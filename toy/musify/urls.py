from django.urls import path
from . import views

urlpatterns = [
    path('', views.test),
    path('intro', views.intro),
    # path('log_in', views.log_in),
    path('login', views.login),
    path('register', views.signup),
    path('insuser', views.insuser),
    path('log_in',views.log_in),
    path('home', views.home),
    path('up_music', views.up_music),
    path('upload_music', views.upload_music),

]