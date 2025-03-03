// At the VERY TOP of music-player.js - BEFORE any other code
console.log("Music player script loading...");

// Create global object immediately
window.MusicPlayer = window.MusicPlayer || {
    playSong: function(indexOrId, songData) {
        console.log("MusicPlayer playSong called with:", songData);
        // Store for later processing
        if (!window.__pendingSongRequests) window.__pendingSongRequests = [];
        window.__pendingSongRequests.push({indexOrId, songData});
        
        // Initialize if needed
        if (typeof initMusicPlayer === 'function') {
            initMusicPlayer();
        }
    },
    getState: function() { return null; },
    setState: function() {},
    addSongs: function(songs) { 
        console.log("Adding songs:", songs?.length || 0); 
    },
    connectPlaylist: function() {
        console.log("Connecting playlist");
    }
};

// Global state variables
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

// Create MusicPlayer global object immediately so it's available early
window.MusicPlayer = {
    // Play a song - immediately functional, no waiting for initialization
    playSong: function(indexOrId, songData) {
        console.log("Global MusicPlayer.playSong called", indexOrId, songData);
        
        // If player isn't initialized, initialize it
        if (!window.__playerInitialized) {
            console.log("Player not initialized yet, initializing now");
            initMusicPlayer();
        }
        
        // Once player should be initialized, try to play
        if (typeof playSong === "function") {
            if (songData) {
                // Make sure song has all needed properties
                const normalizedSong = {
                    id: songData.id || Math.random().toString(36).substr(2, 9),
                    name: songData.name || songData.title || "Unknown Song",
                    title: songData.title || songData.name || "Unknown Song",
                    artist: songData.artist || "Unknown Artist",
                    cover: songData.cover || songData.cover_url || "/static/images/default-album.jpg",
                    cover_url: songData.cover_url || songData.cover || "/static/images/default-album.jpg",
                    source: songData.source || songData.song_url || "",
                    song_url: songData.song_url || songData.source || ""
                };
                
                // Add song to collection and play
                songs.push(normalizedSong);
                playSong(songs.length - 1);
            } else {
                playSong(indexOrId);
            }
        } else {
            console.error("playSong function not available");
            // Store for later
            window.__pendingPlayRequest = {indexOrId, songData};
        }
    },
    
    // These will be populated later but are functional now
    getState: function() { 
        // Basic state without requiring full initialization
        return {
            songs: songs || [],
            currentSongIndex: currentSongIndex || 0,
            isPlaying: audioPlayer ? !audioPlayer.paused : false
        }; 
    },
    setState: function(state) {
        console.log("setState called, initializing if needed");
        if (!window.__playerInitialized) {
            initMusicPlayer();
        }
    },
    addSongs: function(newSongs) {
        if (!Array.isArray(newSongs)) return;
        if (!Array.isArray(songs)) songs = [];
        
        newSongs.forEach(song => songs.push(song));
        console.log("Added songs:", newSongs.length);
    },
    connectPlaylist: function() {
        console.log("connectPlaylist called, initializing if needed");
        if (!window.__playerInitialized) {
            initMusicPlayer();
        }
    }
};

// Initialize player when document is loaded or when loaded via AJAX
function initMusicPlayer() {
    try {
        console.log("Initializing music player");
        
        // Set flag early to prevent multiple initializations
        window.__playerInitialized = true;
        
        console.log("Music player element exists:", !!document.getElementById('music-player'));
        console.log("Audio element exists:", !!document.getElementById('audio-player'));
        
        // Clear previous player if needed
        if (audioPlayer) {
            console.log("Cleaning up previous player instance");
            audioPlayer.pause();
        }
        
        // Find the player elements
        audioPlayer = document.getElementById('audio-player');
        if (!audioPlayer) {
            console.error("Could not find audio-player element!");
            return;
        }
        
        // Initialize player elements
        songProgress = document.getElementById('song-progress');
        currentTimeElem = document.getElementById('current-time');
        totalTimeElem = document.getElementById('total-time');
        playPauseBtn = document.getElementById('playPauseBtn');
        volumeSlider = document.getElementById('volumeSlider');
        volumeBtn = document.getElementById('volumeBtn');
        
        console.log("Player elements found:", {
            songProgress: !!songProgress,
            currentTimeElem: !!currentTimeElem,
            playPauseBtn: !!playPauseBtn,
            volumeSlider: !!volumeSlider,
            volumeBtn: !!volumeBtn
        });
        
        // Set up event listeners
        setupEventListeners();
        
        // Restore state
        restorePlayerState();
        
        console.log("Music player initialization complete");
        
    } catch (error) {
        console.error("Error initializing music player:", error);
    }
}

