from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuthViewSet, MemberViewSet, PracticeTypeViewSet, PracticeViewSet,
    PaymentViewSet, ReceiptViewSet, ExpenseViewSet, FinancialTransactionViewSet,
    AuditLogViewSet, ReportViewSet
)

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'members', MemberViewSet, basename='members')
router.register(r'practice-types', PracticeTypeViewSet, basename='practice-types')
router.register(r'practices', PracticeViewSet, basename='practices')
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'receipts', ReceiptViewSet, basename='receipts')
router.register(r'expenses', ExpenseViewSet, basename='expenses')
router.register(r'financial-transactions', FinancialTransactionViewSet, basename='financial-transactions')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'reports', ReportViewSet, basename='reports')

urlpatterns = [
    path('', include(router.urls)),
]
