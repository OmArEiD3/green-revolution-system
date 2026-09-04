from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.db.models import Sum, Q

class Member(models.Model):
    STREET_CHOICES = [(i, f"شارع {i}") for i in range(1, 18)]

    full_name = models.CharField(max_length=255, verbose_name="الاسم بالكامل", db_index=True)
    mobile_number = models.CharField(max_length=20, verbose_name="رقم الموبايل", db_index=True)
    national_id = models.CharField(max_length=20, blank=True, verbose_name="الرقم القومي", db_index=True)
    street_number = models.IntegerField(
        choices=STREET_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(17)],
        verbose_name="رقم الشارع",
        db_index=True
    )
    has_guard = models.BooleanField(default=False, verbose_name="يوجد غفير")
    guard_name = models.CharField(max_length=255, blank=True, verbose_name="اسم الغفير")
    guard_mobile = models.CharField(max_length=20, blank=True, verbose_name="موبايل الغفير")
    is_active = models.BooleanField(default=True, verbose_name="نشط", db_index=True)
    is_deleted = models.BooleanField(default=False, verbose_name="مؤرشف / محذوف", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التعديل")

    class Meta:
        verbose_name = "عضو"
        verbose_name_plural = "الأعضاء"
        ordering = ['street_number', 'full_name']

    def __str__(self):
        return f"{self.full_name} (شارع {self.street_number})"

    def can_be_deleted(self):
        """Check if safe to hard delete or must be archived (soft-deleted)."""
        has_payments = self.payments.filter(is_voided=False).exists()
        has_practices = self.practices.filter(is_deleted=False).exists()
        return not (has_payments or has_practices)


class PracticeType(models.Model):
    name = models.CharField(max_length=100, verbose_name="نوع الممارسة")
    code = models.CharField(max_length=50, unique=True, verbose_name="كود الممارسة")
    is_active = models.BooleanField(default=True, verbose_name="مفعل")

    class Meta:
        verbose_name = "نوع ممارسة"
        verbose_name_plural = "أنواع الممارسات"

    def __str__(self):
        return self.name


class Practice(models.Model):
    MONTH_CHOICES = [(i, f"شهر {i}") for i in range(1, 13)]

    member = models.ForeignKey(Member, on_delete=models.PROTECT, related_name='practices', verbose_name="العضو")
    practice_type = models.ForeignKey(PracticeType, on_delete=models.PROTECT, related_name='practices', verbose_name="نوع الممارسة")
    year = models.IntegerField(verbose_name="السنة", db_index=True)
    month = models.IntegerField(choices=MONTH_CHOICES, validators=[MinValueValidator(1), MaxValueValidator(12)], verbose_name="الشهر", db_index=True)
    required_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="المبلغ المطلوب"
    )
    notes = models.TextField(blank=True, verbose_name="ملاحظات")
    is_deleted = models.BooleanField(default=False, verbose_name="محذوف", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التعديل")

    class Meta:
        verbose_name = "ممارسة شهرية"
        verbose_name_plural = "الممارسات الشهرية"
        ordering = ['-year', '-month', 'member__street_number', 'member__full_name']

    def __str__(self):
        return f"{self.member.full_name} - {self.practice_type.name} ({self.month}/{self.year}) - {self.required_amount} ج.م"

    @property
    def total_paid(self) -> Decimal:
        paid_sum = self.payments.filter(is_voided=False).aggregate(total=Sum('amount'))['total']
        return Decimal(paid_sum) if paid_sum is not None else Decimal('0.00')

    @property
    def remaining_amount(self) -> Decimal:
        rem = self.required_amount - self.total_paid
        return max(Decimal('0.00'), rem)

    @property
    def overpayment_amount(self) -> Decimal:
        over = self.total_paid - self.required_amount
        return max(Decimal('0.00'), over)

    @property
    def payment_status(self) -> str:
        if self.total_paid >= self.required_amount:
            return 'FULLY_PAID'
        return 'UNPAID'


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'نقدي (Cash)'),
        ('BANK_TRANSFER', 'تحويل بنكي / إلكتروني'),
        ('CHEQUE', 'شيك'),
        ('OTHER', 'أخرى'),
    ]

    practice = models.ForeignKey(Practice, on_delete=models.PROTECT, related_name='payments', verbose_name="الممارسة")
    member = models.ForeignKey(Member, on_delete=models.PROTECT, related_name='payments', verbose_name="العضو")
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="المبلغ المدفوع"
    )
    payment_date = models.DateField(default=timezone.now, verbose_name="تاريخ الدفع", db_index=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='CASH', verbose_name="طريقة الدفع")
    notes = models.TextField(blank=True, verbose_name="ملاحظات")
    is_voided = models.BooleanField(default=False, verbose_name="ملغى", db_index=True)
    void_reason = models.TextField(blank=True, verbose_name="سبب الإلغاء")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="سجل بواسطة")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التعديل")

    class Meta:
        verbose_name = "دفعة مالية"
        verbose_name_plural = "الدفعات المالية"
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"دفعة {self.amount} ج.م - {self.member.full_name} ({self.payment_date})"


