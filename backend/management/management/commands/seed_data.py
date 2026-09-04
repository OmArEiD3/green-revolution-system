from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from management.models import Member, PracticeType, Practice, Expense
from management.services import FinancialService

class Command(BaseCommand):
    help = "Seed initial data for Green Revolution Management System (الثورة الخضراء)"

    def handle(self, *args, **options):
        self.stdout.write("Starting data seeding...")

        # 1. Superuser Engineer
        user, created = User.objects.get_or_create(
            username='engineer',
            defaults={
                'first_name': 'مهندس المنطقة',
                'email': 'engineer@thawra.local',
                'is_staff': True,
                'is_superuser': True
            }
        )
        user.set_password('admin123')
        user.save()
        self.stdout.write(self.style.SUCCESS("[OK] Engineer account: username=engineer, password=admin123"))

        # 2. Practice Types
        pt_main, _ = PracticeType.objects.get_or_create(
            code="ELECTRICITY_MAIN",
            defaults={"name": "ممارسة كهرباء أساسية", "is_active": True}
        )
        pt_extra, _ = PracticeType.objects.get_or_create(
            code="ELECTRICITY_EXTRA",
            defaults={"name": "ممارسة إنارة وطلمبة إضافية", "is_active": True}
        )
        pt_water, _ = PracticeType.objects.get_or_create(
            code="WATER_PRACTICE",
            defaults={"name": "ممارسة مياه وخدمات", "is_active": True}
        )
        self.stdout.write(self.style.SUCCESS("[OK] Created Practice Types"))

        # 3. Seed Sample Members across Streets 1 to 17
        sample_members_data = [
            # Street 1
            ("د. طارق العوضي", "01011112233", "28001011234501", 1, True, "صابر السيد", "01122223344"),
            ("م. حسام الدين حسن", "01022223344", "28502021234502", 1, False, "", ""),
            ("الحاج مصطفى كامل", "01033334455", "27503031234503", 1, True, "عوضين مرسي", "01233334455"),
            # Street 2
            ("أ. يحيى زكريا رضوان", "01044445566", "29004041234504", 2, True, "فرج نصر", "01144445566"),
            ("د. سمير إبراهيم خليل", "01055556677", "28205051234505", 2, False, "", ""),
            # Street 3
            ("م. عادل الشناوي", "01066667788", "27906061234506", 3, True, "سليمان جمعة", "01255556677"),
            ("المهندسة نادية محفوظ", "01077778899", "28807071234507", 3, False, "", ""),
            # Street 4
            ("أ. وائل الصيرفي", "01088889900", "29108081234508", 4, True, "مبروك عثمان", "01166667788"),
            # Street 5
            ("د. محمد بهاء الدين", "01099990011", "28309091234509", 5, True, "عنتر شعبان", "01277778899"),
            ("أ. خالد عبد العزيز", "01010101010", "28610101234510", 5, False, "", ""),
            # Street 6
            ("م. أشرف عبد المنعم", "01020202020", "27811111234511", 6, True, "مسعد سالم", "01188889900"),
            # Street 7 (Active focus)
            ("أحمد محمد السيد", "01012345678", "29001011234567", 7, True, "محمود أحمد", "01198765432"),
            ("م. إيهاب عبد الحميد", "01030303030", "28412121234512", 7, True, "محمود أحمد", "01198765432"),
            ("د. هاني شاكر زكي", "01040404040", "28101011234513", 7, False, "", ""),
            # Street 8
            ("أ. شريف البنداري", "01050505050", "29202021234514", 8, True, "رمضان عبد الستار", "01299990011"),
            # Street 9
            ("م. أيمن الجوهري", "01060606060", "28703031234515", 9, False, "", ""),
            # Street 10
            ("د. معتز الملاح", "01070707070", "28004041234516", 10, True, "فراج حنفي", "01110101010"),
            # Street 11
            ("أ. حازم ممدوح", "01080808080", "28905051234517", 11, False, "", ""),
            # Street 12
            ("م. مدحت قنديل", "01090909090", "27606061234518", 12, True, "شحاتة برعي", "01220202020"),
            # Street 13
            ("د. ياسر المنشاوي", "01013131313", "28507071234519", 13, False, "", ""),
            # Street 14
            ("أ. سامح عبد الفتاح", "01014141414", "29308081234520", 14, True, "حمدي رزق", "01130303030"),
            # Street 15
            ("م. عمرو السعيد", "01015151515", "28809091234521", 15, False, "", ""),
            # Street 16
            ("د. مجدي الجمل", "01016161616", "27710101234522", 16, True, "عرفة ربيع", "01240404040"),
            # Street 17
            ("أ. أسامة هلال", "01017171717", "29111111234523", 17, True, "بسيوني هنداوي", "01150505050"),
        ]

        created_members = []
        for name, mobile, nid, street, has_g, g_name, g_mobile in sample_members_data:
            m, _ = Member.objects.get_or_create(
                mobile_number=mobile,
                defaults={
                    'full_name': name,
                    'national_id': nid,
                    'street_number': street,
                    'has_guard': has_g,
                    'guard_name': g_name,
                    'guard_mobile': g_mobile,
                    'is_active': True
                }
            )
            created_members.append(m)

        self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(created_members)} members across Streets 1 to 17"))

        # 4. Seed Practices for September 2026 and August 2026
        cur_year, cur_month = 2026, 9
        for m in created_members:
            p, _ = Practice.objects.get_or_create(
                member=m,
                practice_type=pt_main,
                year=cur_year,
                month=cur_month,
                defaults={'required_amount': Decimal('560.00')}
            )
            FinancialService.ensure_practice_receipt(p)

        # Extra practice for Street 7 member (Ahmed Mohamed) to showcase multiple practices
        ahmed = Member.objects.filter(full_name="أحمد محمد السيد").first()
        if ahmed:
            p_extra, _ = Practice.objects.get_or_create(
                member=ahmed,
                practice_type=pt_extra,
                year=cur_year,
                month=cur_month,
                defaults={'required_amount': Decimal('300.00')}
            )
            FinancialService.ensure_practice_receipt(p_extra)

        self.stdout.write(self.style.SUCCESS("[OK] Created Practices for Month 9/2026"))

        # 5. Record Sample Payments showcasing Fully Paid, Partially Paid, and Overpayment
        # A: Fully Paid + Overpayment for Ahmed Mohamed (600 on 560 practice -> 40 overpayment)
        ahmed_main_p = Practice.objects.filter(member=ahmed, practice_type=pt_main, year=cur_year, month=cur_month).first()
        if ahmed_main_p and ahmed_main_p.payments.count() == 0:
            FinancialService.record_payment(
                practice_id=ahmed_main_p.id,
                amount=Decimal('600.00'),
                payment_method='CASH',
                notes='تحصيل كاش بالزيادة 40 ج.م'
            )
            # Mark receipt as delivered
            ahmed_main_p.receipt.status = 'DELIVERED'
            ahmed_main_p.receipt.delivery_date = timezone.now().date()
            ahmed_main_p.receipt.save()

        # B: Partially Paid for Member in Street 1
        m_tarek = Member.objects.filter(street_number=1).first()
        if m_tarek:
            p_tarek = Practice.objects.filter(member=m_tarek, year=cur_year, month=cur_month).first()
            if p_tarek and p_tarek.payments.count() == 0:
                FinancialService.record_payment(
                    practice_id=p_tarek.id,
                    amount=Decimal('300.00'),
                    payment_method='BANK_TRANSFER',
                    notes='دفعة أولى فودافون كاش'
                )
                p_tarek.receipt.status = 'RECEIVED'
                p_tarek.receipt.received_date = timezone.now().date()
                p_tarek.receipt.save()

        # C: Fully Paid for Member in Street 2
        m_yahia = Member.objects.filter(street_number=2).first()
        if m_yahia:
            p_yahia = Practice.objects.filter(member=m_yahia, year=cur_year, month=cur_month).first()
            if p_yahia and p_yahia.payments.count() == 0:
                FinancialService.record_payment(
                    practice_id=p_yahia.id,
                    amount=Decimal('560.00'),
                    payment_method='CASH'
                )

        # 6. Sample Expenses
        if Expense.objects.count() == 0:
            FinancialService.record_expense(
                title="بنزين ومواصلات متابعة ميدانية بالمنطقة",
                amount=Decimal('250.00'),
                payment_method='CASH',
                description='زيارة تفقدية للشوارع 1 إلى 17 والتحصيل الميداني'
            )
            FinancialService.record_expense(
                title="صيانة لوحة الكهرباء الرئيسية لشارع 7",
                amount=Decimal('850.00'),
                payment_method='CASH',
                description='تغيير قاطع وفيوزات ومستلزمات فنية'
            )

        self.stdout.write(self.style.SUCCESS("[OK] Seeded initial data, expenses, and ledger transactions successfully!"))
