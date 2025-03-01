from django.urls import path
from . import views
from django.contrib.staticfiles.urls import staticfiles_urlpatterns


urlpatterns = [
    path('', views.test),
    path('intro', views.intro),
    path('login', views.login, name='login'),
    path('register', views.signup),
    path('insuser', views.insuser),
    path('log_in',views.log_in),
    path('home', views.home),
    path('up_music', views.up_music),
    path('upload_music', views.upload_music),
    path('test_storage_connection', views.test_storage_connection),
    path('get_songs', views.get_songs, name='get_songs'),
    path('check-song-exists/', views.check_song_exists, name='check_song_exists'),
    path('profile', views.profile, name='profile'),
    path('update_profile', views.update_profile, name='update_profile'),
    # path('welcome', views.welcome, name='welcome'),
    path('play_list', views.play_list, name='play_list'),
    path('playlist/<int:playlist_id>/', views.playlist, name='playlist'),
    path('playlist/', views.playlist, name='playlist_default'),
    path('create_playlist/', views.create_playlist, name='create_playlist'),
    path('add_to_playlist/', views.add_to_playlist, name='add_to_playlist'),
    path('remove_from_playlist/', views.remove_from_playlist, name='remove_from_playlist'),
    path('user_playlists/', views.user_playlists, name='user_playlists'),
    path('get_playlist_songs/<int:playlist_id>/', views.get_playlist_songs, name='get_playlist_songs'),
    path('play_playlist/<int:playlist_id>/', views.play_playlist, name='play_playlist'),
]

