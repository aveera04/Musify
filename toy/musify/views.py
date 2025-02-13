import os
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.conf import settings
from musify.models import *

# Create your views here.

def test(request):
    return HttpResponse("Hello, world. You're at the musify index.")

def intro(request):
    return render(request, 'intro.html')

# def log_in(request):
#     return render(request, 'log_in.html')

def login(request):
    return render(request, 'login.html')

def signup(request):
    return render(request, 'register.html')

def insuser(request):
    # Collect data
    fn = request.GET['a1']
    ln = request.GET['a2']
    em = request.GET['a3']
    ph = request.GET['a4']
    db = request.GET['a5']
    gd = request.GET['a6']
    un = request.GET['a7']
    pw = request.GET['a8']

    # Check if a user with the same email already exists
    if user.objects.filter(email=em).exists():
        return render(request, 'register.html', {'error': 'Email already exists'})
    # Optionally, also check for existing username, etc.
    if user.objects.filter(username=un).exists():
        return render(request, 'register.html', {'error': 'Username already exists'})

    # Create and save the new user if there are no conflicts
    new_user = user()
    new_user.fnmae = fn
    new_user.lname = ln
    new_user.email = em
    new_user.ph = ph
    new_user.dob = db
    new_user.gender = gd
    new_user.username = un
    new_user.password = pw
    new_user.save()

    # Redirect to login on successful registration
    return redirect('./login')

def home(request):
    return render(request, 'home.html')

def log_in(request):
    a = request.GET['a1']
    b = request.GET['a2']
    if user.objects.filter(email=a, password=b):
        return render(request, 'home.html')
    elif user.objects.filter(username=a, password=b):
        return render(request, 'home.html')
    else:
        return render(request, 'login.html', {'error': 'Something went wrong'})

def up_music(request):
    return render(request, 'up_music.html')

def upload_music(request):
    if request.method == 'POST':
        song_name = request.POST.get('songName')
        artist_name = request.POST.get('artistName')
        album_name = request.POST.get('albumName')
        album_cover = request.FILES.get('albumCover')
        song_file = request.FILES.get('songFile')

        if album_cover:
            handle_uploaded_file(album_cover, album_cover.name)
        if song_file:
            handle_uploaded_file(song_file, song_file.name)

        # Save the song details to the database or perform other actions as needed
        # For example:
        # Song.objects.create(
        #     name=song_name,
        #     artist=artist_name,
        #     album=album_name,
        #     cover=album_cover.name,
        #     file=song_file.name
        # )

        return HttpResponse('Song uploaded successfully!')

    return render(request, 'up_music.html')

def handle_uploaded_file(file, filename):
    upload_path = os.path.join(settings.MEDIA_ROOT, 'uploads')
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    with open(os.path.join(upload_path, filename), 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
