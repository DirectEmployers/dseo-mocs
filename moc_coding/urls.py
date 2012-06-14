from django.conf.urls.defaults import *

urlpatterns = patterns('',
    url('^mocdata/$', 'moc_coding.views.moc_data'),
    url('^onetdata/$', 'moc_coding.views.onet_data'),
    url('^newmap/$', 'moc_coding.views.newmapping'),
    url('^all/$', 'moc_coding.views.maps_by_objid'),
    url('^delete/$', 'moc_coding.views.delete'),
)
