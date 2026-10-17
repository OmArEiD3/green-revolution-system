from decimal import Decimal
import json
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from management.models import (
    Member, PracticeType, Practice, Payment, Receipt, Expense,
    FinancialTransaction, DeliveryStop, AuditLog
)
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


class DeliveryRouteFeatureTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='admin_test')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.pt_main = PracticeType.objects.create(name="كهرباء", code="ELEC")

        self.member1 = Member.objects.create(
            full_name="أحمد حسن",
            mobile_number="01011111111",
            street_number=7,
            member_type='RESIDENTIAL',
            has_guard=True,
            guard_name="محمود حارس",
            guard_mobile="01198765432",
            guard_mobile_2="01298765432",
            latitude=Decimal('30.0444200'),
            longitude=Decimal('31.2357100')
        )
        self.member2 = Member.objects.create(
            full_name="سيد متولي",
            mobile_number="01022222222",
            street_number=12,
            member_type='COMMERCIAL',
            has_guard=True,
            guard_name="محمود حارس",
            guard_mobile="011-9876-5432"
        )
        self.member3 = Member.objects.create(
            full_name="كريم عادل",
            mobile_number="01033333333",
            street_number=5,
            member_type='RESIDENTIAL',
            has_guard=False
        )

    def test_add_and_duplicate_prevention(self):
        """1. Add stop and prevent duplicates in the same month"""
        res = self.client.post('/api/delivery-stops/', {
            'member': self.member1.id,
            'year': 2026,
            'month': 10
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['position'], 1)

        # Duplicate attempt
        res_dup = self.client.post('/api/delivery-stops/', {
            'member': self.member1.id,
            'year': 2026,
            'month': 10
        })
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn('العضو مضاف بالفعل', str(res_dup.data))

    def test_add_at_position_and_renumber(self):
        """2. Add stop at specific position shifts subsequent stops"""
        self.client.post('/api/delivery-stops/', {'member': self.member1.id, 'year': 2026, 'month': 10})
        self.client.post('/api/delivery-stops/', {'member': self.member2.id, 'year': 2026, 'month': 10})

        res = self.client.post('/api/delivery-stops/', {
            'member': self.member3.id,
            'year': 2026,
            'month': 10,
            'position': 1
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['position'], 1)

        s1 = DeliveryStop.objects.get(member=self.member1, year=2026, month=10)
        s2 = DeliveryStop.objects.get(member=self.member2, year=2026, month=10)
        s3 = DeliveryStop.objects.get(member=self.member3, year=2026, month=10)
        self.assertEqual(s3.position, 1)
        self.assertEqual(s1.position, 2)
        self.assertEqual(s2.position, 3)

    def test_location_and_guard_serializer_fields(self):
        """3. Stop returns member location, guard information, and receipt data"""
        p = Practice.objects.create(member=self.member1, practice_type=self.pt_main, year=2026, month=10, required_amount=Decimal('500.00'))
        r = FinancialService.ensure_practice_receipt(p)
        r.receipt_number = "REC-999"
        r.status = "RECEIVED"
        r.save()

        res = self.client.post('/api/delivery-stops/', {'member': self.member1.id, 'year': 2026, 'month': 10})
        self.assertEqual(res.status_code, 201)
        data = res.data
        self.assertEqual(data['member_name'], "أحمد حسن")
        self.assertEqual(data['guard_name'], "محمود حارس")
        self.assertEqual(data['guard_mobile'], "01198765432")
        self.assertEqual(data['guard_mobile_2'], "01298765432")
        self.assertEqual(Decimal(str(data['latitude'])), Decimal('30.0444200'))
        self.assertEqual(Decimal(str(data['longitude'])), Decimal('31.2357100'))
        self.assertEqual(data['receipt_number'], "REC-999")
        self.assertEqual(Decimal(data['receipt_amount']), Decimal('500.00'))
        self.assertEqual(data['receipt_status'], "RECEIVED")

    def test_deliver_and_renumber(self):
        """4. Deliver stop marks status DELIVERED and renumbers remaining pending stops"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=2)
        s3 = DeliveryStop.objects.create(member=self.member3, year=2026, month=10, position=3)

        res = self.client.post(f'/api/delivery-stops/{s1.id}/deliver/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'DELIVERED')
        self.assertIsNotNone(res.data['delivered_at'])

        s2.refresh_from_db()
        s3.refresh_from_db()
        self.assertEqual(s2.position, 1)
        self.assertEqual(s3.position, 2)

    def test_undo_delivery_moves_to_end(self):
        """5. Undo delivery returns stop to PENDING at the END of the route"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1, status='DELIVERED')
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=1, status='PENDING')
        s3 = DeliveryStop.objects.create(member=self.member3, year=2026, month=10, position=2, status='PENDING')

        res = self.client.post(f'/api/delivery-stops/{s1.id}/undo_delivery/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'PENDING')
        s1.refresh_from_db()
        self.assertEqual(s1.position, 3)

    def test_reorder_and_move(self):
        """6. Reorder and move stops top/up/down/bottom/position"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=2)
        s3 = DeliveryStop.objects.create(member=self.member3, year=2026, month=10, position=3)

        res = self.client.post('/api/delivery-stops/reorder/', {'ids': [s3.id, s1.id, s2.id]})
        self.assertEqual(res.status_code, 200)
        s3.refresh_from_db()
        s1.refresh_from_db()
        s2.refresh_from_db()
        self.assertEqual(s3.position, 1)
        self.assertEqual(s1.position, 2)
        self.assertEqual(s2.position, 3)

        res_move = self.client.post(f'/api/delivery-stops/{s2.id}/move/', {'to': 'top'})
        self.assertEqual(res_move.status_code, 200)
        s2.refresh_from_db()
        s3.refresh_from_db()
        s1.refresh_from_db()
        self.assertEqual(s2.position, 1)
        self.assertEqual(s3.position, 2)
        self.assertEqual(s1.position, 3)

    def test_search_and_filter(self):
        """7. Search by member/guard/phone and filter by street/type"""
        DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=2)

        res_search = self.client.get('/api/delivery-stops/?year=2026&month=10&search=محمود')
        self.assertEqual(res_search.status_code, 200)
        self.assertEqual(len(res_search.data), 2)

        res_street = self.client.get('/api/delivery-stops/?year=2026&month=10&street=7')
        self.assertEqual(len(res_street.data), 1)
        self.assertEqual(res_street.data[0]['member'], self.member1.id)

        res_type = self.client.get('/api/delivery-stops/?year=2026&month=10&member_type=COMMERCIAL')
        self.assertEqual(len(res_type.data), 1)
        self.assertEqual(res_type.data[0]['member'], self.member2.id)

    def test_delete_stop(self):
        """8. Deleting a stop from route preserves Member and renumbers remaining stops"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=2)

        res = self.client.delete(f'/api/delivery-stops/{s1.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertTrue(Member.objects.filter(id=self.member1.id).exists())
        s2.refresh_from_db()
        self.assertEqual(s2.position, 1)

    def test_bulk_add_receipts_and_all(self):
        """9. Bulk add from receipts and all active members"""
        p = Practice.objects.create(member=self.member1, practice_type=self.pt_main, year=2026, month=10, required_amount=Decimal('400.00'))
        r = FinancialService.ensure_practice_receipt(p)
        r.status = 'RECEIVED'
        r.save()

        res_rec = self.client.post('/api/delivery-stops/bulk_add/', {'year': 2026, 'month': 10, 'source': 'receipts'})
        self.assertEqual(res_rec.status_code, 201)
        self.assertEqual(res_rec.data['added_count'], 1)

        res_all = self.client.post('/api/delivery-stops/bulk_add/', {'year': 2026, 'month': 10, 'source': 'all'})
        self.assertEqual(res_all.status_code, 201)
        self.assertEqual(res_all.data['added_count'], 2)
        self.assertEqual(DeliveryStop.objects.filter(year=2026, month=10).count(), 3)

    def test_receipt_sync_on_delivery(self):
        """10. Delivering stop transitions RECEIVED receipt to DELIVERED and undo restores it"""
        p = Practice.objects.create(member=self.member1, practice_type=self.pt_main, year=2026, month=10, required_amount=Decimal('550.00'))
        r = FinancialService.ensure_practice_receipt(p)
        r.status = 'RECEIVED'
        r.save()

        stop = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)

        res = self.client.post(f'/api/delivery-stops/{stop.id}/deliver/', {'sync_receipt': True})
        self.assertEqual(res.status_code, 200)
        stop.refresh_from_db()
        r.refresh_from_db()
        self.assertTrue(stop.receipt_synced)
        self.assertEqual(r.status, 'DELIVERED')
        self.assertIsNotNone(r.delivery_date)
        self.assertTrue(AuditLog.objects.filter(action='RECEIPT_DELIVERED_VIA_ROUTE', entity_id=r.id).exists())

        res_undo = self.client.post(f'/api/delivery-stops/{stop.id}/undo_delivery/')
        self.assertEqual(res_undo.status_code, 200)
        stop.refresh_from_db()
        r.refresh_from_db()
        self.assertFalse(stop.receipt_synced)
        self.assertEqual(r.status, 'RECEIVED')
        self.assertIsNone(r.delivery_date)
        self.assertTrue(AuditLog.objects.filter(action='RECEIPT_UNDELIVERED_VIA_ROUTE', entity_id=r.id).exists())

    def test_receipt_sync_disabled(self):
        """11. Delivering stop with sync_receipt=False does not touch receipt"""
        p = Practice.objects.create(member=self.member1, practice_type=self.pt_main, year=2026, month=10, required_amount=Decimal('550.00'))
        r = FinancialService.ensure_practice_receipt(p)
        r.status = 'RECEIVED'
        r.save()

        stop = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        res = self.client.post(f'/api/delivery-stops/{stop.id}/deliver/', {'sync_receipt': False})
        self.assertEqual(res.status_code, 200)
        stop.refresh_from_db()
        r.refresh_from_db()
        self.assertFalse(stop.receipt_synced)
        self.assertEqual(r.status, 'RECEIVED')

    def test_merge_and_hide_merged(self):
        """12. Merged members get position=0 and are hidden from list unless flat=1"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=2)

        res_merge = self.client.post(f'/api/delivery-stops/{s1.id}/merge/', {'stop_ids': [s2.id]})
        self.assertEqual(res_merge.status_code, 200)
        s2.refresh_from_db()
        self.assertEqual(s2.parent, s1)
        self.assertEqual(s2.position, 0)

        res_list = self.client.get('/api/delivery-stops/?year=2026&month=10')
        self.assertEqual(len(res_list.data), 1)
        self.assertEqual(res_list.data[0]['id'], s1.id)
        self.assertEqual(res_list.data[0]['group_members_count'], 2)
        self.assertEqual(len(res_list.data[0]['merged']), 1)
        self.assertEqual(res_list.data[0]['merged'][0]['id'], s2.id)

        res_flat = self.client.get('/api/delivery-stops/?year=2026&month=10&flat=1')
        self.assertEqual(len(res_flat.data), 2)

    def test_group_delivery_and_undo(self):
        """13. Delivering primary delivers whole group and undo reverts all members"""
        p1 = Practice.objects.create(member=self.member1, practice_type=self.pt_main, year=2026, month=10, required_amount=Decimal('300.00'))
        r1 = FinancialService.ensure_practice_receipt(p1)
        r1.status = 'RECEIVED'
        r1.save()

        p2 = Practice.objects.create(member=self.member2, practice_type=self.pt_main, year=2026, month=10, required_amount=Decimal('200.00'))
        r2 = FinancialService.ensure_practice_receipt(p2)
        r2.status = 'RECEIVED'
        r2.save()

        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=0, parent=s1)

        res = self.client.post(f'/api/delivery-stops/{s1.id}/deliver/', {'sync_receipt': True})
        self.assertEqual(res.status_code, 200)
        s1.refresh_from_db()
        s2.refresh_from_db()
        r1.refresh_from_db()
        r2.refresh_from_db()
        self.assertEqual(s1.status, 'DELIVERED')
        self.assertEqual(s2.status, 'DELIVERED')
        self.assertEqual(r1.status, 'DELIVERED')
        self.assertEqual(r2.status, 'DELIVERED')

        res_undo = self.client.post(f'/api/delivery-stops/{s1.id}/undo_delivery/')
        self.assertEqual(res_undo.status_code, 200)
        s1.refresh_from_db()
        s2.refresh_from_db()
        r1.refresh_from_db()
        r2.refresh_from_db()
        self.assertEqual(s1.status, 'PENDING')
        self.assertEqual(s2.status, 'PENDING')
        self.assertEqual(r1.status, 'RECEIVED')
        self.assertEqual(r2.status, 'RECEIVED')

    def test_reject_direct_delivery_of_merged_child(self):
        """14. Direct deliver on merged child is rejected with 400"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=0, parent=s1)

        res = self.client.post(f'/api/delivery-stops/{s2.id}/deliver/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('مرفوض', res.data['error'])

    def test_unmerge_stop(self):
        """15. Unmerging member places it right after the primary stop"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=0, parent=s1)
        s3 = DeliveryStop.objects.create(member=self.member3, year=2026, month=10, position=2)

        res = self.client.post(f'/api/delivery-stops/{s1.id}/unmerge/', {'child_id': s2.id})
        self.assertEqual(res.status_code, 200)
        s1.refresh_from_db()
        s2.refresh_from_db()
        s3.refresh_from_db()
        self.assertIsNone(s2.parent)
        self.assertEqual(s1.position, 1)
        self.assertEqual(s2.position, 2)
        self.assertEqual(s3.position, 3)

    def test_make_primary(self):
        """16. Make primary switches role of primary and child, preserving position"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=0, parent=s1)

        res = self.client.post(f'/api/delivery-stops/{s1.id}/make_primary/', {'new_primary_id': s2.id})
        self.assertEqual(res.status_code, 200)
        s1.refresh_from_db()
        s2.refresh_from_db()
        self.assertIsNone(s2.parent)
        self.assertEqual(s2.position, 1)
        self.assertEqual(s1.parent, s2)
        self.assertEqual(s1.position, 0)

    def test_delete_primary_promotes_child(self):
        """17. Deleting primary stop promotes first child to primary with same position"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=0, parent=s1)
        s3 = DeliveryStop.objects.create(member=self.member3, year=2026, month=10, position=0, parent=s1)

        res = self.client.delete(f'/api/delivery-stops/{s1.id}/')
        self.assertEqual(res.status_code, 204)
        s2.refresh_from_db()
        s3.refresh_from_db()
        self.assertIsNone(s2.parent)
        self.assertEqual(s2.position, 1)
        self.assertEqual(s3.parent, s2)
        self.assertEqual(s3.position, 0)

    def test_auto_merge_guard_dry_run_and_execution(self):
        """18. Auto merge by guard phone: dry_run preview then real execution"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=2)

        res_dry = self.client.post('/api/delivery-stops/auto_merge_guard/', {'year': 2026, 'month': 10, 'dry_run': True})
        self.assertEqual(res_dry.status_code, 200)
        self.assertTrue(res_dry.data['dry_run'])
        self.assertEqual(res_dry.data['groups_count'], 1)
        self.assertEqual(res_dry.data['members_count'], 2)
        s2.refresh_from_db()
        self.assertIsNone(s2.parent)

        res_exec = self.client.post('/api/delivery-stops/auto_merge_guard/', {'year': 2026, 'month': 10, 'dry_run': False})
        self.assertEqual(res_exec.status_code, 200)
        self.assertFalse(res_exec.data['dry_run'])
        s2.refresh_from_db()
        self.assertEqual(s2.parent, s1)
        self.assertEqual(s2.position, 0)

    def test_delete_member_cascades_route_stops(self):
        """19. Deleting member cascades delivery stops cleanly without ProtectError"""
        new_member = Member.objects.create(full_name="عضو تجريبي للحذف", street_number=1)
        stop = DeliveryStop.objects.create(member=new_member, year=2026, month=10, position=1)

        res = self.client.delete(f'/api/members/{new_member.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(DeliveryStop.objects.filter(id=stop.id).exists())

    def test_backup_restore_cycle_with_delivery_stops(self):
        """20. Backup export and restore cycle preserves route stops and merge hierarchy"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=0, parent=s1)

        export_res = self.client.get('/api/reports/backup_export/')
        self.assertEqual(export_res.status_code, 200)
        backup_bytes = export_res.content

        inspect_file = SimpleUploadedFile("backup.json", backup_bytes, content_type="application/json")
        inspect_res = self.client.post('/api/reports/backup_inspect/', {'backup_file': inspect_file}, format='multipart')
        self.assertEqual(inspect_res.status_code, 200)
        self.assertEqual(inspect_res.data['counts']['delivery_stops'], 2)

        restore_file = SimpleUploadedFile("backup.json", backup_bytes, content_type="application/json")
        restore_res = self.client.post('/api/reports/backup_restore/', {
            'backup_file': restore_file,
            'confirm_phrase': 'نعم متأكد'
        }, format='multipart')
        self.assertEqual(restore_res.status_code, 200)

        restored_s1 = DeliveryStop.objects.get(member=self.member1, year=2026, month=10)
        restored_s2 = DeliveryStop.objects.get(member=self.member2, year=2026, month=10)
        self.assertIsNone(restored_s1.parent)
        self.assertEqual(restored_s1.position, 1)
        self.assertEqual(restored_s2.parent_id, restored_s1.id)
        self.assertEqual(restored_s2.position, 0)

    def test_authentication_required(self):
        """21. Unauthenticated requests to delivery-stops are rejected"""
        anon_client = APIClient()
        res = anon_client.get('/api/delivery-stops/')
        self.assertIn(res.status_code, [401, 403])

    def test_route_template_save_and_apply(self):
        """22. Route templates can be saved from active route and applied to target month"""
        s1 = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)
        s2 = DeliveryStop.objects.create(member=self.member2, year=2026, month=10, position=0, parent=s1)

        # Save template
        save_res = self.client.post('/api/delivery-stops/save_template/', {
            'year': 2026,
            'month': 10,
            'name': 'خط سير المعدات التجريبي'
        })
        self.assertEqual(save_res.status_code, 201)
        tpl_id = save_res.data['id']

        # List templates
        list_res = self.client.get('/api/delivery-stops/templates/')
        self.assertEqual(list_res.status_code, 200)
        self.assertTrue(any(t['id'] == tpl_id for t in list_res.data))

        # Apply to month 11
        apply_res = self.client.post('/api/delivery-stops/apply_template/', {
            'year': 2026,
            'month': 11,
            'template_id': tpl_id
        })
        self.assertEqual(apply_res.status_code, 200)

        s1_nov = DeliveryStop.objects.get(member=self.member1, year=2026, month=11)
        s2_nov = DeliveryStop.objects.get(member=self.member2, year=2026, month=11)
        self.assertEqual(s1_nov.position, 1)
        self.assertEqual(s2_nov.parent_id, s1_nov.id)

    def test_bidirectional_receipt_delivery_sync(self):
        """23. Delivering a receipt directly in ReceiptsView marks DeliveryStop DELIVERED"""
        p1 = Practice.objects.create(member=self.member1, practice_type=self.pt_main, year=2026, month=10, required_amount=Decimal('350.00'))
        r1 = FinancialService.ensure_practice_receipt(p1)
        r1.status = 'RECEIVED'
        r1.save()

        stop = DeliveryStop.objects.create(member=self.member1, year=2026, month=10, position=1)

        # Mark delivered via receipt endpoint
        res = self.client.post(f'/api/receipts/{r1.id}/mark_delivered/')
        self.assertEqual(res.status_code, 200)

        stop.refresh_from_db()
        self.assertEqual(stop.status, 'DELIVERED')
        self.assertTrue(stop.receipt_synced)



