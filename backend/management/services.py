from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import (
    Member, Practice, PracticeType, Payment, Receipt,
    Expense, FinancialTransaction, AuditLog
)

class FinancialService:
    @staticmethod
    @transaction.atomic
    def record_payment(practice_id: int, amount: Decimal, payment_date=None, payment_method='CASH', notes='', user=None, ip_address=None) -> Payment:
        """
        Record a payment atomically:
        1. Creates Payment entry.
        2. Calculates practice collection portion vs overpayment portion based on existing total paid.
        3. Creates ledger entries:
           - PRACTICE_COLLECTION for the portion settling required amount.
           - OVERPAYMENT for any portion exceeding required amount.
        4. Logs to AuditLog.
        """
        practice = Practice.objects.select_for_update().get(id=practice_id, is_deleted=False)
        member = practice.member
        amount = Decimal(str(amount))
        
        if amount <= Decimal('0.00'):
            raise ValueError("مبلغ الدفعة يجب أن يكون أكبر من الصفر")

        if payment_date is None:
            payment_date = timezone.now().date()

        # Previous total paid before this payment
        prev_paid = practice.total_paid
        req = practice.required_amount

        # Create payment
        payment = Payment.objects.create(
            practice=practice,
            member=member,
            amount=amount,
            payment_date=payment_date,
            payment_method=payment_method,
            notes=notes,
            created_by=user
        )

        # Calculate allocation:
        # Remaining needed before this payment
        remaining_needed = max(Decimal('0.00'), req - prev_paid)
        
        collection_amount = min(amount, remaining_needed)
        overpayment_amount = max(Decimal('0.00'), amount - collection_amount)

        if collection_amount > Decimal('0.00'):
            FinancialTransaction.objects.create(
                transaction_type='PRACTICE_COLLECTION',
                amount=collection_amount,
                transaction_date=payment_date,
                payment_method=payment_method,
                member=member,
                practice=practice,
                payment=payment,
                description=f"تحصيل ممارسة {practice.practice_type.name} لشهر {practice.month}/{practice.year} - العضو: {member.full_name}",
                created_by=user
            )

        if overpayment_amount > Decimal('0.00'):
            FinancialTransaction.objects.create(
                transaction_type='OVERPAYMENT',
                amount=overpayment_amount,
                transaction_date=payment_date,
                payment_method=payment_method,
                member=member,
                practice=practice,
                payment=payment,
                description=f"مبلغ زائد عن ممارسة {practice.practice_type.name} لشهر {practice.month}/{practice.year} - العضو: {member.full_name}",
                created_by=user
            )

        # Audit Log
        AuditLog.objects.create(
            user=user,
            action='PAYMENT_CREATED',
            entity_name='Payment',
            entity_id=payment.id,
            new_values={
                'practice_id': practice.id,
                'member_id': member.id,
                'member_name': member.full_name,
                'amount': str(amount),
                'payment_method': payment_method,
                'payment_date': str(payment_date),
                'collection_allocated': str(collection_amount),
                'overpayment_allocated': str(overpayment_amount),
            },
            ip_address=ip_address
        )

        return payment

    @staticmethod
    @transaction.atomic
    def void_payment(payment_id: int, reason: str, user=None, ip_address=None) -> Payment:
        """
        Void a payment and reverse all associated financial transactions.
        """
        payment = Payment.objects.select_for_update().get(id=payment_id)
        if payment.is_voided:
            raise ValueError("هذه الدفعة ملغاة بالفعل")

        old_amount = payment.amount
        payment.is_voided = True
        payment.void_reason = reason
        payment.save()

        # Reverse transactions
        for tx in payment.financial_transactions.all():
            FinancialTransaction.objects.create(
                transaction_type='ADJUSTMENT',
                amount=-tx.amount,
                transaction_date=timezone.now().date(),
                payment_method=tx.payment_method,
                member=tx.member,
                practice=tx.practice,
                payment=payment,
                description=f"إلغاء دفعة #{payment.id} بقيمة {tx.amount} ج.م - السبب: {reason}",
                created_by=user
            )

        AuditLog.objects.create(
            user=user,
            action='PAYMENT_VOIDED',
            entity_name='Payment',
            entity_id=payment.id,
            old_values={'amount': str(old_amount), 'is_voided': False},
            new_values={'amount': str(old_amount), 'is_voided': True, 'void_reason': reason},
            ip_address=ip_address
        )

        return payment

    @staticmethod
    @transaction.atomic
    def record_expense(title: str, amount: Decimal, expense_date=None, payment_method='CASH', description='', document_image=None, user=None, ip_address=None) -> Expense:
        """
        Record an expense and post to Financial Ledger.
        """
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValueError("قيمة المصروف يجب أن تكون أكبر من الصفر")

        if expense_date is None:
            expense_date = timezone.now().date()

        expense = Expense.objects.create(
            title=title,
            amount=amount,
            expense_date=expense_date,
            payment_method=payment_method,
            description=description,
            document_image=document_image,
            created_by=user
        )

        FinancialTransaction.objects.create(
            transaction_type='EXPENSE',
            amount=amount,
            transaction_date=expense_date,
            payment_method=payment_method,
            expense=expense,
            description=f"مصروف: {title}" + (f" ({description})" if description else ""),
            created_by=user
        )

        AuditLog.objects.create(
            user=user,
            action='EXPENSE_CREATED',
            entity_name='Expense',
            entity_id=expense.id,
            new_values={'title': title, 'amount': str(amount), 'expense_date': str(expense_date)},
            ip_address=ip_address
        )

        return expense

    @staticmethod
    @transaction.atomic
    def record_manual_overpayment(amount: Decimal, source_name: str, transaction_date=None, payment_method='CASH', description='', user=None, ip_address=None) -> FinancialTransaction:
        """
        Record an independent overpayment not tied directly to a member practice (or from external source).
        """
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValueError("المبلغ يجب أن يكون أكبر من الصفر")

        if transaction_date is None:
            transaction_date = timezone.now().date()

        tx = FinancialTransaction.objects.create(
            transaction_type='OVERPAYMENT',
            amount=amount,
            transaction_date=transaction_date,
            payment_method=payment_method,
            source_payer_name=source_name,
            description=f"مبلغ زائد مستقل: {source_name}" + (f" - {description}" if description else ""),
            created_by=user
        )

        AuditLog.objects.create(
            user=user,
            action='MANUAL_OVERPAYMENT_RECORDED',
            entity_name='FinancialTransaction',
            entity_id=tx.id,
            new_values={'source_name': source_name, 'amount': str(amount), 'payment_method': payment_method},
            ip_address=ip_address
        )

        return tx

    @staticmethod
    @transaction.atomic
    def ensure_practice_receipt(practice: Practice) -> Receipt:
        """
        Ensure that every practice has a corresponding Receipt record with amount matching practice required amount.
        """
        receipt, created = Receipt.objects.get_or_create(
            practice=practice,
            defaults={
                'member': practice.member,
                'receipt_amount': practice.required_amount,
                'status': 'NOT_RECEIVED'
            }
        )
        if not created and receipt.receipt_amount != practice.required_amount:
            receipt.receipt_amount = practice.required_amount
            receipt.save()
        return receipt
