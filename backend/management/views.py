import io
import json
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.core import serializers as django_serializers
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from .models import (
    Member, PracticeType, Practice, Payment, Receipt,
    Expense, FinancialTransaction, AuditLog
)
from .serializers import (
    MemberSerializer, PracticeTypeSerializer, PracticeSerializer,
    PaymentSerializer, ReceiptSerializer, ExpenseSerializer,
    FinancialTransactionSerializer, AuditLogSerializer
)
from .services import FinancialService


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def csrf(self, request):
        return Response({'csrfToken': get_token(request)})

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response({'success': False, 'error': 'يجب إدخال اسم المستخدم وكلمة المرور'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if user is not None and user.is_active:
            login(request, user)
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name or 'المهندس المسؤول',
                    'email': user.email,
                    'is_staff': user.is_staff
                },
                'message': 'تم تسجيل الدخول بنجاح'
            })

        return Response({'success': False, 'error': 'اسم المستخدم أو كلمة المرور غير صحيحة'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def me(self, request):
        if request.user.is_authenticated:
            return Response({
                'authenticated': True,
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'first_name': request.user.first_name or 'المهندس المسؤول',
                    'is_staff': request.user.is_staff
                }
            })
        return Response({'authenticated': False})

    @action(detail=False, methods=['post'])
    def logout(self, request):
        logout(request)
        return Response({'success': True, 'message': 'تم تسجيل الخروج بنجاح'})


class MemberViewSet(viewsets.ModelViewSet):
    serializer_class = MemberSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'mobile_number', 'national_id']

    def get_queryset(self):
        qs = Member.objects.filter(is_deleted=False).annotate(
            practices_count=Count('practices', filter=Q(practices__is_deleted=False), distinct=True)
        )
        street = self.request.query_params.get('street')
        is_active = self.request.query_params.get('is_active')
        search_query = self.request.query_params.get('search')
        member_type = self.request.query_params.get('member_type')

        # Default to residential-only for LIST requests, so every existing
        # screen (dashboard, collections, practices, reports, ...) keeps
        # behaving exactly as before and never mixes in commercial entities
        # unless explicitly asked for via ?member_type=COMMERCIAL (or 'ALL').
        # Detail actions (retrieve/update/destroy) must NOT apply this
        # default filter - otherwise fetching or editing a COMMERCIAL member
        # by ID (e.g. to move it back to RESIDENTIAL) would 404, since it
        # wouldn't exist in a residential-only queryset.
        if self.action == 'list':
            if member_type == 'ALL':
                pass
            elif member_type in ('RESIDENTIAL', 'COMMERCIAL'):
                qs = qs.filter(member_type=member_type)
            else:
                qs = qs.filter(member_type='RESIDENTIAL')
        elif member_type in ('RESIDENTIAL', 'COMMERCIAL'):
            # Non-list actions may still filter explicitly if a caller wants to.
            qs = qs.filter(member_type=member_type)

        if street:
            qs = qs.filter(street_number=street)
        if is_active is not None:
            qs = qs.filter(is_active=(is_active.lower() == 'true'))
        if search_query:
            qs = qs.filter(
                Q(full_name__icontains=search_query) |
                Q(mobile_number__icontains=search_query) |
                Q(national_id__icontains=search_query) |
                Q(id__iexact=search_query)
            )
        return qs.order_by('street_number', 'full_name')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.can_be_deleted():
            # Soft delete instead
            instance.is_deleted = True
            instance.is_active = False
            instance.save()
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action='MEMBER_ARCHIVED',
                entity_name='Member',
                entity_id=instance.id,
                old_values={'full_name': instance.full_name, 'is_deleted': False},
                new_values={'is_deleted': True}
            )
            return Response({'message': 'تم أرشفة العضو لحماية السجلات المالية السابقة'}, status=status.HTTP_200_OK)
        
        # Hard delete safe
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='MEMBER_DELETED',
            entity_name='Member',
            entity_id=instance.id,
            old_values={'full_name': instance.full_name}
        )
        instance.delete()
        return Response({'message': 'تم حذف العضو بنجاح'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def statement(self, request, pk=None):
        member = self.get_object()
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month', timezone.now().month)

        practices = member.practices.filter(is_deleted=False).order_by('-year', '-month')
        if year and month:
            curr_practices = practices.filter(year=year, month=month)
        else:
            curr_practices = practices

        total_req = sum(p.required_amount for p in curr_practices)
        total_paid = sum(p.total_paid for p in curr_practices)
        total_rem = sum(p.remaining_amount for p in curr_practices)
        total_over = sum(p.overpayment_amount for p in curr_practices)

        payments = member.payments.filter(is_voided=False).order_by('-payment_date', '-created_at')
        receipts = member.receipts.all().order_by('-practice__year', '-practice__month')

        return Response({
            'member': MemberSerializer(member).data,
            'period': {'year': year, 'month': month},
            'summary': {
                'total_required': str(total_req),
                'total_paid': str(total_paid),
                'remaining': str(total_rem),
                'overpayment': str(total_over),
                'status': 'FULLY_PAID' if (total_req > 0 and total_paid >= total_req) else 'UNPAID'
            },
            'practices': PracticeSerializer(practices, many=True).data,
            'payments': PaymentSerializer(payments, many=True).data,
            'receipts': ReceiptSerializer(receipts, many=True).data,
        })


class PracticeTypeViewSet(viewsets.ModelViewSet):
    queryset = PracticeType.objects.filter(is_active=True)
    serializer_class = PracticeTypeSerializer


class PracticeViewSet(viewsets.ModelViewSet):
    serializer_class = PracticeSerializer

    def get_queryset(self):
        qs = Practice.objects.filter(is_deleted=False).select_related('member', 'practice_type', 'receipt').prefetch_related('payments')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        member_id = self.request.query_params.get('member_id')
        street = self.request.query_params.get('street')
        search = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if year:
            qs = qs.filter(year=year)
        if month:
            qs = qs.filter(month=month)
        if member_id:
            qs = qs.filter(member_id=member_id)
        if street:
            qs = qs.filter(member__street_number=street)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if search:
            qs = qs.filter(
                Q(member__full_name__icontains=search) |
                Q(member__mobile_number__icontains=search) |
                Q(member__national_id__icontains=search)
            )
        return qs.order_by('member__street_number', 'member__full_name')

    def perform_create(self, serializer):
        practice = serializer.save()
        FinancialService.ensure_practice_receipt(practice)
        AuditLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='PRACTICE_CREATED',
            entity_name='Practice',
            entity_id=practice.id,
            new_values={
                'member_id': practice.member_id,
                'practice_type': practice.practice_type.name,
                'year': practice.year,
                'month': practice.month,
                'required_amount': str(practice.required_amount)
            }
        )

    def perform_update(self, serializer):
        old = serializer.instance
        old_values = {
            'required_amount': str(old.required_amount),
            'year': old.year,
            'month': old.month,
            'notes': old.notes,
        }
        practice = serializer.save()
        # Keep the linked receipt's amount in sync with any edited required_amount
        FinancialService.ensure_practice_receipt(practice)
        # Refresh so the response reflects the just-synced receipt amount,
        # not a stale cached copy from before the sync.
        practice.refresh_from_db()
        AuditLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='PRACTICE_UPDATED',
            entity_name='Practice',
            entity_id=practice.id,
            old_values=old_values,
            new_values={
                'required_amount': str(practice.required_amount),
                'year': practice.year,
                'month': practice.month,
                'notes': practice.notes,
            }
        )

    def destroy(self, request, *args, **kwargs):
        practice = self.get_object()
        if practice.total_paid > 0:
            return Response(
                {'error': 'لا يمكن حذف هذه الممارسة لوجود دفعات مسجلة عليها بالفعل. يرجى إلغاء الدفعات أولاً من شاشة التحصيل ثم إعادة المحاولة.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        practice.is_deleted = True
        practice.save(update_fields=['is_deleted'])
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='PRACTICE_DELETED',
            entity_name='Practice',
            entity_id=practice.id,
            old_values={
                'member_id': practice.member_id,
                'required_amount': str(practice.required_amount),
                'year': practice.year,
                'month': practice.month,
            }
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def bulk_create_month(self, request):
        """
        Quick bulk creation of practice for all active members for a specific month and year.
        """
        year = int(request.data.get('year', timezone.now().year))
        month = int(request.data.get('month', timezone.now().month))
        practice_type_id = request.data.get('practice_type_id')
        required_amount = Decimal(str(request.data.get('required_amount', '560.00')))

        try:
            practice_type = PracticeType.objects.get(id=practice_type_id)
        except (PracticeType.DoesNotExist, ValueError, TypeError):
            return Response(
                {'error': 'يرجى اختيار نوع ممارسة صحيح.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Bulk monthly creation only applies to residential members; commercial
        # entities are managed separately and don't get automatic street practices.
        active_members = Member.objects.filter(
            is_active=True, is_deleted=False, member_type='RESIDENTIAL'
        )

        created_count = 0
        with transaction.atomic():
            for m in active_members:
                practice, created = Practice.objects.get_or_create(
                    member=m,
                    practice_type=practice_type,
                    year=year,
                    month=month,
                    is_deleted=False,
                    defaults={'required_amount': required_amount}
                )
                if created:
                    FinancialService.ensure_practice_receipt(practice)
                    created_count += 1

        return Response({
            'success': True,
            'created_count': created_count,
            'message': f"تم إنشاء {created_count} ممارسة لشهر {month}/{year} بقيمة {required_amount} ج.م"
        })


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = Payment.objects.filter(is_voided=False).select_related('member', 'practice', 'practice__practice_type')
        member_id = self.request.query_params.get('member_id')
        practice_id = self.request.query_params.get('practice_id')
        street = self.request.query_params.get('street')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if member_id:
            qs = qs.filter(member_id=member_id)
        if practice_id:
            qs = qs.filter(practice_id=practice_id)
        if street:
            qs = qs.filter(member__street_number=street)
        if year:
            qs = qs.filter(payment_date__year=year)
        if month:
            qs = qs.filter(payment_date__month=month)
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)
            
        return qs.order_by('-payment_date', '-created_at')

    def create(self, request, *args, **kwargs):
        practice_id = request.data.get('practice')
        amount = request.data.get('amount')
        payment_date = request.data.get('payment_date')
        payment_method = request.data.get('payment_method', 'CASH')
        notes = request.data.get('notes', '')

        if not practice_id or not amount:
            return Response({'error': 'يجب تحديد الممارسة والمبلغ'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = FinancialService.record_payment(
                practice_id=practice_id,
                amount=amount,
                payment_date=payment_date,
                payment_method=payment_method,
                notes=notes,
                user=request.user if request.user.is_authenticated else None,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            serializer = self.get_serializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def void_payment(self, request, pk=None):
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'يجب توضيح سبب الإلغاء'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = FinancialService.void_payment(
                payment_id=pk,
                reason=reason,
                user=request.user if request.user.is_authenticated else None,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({'success': True, 'message': 'تم إلغاء الدفعة وعكس القيد المالي بنجاح'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReceiptViewSet(viewsets.ModelViewSet):
    serializer_class = ReceiptSerializer

    def get_queryset(self):
        qs = Receipt.objects.select_related('member', 'practice', 'practice__practice_type')
        status_filter = self.request.query_params.get('status')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        street = self.request.query_params.get('street')
        search = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if year:
            qs = qs.filter(practice__year=year)
        if month:
            qs = qs.filter(practice__month=month)
        if street:
            qs = qs.filter(member__street_number=street)
        if date_from:
            qs = qs.filter(
                Q(delivery_date__gte=date_from) |
                Q(received_date__gte=date_from) |
                Q(created_at__date__gte=date_from)
            )
        if date_to:
            qs = qs.filter(
                Q(delivery_date__lte=date_to) |
                Q(received_date__lte=date_to) |
                Q(created_at__date__lte=date_to)
            )
        if search:
            qs = qs.filter(
                Q(member__full_name__icontains=search) |
                Q(receipt_number__icontains=search) |
                Q(member__mobile_number__icontains=search)
            )

        return qs.order_by('member__street_number', 'member__full_name')

    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        receipt = self.get_object()
        receipt.status = 'DELIVERED'
        receipt.delivery_date = timezone.now().date()
        receipt.save()

        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='RECEIPT_MARKED_DELIVERED',
            entity_name='Receipt',
            entity_id=receipt.id,
            new_values={'status': 'DELIVERED', 'delivery_date': str(receipt.delivery_date)}
        )
        return Response({'success': True, 'message': 'تم تسجيل تسليم الإيصال للعضو'})

    @action(detail=True, methods=['post'])
    def mark_received(self, request, pk=None):
        receipt = self.get_object()
        receipt.status = 'RECEIVED'
        receipt.received_date = timezone.now().date()
        receipt.save()

        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='RECEIPT_MARKED_RECEIVED',
            entity_name='Receipt',
            entity_id=receipt.id,
            new_values={'status': 'RECEIVED', 'received_date': str(receipt.received_date)}
        )
        return Response({'success': True, 'message': 'تم تسجيل استلام الإيصال من شركة الكهرباء'})


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        qs = Expense.objects.filter(is_deleted=False)
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if year:
            qs = qs.filter(expense_date__year=year)
        if month:
            qs = qs.filter(expense_date__month=month)
        if date_from:
            qs = qs.filter(expense_date__gte=date_from)
        if date_to:
            qs = qs.filter(expense_date__lte=date_to)
        return qs.order_by('-expense_date', '-created_at')

    def create(self, request, *args, **kwargs):
        title = request.data.get('title')
        amount = request.data.get('amount')
        expense_date = request.data.get('expense_date')
        payment_method = request.data.get('payment_method', 'CASH')
        description = request.data.get('description', '')
        document_image = request.FILES.get('document_image')

        try:
            expense = FinancialService.record_expense(
                title=title,
                amount=amount,
                expense_date=expense_date,
                payment_method=payment_method,
                description=description,
                document_image=document_image,
                user=request.user if request.user.is_authenticated else None,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(self.get_serializer(expense).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FinancialTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FinancialTransactionSerializer

    def get_queryset(self):
        qs = FinancialTransaction.objects.select_related('member', 'practice', 'payment', 'expense')
        tx_type = self.request.query_params.get('type')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        member_id = self.request.query_params.get('member_id')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if tx_type:
            qs = qs.filter(transaction_type=tx_type)
        if year:
            qs = qs.filter(transaction_date__year=year)
        if month:
            qs = qs.filter(transaction_date__month=month)
        if date_from:
            qs = qs.filter(transaction_date__gte=date_from)
        if date_to:
            qs = qs.filter(transaction_date__lte=date_to)
        if member_id:
            qs = qs.filter(member_id=member_id)

        return qs.order_by('-transaction_date', '-created_at')

    @action(detail=False, methods=['post'])
    def record_manual_overpayment(self, request):
        amount = request.data.get('amount')
        source_name = request.data.get('source_name', '').strip()
        payment_method = request.data.get('payment_method', 'CASH')
        description = request.data.get('description', '')
        transaction_date = request.data.get('transaction_date')

        if not amount or not source_name:
            return Response({'error': 'يجب تحديد المبلغ والجهة أو الشخص الدافع'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tx = FinancialService.record_manual_overpayment(
                amount=amount,
                source_name=source_name,
                transaction_date=transaction_date,
                payment_method=payment_method,
                description=description,
                user=request.user if request.user.is_authenticated else None,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(self.get_serializer(tx).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').order_by('-created_at')
    serializer_class = AuditLogSerializer


class ReportViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))

        # Residential and Commercial member totals
        total_members = Member.objects.filter(
            is_active=True, is_deleted=False, member_type='RESIDENTIAL'
        ).count()
        total_commercial = Member.objects.filter(
            is_active=True, is_deleted=False, member_type='COMMERCIAL'
        ).count()

        practices = Practice.objects.filter(year=year, month=month, is_deleted=False).prefetch_related('payments')
        total_required = practices.aggregate(total=Sum('required_amount'))['total'] or Decimal('0.00')

        # Real collections and overpayments for this month
        collections = FinancialTransaction.objects.filter(
            transaction_type='PRACTICE_COLLECTION',
            transaction_date__year=year,
            transaction_date__month=month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        overpayments = FinancialTransaction.objects.filter(
            transaction_type='OVERPAYMENT',
            transaction_date__year=year,
            transaction_date__month=month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        expenses = FinancialTransaction.objects.filter(
            transaction_type='EXPENSE',
            transaction_date__year=year,
            transaction_date__month=month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        remaining = max(Decimal('0.00'), total_required - collections)
        net_balance = (collections + overpayments) - expenses

        # Fast in-memory status count using prefetched payments
        fully_paid_count = 0
        unpaid_count = 0

        for p in practices:
            if p.payment_status == 'FULLY_PAID':
                fully_paid_count += 1
            else:
                unpaid_count += 1

        # Receipts status
        receipts = Receipt.objects.filter(practice__year=year, practice__month=month)
        receipts_received = receipts.filter(status='RECEIVED').count()
        receipts_delivered = receipts.filter(status='DELIVERED').count()
        receipts_not_received = receipts.filter(status='NOT_RECEIVED').count()

        return Response({
            'period': {'year': year, 'month': month},
            'members': {
                'total_members': total_members,
                'total_commercial': total_commercial,
            },
            'collections': {
                'total_required': str(total_required),
                'total_paid': str(collections),
                'remaining': str(remaining),
            },
            'payment_status': {
                'fully_paid': fully_paid_count,
                'unpaid': unpaid_count,
            },
            'receipts': {
                'total': receipts.count(),
                'received': receipts_received,
                'delivered': receipts_delivered,
                'not_received': receipts_not_received,
            },
            'financials': {
                'overpayments': str(overpayments),
                'expenses': str(expenses),
                'net_balance': str(net_balance),
            }
        })

    @action(detail=False, methods=['get'])
    def streets(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))

        # Query 1: Get residential member counts grouped by street in a single query
        member_counts_qs = (
            Member.objects.filter(is_active=True, is_deleted=False, member_type='RESIDENTIAL')
            .values('street_number')
            .annotate(c=Count('id'))
        )
        member_counts = {item['street_number']: item['c'] for item in member_counts_qs}

        # Query 2: Fetch all practices for the month with prefetched payments in a single query
        practices = (
            Practice.objects.filter(
                member__member_type='RESIDENTIAL',
                year=year,
                month=month,
                is_deleted=False
            )
            .select_related('member')
            .prefetch_related('payments')
        )

        practices_by_street = {s: [] for s in range(1, 21)}
        for p in practices:
            st = p.member.street_number
            if st in practices_by_street:
                practices_by_street[st].append(p)

        streets_data = []
        for s in range(1, 21):
            s_practices = practices_by_street[s]
            req = sum((p.required_amount for p in s_practices), Decimal('0.00'))
            paid = sum((p.total_paid for p in s_practices), Decimal('0.00'))
            rem = sum((p.remaining_amount for p in s_practices), Decimal('0.00'))

            streets_data.append({
                'street_number': s,
                'street_name': f"شارع {s}",
                'members_count': member_counts.get(s, 0),
                'required_amount': str(req),
                'paid_amount': str(paid),
                'remaining_amount': str(rem),
                'practices_count': len(s_practices)
            })

        return Response({'year': year, 'month': month, 'streets': streets_data})

    @action(detail=False, methods=['get'])
    def commercial(self, request):
        """
        Commercial entities report with period filtering, totals, and member breakdown.
        """
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        search = request.query_params.get('search', '').strip()

        # Query commercial practices
        qs = Practice.objects.filter(
            member__member_type='COMMERCIAL',
            is_deleted=False
        ).select_related('member', 'practice_type', 'receipt').prefetch_related('payments')

        if year:
            qs = qs.filter(year=int(year))
        if month:
            qs = qs.filter(month=int(month))
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if search:
            qs = qs.filter(
                Q(member__full_name__icontains=search) |
                Q(member__mobile_number__icontains=search) |
                Q(member__national_id__icontains=search)
            )

        practices = list(qs.order_by('member__full_name', '-year', '-month'))

        total_commercial_members = Member.objects.filter(
            is_active=True, is_deleted=False, member_type='COMMERCIAL'
        ).count()

        total_required = sum((p.required_amount for p in practices), Decimal('0.00'))
        total_paid = sum((p.total_paid for p in practices), Decimal('0.00'))
        total_remaining = sum((p.remaining_amount for p in practices), Decimal('0.00'))
        total_overpayment = sum((p.overpayment_amount for p in practices), Decimal('0.00'))
        fully_paid_count = sum(1 for p in practices if p.payment_status == 'FULLY_PAID')
        unpaid_count = len(practices) - fully_paid_count
        collection_rate = (
            min(100, round(float(total_paid / total_required) * 100))
            if total_required > Decimal('0.00') else 0
        )

        rows = []
        for p in practices:
            rows.append({
                'id': p.id,
                'member_id': p.member_id,
                'member_name': p.member.full_name,
                'mobile_number': p.member.mobile_number,
                'national_id': p.member.national_id,
                'practice_type_name': p.practice_type.name,
                'year': p.year,
                'month': p.month,
                'required_amount': str(p.required_amount),
                'total_paid': str(p.total_paid),
                'remaining_amount': str(p.remaining_amount),
                'overpayment_amount': str(p.overpayment_amount),
                'payment_status': p.payment_status,
                'receipt_status': p.receipt.status if hasattr(p, 'receipt') and p.receipt else 'NONE',
                'receipt_status_display': (
                    p.receipt.get_status_display()
                    if hasattr(p, 'receipt') and p.receipt else 'بدون إيصال'
                ),
                'receipt_number': p.receipt.receipt_number if hasattr(p, 'receipt') and p.receipt else '',
                'created_at': p.created_at.strftime('%Y-%m-%d'),
            })

        return Response({
            'period': {'year': year, 'month': month, 'date_from': date_from, 'date_to': date_to},
            'summary': {
                'total_commercial_members': total_commercial_members,
                'total_practices': len(practices),
                'total_required': str(total_required),
                'total_paid': str(total_paid),
                'total_remaining': str(total_remaining),
                'total_overpayment': str(total_overpayment),
                'fully_paid_count': fully_paid_count,
                'unpaid_count': unpaid_count,
                'collection_rate': collection_rate,
            },
            'records': rows,
        })

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        street = request.query_params.get('street')

        wb = openpyxl.Workbook()

        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, size=11)
        total_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        total_font = Font(color="0F172A", bold=True, size=11)
        center_align = Alignment(horizontal="center", vertical="center")

        # ---------------------------------------------------------------------
        # Sheet 1: الممارسات السكنية (الشوارع 1 إلى 20)
        # ---------------------------------------------------------------------
        ws1 = wb.active
        ws1.title = "الممارسات السكنية (1-20)"
        ws1.views.sheetView[0].rightToLeft = True

        headers_res = [
            "م", "اسم العضو", "الشارع", "رقم الموبايل", "نوع الممارسة",
            "المطلوب (ج.م)", "المدفوع (ج.م)", "المتبقي (ج.م)", "الزيادة (ج.م)",
            "حالة السداد", "حالة الإيصال"
        ]
        ws1.append(headers_res)

        for col_num, cell in enumerate(ws1[1], 1):
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align

        practices_res = (
            Practice.objects.filter(
                member__member_type='RESIDENTIAL',
                year=year,
                month=month,
                is_deleted=False
            )
            .select_related('member', 'practice_type', 'receipt')
            .prefetch_related('payments')
        )
        if street:
            practices_res = practices_res.filter(member__street_number=street)

        row_idx = 1
        res_req_sum = Decimal('0.00')
        res_paid_sum = Decimal('0.00')
        res_rem_sum = Decimal('0.00')
        res_over_sum = Decimal('0.00')

        for p in practices_res:
            res_req_sum += p.required_amount
            res_paid_sum += p.total_paid
            res_rem_sum += p.remaining_amount
            res_over_sum += p.overpayment_amount

            ws1.append([
                row_idx,
                p.member.full_name,
                f"شارع {p.member.street_number}",
                p.member.mobile_number,
                p.practice_type.name,
                float(p.required_amount),
                float(p.total_paid),
                float(p.remaining_amount),
                float(p.overpayment_amount),
                "مسدد بالكامل" if p.payment_status == 'FULLY_PAID' else "غير مسدد",
                p.receipt.get_status_display() if hasattr(p, 'receipt') and p.receipt else 'بدون إيصال'
            ])
            row_idx += 1

        # Summary total row for residential
        summary_res_row = [
            "الإجمالي", "", "", "", "",
            float(res_req_sum), float(res_paid_sum), float(res_rem_sum), float(res_over_sum),
            "", ""
        ]
        ws1.append(summary_res_row)
        for cell in ws1[ws1.max_row]:
            cell.fill = total_fill
            cell.font = total_font
            cell.alignment = center_align

        # Auto column width
        for col in ws1.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws1.column_dimensions[col_letter].width = max(max_len + 4, 13)

        # ---------------------------------------------------------------------
        # Sheet 2: الجهات والأنشطة التجارية
        # ---------------------------------------------------------------------
        ws2 = wb.create_sheet(title="الجهات والأنشطة التجارية")
        ws2.views.sheetView[0].rightToLeft = True

        comm_header_fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
        headers_comm = [
            "م", "اسم النشاط / الجهة التجارية", "رقم الهاتف", "الرقم القومي / السجل",
            "نوع الممارسة", "المطلوب (ج.م)", "المدفوع (ج.م)", "المتبقي (ج.م)",
            "الزيادة (ج.م)", "حالة السداد", "حالة الإيصال"
        ]
        ws2.append(headers_comm)
        for col_num, cell in enumerate(ws2[1], 1):
            cell.fill = comm_header_fill
            cell.font = header_font
            cell.alignment = center_align

        practices_comm = (
            Practice.objects.filter(
                member__member_type='COMMERCIAL',
                year=year,
                month=month,
                is_deleted=False
            )
            .select_related('member', 'practice_type', 'receipt')
            .prefetch_related('payments')
        )

        row_idx = 1
        comm_req_sum = Decimal('0.00')
        comm_paid_sum = Decimal('0.00')
        comm_rem_sum = Decimal('0.00')
        comm_over_sum = Decimal('0.00')

        for p in practices_comm:
            comm_req_sum += p.required_amount
            comm_paid_sum += p.total_paid
            comm_rem_sum += p.remaining_amount
            comm_over_sum += p.overpayment_amount

            ws2.append([
                row_idx,
                p.member.full_name,
                p.member.mobile_number,
                p.member.national_id or "-",
                p.practice_type.name,
                float(p.required_amount),
                float(p.total_paid),
                float(p.remaining_amount),
                float(p.overpayment_amount),
                "مسدد بالكامل" if p.payment_status == 'FULLY_PAID' else "غير مسدد",
                p.receipt.get_status_display() if hasattr(p, 'receipt') and p.receipt else 'بدون إيصال'
            ])
            row_idx += 1

        # Summary total row for commercial
        summary_comm_row = [
            "الإجمالي", "", "", "", "",
            float(comm_req_sum), float(comm_paid_sum), float(comm_rem_sum), float(comm_over_sum),
            "", ""
        ]
        ws2.append(summary_comm_row)
        for cell in ws2[ws2.max_row]:
            cell.fill = total_fill
            cell.font = total_font
            cell.alignment = center_align

        for col in ws2.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws2.column_dimensions[col_letter].width = max(max_len + 4, 13)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"Green_Revolution_Full_Report_{month}_{year}.xlsx"
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    # Models are listed in FK-dependency-safe order: parents before children.
    # Backup restore/wipe operations must respect this order (insert in this
    # order, delete in reverse) to avoid foreign-key errors.
    BACKUP_MODELS_ORDER = [
        Member, PracticeType, Practice, Payment, Receipt, Expense,
        FinancialTransaction, AuditLog,
    ]

    @action(detail=False, methods=['get'])
    def backup_export(self, request):
        """Download a full JSON backup of all data (excludes Django's own
        auth/session tables for security - no password hashes in this file)."""
        all_objects = []
        for model in self.BACKUP_MODELS_ORDER:
            all_objects.extend(model.objects.all())

        data = django_serializers.serialize('json', all_objects, indent=2)
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        response = HttpResponse(data, content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="green_revolution_backup_{timestamp}.json"'
        return response

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def backup_inspect(self, request):
        """Inspect and validate a backup file without modifying the database."""
        uploaded_file = request.FILES.get('backup_file')
        if not uploaded_file:
            return Response({'error': 'يرجى اختيار ملف النسخة الاحتياطية (JSON) أولاً.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = uploaded_file.read().decode('utf-8')
            deserialized_objects = list(django_serializers.deserialize('json', content))
            if not deserialized_objects:
                return Response({'error': 'الملف فارغ أو لا يحتوي على بيانات صالحة.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'ملف النسخة الاحتياطية غير صالح أو تالف: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        counts = {
            'members_residential': 0,
            'members_commercial': 0,
            'practice_types': 0,
            'practices': 0,
            'payments': 0,
            'receipts': 0,
            'expenses': 0,
            'transactions': 0,
            'audit_logs': 0,
            'other': 0,
        }

        total_payments_amount = Decimal('0.00')
        total_expenses_amount = Decimal('0.00')

        for d_obj in deserialized_objects:
            instance = d_obj.object
            model_name = instance._meta.model_name
            if model_name == 'member':
                if getattr(instance, 'member_type', 'RESIDENTIAL') == 'COMMERCIAL':
                    counts['members_commercial'] += 1
                else:
                    counts['members_residential'] += 1
            elif model_name == 'practicetype':
                counts['practice_types'] += 1
            elif model_name == 'practice':
                counts['practices'] += 1
            elif model_name == 'payment':
                counts['payments'] += 1
                if not getattr(instance, 'is_voided', False):
                    total_payments_amount += getattr(instance, 'amount', Decimal('0.00')) or Decimal('0.00')
            elif model_name == 'receipt':
                counts['receipts'] += 1
            elif model_name == 'expense':
                counts['expenses'] += 1
                if not getattr(instance, 'is_deleted', False):
                    total_expenses_amount += getattr(instance, 'amount', Decimal('0.00')) or Decimal('0.00')
            elif model_name == 'financialtransaction':
                counts['transactions'] += 1
            elif model_name == 'auditlog':
                counts['audit_logs'] += 1
            else:
                counts['other'] += 1

        return Response({
            'valid': True,
            'filename': uploaded_file.name,
            'file_size_bytes': uploaded_file.size,
            'total_objects': len(deserialized_objects),
            'counts': counts,
            'financial_totals': {
                'total_payments': str(total_payments_amount),
                'total_expenses': str(total_expenses_amount),
            },
            'verified_at': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            'message': 'النسخة الاحتياطية سليمة ومتوافقة بالكامل مع هيكل قاعدة البيانات.',
        })

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def backup_restore(self, request):
        """Replace ALL current data with the contents of an uploaded backup
        file. Extremely destructive by design - protected by a required
        confirmation phrase, and an automatic safety snapshot of the current
        data taken right before anything is deleted."""
        CONFIRM_PHRASE = 'نعم متأكد'
        if request.data.get('confirm_phrase', '').strip() != CONFIRM_PHRASE:
            return Response(
                {'error': f'يجب كتابة عبارة التأكيد "{CONFIRM_PHRASE}" بالضبط للمتابعة، ولم تتم أي عملية.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES.get('backup_file')
        if not uploaded_file:
            return Response({'error': 'يرجى اختيار ملف النسخة الاحتياطية (JSON) أولاً.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = uploaded_file.read().decode('utf-8')
            deserialized_objects = list(django_serializers.deserialize('json', content))
            if not deserialized_objects:
                return Response({'error': 'الملف فارغ أو لا يحتوي على بيانات صالحة.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'ملف النسخة الاحتياطية غير صالح أو تالف: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Automatic safety net: snapshot the CURRENT data before wiping
        # anything, in case the wrong file was uploaded by mistake.
        safety_objects = []
        for model in self.BACKUP_MODELS_ORDER:
            safety_objects.extend(model.objects.all())
        safety_snapshot = django_serializers.serialize('json', safety_objects, indent=2)

        try:
            with transaction.atomic():
                for model in reversed(self.BACKUP_MODELS_ORDER):
                    model.objects.all().delete()
                for obj in deserialized_objects:
                    obj.save()
        except Exception as e:
            # transaction.atomic() has already rolled back any partial
            # changes at this point - the original data is intact.
            return Response(
                {'error': f'فشلت عملية الاستعادة وتم التراجع تلقائياً؛ بياناتك الأصلية سليمة ولم تتأثر. سبب الفشل: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='DATA_RESTORED',
            entity_name='System',
            new_values={'objects_restored': len(deserialized_objects)}
        )

        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        return JsonResponse({
            'success': True,
            'message': f'تم استعادة {len(deserialized_objects)} سجل بنجاح من النسخة الاحتياطية.',
            'safety_snapshot': safety_snapshot,
            'safety_snapshot_filename': f'green_revolution_SAFETY_before_restore_{timestamp}.json',
        })
