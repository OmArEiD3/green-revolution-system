import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0006_alter_member_street_number'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DeliveryStop',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.IntegerField(db_index=True, verbose_name='السنة')),
                ('month', models.IntegerField(choices=[(1, 'شهر 1'), (2, 'شهر 2'), (3, 'شهر 3'), (4, 'شهر 4'), (5, 'شهر 5'), (6, 'شهر 6'), (7, 'شهر 7'), (8, 'شهر 8'), (9, 'شهر 9'), (10, 'شهر 10'), (11, 'شهر 11'), (12, 'شهر 12')], db_index=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(12)], verbose_name='الشهر')),
                ('position', models.IntegerField(default=0, verbose_name='الترتيب في خط السير')),
                ('status', models.CharField(choices=[('PENDING', 'قيد التسليم'), ('DELIVERED', 'تم التسليم')], db_index=True, default='PENDING', max_length=20, verbose_name='حالة التسليم')),
                ('delivered_at', models.DateTimeField(blank=True, null=True, verbose_name='تاريخ ووقت التسليم')),
                ('receipt_synced', models.BooleanField(default=False, verbose_name='تم مزامنة حالة الإيصال')),
                ('notes', models.TextField(blank=True, verbose_name='ملاحظات')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاريخ التعديل')),
                ('delivered_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='delivered_stops', to=settings.AUTH_USER_MODEL, verbose_name='تم التسليم بواسطة')),
                ('member', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_stops', to='management.member', verbose_name='العضو')),
            ],
            options={
                'verbose_name': 'محطة خط السير',
                'verbose_name_plural': 'خط السير والتسليم',
                'ordering': ['position', 'id'],
                'unique_together': {('member', 'year', 'month')},
            },
        ),
    ]
