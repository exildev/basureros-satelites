from django.conf.urls import include, url
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.contrib import admin
from satelite import views as satelite
import settings

admin.autodiscover()

urlpatterns = [
    # Examples:
    # url(r'^$', 'server_camera.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
    url(r'^$', satelite.home),
    url(r'^admin/', admin.site.urls),
    url(r'^basureros/', include('satelite.urls')),
    url(r'^rest/', include('rest.urls'))
]

urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)