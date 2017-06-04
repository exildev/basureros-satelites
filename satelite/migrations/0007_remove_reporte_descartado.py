# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('satelite', '0006_reporte_descartado'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='reporte',
            name='descartado',
        ),
    ]
