import os
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from musify.models import *
from django.contrib import messages
import json

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

def welcome(request):
    return render(request, 'welcome.html')

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
            album_cover = request.FILES.get('albumCover')
            song_file = request.FILES.get('songFile')

            # Validate inputs
            if not all([song_name, artist_name, album_name, album_cover, song_file]):
                return render(request, 'up_music.html', 
                    {'error': 'All fields are required'})

            # Verify file types
            if not album_cover.content_type.startswith('image/'):
                return render(request, 'up_music.html', 
                    {'error': 'Please upload a valid image file'})

            if not song_file.content_type in ['audio/mpeg', 'audio/mp3']:
                return render(request, 'up_music.html', 
                    {'error': 'Please upload an MP3 file'})
                    
            # Preserve original filenames but ensure they're clean
            cover_ext = os.path.splitext(album_cover.name)[1]
            song_ext = os.path.splitext(song_file.name)[1]
            
            # Use simple filenames within the folder
            album_cover.name = f"cover{cover_ext}"
            song_file.name = f"song{song_ext}"

            # Create music object (this will handle the upload_to path)
            new_music = Music(
                title=song_name,
                artist=artist_name,
                album=album_name,
                cover=album_cover,
                song=song_file
            )
            
            # Save to trigger the upload and URL cache
            new_music.save()

            return HttpResponse('Song uploaded successfully!')

        except Exception as e:
            logger.error(f"Upload failed: {str(e)}")
            return render(request, 'up_music.html', 
                {'error': f'Upload failed: {str(e)}'})

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
        songs_list = [{
            'id': song.id,
            'name': song.title,
            'artist': song.artist,
            'cover': song.cover_url,
            'source': song.song_url,
            'album': song.album
        } for song in songs]
        
        return JsonResponse({'songs': songs_list})
    except Exception as e:
        logger.error(f"Error in get_songs view: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

def check_song_exists(request):
    """Check if a song with the given name already exists"""
    if request.method == 'GET':
        song_name = request.GET.get('song_name')
        if song_name:
            # Check if song exists in the database
            exists = Music.objects.filter(title__iexact=song_name).exists()
            return JsonResponse({'exists': exists})
    
    return JsonResponse({'exists': False})

def test_storage_connection(request):
    try:
        import boto3
        s3 = boto3.client('s3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        response = s3.list_objects_v2(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            MaxKeys=1
        )
        
        return JsonResponse({
            'status': 'success',
            'message': 'Successfully connected to S3',
            'bucket': settings.AWS_STORAGE_BUCKET_NAME,
            'region': settings.AWS_S3_REGION_NAME,
            'cloudfront': settings.CLOUDFRONT_DOMAIN
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)
def profile(request):
    print(f"Session data: {request.session}")
    # Check if user is logged in
    if 'email' not in request.session or 'username' not in request.session:
        return redirect('./login')
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    return render(request, 'profile.html', {'user': user})
def update_profile(request):
    # Check if user is logged in
    if 'email' not in request.session or 'username' not in request.session:
        return redirect('./login')
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    message = None
    message_type = None
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        # Handle password update
        if action == 'update_password':
            current_password = request.POST.get('currentPassword')
            new_password = request.POST.get('newPassword')
            confirm_password = request.POST.get('confirmPassword')
            
            # Verify current password
            if user.password != current_password:
                message = 'Current password is incorrect'
                message_type = 'error'
            # Check if new passwords match
            elif new_password != confirm_password:
                message = 'New passwords do not match'
                message_type = 'error'
            else:
                # Update password
                user.password = new_password
                user.save()
                message = 'Password updated successfully'
                message_type = 'success'
            
        # Handle profile image upload
        elif action == 'update_image':
            profile_image = request.FILES.get('imageUpload')
            if profile_image:
                # Validate file type
                if not profile_image.content_type.startswith('image/'):
                    message = 'Please upload a valid image file'
                    message_type = 'error'
                else:
                    # Save the profile image
                    user.profile_image = profile_image
                    user.save()
                    message = 'Profile image updated successfully'
                    message_type = 'success'
    
    # GET request - just display the profile
    context = {
        'user': user,
    }
    
    if message:
        context['message'] = message
        context['message_type'] = message_type
        
    return redirect('./login')

def play_list(request):
    return render(request, 'play_list.html')

import json

def playlist(request, playlist_id=None):
    """View a specific playlist"""
    if 'email' not in request.session or 'username' not in request.session:
        return redirect('./login')
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    # Check if user has any playlists
    if not Playlist.objects.filter(user=user).exists():
        # Create a default playlist
        default_playlist = Playlist(name="My First Playlist", user=user)
        default_playlist.save()
        playlist_id = default_playlist.id
    
    # Get playlist by ID or default to first playlist
    if playlist_id:
        playlist = get_object_or_404(Playlist, id=playlist_id, user=user)
    else:
        playlist = Playlist.objects.filter(user=user).first()
    
    # Get all songs in the playlist
    songs = playlist.songs.all()
    songs_list = [{
        'id': song.id,
        'title': song.title,
        'artist': song.artist,
        'cover_url': song.cover_url,
        'song_url': song.song_url,
        'album': song.album
    } for song in songs]
    
    # Get all user playlists for sidebar
    user_playlists = Playlist.objects.filter(user=user)
    playlists_list = [{
        'id': p.id,
        'name': p.name,
        'song_count': p.songs.count(),
        'is_current': p.id == playlist.id
    } for p in user_playlists]
    
    # Pass data to template
    context = {
        'user': user,
        'playlist': playlist,
        'songs_json': json.dumps(songs_list),  # For JavaScript initialization
        'playlists': playlists_list
    }
    
    return render(request, 'playlist.html', context)

def create_playlist(request):
    """Create a new playlist"""
    if 'email' not in request.session or 'username' not in request.session:
        return redirect('./login')
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    if request.method == 'POST':
        name = request.POST.get('playlist_name')
        if name:
            playlist = Playlist(name=name, user=user)
            playlist.save()
            return JsonResponse({'status': 'success', 'playlist_id': playlist.id, 'playlist_name': name})
        return JsonResponse({'status': 'error', 'message': 'Playlist name is required'})
    
    return redirect('./home')

def add_to_playlist(request):
    """Add a song to a playlist"""
    if 'email' not in request.session or 'username' not in request.session:
        return JsonResponse({'status': 'error', 'message': 'Not logged in'}, status=401)
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    if request.method == 'POST':
        playlist_id = request.POST.get('playlist_id')
        song_id = request.POST.get('song_id')
        
        if playlist_id and song_id:
            try:
                playlist = get_object_or_404(Playlist, id=playlist_id, user=user)
                song = get_object_or_404(Music, id=song_id)
                
                # Add song to playlist if it's not already there
                if song not in playlist.songs.all():
                    playlist.songs.add(song)
                    return JsonResponse({'status': 'success'})
                return JsonResponse({'status': 'info', 'message': 'Song already in playlist'})
            except Exception as e:
                return JsonResponse({'status': 'error', 'message': str(e)})
            
        return JsonResponse({'status': 'error', 'message': 'Playlist ID and Song ID are required'})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def remove_from_playlist(request):
    """Remove a song from a playlist"""
    if 'email' not in request.session or 'username' not in request.session:
        return JsonResponse({'status': 'error', 'message': 'Not logged in'}, status=401)
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    if request.method == 'POST':
        playlist_id = request.POST.get('playlist_id')
        song_id = request.POST.get('song_id')
        
        if playlist_id and song_id:
            playlist = get_object_or_404(Playlist, id=playlist_id, user=user)
            song = get_object_or_404(Music, id=song_id)
            
            # Remove song from playlist
            playlist.songs.remove(song)
            return JsonResponse({'status': 'success'})
        return JsonResponse({'status': 'error', 'message': 'Playlist ID and Song ID are required'})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def user_playlists(request):
    """Get all playlists for the current user"""
    if 'email' not in request.session or 'username' not in request.session:
        return JsonResponse({'status': 'error', 'message': 'Not logged in'}, status=401)
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    playlists = user.playlists.all()
    playlists_list = [{
        'id': playlist.id,
        'name': playlist.name,
        'song_count': playlist.songs.count()
    } for playlist in playlists]
    
    return JsonResponse({'playlists': playlists_list})

def get_playlist_songs(request, playlist_id):
    """Get all songs in a playlist"""
    if 'email' not in request.session or 'username' not in request.session:
        return JsonResponse({'status': 'error', 'message': 'Not logged in'}, status=401)
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    try:
        playlist = get_object_or_404(Playlist, id=playlist_id, user=user)
        songs = playlist.songs.all()
        songs_list = [{
            'id': song.id,
            'name': song.title,
            'artist': song.artist,
            'cover': song.cover_url,
            'source': song.song_url,
            'album': song.album
        } for song in songs]
        
        return JsonResponse({'songs': songs_list})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})
