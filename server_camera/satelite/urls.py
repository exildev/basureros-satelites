from django.conf.urls import patterns, include, url
import views

urlpatterns = patterns('pedido.views',
	url(r'^mostrar/$', views.mostrar_basureros, name='mostrar_basureros'),
	url(r'^aprobar/$', views.aprobar_reporte, name='aprobar_reporte'),
	url(r'^basureros.json$', views.json_basureros, name='json_basureros'),
	url(r'^reportar/$', views.reportar_basurero, name='reportar_basurero'),
	url(r'^descartar/$', views.descartar_reporte, name='descartar_reporte'),
)