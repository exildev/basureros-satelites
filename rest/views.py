import django_filters
from django.shortcuts import render
from rest_framework import routers, serializers, viewsets, filters, generics
from satelite import models as satelite
from django.db.models import Q, Count
# Create your views here.

class ImagenSerializer(serializers.HyperlinkedModelSerializer):
	class Meta:
		model = satelite.Imagen
		fields = ['imagen']
	#end class
#end class

class ImageFilter(django_filters.FilterSet):
	class Meta:
		model = satelite.Imagen
		fields = ['reporte__id']
#end class

class ImagenList(generics.ListAPIView):
	queryset = satelite.Imagen.objects.all()
	serializer_class = ImagenSerializer
	filter_backends = (filters.DjangoFilterBackend,)
	filter_class = ImageFilter
#end class

class GPSSerializer(serializers.HyperlinkedModelSerializer):
	class Meta:
		model = satelite.GPS
		fields = ['latitude', 'longitude']
	#end class
#end class

class GPSViewSet(viewsets.ModelViewSet):
	queryset = satelite.GPS.objects.all()
	serializer_class = GPSSerializer
#end class

class BasureroSerializer(serializers.HyperlinkedModelSerializer):

	gps = GPSSerializer()
	imagenes = ImagenSerializer(many=True)

	class Meta:
		model = satelite.Basurero
		fields = ['nombre', 'descripcion', 'gps', 'fecha', 'id', 'tamano', 'imagenes']
	#end class
#end class

class BasureroViewSet(viewsets.ModelViewSet):
	queryset = satelite.Basurero.objects.annotate(num_reportes=Count('reporte')).filter(num_reportes__gt=0)
	serializer_class = BasureroSerializer
#end class

class ReporteSerializer(serializers.HyperlinkedModelSerializer):

	gps = GPSSerializer()
	basurero = BasureroSerializer()

	class Meta:
		model = satelite.Reporte
		fields = ['gps', 'fecha', 'basurero','id']
	#end class
#end class

class ReporteViewSet(viewsets.ModelViewSet):
	queryset = satelite.Reporte.objects.filter(Q(basurero=None) & ~Q(gps__latitude="NaN") & ~Q(gps__longitude="NaN") & ~Q(gps__latitude="undefined") & ~Q(gps__longitude="undefined") & ~Q(gps__latitude=None) & ~Q(gps__longitude=None) & Q(descartado=None))
	serializer_class = ReporteSerializer
#end class


router = routers.DefaultRouter()
#router.register(r'imagen', ImagenViewSet)
router.register(r'gps', GPSViewSet)
router.register(r'reporte', ReporteViewSet)
router.register(r'basurero', BasureroViewSet)