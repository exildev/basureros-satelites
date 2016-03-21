from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404
from django.core.files import File
from models import Imagen, Basurero, GPS, Reporte
from forms import BasureroForm
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
import string
import os
import json

@csrf_exempt
def reportar_basurero(request):
	latitude = request.POST.get('latitude',False)
	longitude = request.POST.get('longitude',False)
	if(latitude and longitude):
		gps = GPS(latitude=latitude, longitude=longitude)
		gps.save()
		reporte = Reporte(gps=gps)
		reporte.save()
		print request.FILES
		print request.POST
		for key in request.FILES.keys():
			print key
			for f in request.FILES.getlist(key):
				img = Imagen(reporte = reporte)
				img.save()
				path, name = handle_uploaded_file(img.pk, f)
				lf = open(path)
				img.imagen.save(name,File(lf))
				os.remove(path)
			#end for
		#end for
		return HttpResponse("bien")
	#end if
	return HttpResponse("mal", status=400)
#end def

def descartar_reporte(request):
	reporte = request.GET.get('id', False)
	reporte = get_object_or_404(Reporte, pk=reporte)
	reporte.descartado = True
	reporte.save()
	return HttpResponse(status=200)
#end def

@csrf_exempt
def crear_basurero(request):
	reporte = request.POST.get('reporte', False)
	reporte = get_object_or_404(Reporte, pk = reporte)
	f = BasureroForm(request.POST)
	if f.is_valid():
		basurero = f.save(commit=False)
		basurero.gps = reporte.gps
		basurero.save()
		reporte.basurero = basurero
		reporte.save()
		return HttpResponse(status=200)
	#end if
	return HttpResponse(status=400)
#end def

@csrf_exempt
def indexar_reporte(request):
	reporte = request.POST.get('reporte', False)
	basurero = request.POST.get('basurero', False)
	reporte = get_object_or_404(Reporte, pk = reporte)
	basurero = get_object_or_404(Basurero, pk= basurero)
	f = BasureroForm(request.POST, instance=basurero)
	if f.is_valid():
		basurero = f.save(commit=False)
		basurero.save()
		reporte.basurero = basurero
		reporte.save()
		return HttpResponse(status=200)
	#end if
	return HttpResponse(status=400)
#end def

def json_basureros(request):
	lat = request.GET.get('latitude', False)
	lng = request.GET.get('longitude', False)
	if lat and lng:
		basureros = Basurero.objects.raw("select * from basureros_cercanos(%s, %s);", (lat,lng))
		basureros_list = [{
			'latitude':basurero.gps.latitude,
			'longitude':basurero.gps.longitude,
			'pk': basurero.pk,
			'nombre': basurero.nombre,
			'descripcion': basurero.descripcion,
			'tamano': basurero.tamano
		} for basurero in basureros]
		return HttpResponse(json.dumps(basureros_list), content_type="application/json")
	#end if
	return HttpResponse(status=400, content_type="application/json")
#end def

def mostrar_basureros(request):
	return render(request,"index.html")
#end def

def handle_uploaded_file(pk, f):
	filename = str(pk) + "_" + f.name
	with open('/tmp/'+filename, 'wb+') as destination:
		for chunk in f.chunks():
			destination.write(chunk)
		#end for
		return '/tmp/'+filename, filenawithme
	#end 
#end def