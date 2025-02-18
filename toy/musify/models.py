from django.db import models
from django.utils import timezone

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
    class Meta:
        db_table = "user"

class Music(models.Model):
    title = models.CharField(max_length=100)
    artist = models.CharField(max_length=100)
    album = models.CharField(max_length=100)
    cover = models.URLField(max_length=500)
    song = models.URLField(max_length=500)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "music"

    def __str__(self):
        return f"{self.title} - {self.artist}"