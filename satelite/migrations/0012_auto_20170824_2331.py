# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2017-08-24 23:31
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('satelite', '0011_auto_20170820_2122'),
    ]

    operations = [
        migrations.AlterField(
            model_name='reporte',
            name='fecha',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]