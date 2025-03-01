// Global player state
let audioPlayer;
let songProgress;
let currentTimeElem;
let totalTimeElem;
let playPauseBtn;
let volumeSlider;
let volumeBtn;
let currentSongIndex = 0;
let songs = [];
let isShuffled = false;
let isLooped = false;
let previousVolume = 1;
let isMinimized = false;

// Initialize player as soon as DOM is loaded
document.addEventListener('DOMContentLoaded', initializePlayer);

function initializePlayer() {
    // Find player elements
    audioPlayer = document.getElementById('audio-player');
    songProgress = document.getElementById('song-progress');
    currentTimeElem = document.getElementById('current-time');
    totalTimeElem = document.getElementById('total-time');
    playPauseBtn = document.getElementById('playPauseBtn');
    volumeSlider = document.getElementById('volumeSlider');
    volumeBtn = document.getElementById('volumeBtn');
    
    // Load songs if empty
    if (songs.length === 0) {
        loadSongsFromDatabase();
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Restore player state from localStorage
    restorePlayerState();
}

function setupEventListeners() {
    // Audio player events
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleSongEnd);
    audioPlayer.addEventListener('play', () => {
        playPauseBtn.classList.remove('paused');
        playPauseBtn.classList.add('playing');
        savePlayerState();
    });
    audioPlayer.addEventListener('pause', () => {
        playPauseBtn.classList.remove('playing');
        playPauseBtn.classList.add('paused');
        savePlayerState();
    });
    audioPlayer.addEventListener('error', handlePlaybackError);
    
    // Controls
    songProgress.addEventListener('input', handleProgressChange);
    volumeSlider.addEventListener('input', handleVolumeChange);
    
    // Initialize volume slider appearance
    updateVolumeSlider();
}

// Save current player state to localStorage
function savePlayerState() {
    const state = {
        currentSongIndex: currentSongIndex,
        currentTime: audioPlayer.currentTime,
        volume: audioPlayer.volume,
        isPlaying: !audioPlayer.paused,
        isShuffled: isShuffled,
        isLooped: isLooped,
        isMinimized: isMinimized
    };
    
    localStorage.setItem('musicPlayerState', JSON.stringify(state));
}

// Restore player state from localStorage
function restorePlayerState() {
    const stateJson = localStorage.getItem('musicPlayerState');
    
    if (stateJson) {
        const state = JSON.parse(stateJson);
        
        // Restore volume first (to avoid loud surprises)
        audioPlayer.volume = state.volume || 1;
        volumeSlider.value = state.volume * 100;
        updateVolumeSlider();
        
        // Restore minimized state
        isMinimized = state.isMinimized || false;
        const musicPlayer = document.getElementById('music-player');
        if (isMinimized) {
            musicPlayer.classList.add('minimized');
            document.querySelector('.minimize-btn i').className = 'fas fa-chevron-up';
        }
        
        // Only proceed if we have songs loaded
        if (songs.length > 0 && state.currentSongIndex !== undefined) {
            // Set current song
            currentSongIndex = Math.min(state.currentSongIndex, songs.length - 1);
            
            // Update player UI
            updatePlayerInfo();
            
            // Restore song position
            if (state.currentTime) {
                audioPlayer.currentTime = state.currentTime;
            }
            
            // Show the player
            musicPlayer.classList.add('active');
            
            // Play if it was playing before
            if (state.isPlaying) {
                audioPlayer.play().catch(e => console.error('Auto-play prevented:', e));
            }
            
            // Restore other states
            isShuffled = state.isShuffled || false;
            isLooped = state.isLooped || false;
            
            if (isShuffled) document.getElementById('shuffleBtn').classList.add('active');
            if (isLooped) {
                audioPlayer.loop = true;
                if (document.getElementById('loopBtn')) {
                    document.getElementById('loopBtn').classList.add('active');
                }
            }
        }
    }
}

// Updates the player info with current song
function updatePlayerInfo() {
    if (currentSongIndex >= 0 && currentSongIndex < songs.length) {
        const song = songs[currentSongIndex];
        document.getElementById('current-song-title').textContent = song.name || song.title;
        document.getElementById('current-song-artist').textContent = song.artist;
        document.getElementById('current-song-cover').src = song.cover || song.cover_url;
        
        // Set audio source if it's not already set to this song
        if (!audioPlayer.src.includes(song.source || song.song_url)) {
            audioPlayer.src = song.source || song.song_url;
        }
    }
}

