console.log("Resolve.js running...");
console.log("Resolve.js loading - creating global objects");

// Immediate execution to ensure player object is available
(function() {
    console.log("Loading resolve.js - Setting up global MusicPlayer object");
    
    // Always define MusicPlayer immediately
    window.MusicPlayer = window.MusicPlayer || {
        playSong: function(indexOrId, songData) {
            console.log("Resolve.js MusicPlayer.playSong called");
            if (!window.__pendingSongRequests) window.__pendingSongRequests = [];
            window.__pendingSongRequests.push({indexOrId, songData});
        },
        getState: function() { return null; },
        setState: function() {},
        addSongs: function() {},
        connectPlaylist: function() {}
    };
    
    console.log("Global MusicPlayer object created with:", 
        Object.keys(window.MusicPlayer).join(", "));
    
    console.log("MusicPlayer global object created by resolve.js");
    
    // Global utility for resolving the player
    window.resolveMusicPlayer = function() {
        console.log("Resolving music player");
        if (typeof window.initMusicPlayer === 'function') {
            window.initMusicPlayer();
        }
        return window.MusicPlayer;
    };
})();