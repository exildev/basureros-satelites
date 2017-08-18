from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.core.files import File
from models import Imagen, Basurero, GPS, Reporte
from forms import BasureroForm
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout, authenticate
from django.views.generic import TemplateView
from django.db.models import Q, Count
from supra import views as supra
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

def json_basureros_markers(request):
	basureros = Basurero.objects.annotate(num_reportes=Count('reporte')).filter(num_reportes__gt=0)
	basureros_list = [{
			"latitude": basurero.gps.latitude,
			"longitude": basurero.gps.longitude,
			"title": basurero.nombre,
			"description": basurero.descripcion,
			"image": "http://104.236.33.228:8080/" + basurero.imagenes().last().imagen.url,
			"price": str(basurero.tamano) + "m3",
			"details_url": "map-property.html",
			"ribbon_mark_text": "Rent",
			"ribbon_mark_class": "ribbon-primary",
			"template": "real-estate-map-pop-1",
			"icon": "building-02"
		} for basurero in basureros]
	return HttpResponse(json.dumps({'markers': basureros_list}), content_type="application/json")
#end def

@login_required
def mostrar_basureros(request):
	return render(request,"index.html")
#end def

def home(request):
	return render(request,"home.html")
#end def

def handle_uploaded_file(pk, f):
	filename = str(pk) + "_" + f.name
	with open('/tmp/'+filename, 'wb+') as destination:
		for chunk in f.chunks():
			destination.write(chunk)
		#end for
		return '/tmp/'+filename, filename
	#end 
#end def

class Login(supra.SupraSession):
	template_name = "satelite/login.html"

	def form_valid(self, form):
		instance = form.save()
		for inline in self.validated_inilines:
			inline.instance = instance
			inline.save()
		# end for
		nex = self.request.GET.get('next', False)
		if nex:
			return HttpResponseRedirect(nex)
		return HttpResponseRedirect('/')
	# end def

	def login(self, request, cleaned_data):
		user = authenticate(username=cleaned_data[
							'username'], password=cleaned_data['password'])
		if user is not None:
			exist_obj = self.model.objects.filter(pk=user.pk).count()
			if exist_obj and user.is_active:
				login(request, user)
				return user
			# end if
		# end if
		return HttpResponseRedirect('/empleados/login/')
		# end def

	def form_invalid(self, form):
		errors = dict(form.errors)
		for i in self.invalided_inilines:
			errors['inlines'] = list(i.errors)
		# end for
		return render(self.request, self.template_name, {"form": form})
	# end def
# end class


class Logout(TemplateView):

    def dispatch(self, request, *args, **kwargs):
        logout(request, **kwargs)
        return HttpResponseRedirect('/')
    # end def
# end class