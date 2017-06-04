# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('satelite', '0007_remove_reporte_descartado'),
    ]

    operations = [
        migrations.AddField(
            model_name='reporte',
            name='descartado',
            field=models.NullBooleanField(default=None),
        ),
    ]
