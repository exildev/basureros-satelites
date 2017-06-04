# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('satelite', '0009_remove_basurero_tamano'),
    ]

    operations = [
        migrations.AddField(
            model_name='basurero',
            name='tamano',
            field=models.FloatField(default=0),
            preserve_default=False,
        ),
    ]
