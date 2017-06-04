from django.conf.urls import url, include
from views import router, ImagenList

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^imagen/$', ImagenList.as_view(), name='imagen-list'),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework'))
]