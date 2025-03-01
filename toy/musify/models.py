from django.db import models
from django.utils import timezone
from django.conf import settings
from django.templatetags.static import static
import os

# Create a function to determine upload path
def song_upload_path(instance, filename):
    # Clean the title and album name for use in paths
    title = instance.title.replace(' ', '_').replace('/', '_')
    album = instance.album.replace(' ', '_').replace('/', '_')
    return f'data/{title}|{album}/{filename}'

def cover_upload_path(instance, filename):
    # Clean the title and album name for use in paths
    title = instance.title.replace(' ', '_').replace('/', '_')
    album = instance.album.replace(' ', '_').replace('/', '_')
    return f'data/{title}|{album}/{filename}'

# Create your models here.
#    
class User(models.Model):
    fname = models.CharField(max_length=100)
    lname = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15)  # Adjusted max_length for country code
    dob = models.DateField()
    gender = models.CharField(max_length=10)
    username = models.CharField(max_length=100)
    password = models.CharField(max_length=100)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    
    class Meta:
        db_table = "user"
        
    @property
    def profile_image_url(self):
        """Returns CloudFront URL for profile image or default image if none exists"""
        if self.profile_image:
            return f"https://d3t799rwj17rbr.cloudfront.net/{self.profile_image.name}"
        return static('images/profile.png')  # Use the static file instead

class Music(models.Model):
    # Explicitly define id field to avoid migration issues
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=100)
    artist = models.CharField(max_length=100)
    album = models.CharField(max_length=100)
    cover = models.ImageField(upload_to=cover_upload_path)  # Use the function
    song = models.FileField(upload_to=song_upload_path)     # Use the function
    created_at = models.DateTimeField(default=timezone.now)
    # Add these fields to cache URLs for better performance
    cover_url_cache = models.CharField(max_length=255, blank=True)
    song_url_cache = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "music"
        ordering = ['-created_at']  # Newest first

    def save(self, *args, **kwargs):
        # We need to save first if this is a new record
        is_new = self.pk is None
        if is_new:
            super().save(*args, **kwargs)
        
        # Now we can generate paths with the title and album
        if self.cover and not self.cover_url_cache:
            self.cover_url_cache = f"https://d3t799rwj17rbr.cloudfront.net/{self.cover.name}"
            
        if self.song and not self.song_url_cache:
            self.song_url_cache = f"https://d3t799rwj17rbr.cloudfront.net/{self.song.name}"
            
        # Save again if we're updating an existing record
        if not is_new:
            super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.title} - {self.artist}"

    @property
    def cover_url(self):
        """Returns CloudFront URL for cover image"""
        if self.cover_url_cache:
            return self.cover_url_cache
        elif self.cover:
            return f"https://d3t799rwj17rbr.cloudfront.net/{self.cover.name}"
        return None

    @property
    def song_url(self):
        """Returns CloudFront URL for song file"""
        if self.song_url_cache:
            return self.song_url_cache
        elif self.song:
            return f"https://d3t799rwj17rbr.cloudfront.net/{self.song.name}"
        return None

class Playlist(models.Model):
    name = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='playlists')
    songs = models.ManyToManyField(Music, related_name='playlists', blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = "playlist"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} by {self.user.username}"