document.addEventListener('DOMContentLoaded', initMusicPlayer);

// Export init function for use after AJAX navigation
window.initMusicPlayer = initMusicPlayer;

// Update the beginning of initializePlayer()

function initializePlayer() {
    // Find player elements with error handling
    try {
        audioPlayer = document.getElementById('audio-player');
        if (!audioPlayer) {
            console.error("Could not find audio-player element");
            return; // Exit if we can't find the audio element
        }
        
        songProgress = document.getElementById('song-progress');
        currentTimeElem = document.getElementById('current-time');
        totalTimeElem = document.getElementById('total-time');
        playPauseBtn = document.getElementById('playPauseBtn');
        volumeSlider = document.getElementById('volumeSlider');
        volumeBtn = document.getElementById('volumeBtn');
        
        // Log missing elements but continue
        if (!songProgress) console.warn("Could not find song-progress element");
        if (!currentTimeElem) console.warn("Could not find current-time element");
        if (!totalTimeElem) console.warn("Could not find total-time element");
        if (!playPauseBtn) console.warn("Could not find playPauseBtn element");
        if (!volumeSlider) console.warn("Could not find volumeSlider element");
        if (!volumeBtn) console.warn("Could not find volumeBtn element");
        
        // Load songs if empty
        if (songs.length === 0) {
            loadSongsFromDatabase();
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Restore player state from localStorage
        restorePlayerState();
        
    } catch(e) {
        console.error("Error initializing music player:", e);
    }
}

// Add at the start of setupEventListeners
function setupEventListeners() {
    // IMPORTANT: Remove existing listeners before adding new ones
    if (audioPlayer) {
        audioPlayer.removeEventListener('timeupdate', updateProgress);
        audioPlayer.removeEventListener('ended', handleSongEnd);
        // Remove other listeners...
    }
    
    // Audio player events
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleSongEnd);
    audioPlayer.addEventListener('play', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playPauseBtn.classList.remove('paused');
        savePlayerState();
    });
    audioPlayer.addEventListener('pause', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        playPauseBtn.classList.add('paused');
        savePlayerState();
    });
    
    // Enhance error handling for audio element
    audioPlayer.addEventListener('error', function(e) {
        console.error("Audio player error:", e);
        console.error("Error code:", audioPlayer.error?.code);
        console.error("Error message:", audioPlayer.error?.message);
        
        // Handle empty source errors specifically
        if (audioPlayer.error?.code === 4) {
            console.log("Empty source error - attempting to restore from localStorage");
            restorePlayerState();
        }
    });
    
    // Controls
    songProgress.addEventListener('input', handleProgressChange);
    volumeSlider.addEventListener('input', handleVolumeChange);
    
    // Initialize volume slider appearance
    updateVolumeSlider();
}

// Save current player state to localStorage
function savePlayerState() {
    if (!audioPlayer) return;
    
    const state = {
        currentSongIndex: currentSongIndex,
        currentTime: audioPlayer.currentTime,
        volume: audioPlayer.volume,
        isPlaying: !audioPlayer.paused && audioPlayer.src !== '',
        isShuffled: isShuffled,
        isLooped: isLooped,
        isMinimized: isMinimized,
        currentSongData: songs.length > 0 ? songs[currentSongIndex] : null
    };
    
    localStorage.setItem('musicPlayerState', JSON.stringify(state));
    console.log("Player state saved to localStorage");
}

