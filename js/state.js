// App state — all shared variables live here
// Depends on: storage.js (loadStorage)

var playlists = {
  liked: { name: "Liked Songs", query: "bollywood hits", songs: [], loaded: false },
  bollywood: { name: "Bollywood Hits", query: "arijit singh new bollywood", songs: [], loaded: false },
  chill: { name: "Chill Vibes", query: "hindi lofi chill", songs: [], loaded: false },
  workout: { name: "Workout Mix", query: "hindi party dance", songs: [], loaded: false },
  focus: { name: "Deep Focus", query: "indian instrumental classical", songs: [], loaded: false }
};

// user-created playlists from localStorage
var savedPlaylists = loadStorage("custom_playlists", null);
if (savedPlaylists) {
  Object.assign(playlists, savedPlaylists);
}

var currentPlaylist = "bollywood";
var currentSongIndex = -1;
var isPlaying = false;
var shuffleOn = loadStorage("shuffle", false);
var repeatMode = loadStorage("repeat", 0);
var volume = loadStorage("volume", 0.7);
var isMuted = false;
var prevVolume = 0.7;
var queue = [];
var likedSongIds = new Set(loadStorage("liked_ids", []));
var likedSongsData = loadStorage("liked_songs_data", []);
var sortOrder = "default";
var isQueueOpen = false;
var isVisualizerOpen = false;
var isDraggingProgress = false;
var isDraggingVolume = false;
var contextSongIndex = -1;
var navHistory = [];
var navHistoryPos = -1;
var searchTimeout = null;
var isSearchActive = false;
var searchResults = [];

var profile = loadStorage("profile", { name: "Arbaz", color: "#1db954" });
var settings = loadStorage("settings", { quality: "normal", notifications: true, autoplay: false });

// Audio element
var audio = new Audio();
audio.volume = volume;
audio.preload = "none";
