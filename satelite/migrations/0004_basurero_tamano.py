# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('satelite', '0003_reporte_descartado'),
    ]

    operations = [
        migrations.AddField(
            model_name='basurero',
            name='tamano',
            field=models.FloatField(default=0),
            preserve_default=False,
        ),
    ]
