from django.contrib import admin
from .models import (
    Member, PracticeType, Practice, Payment, Receipt,
    Expense, FinancialTransaction, AuditLog
)


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'mobile_number', 'street_number', 'is_active', 'is_deleted')
    list_filter = ('street_number', 'is_active', 'is_deleted', 'has_guard')
    search_fields = ('full_name', 'mobile_number', 'national_id')


@admin.register(PracticeType)
class PracticeTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active')
    search_fields = ('name', 'code')


@admin.register(Practice)
class PracticeAdmin(admin.ModelAdmin):
    list_display = ('member', 'practice_type', 'year', 'month', 'required_amount', 'payment_status')
    list_filter = ('year', 'month', 'practice_type', 'is_deleted')
    search_fields = ('member__full_name', 'member__mobile_number')
    autocomplete_fields = ('member', 'practice_type')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('member', 'practice', 'amount', 'payment_date', 'payment_method', 'is_voided')
    list_filter = ('payment_method', 'is_voided', 'payment_date')
    search_fields = ('member__full_name', 'member__mobile_number')
    autocomplete_fields = ('member', 'practice')


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('member', 'practice', 'receipt_amount', 'status', 'received_date', 'delivery_date')
    list_filter = ('status',)
    search_fields = ('member__full_name', 'receipt_number')
    autocomplete_fields = ('member', 'practice')


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('title', 'amount', 'expense_date', 'payment_method', 'is_deleted')
    list_filter = ('payment_method', 'is_deleted')
    search_fields = ('title', 'description')


@admin.register(FinancialTransaction)
class FinancialTransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_type', 'amount', 'transaction_date', 'member', 'payment_method')
    list_filter = ('transaction_type', 'payment_method', 'transaction_date')
    search_fields = ('member__full_name', 'description', 'source_payer_name')
    autocomplete_fields = ('member', 'practice', 'payment', 'expense')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'entity_name', 'entity_id', 'user', 'created_at')
    list_filter = ('action', 'entity_name')
    search_fields = ('entity_name', 'action')
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