function restorePlayerState() {
    const stateJson = localStorage.getItem('musicPlayerState');
    
    if (stateJson) {
        const state = JSON.parse(stateJson);
        
        // Restore volume first (to avoid loud surprises)
        audioPlayer.volume = state.volume || 1;
        volumeSlider.value = state.volume * 100;
        updateVolumeSlider();
        updateVolumeIcon(state.volume);
        
        // Restore minimized state
        isMinimized = state.isMinimized || false;
        const musicPlayer = document.getElementById('music-player');
        if (isMinimized) {
            musicPlayer.classList.add('minimized');
            document.querySelector('.minimize-btn i').className = 'fas fa-chevron-up';
        }
        
        // Restore shuffle and loop states
        isShuffled = state.isShuffled || false;
        isLooped = state.isLooped || false;
        if (isShuffled && document.getElementById('shuffleBtn')) {
            document.getElementById('shuffleBtn').classList.add('active');
        }
        if (isLooped && document.getElementById('loopBtn')) {
            document.getElementById('loopBtn').classList.add('active');
            audioPlayer.loop = true;
        }
        
        // If we have song data from a previous session
        if (state.currentSongData) {
            // We may need to add the current song to our songs array if it's empty
            if (songs.length === 0) {
                songs.push(state.currentSongData);
                currentSongIndex = 0;
            } else {
                // Try to find the same song in our current songs array
                const matchingIndex = songs.findIndex(song => 
                    song.id === state.currentSongData.id ||
                    (song.title === state.currentSongData.title && 
                     song.artist === state.currentSongData.artist));
                
                if (matchingIndex >= 0) {
                    currentSongIndex = matchingIndex;
                } else {
                    // If we can't find the song, just use the saved index if valid
                    currentSongIndex = Math.min(state.currentSongIndex, songs.length - 1);
                }
            }
            
            // Update the player UI with the current song
            updatePlayerInfo();
            
            // Show the player
            musicPlayer.classList.add('active');
            
            // Set the audio source and current time if needed
            if (state.currentSongData.song_url) {
                audioPlayer.src = state.currentSongData.song_url;
                
                // Try to restore playback position
                if (state.currentTime) {
                    audioPlayer.currentTime = state.currentTime;
                }
                
                // Play if it was playing before
                if (state.isPlaying) {
                    audioPlayer.play().catch(e => console.log('Auto-play prevented:', e));
                }
            }
        }
    }
}

// Updates the player info with current song
function updatePlayerInfo() {
    if (currentSongIndex >= 0 && currentSongIndex < songs.length) {
        const song = songs[currentSongIndex];
        document.getElementById('current-song-title').textContent = song.title || song.name;
        document.getElementById('current-song-artist').textContent = song.artist;
        document.getElementById('current-song-cover').src = song.cover_url || song.cover;
    }
}

// Update the loadSongsFromDatabase function

