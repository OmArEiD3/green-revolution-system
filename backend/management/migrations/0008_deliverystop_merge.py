import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0007_deliverystop'),
    ]

    operations = [
        migrations.AddField(
            model_name='deliverystop',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='children', to='management.deliverystop', verbose_name='العضو الرئيسي / التابع له'),
        ),
    ]
