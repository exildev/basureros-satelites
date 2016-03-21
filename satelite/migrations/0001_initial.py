# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Basurero',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('nombre', models.CharField(max_length=50)),
                ('descripcion', models.TextField()),
                ('fecha', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Basurero',
                'verbose_name_plural': 'Basureros',
            },
        ),
        migrations.CreateModel(
            name='GPS',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('latitude', models.CharField(max_length=50)),
                ('longitude', models.CharField(max_length=50)),
            ],
            options={
                'verbose_name': 'GPS',
                'verbose_name_plural': "GPS's",
            },
        ),
        migrations.CreateModel(
            name='Imagen',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('imagen', models.FileField(upload_to=b'media')),
            ],
            options={
                'verbose_name': 'Imagen',
                'verbose_name_plural': 'Im\xe1genes',
            },
        ),
        migrations.CreateModel(
            name='Reporte',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('descartado', models.NullBooleanField(default=None)),
                ('basurero', models.ForeignKey(blank=True, to='satelite.Basurero', null=True)),
                ('gps', models.OneToOneField(to='satelite.GPS')),
            ],
            options={
                'verbose_name': 'Reporte',
                'verbose_name_plural': 'Reportes',
            },
        ),
        migrations.AddField(
            model_name='imagen',
            name='reporte',
            field=models.ForeignKey(to='satelite.Reporte'),
        ),
        migrations.AddField(
            model_name='basurero',
            name='gps',
            field=models.OneToOneField(to='satelite.GPS'),
        ),
    ]