async function loadSongsFromDatabase() {
    try {
        const response = await fetch('/musify/get_songs');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process songs based on response format
        if (data.songs) {
            songs = data.songs.map(normalizeSongObject);
        } else if (Array.isArray(data)) {
            songs = data.map(normalizeSongObject);
        }
        
        console.log('Songs loaded:', songs.length);
        
        // Try to restore state now that songs are loaded
        restorePlayerState();
        
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Normalize song objects to ensure consistent properties
function normalizeSongObject(song) {
    return {
        id: song.id || song._id || null,
        title: song.title || song.name || "Unknown Song",
        artist: song.artist || song.artist_name || "Unknown Artist",
        cover_url: song.cover_url || song.cover || song.artwork || song.image || '/static/images/default-album.jpg',
        song_url: song.song_url || song.url || song.source || song.file || ''
    };
}

// Play a specific song 
function playSong(nameOrIndex, artist) {
    console.log("Playing song:", nameOrIndex, artist);
    
    // Handle different input types
    let index = -1;
    
    // Case 1: Direct index
    if (typeof nameOrIndex === 'number') {
        index = nameOrIndex;
    } 
    // Case 2: Song name and artist
    else if (typeof nameOrIndex === 'string' && artist) {
        index = songs.findIndex(song => 
            (song.name === nameOrIndex || song.title === nameOrIndex) && 
            song.artist === artist);
    }
    // Case 3: Song object passed in
    else if (typeof nameOrIndex === 'object' && nameOrIndex) {
        // Add to songs array if not already present
        const existingIndex = songs.findIndex(s => 
            (s.name === nameOrIndex.name || s.title === nameOrIndex.name) && 
            s.artist === nameOrIndex.artist);
            
        if (existingIndex >= 0) {
            index = existingIndex;
        } else {
            songs.push(nameOrIndex);
            index = songs.length - 1;
        }
    }
    
    if (index >= 0 && index < songs.length) {
        currentSongIndex = index;
        const song = songs[currentSongIndex];
        
        console.log("Playing song with data:", song);
        
        // Update player UI
        updatePlayerInfo();
        
        // Set audio source and play
        const audioSource = song.song_url || song.source;
        console.log("Setting audio source to:", audioSource);
        if (!audioSource) {
            console.error("No valid audio source found in song:", song);
            return; // Don't try to play without a source
        }
        audioPlayer.src = audioSource;
        showMusicPlayer(); // Add this line
        
        console.log("Setting audio source to:", audioPlayer.src);
        
        // Show the music player
        const musicPlayer = document.getElementById('music-player');
        if (musicPlayer) {
            musicPlayer.classList.add('active');
            console.log("Showing music player");
        }
        
        // Play the audio
        const playPromise = audioPlayer.play();
        if (playPromise) {
            playPromise.catch(error => {
                console.error('Error playing song:', error);
                alert('Error playing song. Try again.');
            });
        }
        
        // Save the state
        savePlayerState();
        
        // Highlight currently playing song in lists
        highlightCurrentSong();
    } else {
        console.error("Invalid song index or song not found:", index, nameOrIndex, artist);
    }
}

// Highlight the current song in any song lists on the page
function highlightCurrentSong() {
    // Remove 'playing' class from all song cards
    document.querySelectorAll('.song-card').forEach(card => {
        card.classList.remove('playing');
    });
    
    // Find cards that match current song and add 'playing' class
    if (songs[currentSongIndex]) {
        const currentSong = songs[currentSongIndex];
        document.querySelectorAll('.song-card').forEach((card, i) => {
            const title = card.querySelector('h4')?.textContent || card.querySelector('h3')?.textContent;
            const artist = card.querySelector('p')?.textContent;
            
            if ((title === currentSong.title || title === currentSong.name) && 
                artist === currentSong.artist) {
                card.classList.add('playing');
            }
        });
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

// Make functions available globally for use in HTML event handlers
window.playSong = playSong;
window.togglePlayPause = togglePlayPause;
window.nextSong = nextSong;
window.prevSong = prevSong;
window.toggleShuffle = toggleShuffle;
window.toggleLoop = toggleLoop;
window.toggleMute = toggleMute;
window.toggleMinimizePlayer = toggleMinimizePlayer;

// After player is initialized (at the bottom of the file), update the MusicPlayer object methods
document.addEventListener('DOMContentLoaded', function() {
    // Mark as initialized so we know it's safe to use
    window.__playerInitialized = true;
    
    // Now fully define all methods
    window.MusicPlayer.getState = function() {
        console.log("Getting music player state");
        
        // Check if player is initialized
        if (!audioPlayer) {
            console.warn("Audio player not initialized when getting state");
            return null;
        }
        
        return {
            currentSongIndex: currentSongIndex,
            currentTime: audioPlayer?.currentTime || 0,
            volume: audioPlayer?.volume || 1,
            isPlaying: audioPlayer ? (!audioPlayer.paused && audioPlayer.src !== '') : false,
            isShuffled: isShuffled,
            isLooped: isLooped,
            isMinimized: isMinimized,
            songs: songs,
            currentSongData: songs.length > 0 ? songs[currentSongIndex] : null
        };
    };
    
    // Define other methods properly
    // setState, addSongs, connectPlaylist, etc.
    
    // Check if there's a pending play request from before initialization
    if (window.__pendingPlayRequest) {
        console.log("Processing pending play request");
        window.MusicPlayer.playSong(
            window.__pendingPlayRequest.indexOrId,
            window.__pendingPlayRequest.songData
        );
        window.__pendingPlayRequest = null;
    }
});

// Add this function to your music-player.js

function showMusicPlayer() {
    const musicPlayer = document.getElementById('music-player');
    if (musicPlayer) {
        console.log("Forcing music player visibility");
        musicPlayer.classList.add('active');
        musicPlayer.style.display = 'flex';
        musicPlayer.style.opacity = '1';
        musicPlayer.style.transform = 'translateY(0)';
        musicPlayer.style.zIndex = '9999';
    } else {
        console.error("Music player element not found!");
    }
}