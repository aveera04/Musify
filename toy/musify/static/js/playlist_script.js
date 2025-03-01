// Initialize variables
const audioPlayer = document.getElementById('audio-player');
const songProgress = document.getElementById('song-progress');
const currentTimeElem = document.getElementById('current-time');
const totalTimeElem = document.getElementById('total-time');
let currentSongIndex = 0;
let songs = [];
let allAvailableSongs = [];
let playlistId = "{{ playlist.id|escapejs }}";
let isShuffled = false;
let previousVolume = 1;

// Document ready
document.addEventListener('DOMContentLoaded', () => {
    // Load all available songs
    loadAllSongs();
    
    // Load user playlists
    loadUserPlaylists();
    
    // Initialize volume slider color
    const volumeSlider = document.getElementById('volumeSlider');
    volumeSlider.style.background = `linear-gradient(to right, #1ed760 0%, #1ed760 100%, rgba(255, 255, 255, 0.1) 100%, rgba(255, 255, 255, 0.1) 100%)`;
});

// ===== Playlist Functions =====

// Load songs in the current playlist
async function loadPlaylistSongs() {
    try {
        // If songs are already loaded from Django, just update UI
        if (songs && songs.length > 0) {
            console.log("Songs already loaded from Django, skipping fetch");
            return;
        }
        
        // Otherwise do the original fetch
        const response = await fetch(`/musify/get_playlist_songs/${playlistId}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.songs) {
            songs = data.songs.map(song => {
                return {
                    id: song.id,
                    title: song.name || song.title,
                    artist: song.artist,
                    cover_url: song.cover || song.cover_url,
                    song_url: song.source || song.song_url,
                    album: song.album
                };
            });
            console.log("Loaded songs via AJAX:", songs);
            updatePlaylistGrid();
        }
    } catch (error) {
        console.error('Error loading playlist songs:', error);
        showToast('Error loading playlist songs', 'error');
    }
}

// Update the playlist grid with the current songs
function updatePlaylistGrid() {
    const songsGrid = document.getElementById('playlist-songs-grid');
    songsGrid.innerHTML = ''; // Clear existing content
    
    if (songs.length === 0) {
        songsGrid.innerHTML = `
            <div class="empty-playlist">
                <i class="fas fa-music"></i>
                <h3>This playlist is empty</h3>
                <p>Click "Add Songs" to add some music!</p>
            </div>
        `;
        return;
    }
    songs.forEach((song, index) => {
        const songCard = document.createElement('div');
        songCard.className = 'song-card';
        songCard.innerHTML = `
            <div class="song-image" onclick="playSong(${index})">
                <img src="${song.cover_url}" alt="${song.title} cover">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="song-info">
                <h4>${song.title}</h4>
                <p>${song.artist}</p>
            </div>
            <div class="song-actions">
                <button class="remove-btn" onclick="removeSong(${song.id})" title="Remove from playlist">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        `;
        songsGrid.appendChild(songCard);
    });
}

// Load all available songs for the add songs modal
async function loadAllSongs() {
    try {
        // Show loading state
        const availableSongsContainer = document.getElementById('available-songs');
        availableSongsContainer.innerHTML = `
            <div class="loading-songs">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading songs...</p>
            </div>
        `;
        
        // Fetch songs
        const response = await fetch('/musify/get_songs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse response
        const data = await response.json();
        console.log("Raw song data:", data);
        
        // Handle ALL possible response formats
        let processedSongs = [];
        
        // Case 1: Array of songs directly
        if (Array.isArray(data)) {
            processedSongs = data;
        }
        // Case 2: {songs: [...]} format
        else if (data.songs && Array.isArray(data.songs)) {
            processedSongs = data.songs;
        }
        // Case 3: Other object structure with songs inside
        else {
            // Try to find any array property that might contain songs
            for (const key in data) {
                if (Array.isArray(data[key]) && data[key].length > 0 && data[key][0].title) {
                    processedSongs = data[key];
                    break;
                }
            }
        }
        
        console.log("Found songs array:", processedSongs);
        
        // Normalize song objects to ensure consistent properties
        const normalizedSongs = processedSongs.map(song => {
            return {
                id: song.id || song._id || null,
                title: song.title || song.name || song.song_name || "Unknown Song",
                artist: song.artist || song.artist_name || "Unknown Artist",
                cover_url: song.cover_url || song.cover || song.artwork || song.image || '{% static "images/default-album.jpg" %}',
                song_url: song.song_url || song.url || song.source || song.file || ''
            };
        }).filter(song => song.id !== null); // Filter out songs without IDs
        
        allAvailableSongs = normalizedSongs;
        console.log('Normalized songs:', allAvailableSongs);
        
        // Clear container
        availableSongsContainer.innerHTML = '';
        
        // Handle empty song list
        if (allAvailableSongs.length === 0) {
            availableSongsContainer.innerHTML = `
                <div class="empty-songs">
                    <i class="fas fa-music"></i>
                    <h3>No songs found</h3>
                    <p>Upload some music first!</p>
                </div>
            `;
            return;
        }
        
        // Cache song IDs already in the playlist for quick lookup
        const playlistSongIds = new Set((songs || []).map(song => song.id));
        
        // Create song items
        allAvailableSongs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            
            // Check if song is already in playlist
            const isInPlaylist = playlistSongIds.has(song.id);
            
            songItem.innerHTML = `
                <img src="${song.cover_url}" alt="${song.title} cover">
                <h4>${song.title}</h4>
                <p>${song.artist}</p>
                <div class="song-actions">
                    ${isInPlaylist ? 
                        `<button class="add-btn" disabled title="Already in playlist" style="background-color: #888;">
                            <i class="fas fa-check"></i>
                        </button>` : 
                        `<button class="add-btn" onclick="addSongToPlaylist(${song.id})" title="Add to playlist">
                            <i class="fas fa-plus"></i>
                        </button>`
                    }
                </div>
            `;
            availableSongsContainer.appendChild(songItem);
        });
        
    } catch (error) {
        console.error('Error loading available songs:', error);
        
        // Show error in modal
        const availableSongsContainer = document.getElementById('available-songs');
        availableSongsContainer.innerHTML = `
            <div class="error-loading">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error loading songs</h3>
                <p>${error.message}</p>
                <button onclick="loadAllSongs()" class="retry-btn">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        
        showToast('Error loading songs: ' + error.message, 'error');
    }
}

// Add song to playlist
async function addSongToPlaylist(songId) {
    try {
        // Show loading indicator
        const addButton = event.currentTarget;
        const originalHTML = addButton.innerHTML;
        addButton.disabled = true;
        addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        const formData = new FormData();
        formData.append('playlist_id', playlistId);
        formData.append('song_id', songId);
        
        const response = await fetch('/musify/add_to_playlist/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Change button to checkmark
            addButton.innerHTML = '<i class="fas fa-check"></i>';
            addButton.style.backgroundColor = '#1ed760';
            showToast('Song added to playlist');
            
            // Reload playlist songs
            loadPlaylistSongs();
            
            // Don't close modal, let user add more songs
            // Instead, mark song as already added
            setTimeout(() => {
                addButton.style.backgroundColor = '#888';
                addButton.disabled = true;
            }, 1500);
        } else {
            addButton.innerHTML = originalHTML;
            addButton.disabled = false;
            showToast(data.message || 'Failed to add song', 'error');
        }
    } catch (error) {
        console.error('Error adding song to playlist:', error);
        showToast('Error adding song to playlist', 'error');
        // Restore button
        const addButton = event.currentTarget;
        addButton.innerHTML = '<i class="fas fa-plus"></i>';
        addButton.disabled = false;
    }
}

// Remove song from playlist
async function removeSong(songId) {
    try {
        const response = await fetch('/musify/remove_from_playlist/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                playlist_id: playlistId,
                song_id: songId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Song removed from playlist');
            
            // Remove the song from the local array
            songs = songs.filter(song => song.id !== songId);
            
            // Update the display
            updatePlaylistGrid();
            
            // If the removed song was playing, stop playback or move to next song
            if (currentSongIndex < songs.length) {
                playSong(currentSongIndex);
            } else if (songs.length > 0) {
                playSong(0);
            } else {
                // No songs left, stop playback
                stopPlayback();
            }
        } else {
            showToast(data.error || 'Failed to remove song', 'error');
        }
    } catch (error) {
        console.error('Error removing song from playlist:', error);
        showToast('Error removing song from playlist', 'error');
    }
}

// ===== Player Functions =====

// Play a song at specific index
function playSong(index) {
    if (index >= 0 && index < songs.length) {
        currentSongIndex = index;
        const song = songs[index];
        
        document.getElementById('current-song-title').textContent = song.title;
        document.getElementById('current-song-artist').textContent = song.artist;
        document.getElementById('current-song-cover').src = song.cover_url;
        
        audioPlayer.src = song.song_url;
        audioPlayer.play().catch(error => {
            console.error('Error playing song:', error);
            showToast('Error playing song. Try again.', 'error');
        });
        
        // Update play button to show pause
        const playPauseBtn = document.getElementById('playPauseBtn');
        playPauseBtn.classList.remove('paused');
        
        // Highlight the current playing song
        document.querySelectorAll('.song-card').forEach((card, i) => {
            if (i === index) {
                card.classList.add('playing');
            } else {
                card.classList.remove('playing');
            }
        });
    }
}

// Stop playback when no songs left
function stopPlayback() {
    audioPlayer.pause();
    audioPlayer.src = '';
    document.getElementById('current-song-title').textContent = 'Select a song';
    document.getElementById('current-song-artist').textContent = 'Artist';
    document.getElementById('current-song-cover').src = "{% static 'images/default-album.jpg' %}";
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.classList.add('paused');
}

// Toggle play/pause
function togglePlayPause() {
    if (audioPlayer.src) {
        if (audioPlayer.paused) {
            audioPlayer.play();
            document.getElementById('playPauseBtn').classList.remove('paused');
        } else {
            audioPlayer.pause();
            document.getElementById('playPauseBtn').classList.add('paused');
        }
    } else if (songs.length > 0) {
        playSong(0);
    }
}

// Play next song
function nextSong() {
    if (songs.length > 0) {
        let nextIndex;
        if (isShuffled) {
            // Play a random song if shuffle is on
            nextIndex = Math.floor(Math.random() * songs.length);
        } else {
            // Play next song in order
            nextIndex = (currentSongIndex + 1) % songs.length;
        }
        playSong(nextIndex);
    }
}

// Play previous song
function prevSong() {
    if (songs.length > 0) {
        audioPlayer.volume = 0;
        volumeSlider.value = 0;
        volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else {
        audioPlayer.volume = previousVolume;
        volumeSlider.value = previousVolume * 100;
        volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
    
    updateVolumeSlider();
}

// Update volume slider color
function updateVolumeSlider() {
    const volumeSlider = document.getElementById('volumeSlider');
    const value = volumeSlider.value;
    volumeSlider.style.background = `linear-gradient(to right, #1ed760 0%, #1ed760 ${value}%, rgba(255, 255, 255, 0.1) ${value}%, rgba(255, 255, 255, 0.1) 100%)`;
}

// Audio player event listeners
audioPlayer.addEventListener('timeupdate', () => {
    // Update timeline
    if (audioPlayer.duration) {
        const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        songProgress.value = percentage;
        
        // Update current time display
        currentTimeElem.textContent = formatTime(audioPlayer.currentTime);
    }
});

audioPlayer.addEventListener('loadedmetadata', () => {
    // Update total time display
    totalTimeElem.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener('ended', () => {
    nextSong();
});

// Song progress control
songProgress.addEventListener('input', () => {
    const seekTime = (songProgress.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
});

// Volume control
const volumeSlider = document.getElementById('volumeSlider');
volumeSlider.addEventListener('input', () => {
    const volume = volumeSlider.value / 100;
    audioPlayer.volume = volume;
    
    // Update volume icon
    const volumeBtn = document.getElementById('volumeBtn');
    if (volume === 0) {
        volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else if (volume < 0.5) {
        volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
    } else {
        volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
    
    updateVolumeSlider();
});

// ===== Modal Functions =====

// Open the Add Songs modal
function openAddSongsModal() {
    const modal = document.getElementById('addSongsModal');
    modal.classList.add('active');
    loadAllSongs();
}

// Close the Add Songs modal
function closeAddSongsModal() {
    const modal = document.getElementById('addSongsModal');
    modal.classList.remove('active');
}

// Open Create Playlist modal
function openCreatePlaylistModal() {
    const modal = document.getElementById('createPlaylistModal');
    modal.classList.add('active');
    document.getElementById('playlistName').focus();
}

// Close Create Playlist modal
function closeCreatePlaylistModal() {
    const modal = document.getElementById('createPlaylistModal');
    modal.classList.remove('active');
}

// ===== Playlist Management Functions =====

// Load user playlists
async function loadUserPlaylists() {
    try {
        const response = await fetch('/musify/user_playlists/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const playlistsContainer = document.getElementById('user-playlists');
        playlistsContainer.innerHTML = '';
        
        if (data.playlists && data.playlists.length > 0) {
            data.playlists.forEach(playlist => {
                const playlistItem = document.createElement('a');
                playlistItem.href = `/musify/playlist/${playlist.id}/`;
                playlistItem.className = 'playlist-item';
                playlistItem.classList.toggle('active', playlist.id === playlistId);
                playlistItem.innerHTML = `
                    <span>📝</span>
                    ${playlist.name}
                `;
                playlistsContainer.appendChild(playlistItem);
            });
        } else {
            playlistsContainer.innerHTML = `
                <p class="no-playlists">No playlists found</p>
            `;
        }
        
    } catch (error) {
        console.error('Error loading user playlists:', error);
    }
}

// Create new playlist
document.getElementById('create-playlist-btn').addEventListener('click', function() {
    openCreatePlaylistModal();
});

document.getElementById('createPlaylistForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const playlistName = document.getElementById('playlistName').value.trim();
    
    if (!playlistName) {
        showToast('Please enter a playlist name', 'error');
        return;
    }
    
    try {
        // Create FormData instead of JSON
        const formData = new FormData();
        formData.append('playlist_name', playlistName);
        
        const response = await fetch('/musify/create_playlist/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {  // Check for data.status instead of data.success
            showToast('Playlist created successfully');
            closeCreatePlaylistModal();
            loadUserPlaylists();
            
            // Redirect to the new playlist
            if (data.playlist_id) {
                window.location.href = `/musify/playlist/${data.playlist_id}/`;
            }
        } else {
            showToast(data.message || 'Failed to create playlist', 'error');
        }
        
    } catch (error) {
        console.error('Error creating playlist:', error);
        showToast('Error creating playlist', 'error');
    }
});

// ===== Utility Functions =====

// Format seconds to mm:ss
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Get CSRF cookie for secure form submissions
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Toggle profile popup
function toggleProfilePopup() {
    const popup = document.getElementById('profilePopup');
    popup.classList.toggle('hidden');
}

// Close profile popup when clicking outside
document.addEventListener('click', function(event) {
    const popup = document.getElementById('profilePopup');
    const profileBtn = document.querySelector('.profile-btn');
    
    // Add null checks to prevent errors
    if (popup && profileBtn && !popup.contains(event.target) && !profileBtn.contains(event.target)) {
        popup.classList.add('hidden');
    }
});

// Confirm logout
function confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/musify/login';
    }
}

// Search functionality for the modal
document.getElementById('modalSearchInput').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const songItems = document.querySelectorAll('#available-songs .song-item');
    
    songItems.forEach(item => {
        const title = item.querySelector('h4').textContent.toLowerCase();
        const artist = item.querySelector('p').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || artist.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});

// Search functionality for the main page
document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    
    if (!searchTerm) {
        // If search is empty, show all playlist songs
        updatePlaylistGrid();
        return;
    }
    
    const filteredSongs = songs.filter(song => 
        song.title.toLowerCase().includes(searchTerm) || 
        song.artist.toLowerCase().includes(searchTerm)
    );
    
    const songsGrid = document.getElementById('playlist-songs-grid');
    songsGrid.innerHTML = '';
    
    if (filteredSongs.length === 0) {
        songsGrid.innerHTML = `
            <div class="empty-playlist">
                <i class="fas fa-search"></i>
                <h3>No matching songs found</h3>
                <p>Try a different search term</p>
            </div>
        `;
        return;
    }
    
    filteredSongs.forEach((song, index) => {
        const originalIndex = songs.findIndex(s => s.id === song.id);
        const songCard = document.createElement('div');
        songCard.className = 'song-card';
        songCard.innerHTML = `
            <div class="song-image" onclick="playSong(${originalIndex})">
                <img src="${song.cover_url}" alt="${song.title} cover">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="song-info">
                <h4>${song.title}</h4>
                <p>${song.artist}</p>
            </div>
            <div class="song-actions">
                <button class="remove-btn" onclick="removeSong(${song.id})" title="Remove from playlist">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        `;
        songsGrid.appendChild(songCard);
    });
});

// Toggle minimize player
function toggleMinimizePlayer() {
    const musicPlayer = document.getElementById('music-player');
    musicPlayer.classList.toggle('minimized');
    
    const minimizeBtn = document.querySelector('.minimize-btn i');
    if (musicPlayer.classList.contains('minimized')) {
        minimizeBtn.className = 'fas fa-chevron-right';
    } else {
        minimizeBtn.className = 'fas fa-chevron-left';
    }
}