from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from management.models import Member, PracticeType, Practice, Payment, Receipt, Expense, FinancialTransaction
from management.services import FinancialService

class FinancialAndPracticeBusinessLogicTests(TestCase):
    def setUp(self):
        self.member1 = Member.objects.create(
            full_name="أحمد محمد السيد",
            mobile_number="01012345678",
            national_id="29001011234567",
            street_number=7,
            has_guard=True,
            guard_name="محمود حارس",
            guard_mobile="01198765432"
        )
        self.practice_type_main = PracticeType.objects.create(
            name="ممارسة كهرباء أساسية",
            code="ELECTRICITY_MAIN"
        )
        self.practice_type_extra = PracticeType.objects.create(
            name="ممارسة إنارة إضافية",
            code="ELECTRICITY_EXTRA"
        )

    def test_unpaid_practice_calculation(self):
        """Test Required = 560, Paid = 0 -> Status = UNPAID, Remaining = 560"""
        practice = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_main,
            year=2026,
            month=9,
            required_amount=Decimal('560.00')
        )
        FinancialService.ensure_practice_receipt(practice)

        self.assertEqual(practice.total_paid, Decimal('0.00'))
        self.assertEqual(practice.remaining_amount, Decimal('560.00'))
        self.assertEqual(practice.overpayment_amount, Decimal('0.00'))
        self.assertEqual(practice.payment_status, 'UNPAID')
        self.assertEqual(practice.receipt.receipt_amount, Decimal('560.00'))

    def test_partially_paid_practice(self):
        """Test Required = 560, Paid = 300 -> Status = UNPAID (since partial status is removed), Remaining = 260"""
        practice = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_main,
            year=2026,
            month=9,
            required_amount=Decimal('560.00')
        )
        FinancialService.record_payment(
            practice_id=practice.id,
            amount=Decimal('300.00'),
            payment_method='CASH'
        )

        practice.refresh_from_db()
        self.assertEqual(practice.total_paid, Decimal('300.00'))
        self.assertEqual(practice.remaining_amount, Decimal('260.00'))
        self.assertEqual(practice.overpayment_amount, Decimal('0.00'))
        self.assertEqual(practice.payment_status, 'UNPAID')

    def test_fully_paid_single_payment(self):
        """Test Required = 560, Paid = 560 -> Status = FULLY_PAID, Remaining = 0"""
        practice = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_main,
            year=2026,
            month=9,
            required_amount=Decimal('560.00')
        )
        FinancialService.record_payment(
            practice_id=practice.id,
            amount=Decimal('560.00'),
            payment_method='CASH'
        )

        practice.refresh_from_db()
        self.assertEqual(practice.total_paid, Decimal('560.00'))
        self.assertEqual(practice.remaining_amount, Decimal('0.00'))
        self.assertEqual(practice.overpayment_amount, Decimal('0.00'))
        self.assertEqual(practice.payment_status, 'FULLY_PAID')

    def test_overpayment_logic_and_ledger_separation(self):
        """
        Test Required = 560, Paid = 600
        Status = FULLY_PAID, Remaining = 0, Overpayment = 40
        Ledger must record PRACTICE_COLLECTION (560) and OVERPAYMENT (40) separately!
        """
        practice = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_main,
            year=2026,
            month=9,
            required_amount=Decimal('560.00')
        )
        FinancialService.ensure_practice_receipt(practice)

        payment = FinancialService.record_payment(
            practice_id=practice.id,
            amount=Decimal('600.00'),
            payment_method='CASH',
            notes="دفع 600 مع وجود 40 زيادة"
        )

        practice.refresh_from_db()
        self.assertEqual(practice.total_paid, Decimal('600.00'))
        self.assertEqual(practice.remaining_amount, Decimal('0.00'))
        self.assertEqual(practice.overpayment_amount, Decimal('40.00'))
        self.assertEqual(practice.payment_status, 'FULLY_PAID')

        # Check receipt amount is strictly practice required amount (560) NOT 600
        self.assertEqual(practice.receipt.receipt_amount, Decimal('560.00'))

        # Check ledger entries
        tx_collection = FinancialTransaction.objects.filter(
            practice=practice,
            transaction_type='PRACTICE_COLLECTION'
        ).first()
        self.assertIsNotNone(tx_collection)
        self.assertEqual(tx_collection.amount, Decimal('560.00'))

        tx_overpayment = FinancialTransaction.objects.filter(
            practice=practice,
            transaction_type='OVERPAYMENT'
        ).first()
        self.assertIsNotNone(tx_overpayment)
        self.assertEqual(tx_overpayment.amount, Decimal('40.00'))

    def test_multiple_payments_summation(self):
        """Test Multiple Payments: 300 + 260 = 560 -> FULLY_PAID"""
        practice = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_main,
            year=2026,
            month=9,
            required_amount=Decimal('560.00')
        )

        # Payment 1
        FinancialService.record_payment(
            practice_id=practice.id,
            amount=Decimal('300.00'),
            payment_date=timezone.now().date(),
            payment_method='CASH'
        )

        # Payment 2
        FinancialService.record_payment(
            practice_id=practice.id,
            amount=Decimal('260.00'),
            payment_date=timezone.now().date(),
            payment_method='BANK_TRANSFER'
        )

        practice.refresh_from_db()
        self.assertEqual(practice.total_paid, Decimal('560.00'))
        self.assertEqual(practice.remaining_amount, Decimal('0.00'))
        self.assertEqual(practice.payment_status, 'FULLY_PAID')
        self.assertEqual(practice.payments.count(), 2)

    def test_multiple_practices_for_same_member_same_month(self):
        """Test Multiple Practices: Practice A (560) + Practice B (300) = 860 total required"""
        p1 = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_main,
            year=2026,
            month=9,
            required_amount=Decimal('560.00')
        )
        p2 = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_extra,
            year=2026,
            month=9,
            required_amount=Decimal('300.00')
        )

        practices = self.member1.practices.filter(year=2026, month=9)
        total_member_required = sum(p.required_amount for p in practices)
        self.assertEqual(total_member_required, Decimal('860.00'))

    def test_receipt_lifecycle_and_delivery(self):
        """Test receipt state transitions and date recording"""
        practice = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_main,
            year=2026,
            month=9,
            required_amount=Decimal('560.00')
        )
        receipt = FinancialService.ensure_practice_receipt(practice)
        self.assertEqual(receipt.status, 'NOT_RECEIVED')

        # Receive from electricity company
        receipt.status = 'RECEIVED'
        receipt.received_date = timezone.now().date()
        receipt.save()
        self.assertEqual(receipt.status, 'RECEIVED')

        # Mark Delivered
        receipt.status = 'DELIVERED'
        receipt.delivery_date = timezone.now().date()
        receipt.save()
        self.assertEqual(receipt.status, 'DELIVERED')
        self.assertIsNotNone(receipt.delivery_date)

    def test_safe_soft_delete_member_with_history(self):
        """Member with financial history cannot be hard deleted; can_be_deleted() returns False"""
        practice = Practice.objects.create(
            member=self.member1,
            practice_type=self.practice_type_main,
            year=2026,
            month=9,
            required_amount=Decimal('560.00')
        )
        FinancialService.record_payment(practice_id=practice.id, amount=Decimal('560.00'))

        self.assertFalse(self.member1.can_be_deleted())
