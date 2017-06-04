from django.conf.urls import patterns, include, url
import settings

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'server_camera.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
    url(r'^$', 'server_camera.views.home', name='home'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^basureros/', include('satelite.urls')),
    url(r'^rest/', include('rest.urls'))
)

urlpatterns += patterns('django.views.static',
    (r'media/(?P<path>.*)', 'serve', {'document_root': settings.MEDIA_ROOT}),
)