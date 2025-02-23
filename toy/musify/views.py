import os
import logging
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from musify.models import *
from .google_drive import upload_to_drive, get_file_url
from dotenv import load_dotenv

# Configure logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)
load_dotenv()
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
        try:
            # Get form data
            song_name = request.POST.get('songName')
            artist_name = request.POST.get('artistName')
            album_name = request.POST.get('albumName')

            # Validate form data
            if not all([song_name, artist_name, album_name]):
                return render(request, 'up_music.html', 
                    {'error': 'Please fill in all fields'})

            # Get files
            album_cover = request.FILES.get('albumCover')
            song_file = request.FILES.get('songFile')

            album_cover_folder_id = os.getenv("ALBUM_COVER_FOLDER_ID")
            if not album_cover or not song_file:
                return render(request, 'up_music.html', 
                    {'error': 'Please select both album cover and song file'})

            # Verify file types
            if not album_cover.content_type.startswith('image/'):
                return render(request, 'up_music.html', 
                    {'error': 'Please upload a valid image file for album cover'})

            allowed_audio_types = ['audio/mpeg', 'audio/mp3']
            if song_file.content_type not in allowed_audio_types:
                return render(request, 'up_music.html', 
                    {'error': 'Please upload an MP3 file'})

            # Upload cover
            
            
            album_cover_id = upload_to_drive(album_cover, 
                                           f"cover_{song_name}{os.path.splitext(album_cover.name)[1]}", 
                                           album_cover_folder_id)
            
            if not album_cover_id:
                return render(request, 'up_music.html', 
                    {'error': 'Failed to upload album cover'})

            # Upload song
            song_file_folder_id = os.getenv("SONG_FILE_FOLDER_ID")
            song_file_id = upload_to_drive(song_file, 
                                         f"{song_name}{os.path.splitext(song_file.name)[1]}", 
                                         song_file_folder_id)
            
            if not song_file_id:
                return render(request, 'up_music.html', 
                    {'error': 'Failed to upload song file'})

            # Create URLs
            album_cover_url = f"https://drive.google.com/uc?id={album_cover_folder_id}"
            song_file_url = f"https://drive.google.com/uc?id={song_file_folder_id}"

            # Save to database
            new_music = Music(
                title=song_name,
                artist=artist_name,
                album=album_name,
                cover=album_cover_id,
                song=song_file_id
            )
            new_music.save()

            return HttpResponse('Song uploaded and saved successfully!')

        except Exception as e:
            return render(request, 'up_music.html', 
                {'error': f'An error occurred: {str(e)}'})

    return render(request, 'up_music.html')

def handle_uploaded_file(file, filename, upload_path):
    # Create the upload directory if it doesn't exist
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    with open(upload_path + filename, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)

def get_songs(request):
    try:
        songs = Music.objects.all()
        logger.info(f"Found {songs.count()} songs in database")
        songs_list = []
        
        for song in songs:
            try:
                cover_url = get_file_url(song.cover, is_audio=False)
                song_url = get_file_url(song.song, is_audio=True)
                
                logger.info(f"Processing {song.title}")
                logger.info(f"Cover URL: {cover_url}")
                logger.info(f"Song URL: {song_url}")
                
                if cover_url and song_url:
                    songs_list.append({
                        'name': song.title,
                        'artist': song.artist,
                        'cover': cover_url,
                        'source': song_url,
                        'album': song.album
                    })
                    logger.info(f"Successfully added {song.title}")
                else:
                    logger.error(f"Failed to get URLs for {song.title}")
                    
            except Exception as e:
                logger.error(f"Error processing song {song.title}: {str(e)}")
                continue
        
        return JsonResponse({'songs': songs_list})
        
    except Exception as e:
        logger.error(f"Error in get_songs view: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

def test_drive_connection(request):
    try:
        from .google_drive import service
        about = service.about().get(fields="user,storageQuota").execute()
        return JsonResponse({
            'status': 'success',
            'user': about['user']['emailAddress'],
            'quota': about['storageQuota']
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

