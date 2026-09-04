from decimal import Decimal
from rest_framework import serializers
from .models import (
    Member, PracticeType, Practice, Payment, Receipt,
    Expense, FinancialTransaction, AuditLog
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
    practices_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Member
        fields = [
            'id', 'full_name', 'mobile_number', 'national_id',
            'street_number', 'has_guard', 'guard_name', 'guard_mobile',
            'is_active', 'is_deleted', 'practices_count', 'created_at', 'updated_at'
        ]

    def validate_street_number(self, value):
        if value < 1 or value > 17:
            raise serializers.ValidationError("رقم الشارع يجب أن يكون بين 1 و 17")
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
