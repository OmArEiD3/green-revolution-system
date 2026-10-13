from decimal import Decimal
from rest_framework import serializers
from .models import (
    Member, PracticeType, Practice, Payment, Receipt,
    Expense, FinancialTransaction, AuditLog, DeliveryStop
)

class PracticeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeType
        fields = ['id', 'name', 'code', 'is_active']


class ReceiptSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    street_number = serializers.IntegerField(source='member.street_number', read_only=True)
    practice_type_name = serializers.CharField(source='practice.practice_type.name', read_only=True)
    practice_year = serializers.IntegerField(source='practice.year', read_only=True)
    practice_month = serializers.IntegerField(source='practice.month', read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id', 'receipt_number', 'practice', 'member', 'member_name',
            'street_number', 'practice_type_name', 'practice_year', 'practice_month',
            'receipt_amount', 'status', 'received_date', 'delivery_date',
            'receipt_image', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['receipt_amount', 'member']


class PaymentSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    practice_type_name = serializers.CharField(source='practice.practice_type.name', read_only=True)
    practice_month = serializers.IntegerField(source='practice.month', read_only=True)
    practice_year = serializers.IntegerField(source='practice.year', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'practice', 'member', 'member_name', 'practice_type_name',
            'practice_month', 'practice_year', 'amount', 'payment_date',
            'payment_method', 'notes', 'is_voided', 'void_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['member']


class PracticeSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    street_number = serializers.IntegerField(source='member.street_number', read_only=True)
    practice_type_name = serializers.CharField(source='practice_type.name', read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    overpayment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    payment_status = serializers.CharField(read_only=True)
    receipt = ReceiptSerializer(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Practice
        fields = [
            'id', 'member', 'member_name', 'street_number', 'practice_type',
            'practice_type_name', 'year', 'month', 'required_amount', 'notes',
            'total_paid', 'remaining_amount', 'overpayment_amount', 'payment_status',
            'receipt', 'payments', 'created_at', 'updated_at'
        ]


class MemberSerializer(serializers.ModelSerializer):
    # Populated via annotation in MemberViewSet.get_queryset(); falls back to
    # 0 if a Member instance is serialized without that annotation.
    practices_count = serializers.SerializerMethodField()

    def get_practices_count(self, obj):
        return getattr(obj, 'practices_count', 0)

    class Meta:
        model = Member
        fields = [
            'id', 'member_type', 'full_name', 'mobile_number', 'national_id',
            'street_number', 'has_guard', 'guard_name', 'guard_mobile', 'guard_mobile_2',
            'latitude', 'longitude',
            'is_active', 'is_deleted', 'practices_count', 'created_at', 'updated_at'
        ]

    def validate_street_number(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError("رقم الشارع يجب أن يكون بين 1 و 20")
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            'id', 'title', 'amount', 'expense_date', 'payment_method',
            'description', 'document_image', 'is_deleted', 'created_at', 'updated_at'
        ]


class FinancialTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    member_name = serializers.CharField(source='member.full_name', read_only=True, default=None)
    street_number = serializers.IntegerField(source='member.street_number', read_only=True, default=None)

    class Meta:
        model = FinancialTransaction
        fields = [
            'id', 'transaction_type', 'transaction_type_display', 'amount',
            'transaction_date', 'payment_method', 'member', 'member_name', 'street_number',
            'practice', 'payment', 'expense', 'source_payer_name', 'description', 'created_at'
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default='النظام')

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'username', 'action', 'entity_name', 'entity_id',
            'old_values', 'new_values', 'ip_address', 'created_at'
        ]


class DeliveryMergedMemberSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_type = serializers.CharField(source='member.member_type', read_only=True)
    member_type_display = serializers.CharField(source='member.get_member_type_display', read_only=True)
    street_number = serializers.IntegerField(source='member.street_number', read_only=True)
    mobile_number = serializers.CharField(source='member.mobile_number', read_only=True)
    has_guard = serializers.BooleanField(source='member.has_guard', read_only=True)
    guard_name = serializers.CharField(source='member.guard_name', read_only=True)
    guard_mobile = serializers.CharField(source='member.guard_mobile', read_only=True)
    guard_mobile_2 = serializers.CharField(source='member.guard_mobile_2', read_only=True)
    latitude = serializers.DecimalField(source='member.latitude', max_digits=10, decimal_places=7, read_only=True)
    longitude = serializers.DecimalField(source='member.longitude', max_digits=10, decimal_places=7, read_only=True)

    receipt_id = serializers.SerializerMethodField()
    receipt_number = serializers.SerializerMethodField()
    receipt_amount = serializers.SerializerMethodField()
    receipt_status = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryStop
        fields = [
            'id', 'member', 'member_name', 'member_type', 'member_type_display',
            'street_number', 'mobile_number', 'has_guard', 'guard_name',
            'guard_mobile', 'guard_mobile_2', 'latitude', 'longitude',
            'status', 'receipt_id', 'receipt_number', 'receipt_amount',
            'receipt_status', 'notes', 'created_at', 'updated_at'
        ]

    def _get_receipt(self, obj):
        receipts_map = self.context.get('receipts_by_member_id')
        if receipts_map is not None:
            return receipts_map.get(obj.member_id)
        return Receipt.objects.filter(
            member_id=obj.member_id,
            practice__year=obj.year,
            practice__month=obj.month,
            practice__is_deleted=False
        ).first()

    def get_receipt_id(self, obj):
        r = self._get_receipt(obj)
        return r.id if r else None

    def get_receipt_number(self, obj):
        r = self._get_receipt(obj)
        return r.receipt_number if r else ''

    def get_receipt_amount(self, obj):
        r = self._get_receipt(obj)
        return str(r.receipt_amount) if r else '0.00'

    def get_receipt_status(self, obj):
        r = self._get_receipt(obj)
        return r.status if r else None


class DeliveryStopSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_type = serializers.CharField(source='member.member_type', read_only=True)
    member_type_display = serializers.CharField(source='member.get_member_type_display', read_only=True)
    street_number = serializers.IntegerField(source='member.street_number', read_only=True)
    mobile_number = serializers.CharField(source='member.mobile_number', read_only=True)
    has_guard = serializers.BooleanField(source='member.has_guard', read_only=True)
    guard_name = serializers.CharField(source='member.guard_name', read_only=True)
    guard_mobile = serializers.CharField(source='member.guard_mobile', read_only=True)
    guard_mobile_2 = serializers.CharField(source='member.guard_mobile_2', read_only=True)
    latitude = serializers.DecimalField(source='member.latitude', max_digits=10, decimal_places=7, read_only=True)
    longitude = serializers.DecimalField(source='member.longitude', max_digits=10, decimal_places=7, read_only=True)
    delivered_by_name = serializers.CharField(source='delivered_by.username', read_only=True, default=None)

    receipt_id = serializers.SerializerMethodField()
    receipt_number = serializers.SerializerMethodField()
    receipt_amount = serializers.SerializerMethodField()
    receipt_status = serializers.SerializerMethodField()

    merged = serializers.SerializerMethodField()
    group_members_count = serializers.SerializerMethodField()
    group_total_amount = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryStop
        fields = [
            'id', 'member', 'parent', 'year', 'month', 'position', 'status',
            'delivered_at', 'delivered_by', 'delivered_by_name', 'receipt_synced',
            'notes', 'created_at', 'updated_at',
            'member_name', 'member_type', 'member_type_display',
            'street_number', 'mobile_number', 'has_guard', 'guard_name',
            'guard_mobile', 'guard_mobile_2', 'latitude', 'longitude',
            'receipt_id', 'receipt_number', 'receipt_amount', 'receipt_status',
            'merged', 'group_members_count', 'group_total_amount'
        ]
        read_only_fields = ['delivered_at', 'delivered_by', 'receipt_synced']
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=DeliveryStop.objects.all(),
                fields=('member', 'year', 'month'),
                message='العضو مضاف بالفعل إلى خط السير لهذا الشهر'
            )
        ]

    def _get_receipt(self, obj):
        receipts_map = self.context.get('receipts_by_member_id')
        if receipts_map is not None:
            return receipts_map.get(obj.member_id)
        return Receipt.objects.filter(
            member_id=obj.member_id,
            practice__year=obj.year,
            practice__month=obj.month,
            practice__is_deleted=False
        ).first()

    def get_receipt_id(self, obj):
        r = self._get_receipt(obj)
        return r.id if r else None

    def get_receipt_number(self, obj):
        r = self._get_receipt(obj)
        return r.receipt_number if r else ''

    def get_receipt_amount(self, obj):
        r = self._get_receipt(obj)
        return str(r.receipt_amount) if r else '0.00'

    def get_receipt_status(self, obj):
        r = self._get_receipt(obj)
        return r.status if r else None

    def get_merged(self, obj):
        children = getattr(obj, '_prefetched_children', None)
        if children is None:
            children = list(obj.children.all())
        serializer = DeliveryMergedMemberSerializer(children, many=True, context=self.context)
        return serializer.data

    def get_group_members_count(self, obj):
        children = getattr(obj, '_prefetched_children', None)
        if children is None:
            return 1 + obj.children.count()
        return 1 + len(children)

    def get_group_total_amount(self, obj):
        primary_r = self._get_receipt(obj)
        total = Decimal(str(primary_r.receipt_amount)) if primary_r and primary_r.receipt_amount else Decimal('0.00')
        children = getattr(obj, '_prefetched_children', None)
        if children is None:
            children = list(obj.children.all())
        receipts_map = self.context.get('receipts_by_member_id')
        for child in children:
            if receipts_map is not None:
                cr = receipts_map.get(child.member_id)
            else:
                cr = Receipt.objects.filter(
                    member_id=child.member_id,
                    practice__year=child.year,
                    practice__month=child.month,
                    practice__is_deleted=False
                ).first()
            if cr and cr.receipt_amount:
                total += Decimal(str(cr.receipt_amount))
        return str(total)