class Receipt(models.Model):
    STATUS_CHOICES = [
        ('NOT_RECEIVED', 'لم تستلم من شركة الكهرباء'),
        ('RECEIVED', 'تم الاستلام من شركة الكهرباء'),
        ('DELIVERED', 'تم التسليم للعضو'),
    ]

    receipt_number = models.CharField(max_length=100, blank=True, verbose_name="رقم الإيصال", db_index=True)
    practice = models.OneToOneField(Practice, on_delete=models.PROTECT, related_name='receipt', verbose_name="الممارسة")
    member = models.ForeignKey(Member, on_delete=models.PROTECT, related_name='receipts', verbose_name="العضو")
    receipt_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="قيمة الإيصال")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_RECEIVED', verbose_name="حالة الإيصال", db_index=True)
    received_date = models.DateField(null=True, blank=True, verbose_name="تاريخ الاستلام من الكهرباء")
    delivery_date = models.DateField(null=True, blank=True, verbose_name="تاريخ التسليم للعضو")
    receipt_image = models.ImageField(upload_to='receipts/%Y/%m/', null=True, blank=True, verbose_name="صورة الإيصال")
    notes = models.TextField(blank=True, verbose_name="ملاحظات")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التعديل")

    class Meta:
        verbose_name = "إيصال"
        verbose_name_plural = "الإيصالات"
        ordering = ['-practice__year', '-practice__month', 'member__street_number']

    def __str__(self):
        return f"إيصال {self.member.full_name} - شهر {self.practice.month}/{self.practice.year} - {self.receipt_amount} ج.م"

    def save(self, *args, **kwargs):
        # Enforce business rule: receipt_amount must strictly equal practice required amount
        if self.practice:
            self.receipt_amount = self.practice.required_amount
            self.member = self.practice.member
        super().save(*args, **kwargs)


class Expense(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'نقدي (Cash)'),
        ('BANK_TRANSFER', 'تحويل بنكي / إلكتروني'),
        ('OTHER', 'أخرى'),
    ]

    title = models.CharField(max_length=255, verbose_name="اسم / بيان المصروف", db_index=True)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="القيمة"
    )
    expense_date = models.DateField(default=timezone.now, verbose_name="تاريخ المصروف", db_index=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='CASH', verbose_name="طريقة الدفع")
    description = models.TextField(blank=True, verbose_name="الوصف والتفاصيل")
    document_image = models.ImageField(upload_to='expenses/%Y/%m/', null=True, blank=True, verbose_name="صورة المستند / الفاتورة")
    is_deleted = models.BooleanField(default=False, verbose_name="محذوف", db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="سجل بواسطة")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التعديل")

    class Meta:
        verbose_name = "مصروف"
        verbose_name_plural = "المصروفات"
        ordering = ['-expense_date', '-created_at']

    def __str__(self):
        return f"{self.title} - {self.amount} ج.م ({self.expense_date})"


class FinancialTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('PRACTICE_COLLECTION', 'تحصيل ممارسة'),
        ('OVERPAYMENT', 'مبلغ زائد'),
        ('EXPENSE', 'مصروفات'),
        ('REFUND', 'استرداد مالي'),
        ('ADJUSTMENT', 'تسوية مالية'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'نقدي'),
        ('BANK_TRANSFER', 'تحويل بنكي / إلكتروني'),
        ('CHEQUE', 'شيك'),
        ('OTHER', 'أخرى'),
    ]

    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPE_CHOICES, verbose_name="نوع المعاملة", db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="المبلغ")
    transaction_date = models.DateField(default=timezone.now, verbose_name="تاريخ المعاملة", db_index=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='CASH', verbose_name="طريقة الدفع")
    member = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name='financial_transactions', verbose_name="العضو")
    practice = models.ForeignKey(Practice, on_delete=models.SET_NULL, null=True, blank=True, related_name='financial_transactions', verbose_name="الممارسة")
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='financial_transactions', verbose_name="الدفعة المرتبطة")
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True, related_name='financial_transactions', verbose_name="المصروف المرتبط")
    source_payer_name = models.CharField(max_length=255, blank=True, verbose_name="اسم المصدر / الدافع (إذا لم يكن عضواً)")
    description = models.TextField(blank=True, verbose_name="البيان / الوصف")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="المستخدم")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التعديل")

    class Meta:
        verbose_name = "معاملة مالية"
        verbose_name_plural = "دفتر الأستاذ المالي (Ledger)"
        ordering = ['-transaction_date', '-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount} ج.م ({self.transaction_date})"


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="المستخدم")
    action = models.CharField(max_length=100, verbose_name="نوع الإجراء", db_index=True)
    entity_name = models.CharField(max_length=50, verbose_name="الكيان")
    entity_id = models.IntegerField(null=True, blank=True, verbose_name="معرف الكيان")
    old_values = models.JSONField(null=True, blank=True, verbose_name="القيم السابقة")
    new_values = models.JSONField(null=True, blank=True, verbose_name="القيم الجديدة")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="عنوان IP")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="وقت العملية", db_index=True)

    class Meta:
        verbose_name = "سجل النشاط والرقابة"
        verbose_name_plural = "سجلات النشاط والرقابة (Audit Logs)"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} on {self.entity_name} #{self.entity_id} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"
