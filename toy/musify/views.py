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
    if request.method == 'POST':
        fn = request.POST.get('a1')
        ln = request.POST.get('a2')
        em = request.POST.get('a3')
        ph = request.POST.get('a4')
        db = request.POST.get('a5')
        gd = request.POST.get('a6')
        un = request.POST.get('a7')
        pw = request.POST.get('a8')
    else:
        return render(request, 'register.html', {'error': 'Invalid request method'})

    # Check if any entry is missing
    if not all([fn, ln, em, ph, db, gd, un, pw]):
        return render(request, 'register.html', {'error': 'Please fill all the entries properly'})

    # Check if a user with the same email already exists
    if User.objects.filter(email=em).exists():
        return render(request, 'register.html', {'error': 'Email already exists'})
    # Optionally, also check for existing Username, etc.
    if User.objects.filter(username=un).exists():
        return render(request, 'register.html', {'error': 'Username already exists'})

    # Create and save the new user if there are no conflicts
    new_user = User()
    new_user.fname = fn
    new_user.lname = ln
    new_user.email = em
    new_user.phone = ph
    new_user.dob = db
    new_user.gender = gd
    new_user.username = un
    new_user.password = pw
    new_user.save()

    # Redirect to login on successful registration
    return redirect('./login')

def home(request):
    # Check if the user is logged in
    if 'email' not in request.session  or 'username' not in request.session:
        return render(request, 'login.html', {'error': 'You are not logged in. Please log in first.'})
    return render(request, 'home.html')

def log_in(request):
    if request.method == 'POST':
        a = request.POST.get('a1')
        b = request.POST.get('a2')
        if User.objects.filter(email=a, password=b).exists() or User.objects.filter(username=a, password=b).exists():
            # this is the session check
            u = User.objects.filter(email=a).first() or User.objects.filter(username=a).first()
            request.session['email'] = u.email
            request.session['username'] = u.username
            return redirect('./home')
        else:
            return render(request, 'login.html', {'error': 'Invalid email/username or password'})
    else:
        return render(request, 'login.html', {'error': 'Invalid request method'})
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