def play_playlist(request, playlist_id):
    """View for playing a specific playlist's songs"""
    if 'email' not in request.session or 'username' not in request.session:
        return redirect('./login')
    
    # Get user from session
    email = request.session.get('email')
    user = get_object_or_404(User, email=email)
    
    try:
        # Get the playlist and verify ownership
        playlist = get_object_or_404(Playlist, id=playlist_id, user=user)
        
        # Get all songs in the playlist
        songs = playlist.songs.all()
        
        # Format songs for the template
        songs_list = [{
            'id': song.id,
            'title': song.title,
            'artist': song.artist,
            'cover_url': song.cover_url,
            'song_url': song.song_url,
            'album': song.album
        } for song in songs]
        
        # Get all user playlists for sidebar
        user_playlists = user.playlists.all()
        playlists_list = [{
            'id': p.id,
            'name': p.name,
            'song_count': p.songs.count(),
            'is_active': p.id == playlist.id
        } for p in user_playlists]
        
        # Pass all data directly to template
        context = {
            'user': user,
            'playlist': playlist,
            'songs': songs_list,
            'playlists': playlists_list,
            'songs_json': json.dumps(songs_list)  # For JavaScript to access
        }
        
        return render(request, 'play_playlist.html', context)
        
    except Exception as e:
        messages.error(request, f"Error loading playlist: {str(e)}")
        return redirect('home')