// Load songs from database
async function loadSongsFromDatabase() {
    try {
        const response = await fetch('/musify/get_songs');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Server error:', data.error);
            return;
        }
        
        if (!data.songs || data.songs.length === 0) {
            console.log('No songs available');
            return;
        }
        
        songs = data.songs;
        console.log('Songs loaded into player:', songs.length);
        
        // Try to restore state now that songs are loaded
        restorePlayerState();
        
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Play a specific song
// Make this function global so it can be called from other scripts
window.playSong = function(nameOrIndex, artist) {
    // Handle either index or name/artist pair
    let index = typeof nameOrIndex === 'number' ? nameOrIndex : -1;
    
    if (index === -1 && typeof nameOrIndex === 'string') {
        index = songs.findIndex(song => 
            (song.name === nameOrIndex || song.title === nameOrIndex) && 
            song.artist === artist);
    }
    
    if (index >= 0 && index < songs.length) {
        currentSongIndex = index;
        const song = songs[currentSongIndex];
        
        // Update player UI
        document.getElementById('current-song-title').textContent = song.name || song.title;
        document.getElementById('current-song-artist').textContent = song.artist;
        document.getElementById('current-song-cover').src = song.cover || song.cover_url;
        
        // Show the music player with animation
        document.getElementById('music-player').classList.add('active');
        
        // Set audio source and play
        audioPlayer.src = song.source || song.song_url;
        audioPlayer.play().catch(error => {
            console.error('Error playing song:', error);
            alert('Error playing song. Try again.');
        });
        
        // Save the state
        savePlayerState();
    }
}

// Play next song
function nextSong() {
    if (songs.length > 0) {
        let nextIndex;
        if (isShuffled) {
            nextIndex = Math.floor(Math.random() * songs.length);
        } else {
            nextIndex = (currentSongIndex + 1) % songs.length;
        }
        playSong(nextIndex);
    }
}

// Play previous song
function prevSong() {
    if (songs.length > 0) {
        let prevIndex;
        if (isShuffled) {
            prevIndex = Math.floor(Math.random() * songs.length);
        } else {
            prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        }
        playSong(prevIndex);
    }
}

// Toggle play/pause
function togglePlayPause() {
    if (audioPlayer.src) {
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
        savePlayerState();
    } else if (songs.length > 0) {
        playSong(0);
    }
}

// Toggle shuffle mode
function toggleShuffle() {
    isShuffled = !isShuffled;
    document.getElementById('shuffleBtn').classList.toggle('active');
    savePlayerState();
}

// Toggle loop mode
function toggleLoop() {
    isLooped = !isLooped;
    audioPlayer.loop = isLooped;
    if (document.getElementById('loopBtn')) {
        document.getElementById('loopBtn').classList.toggle('active');
    }
    savePlayerState();
}

// Toggle mute
function toggleMute() {
    if (audioPlayer.volume > 0) {
        previousVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
        volumeSlider.value = 0;
        volumeBtn.querySelector('i').className = 'fas fa-volume-mute';
    } else {
        audioPlayer.volume = previousVolume;
        volumeSlider.value = previousVolume * 100;
        updateVolumeIcon(previousVolume);
    }
    updateVolumeSlider();
    savePlayerState();
}

// Handle volume change
function handleVolumeChange(e) {
    const volume = e.target.value / 100;
    audioPlayer.volume = volume;
    updateVolumeIcon(volume);
    updateVolumeSlider();
    savePlayerState();
}

// Update the volume icon based on level
function updateVolumeIcon(volume) {
    const icon = volumeBtn.querySelector('i');
    icon.className = 'fas';
    
    if (volume === 0) {
        icon.classList.add('fa-volume-mute');
    } else if (volume < 0.5) {
        icon.classList.add('fa-volume-down');
    } else {
        icon.classList.add('fa-volume-up');
    }
}

// Update the volume slider appearance
function updateVolumeSlider() {
    const value = volumeSlider.value;
    volumeSlider.style.background = `linear-gradient(to right, #1ed760 0%, #1ed760 ${value}%, rgba(255, 255, 255, 0.1) ${value}%, rgba(255, 255, 255, 0.1) 100%)`;
}

// Handle song progress change
function handleProgressChange(e) {
    const percentage = e.target.value;
    if (audioPlayer.duration) {
        audioPlayer.currentTime = (percentage / 100) * audioPlayer.duration;
        updateProgressBar(percentage);
    }
}

// Update progress display
function updateProgress() {
    if (audioPlayer.duration) {
        const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        updateProgressBar(percentage);
        currentTimeElem.textContent = formatTime(audioPlayer.currentTime);
        totalTimeElem.textContent = formatTime(audioPlayer.duration);
    }
}

// Update the progress bar appearance
function updateProgressBar(percentage) {
    songProgress.value = percentage;
    songProgress.style.background = `linear-gradient(to right, #1ed760 0%, #1ed760 ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%, rgba(255, 255, 255, 0.1) 100%)`;
}

// Format time in MM:SS format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Handle song end
function handleSongEnd() {
    if (!isLooped) {
        nextSong();
    }
}

// Toggle minimize player
function toggleMinimizePlayer() {
    const musicPlayer = document.getElementById('music-player');
    const minimizeBtn = document.querySelector('.minimize-btn i');
    const coverImage = document.getElementById('current-song-cover');
    
    isMinimized = !isMinimized;
    musicPlayer.classList.toggle('minimized');
    
    if (isMinimized) {
        minimizeBtn.className = 'fas fa-chevron-up';
        coverImage.addEventListener('click', toggleMinimizePlayer);
    } else {
        minimizeBtn.className = 'fas fa-chevron-left';
        coverImage.removeEventListener('click', toggleMinimizePlayer);
    }
    
    savePlayerState();
}

// Handle playback errors
function handlePlaybackError(e) {
    console.error('Audio player error:', e);
    console.error('Error code:', audioPlayer.error ? audioPlayer.error.code : 'unknown');
    alert('Error playing audio. Please try refreshing the page.');
}