document.addEventListener('DOMContentLoaded', function() {
    // Set up AJAX navigation for all internal links
    setupAjaxNavigation();
});

function setupAjaxNavigation() {
    // Get all internal links that should use AJAX navigation
    const internalLinks = document.querySelectorAll('a[href^="/musify/"]');
    
    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Only handle links to other pages, not downloads or special functions
            const href = this.getAttribute('href');
            
            // Skip special cases
            if (href.includes('/download/') || 
                this.getAttribute('target') === '_blank' ||
                this.hasAttribute('data-no-ajax') ||
                href.endsWith('.mp3')) {
                return; // Let the browser handle these normally
            }
            
            e.preventDefault(); // Stop normal navigation
            navigateToPage(href);
        });
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(e) {
        if (e.state && e.state.url) {
            loadContent(e.state.url, false);
        }
    });
}

// Navigate to a new page without reloading
function navigateToPage(url) {
    // Show loading indicator
    showPageLoading();
    
    // Load the new page content via AJAX
    loadContent(url, true);
}

// Update the loadContent function

async function loadContent(url, addToHistory) {
    try {
        // Save player state BEFORE fetching
        const musicPlayerState = saveMusicPlayerStateBeforeNavigation();
        console.log("Pre-navigation state saved:", !!musicPlayerState);
        
        // Show loading indicator
        showPageLoading();
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Extract just the main content from the loaded page
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Save player state before updating content
        saveMusicPlayerStateBeforeNavigation();
        
        // IMPORTANT: Only update the main-content area, not the music player
        const mainContentOnly = doc.querySelector('.main-content');
        if (mainContentOnly) {
            document.querySelector('.main-content').innerHTML = mainContentOnly.innerHTML;
        } else {
            console.error('Could not find .main-content in loaded page');
            // Fall back to body content if main-content not found
            document.querySelector('.main-content').innerHTML = doc.body.innerHTML;
        }
        
        // Update page title
        document.title = doc.title;
        
        // Update navigation active states
        updateActiveNavItem(url);
        
        // Add to browser history if requested
        if (addToHistory) {
            window.history.pushState({ url: url }, doc.title, url);
        }
        
        // After content update but BEFORE running scripts
        if (musicPlayerState) {
            console.log("Preserving active player with state:", musicPlayerState);
        }
        
        // Re-initialize any page-specific scripts
        initPageScripts();
        
        // IMPORTANT: Restore state AFTER scripts are initialized
        setTimeout(() => {
            if (musicPlayerState) {
                restoreMusicPlayerStateAfterNavigation(musicPlayerState);
            }
        }, 100);
        
    } catch (error) {
        console.error('Error loading page:', error);
        // Handle error - maybe show an error message
        document.querySelector('.main-content').innerHTML = `
            <div class="error-message">
                <h2>Error Loading Page</h2>
                <p>${error.message}</p>
                <button onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
    } finally {
        hidePageLoading();
    }
}

// Show loading indicator
function showPageLoading() {
    // Create loading indicator if it doesn't exist
    if (!document.getElementById('page-loading')) {
        const loader = document.createElement('div');
        loader.id = 'page-loading';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
        
        // Add styling if not already in CSS
        const style = document.createElement('style');
        style.textContent = `
            #page-loading {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                z-index: 9999;
                background: linear-gradient(90deg, transparent, #1ed760, transparent);
                background-size: 200% 100%;
                animation: loading-bar 1.5s infinite;
            }
            @keyframes loading-bar {
                0% { background-position: 100% 0; }
                100% { background-position: -100% 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.getElementById('page-loading').style.display = 'block';
}

// Hide loading indicator
function hidePageLoading() {
    const loader = document.getElementById('page-loading');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Update active navigation item
function updateActiveNavItem(url) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and add active class to current page nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (url.includes(href) && href !== '#') {
            item.classList.add('active');
        }
    });
}

// Update the initPageScripts function

function initPageScripts() {
    console.log("Initializing page scripts after navigation");
    
    // Initialize music player immediately if available
    if (typeof window.initMusicPlayer === 'function') {
        console.log("Re-initializing music player");
        window.initMusicPlayer();
    } else {
        console.warn("initMusicPlayer function not found");
        
        // Try to load it dynamically as fallback
        const script = document.createElement('script');
        script.src = "/static/js/music-player.js";
        script.onload = function() {
            if (typeof window.initMusicPlayer === 'function') {
                window.initMusicPlayer();
            }
        };
        document.head.appendChild(script);
    }
    
    // Example: Re-initialize search functionality
    const searchInput = document.querySelector('.search-bar');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Search functionality...
        });
    }
    
    // If on songs page, load songs
    if (window.location.pathname.includes('/home') || window.location.pathname === '/musify/') {
        if (typeof window.loadSongs === 'function') {
            window.loadSongs();
        }
        
        // Load songs from database on home page
        if (typeof loadSongsFromDatabase === 'function') {
            loadSongsFromDatabase();
        }
    }
    
    // If on playlist page, initialize playlist functionality
    if (window.location.pathname.includes('/playlist/')) {
        if (typeof window.loadPlaylistSongs === 'function') {
            window.loadPlaylistSongs();
            
            // Connect playlist's play functions to the music player
            if (window.MusicPlayer) {
                window.MusicPlayer.connectPlaylist();
            }
        }
    }
}

// Update these functions to have better error handling and debugging

function saveMusicPlayerStateBeforeNavigation() {
    console.log("Saving music player state before navigation");
    try {
        // Save state to localStorage for redundancy
        if (typeof savePlayerState === 'function') {
            savePlayerState();
        }
        
        if (window.MusicPlayer && typeof window.MusicPlayer.getState === 'function') {
            const state = window.MusicPlayer.getState();
            return state;
        }
    } catch (error) {
        console.error("Error saving music player state:", error);
    }
    return null;
}

// Update the restoreMusicPlayerStateAfterNavigation function

function restoreMusicPlayerStateAfterNavigation(state) {
    console.log("Restoring music player state after navigation");
    if (!state) return;
    
    setTimeout(() => {
        if (window.MusicPlayer && typeof window.MusicPlayer.setState === 'function') {
            window.MusicPlayer.setState(state);
            
            // Force player visibility if needed
            if (state.currentSongData) {
                const musicPlayer = document.getElementById('music-player');
                if (musicPlayer) musicPlayer.classList.add('active');
            }
        }
    }, 200); // Short delay to ensure DOM is ready
    
    // Add these console logs within restoreMusicPlayerStateAfterNavigation
    console.log("Music player element exists:", !!document.getElementById('music-player'));
    console.log("Audio element exists:", !!document.getElementById('audio-player'));
    console.log("Current songs array:", songs?.length || 0);
}