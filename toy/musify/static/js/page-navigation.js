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

// Load content from a URL
async function loadContent(url, addToHistory) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Extract just the main content from the loaded page
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get the main content - adjust selector based on your HTML structure
        const newContent = doc.querySelector('.main-content').innerHTML;
        document.querySelector('.main-content').innerHTML = newContent;
        
        // Update page title
        document.title = doc.title;
        
        // Update navigation active states
        updateActiveNavItem(url);
        
        // Add to browser history if requested
        if (addToHistory) {
            window.history.pushState({ url: url }, doc.title, url);
        }
        
        // Re-initialize any page-specific scripts
        initPageScripts();
        
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

// Initialize any scripts needed on the new page
function initPageScripts() {
    // This function will re-initialize any page-specific functionality
    
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
    }
    
    // If on playlist page, initialize playlist functionality
    if (window.location.pathname.includes('/playlist/')) {
        if (typeof window.loadPlaylistSongs === 'function') {
            window.loadPlaylistSongs();
        }
    }
}