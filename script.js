// Vibe Player - Music Streaming App
// Fetches real songs from iTunes Search API (30-second previews)

// ---- iTunes API ----

const API_URL = "https://itunes.apple.com/search";

async function fetchSongs(query, limit = 25) {
  const url = `${API_URL}?term=${encodeURIComponent(query)}&media=music&limit=${limit}&country=IN`;
  const response = await fetch(url);
  const data = await response.json();

  return data.results
    .filter(track => track.previewUrl)
    .map(track => ({
      id: track.trackId,
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName || "Single",
      artwork: track.artworkUrl100.replace("100x100", "300x300"),
      artworkSmall: track.artworkUrl100,
      previewUrl: track.previewUrl,
      duration: 30
    }));
}

// ---- Playlists & Data ----

const playlists = {
  liked: { name: "Liked Songs", query: "bollywood hits", songs: [], loaded: false },
  bollywood: { name: "Bollywood Hits", query: "arijit singh new bollywood", songs: [], loaded: false },
  chill: { name: "Chill Vibes", query: "hindi lofi chill", songs: [], loaded: false },
  workout: { name: "Workout Mix", query: "hindi party dance", songs: [], loaded: false },
  focus: { name: "Deep Focus", query: "indian instrumental classical", songs: [], loaded: false }
};

// user-created playlists from localStorage
const savedPlaylists = loadStorage("custom_playlists", null);
if (savedPlaylists) {
  Object.assign(playlists, savedPlaylists);
}

// ---- Persistent Storage ----

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem("vibe_" + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStorage(key, val) {
  try {
    localStorage.setItem("vibe_" + key, JSON.stringify(val));
  } catch (e) { }
}

// ---- App State ----

let currentPlaylist = "bollywood";
let currentSongIndex = -1;
let isPlaying = false;
let shuffleOn = loadStorage("shuffle", false);
let repeatMode = loadStorage("repeat", 0); // 0=off, 1=all, 2=one
let volume = loadStorage("volume", 0.7);
let isMuted = false;
let prevVolume = 0.7;
let queue = [];
let likedSongIds = new Set(loadStorage("liked_ids", []));
let likedSongsData = loadStorage("liked_songs_data", []);
let sortOrder = "default";
let isQueueOpen = false;
let isVisualizerOpen = false;
let isDraggingProgress = false;
let isDraggingVolume = false;
let contextSongIndex = -1;
let navHistory = [];
let navHistoryPos = -1;
let searchTimeout = null;
let isSearchActive = false;
let searchResults = [];

const profile = loadStorage("profile", { name: "Arbaz", color: "#1db954" });
const settings = loadStorage("settings", { quality: "normal", notifications: true, autoplay: false });

// ---- Audio Player ----

const audio = new Audio();
audio.volume = volume;
audio.preload = "none";

// ---- DOM Elements ----

const $ = (id) => document.getElementById(id);
const q = (sel) => document.querySelector(sel);
const qa = (sel) => document.querySelectorAll(sel);

const songListEl = $("songList");
const songCountEl = $("songCount");
const totalDurationEl = $("totalDuration");
const heroTitleEl = $("heroTitle");
const heroGradient = q(".hero-gradient");

const nowPlayingTitle = $("nowPlayingTitle");
const nowPlayingArtist = $("nowPlayingArtist");
const nowPlayingArt = $("nowPlayingArt");

const btnPlay = $("btnPlay");
const btnPrev = $("btnPrev");
const btnNext = $("btnNext");
const btnShuffle = $("btnShuffle");
const btnRepeat = $("btnRepeat");
const btnLike = $("btnLike");
const btnPlayAll = $("btnPlayAll");
const btnShuffleAll = $("btnShuffleAll");
const btnVolume = $("btnVolume");
const btnVisualizer = $("btnVisualizer");
const btnQueue = $("btnQueue");
const btnFullscreen = $("btnFullscreen");
const btnSort = $("btnSort");
const btnBack = $("btnBack");
const btnForward = $("btnForward");

const progressBar = $("progressBar");
const progressFilled = $("progressFilled");
const progressThumb = $("progressThumb");
const timeCurrent = $("timeCurrent");
const timeTotal = $("timeTotal");

const volumeBar = $("volumeBar");
const volumeFilled = $("volumeFilled");
const volumeThumb = $("volumeThumb");

const visualizerOverlay = $("visualizerOverlay");
const visualizerCanvas = $("visualizerCanvas");
const vizTitle = $("vizTitle");
const vizArtist = $("vizArtist");
const vizArt = $("vizArt");

const queuePanel = $("queuePanel");
const queueListEl = $("queueList");
const queueCountEl = $("queueCount");
const queueCurrentEl = $("queueCurrent");
const queueEmptyState = $("queueEmptyState");

const contextMenu = $("contextMenu");
const contextLikeText = $("contextLikeText");
const playlistSubmenu = $("playlistSubmenu");

const modalOverlay = $("modalOverlay");
const playlistNameInput = $("playlistNameInput");
const charCount = $("charCount");
const playlistListEl = $("playlistList");

const profileDropdown = $("profileDropdown");
const userAvatar = $("userAvatar");
const dropdownName = $("dropdownName");

const btnFavorites = $("btnFavorites");
const favCountEl = $("favCount");

const searchInput = $("searchInput");
const btnClearSearch = $("btnClearSearch");
const toastEl = $("toast");
const toastMsg = $("toastMessage");

const loadingState = $("loadingState");
const errorState = $("errorState");

// ---- Helpers ----

function formatTime(sec) {
  let m = Math.floor(sec / 60);
  let s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

let toastTimer = null;
function showToast(msg) {
  clearTimeout(toastTimer);
  toastMsg.textContent = msg;
  toastEl.classList.remove("hidden");
  toastEl.classList.add("show");
  toastTimer = setTimeout(function () {
    toastEl.classList.remove("show");
    setTimeout(function () { toastEl.classList.add("hidden"); }, 300);
  }, 2000);
}

function getSongs() {
  let songs;
  if (isSearchActive) {
    songs = searchResults;
  } else if (currentPlaylist === "liked") {
    songs = likedSongsData;
  } else {
    songs = playlists[currentPlaylist]?.songs || [];
  }

  if (sortOrder === "title") {
    songs = [...songs].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortOrder === "artist") {
    songs = [...songs].sort((a, b) => a.artist.localeCompare(b.artist));
  }
  return songs;
}

// get a dominant color from artwork URL (we'll use a simple hash approach)
function getColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let h = Math.abs(hash % 360);
  return "hsl(" + h + ", 60%, 40%)";
}

// ---- Load Songs for a Playlist ----

async function loadPlaylistSongs(key) {
  // "liked" playlist pulls from our saved liked songs, no API needed
  if (key === "liked") {
    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");
    if (likedSongsData.length === 0) {
      songListEl.innerHTML = '<li style="padding:40px;text-align:center;color:var(--text-muted)">' +
        'No liked songs yet. Tap the <b style="color:#1db954">heart</b> on any song to save it here.</li>';
      songCountEl.textContent = "0";
      totalDurationEl.textContent = "0 min";
    } else {
      renderSongList(getSongs());
    }
    return;
  }

  let pl = playlists[key];
  if (!pl) return;

  if (pl.loaded && pl.songs.length > 0) {
    renderSongList(getSongs());
    return;
  }

  songListEl.innerHTML = "";
  loadingState.classList.remove("hidden");
  errorState.classList.add("hidden");

  try {
    let songs = await fetchSongs(pl.query);

    if (songs.length === 0) {
      songs = await fetchSongs("bollywood");
    }

    pl.songs = songs;
    pl.loaded = true;

    loadingState.classList.add("hidden");
    renderSongList(getSongs());

    songCountEl.textContent = songs.length;
    totalDurationEl.textContent = Math.floor(songs.length * 30 / 60) + " min";
  } catch (err) {
    console.error("Failed to fetch songs:", err);
    loadingState.classList.add("hidden");
    errorState.classList.remove("hidden");
  }
}

// ---- Render Song List ----

function renderSongList(songs) {
  songListEl.innerHTML = "";
  songCountEl.textContent = songs.length;
  totalDurationEl.textContent = Math.floor(songs.length * 30 / 60) + " min";

  songs.forEach(function (song, i) {
    let li = document.createElement("li");
    li.className = "song-item";
    li.style.animationDelay = (i * 0.03) + "s";
    li.dataset.index = i;

    if (i === currentSongIndex) {
      li.classList.add("active");
      if (isPlaying) li.classList.add("playing");
    }

    li.innerHTML =
      '<div style="position:relative">' +
        '<span class="song-number">' + (i + 1) + '</span>' +
        '<div class="song-play-icon">' +
          '<svg class="play-icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
          '<div class="equalizer"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="song-info">' +
        '<div class="song-art">' +
          '<img src="' + song.artworkSmall + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
        '</div>' +
        '<div class="song-details">' +
          '<span class="song-title">' + song.title + '</span>' +
          '<span class="song-artist">' + song.artist + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="song-album">' + song.album + '</span>' +
      '<span class="song-duration">' + formatTime(song.duration) + '</span>' +
      '<div class="song-more">' +
        '<button class="btn-song-more" title="More options">' +
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>' +
        '</button>' +
      '</div>';

    li.addEventListener("click", function () { playSong(i); });
    li.addEventListener("contextmenu", function (e) { openContextMenu(e, i); });

    li.querySelector(".btn-song-more").addEventListener("click", function (e) {
      e.stopPropagation();
      openContextMenu(e, i);
    });

    songListEl.appendChild(li);
  });
}

// ---- Play / Pause / Next / Prev ----

function playSong(index) {
  let songs = getSongs();
  if (index < 0 || index >= songs.length) return;

  currentSongIndex = index;
  let song = songs[index];

  audio.src = song.previewUrl;
  audio.load();
  audio.play().catch(function () {
    showToast("Tap to enable audio playback");
  });

  isPlaying = true;
  updatePlayerUI(song);
  updateSongActive();
  updateQueuePanel();
}

function togglePlay() {
  if (currentSongIndex === -1) {
    playSong(0);
    return;
  }
  if (isPlaying) {
    pause();
  } else {
    resume();
  }
}

function pause() {
  isPlaying = false;
  audio.pause();
  updatePlayBtn();
  updateSongActive();
  nowPlayingArt.classList.remove("playing");
  vizArt.classList.remove("spinning");
}

function stopPlayback() {
  isPlaying = false;
  audio.pause();
  audio.src = "";
  currentSongIndex = -1;

  nowPlayingTitle.textContent = "No track selected";
  nowPlayingArtist.textContent = "Select a song to play";
  nowPlayingArt.innerHTML = '<div class="art-placeholder"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>';
  nowPlayingArt.classList.remove("has-art", "playing");

  progressFilled.style.width = "0%";
  progressThumb.style.left = "0";
  timeCurrent.textContent = "0:00";
  timeTotal.textContent = "0:00";

  vizArt.classList.remove("spinning");
  document.title = "Vibe Player - Music Streaming";
  updatePlayBtn();
}

function resume() {
  isPlaying = true;
  audio.play().catch(function () { });
  updatePlayBtn();
  updateSongActive();
  nowPlayingArt.classList.add("playing");
  vizArt.classList.add("spinning");
}

function playNext() {
  let songs = getSongs();
  if (songs.length === 0) return;

  // check the manual queue first
  if (queue.length > 0) {
    let nextId = queue.shift();
    let idx = songs.findIndex(function (s) { return s.id === nextId; });
    if (idx !== -1) {
      playSong(idx);
      return;
    }
  }

  if (repeatMode === 2) {
    playSong(currentSongIndex);
    return;
  }

  let next;
  if (shuffleOn) {
    next = Math.floor(Math.random() * songs.length);
  } else {
    next = (currentSongIndex + 1) % songs.length;
  }

  // stop at end if repeat is off
  if (next === 0 && repeatMode === 0 && !shuffleOn) {
    pause();
    return;
  }

  playSong(next);
}

function playPrev() {
  let songs = getSongs();
  if (songs.length === 0) return;

  // if we're more than 3 seconds in, restart the song
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  let prev;
  if (shuffleOn) {
    prev = Math.floor(Math.random() * songs.length);
  } else {
    prev = (currentSongIndex - 1 + songs.length) % songs.length;
  }
  playSong(prev);
}

// Audio element events
audio.addEventListener("timeupdate", function () {
  if (isDraggingProgress) return;
  let duration = audio.duration || 30;
  let pct = (audio.currentTime / duration) * 100;
  progressFilled.style.width = pct + "%";
  progressThumb.style.left = "calc(" + pct + "% - 6px)";
  timeCurrent.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("loadedmetadata", function () {
  timeTotal.textContent = formatTime(audio.duration);
  let songs = getSongs();
  if (songs[currentSongIndex]) {
    songs[currentSongIndex].duration = Math.floor(audio.duration);
  }
});

audio.addEventListener("ended", function () {
  playNext();
});

audio.addEventListener("error", function () {
  showToast("Couldn't play this track. Skipping...");
  setTimeout(playNext, 1000);
});

// ---- UI Update Functions ----

function updatePlayerUI(song) {
  nowPlayingTitle.textContent = song.title;
  nowPlayingArtist.textContent = song.artist;
  nowPlayingArt.innerHTML = '<img src="' + song.artwork + '" alt="' + song.title + '">';
  nowPlayingArt.classList.add("has-art", "playing");

  timeTotal.textContent = formatTime(song.duration);
  timeCurrent.textContent = "0:00";
  progressFilled.style.width = "0%";

  vizTitle.textContent = song.title;
  vizArtist.textContent = song.artist;
  vizArt.innerHTML = '<img src="' + song.artwork + '" alt="">';
  vizArt.classList.add("spinning");

  // tint the hero background
  let color = getColorFromString(song.title + song.artist);
  heroGradient.style.background = "linear-gradient(180deg, " + color + " 0%, var(--bg-secondary) 100%)";

  document.title = song.title + " - " + song.artist + " | Vibe Player";

  updatePlayBtn();
  updateLikeBtn(song.id);
}

function updatePlayBtn() {
  let iconPlay = btnPlay.querySelector(".icon-play");
  let iconPause = btnPlay.querySelector(".icon-pause");
  if (isPlaying) {
    iconPlay.classList.add("hidden");
    iconPause.classList.remove("hidden");
  } else {
    iconPlay.classList.remove("hidden");
    iconPause.classList.add("hidden");
  }

  if (isPlaying) {
    btnPlayAll.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  } else {
    btnPlayAll.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }
}

function updateSongActive() {
  let items = songListEl.querySelectorAll(".song-item");
  items.forEach(function (item, i) {
    item.classList.toggle("active", i === currentSongIndex);
    item.classList.toggle("playing", i === currentSongIndex && isPlaying);
  });
}

function updateLikeBtn(songId) {
  if (likedSongIds.has(songId)) {
    btnLike.classList.add("liked");
  } else {
    btnLike.classList.remove("liked");
  }
}

function updateVolumeUI() {
  let vol = isMuted ? 0 : volume;
  volumeFilled.style.width = (vol * 100) + "%";
  volumeThumb.style.left = "calc(" + (vol * 100) + "% - 6px)";

  let iconHigh = btnVolume.querySelector(".icon-vol-high");
  let iconMute = btnVolume.querySelector(".icon-vol-mute");
  if (isMuted || volume === 0) {
    iconHigh.classList.add("hidden");
    iconMute.classList.remove("hidden");
  } else {
    iconHigh.classList.remove("hidden");
    iconMute.classList.add("hidden");
  }
}

// ---- Shuffle / Repeat / Like ----

function toggleShuffle() {
  shuffleOn = !shuffleOn;
  btnShuffle.classList.toggle("active", shuffleOn);
  showToast(shuffleOn ? "Shuffle On" : "Shuffle Off");
  saveStorage("shuffle", shuffleOn);
}

function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  btnRepeat.classList.toggle("active", repeatMode > 0);

  if (repeatMode === 2) {
    btnRepeat.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/><text x="12" y="15" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" font-weight="bold">1</text></svg>';
  } else {
    btnRepeat.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>';
  }

  let labels = ["Repeat Off", "Repeat All", "Repeat One"];
  showToast(labels[repeatMode]);
  saveStorage("repeat", repeatMode);
}

function toggleLike() {
  let song = getSongs()[currentSongIndex];
  if (!song) return;
  toggleLikeSong(song.id);
}

function toggleLikeSong(songId) {
  if (likedSongIds.has(songId)) {
    likedSongIds.delete(songId);
    likedSongsData = likedSongsData.filter(function (s) { return s.id !== songId; });
    showToast("Removed from Liked Songs");
  } else {
    likedSongIds.add(songId);
    // find the full song object from wherever it currently lives
    let songObj = null;
    Object.keys(playlists).forEach(function (key) {
      if (!songObj) {
        songObj = playlists[key].songs.find(function (s) { return s.id === songId; });
      }
    });
    if (songObj) {
      likedSongsData.push(songObj);
    }
    showToast("Added to Liked Songs");
  }

  let current = getSongs()[currentSongIndex];
  if (current) updateLikeBtn(current.id);
  saveStorage("liked_ids", Array.from(likedSongIds));
  saveStorage("liked_songs_data", likedSongsData);
  updateFavCount();

  // refresh the list if we're currently viewing liked songs
  if (currentPlaylist === "liked") {
    renderSongList(getSongs());
  }
}

function updateFavCount() {
  favCountEl.textContent = likedSongsData.length;
}

// ---- Volume ----

function setVolume(val) {
  volume = Math.max(0, Math.min(1, val));
  isMuted = (volume === 0);
  audio.volume = volume;
  updateVolumeUI();
  saveStorage("volume", volume);
}

function toggleMute() {
  if (isMuted) {
    isMuted = false;
    volume = prevVolume || 0.7;
  } else {
    prevVolume = volume;
    isMuted = true;
  }
  audio.volume = isMuted ? 0 : volume;
  updateVolumeUI();
}

// ---- Seeking ----

function seekTo(e) {
  let duration = audio.duration;
  if (!duration) return;
  let rect = progressBar.getBoundingClientRect();
  let pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = pct * duration;
}

// ---- Queue ----

function addToQueue(songId) {
  queue.push(songId);
  let songs = getSongs();
  let song = songs.find(function (s) { return s.id === songId; });
  showToast('Added "' + (song ? song.title : "track") + '" to Queue');
  updateQueuePanel();
}

function removeFromQueue(index) {
  queue.splice(index, 1);
  updateQueuePanel();
}

function clearQueue() {
  queue = [];
  updateQueuePanel();
  showToast("Queue cleared");
}

function toggleQueuePanel() {
  isQueueOpen = !isQueueOpen;
  queuePanel.classList.toggle("hidden", !isQueueOpen);
  btnQueue.classList.toggle("active", isQueueOpen);
  if (isQueueOpen) updateQueuePanel();
}

function updateQueuePanel() {
  let songs = getSongs();
  let song = songs[currentSongIndex];

  if (song) {
    queueCurrentEl.innerHTML =
      '<div class="queue-current-art"><img src="' + song.artworkSmall + '" alt=""></div>' +
      '<div class="queue-current-info">' +
        '<span class="queue-current-title">' + song.title + '</span>' +
        '<span class="queue-current-artist">' + song.artist + '</span>' +
      '</div>';
  } else {
    queueCurrentEl.innerHTML = '<span class="queue-empty">Nothing playing</span>';
  }

  queueCountEl.textContent = queue.length;
  queueListEl.innerHTML = "";

  if (queue.length === 0) {
    queueEmptyState.classList.remove("hidden");
    return;
  }
  queueEmptyState.classList.add("hidden");

  queue.forEach(function (songId, i) {
    let s = songs.find(function (x) { return x.id === songId; });
    if (!s) return;

    let li = document.createElement("li");
    li.className = "queue-item";
    li.draggable = true;
    li.dataset.queueIndex = i;

    li.innerHTML =
      '<div class="queue-item-art"><img src="' + s.artworkSmall + '" alt=""></div>' +
      '<div class="queue-item-info">' +
        '<span class="queue-item-title">' + s.title + '</span>' +
        '<span class="queue-item-artist">' + s.artist + '</span>' +
      '</div>' +
      '<button class="queue-item-remove" title="Remove">' +
        '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';

    // drag and drop for reordering
    li.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", i);
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", function () {
      li.classList.remove("dragging");
    });
    li.addEventListener("dragover", function (e) {
      e.preventDefault();
      li.classList.add("drag-over");
    });
    li.addEventListener("dragleave", function () {
      li.classList.remove("drag-over");
    });
    li.addEventListener("drop", function (e) {
      e.preventDefault();
      li.classList.remove("drag-over");
      let from = parseInt(e.dataTransfer.getData("text/plain"));
      if (from !== i) {
        let moved = queue.splice(from, 1)[0];
        queue.splice(i, 0, moved);
        updateQueuePanel();
      }
    });

    li.querySelector(".queue-item-remove").addEventListener("click", function (e) {
      e.stopPropagation();
      removeFromQueue(i);
    });

    queueListEl.appendChild(li);
  });
}

// ---- Context Menu ----

function openContextMenu(e, songIndex) {
  e.preventDefault();
  contextSongIndex = songIndex;
  let songs = getSongs();
  let song = songs[songIndex];

  contextLikeText.textContent = likedSongIds.has(song.id) ? "Unlike" : "Like";
  playlistSubmenu.classList.add("hidden");
  contextMenu.classList.remove("hidden");

  // measure the menu so we can clamp it inside the viewport
  let menuW = contextMenu.offsetWidth || 220;
  let menuH = contextMenu.offsetHeight || 260;

  let x = e.clientX;
  let y = e.clientY;

  // flip left if overflowing right
  if (x + menuW > window.innerWidth - 10) {
    x = window.innerWidth - menuW - 10;
  }
  // flip up if overflowing bottom (account for player bar ~90px)
  if (y + menuH > window.innerHeight - 100) {
    y = window.innerHeight - menuH - 100;
  }

  // safety clamp
  x = Math.max(10, x);
  y = Math.max(10, y);

  contextMenu.style.left = x + "px";
  contextMenu.style.top = y + "px";
}

function closeContextMenu() {
  contextMenu.classList.add("hidden");
  playlistSubmenu.classList.add("hidden");
}

function handleContextAction(action) {
  let songs = getSongs();
  let song = songs[contextSongIndex];
  if (!song) return;

  if (action === "play") {
    playSong(contextSongIndex);
  } else if (action === "queue") {
    addToQueue(song.id);
  } else if (action === "like") {
    toggleLikeSong(song.id);
  } else if (action === "share") {
    let text = 'Listening to "' + song.title + '" by ' + song.artist + ' on Vibe Player!';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast("Copied to clipboard!");
    } else {
      showToast(text);
    }
  } else if (action === "addToPlaylist") {
    openPlaylistSubmenu();
    return;
  }
  closeContextMenu();
}

function openPlaylistSubmenu() {
  playlistSubmenu.innerHTML = "";

  Object.keys(playlists).forEach(function (key) {
    let pl = playlists[key];
    let btn = document.createElement("button");
    btn.className = "context-item";
    btn.textContent = pl.name;
    btn.addEventListener("click", function () {
      let song = getSongs()[contextSongIndex];
      if (song && !pl.songs.find(function (s) { return s.id === song.id; })) {
        pl.songs.push(song);
        showToast('Added to "' + pl.name + '"');
      } else {
        showToast("Already in that playlist");
      }
      closeContextMenu();
    });
    playlistSubmenu.appendChild(btn);
  });

  let menuRect = contextMenu.getBoundingClientRect();
  playlistSubmenu.classList.remove("hidden");

  let subW = playlistSubmenu.offsetWidth || 180;
  let subH = playlistSubmenu.offsetHeight || 200;

  // try placing to the right of the context menu
  let subX = menuRect.right + 4;
  let subY = menuRect.top;

  // if it overflows the right edge, place it to the left instead
  if (subX + subW > window.innerWidth - 10) {
    subX = menuRect.left - subW - 4;
  }

  // if still off-screen on the left, just pin it inside
  if (subX < 10) {
    subX = 10;
  }

  // if it overflows the bottom, shift it up
  if (subY + subH > window.innerHeight - 100) {
    subY = window.innerHeight - subH - 100;
  }
  if (subY < 10) subY = 10;

  playlistSubmenu.style.left = subX + "px";
  playlistSubmenu.style.top = subY + "px";
}

// ---- Visualizer (animated bars) ----

let vizAnimId = null;

function openVisualizer() {
  isVisualizerOpen = true;
  visualizerOverlay.classList.remove("hidden");
  resizeCanvas();
  drawVisualizerFrame();
}

function closeVisualizer() {
  isVisualizerOpen = false;
  visualizerOverlay.classList.add("hidden");
  if (vizAnimId) {
    cancelAnimationFrame(vizAnimId);
    vizAnimId = null;
  }
}

function resizeCanvas() {
  visualizerCanvas.width = window.innerWidth;
  visualizerCanvas.height = window.innerHeight;
}

function drawVisualizerFrame() {
  if (!isVisualizerOpen) return;

  let canvas = visualizerCanvas;
  let ctx = canvas.getContext("2d");
  let W = canvas.width;
  let H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  let time = Date.now() / 1000;
  let barCount = 64;
  let barWidth = W / barCount;
  let centerY = H * 0.55;

  // dynamic bars that react to playback
  for (let i = 0; i < barCount; i++) {
    let baseHeight;
    if (isPlaying) {
      // animated bouncing bars when music is playing
      let wave1 = Math.sin(time * 3 + i * 0.4) * 0.5 + 0.5;
      let wave2 = Math.sin(time * 5 + i * 0.7) * 0.3 + 0.5;
      let wave3 = Math.cos(time * 2 + i * 0.2) * 0.2 + 0.5;
      baseHeight = (wave1 + wave2 + wave3) / 3;
      baseHeight = baseHeight * 0.8 + Math.random() * 0.2;
    } else {
      baseHeight = (Math.sin(time * 0.5 + i * 0.3) + 1) / 2 * 0.1;
    }

    let barH = baseHeight * H * 0.35 + 2;
    let hue = (i / barCount) * 80 + time * 20;

    // top bars
    ctx.fillStyle = "hsla(" + hue + ", 70%, 55%, " + (0.4 + baseHeight * 0.5) + ")";
    ctx.fillRect(i * barWidth, centerY - barH, barWidth - 2, barH);

    // reflection
    ctx.fillStyle = "hsla(" + hue + ", 70%, 55%, " + (0.1 + baseHeight * 0.15) + ")";
    ctx.fillRect(i * barWidth, centerY, barWidth - 2, barH * 0.4);
  }

  // draw a wave line on top
  if (isPlaying) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(29, 185, 84, 0.3)";
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 3) {
      let y = centerY + Math.sin(x * 0.015 + time * 2.5) * 40 + Math.sin(x * 0.03 + time * 4) * 15;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  vizAnimId = requestAnimationFrame(drawVisualizerFrame);
}

// ---- Playlist Switching ----

function switchPlaylist(key) {
  if (!playlists[key]) return;

  stopPlayback();
  pushNav(key);
  currentPlaylist = key;
  sortOrder = "default";
  isSearchActive = false;
  searchResults = [];
  searchInput.value = "";
  btnClearSearch.classList.add("hidden");
  updateSortButton();

  heroTitleEl.textContent = playlists[key].name;
  qa(".playlist-item").forEach(function (item) {
    item.classList.toggle("active", item.dataset.playlist === key);
  });

  loadPlaylistSongs(key);
}

function createPlaylist(name) {
  if (!name.trim()) return;
  let key = name.trim().toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();

  playlists[key] = { name: name.trim(), query: name.trim(), songs: [], loaded: false };

  // save custom playlists
  let custom = {};
  Object.keys(playlists).forEach(function (k) {
    if (!["liked", "bollywood", "chill", "workout", "focus"].includes(k)) {
      custom[k] = playlists[k];
    }
  });
  saveStorage("custom_playlists", custom);

  // add to sidebar
  let li = document.createElement("li");
  li.className = "playlist-item";
  li.dataset.playlist = key;
  let hue = Math.floor(Math.random() * 360);
  li.innerHTML = '<div class="playlist-icon" style="background:hsl(' + hue + ',70%,50%)">' + name.charAt(0).toUpperCase() + '</div><span>' + name.trim() + '</span>';
  li.addEventListener("click", function () { switchPlaylist(key); });
  playlistListEl.appendChild(li);

  showToast('Created "' + name.trim() + '"');
}

// ---- Navigation History ----

function pushNav(playlistKey) {
  navHistory = navHistory.slice(0, navHistoryPos + 1);
  navHistory.push(playlistKey);
  navHistoryPos = navHistory.length - 1;
}

function goBack() {
  if (navHistoryPos > 0) {
    stopPlayback();
    navHistoryPos--;
    let key = navHistory[navHistoryPos];
    currentPlaylist = key;
    heroTitleEl.textContent = playlists[key]?.name || "Unknown";
    qa(".playlist-item").forEach(function (item) {
      item.classList.toggle("active", item.dataset.playlist === key);
    });
    loadPlaylistSongs(key);
  }
}

function goForward() {
  if (navHistoryPos < navHistory.length - 1) {
    stopPlayback();
    navHistoryPos++;
    let key = navHistory[navHistoryPos];
    currentPlaylist = key;
    heroTitleEl.textContent = playlists[key]?.name || "Unknown";
    qa(".playlist-item").forEach(function (item) {
      item.classList.toggle("active", item.dataset.playlist === key);
    });
    loadPlaylistSongs(key);
  }
}

// ---- Search (iTunes API) ----

function handleSearch(query) {
  clearTimeout(searchTimeout);
  let q_val = query.trim();

  btnClearSearch.classList.toggle("hidden", !q_val);

  if (!q_val) {
    isSearchActive = false;
    searchResults = [];
    currentSongIndex = -1;
    loadPlaylistSongs(currentPlaylist);
    return;
  }

  searchTimeout = setTimeout(async function () {
    songListEl.innerHTML = "";
    loadingState.classList.remove("hidden");

    try {
      let results = await fetchSongs(q_val, 30);
      loadingState.classList.add("hidden");

      if (results.length === 0) {
        songListEl.innerHTML = '<li style="padding:40px;text-align:center;color:var(--text-muted)">No results for "' + query + '"</li>';
        songCountEl.textContent = "0";
        isSearchActive = false;
        return;
      }

      isSearchActive = true;
      searchResults = results;
      currentSongIndex = -1;
      renderSongList(results);
    } catch (err) {
      loadingState.classList.add("hidden");
      songListEl.innerHTML = '<li style="padding:40px;text-align:center;color:var(--text-muted)">Search failed. Try again.</li>';
    }
  }, 500);
}

// ---- Sort ----

function cycleSort() {
  let orders = ["default", "title", "artist"];
  let labels = ["Default", "Title A-Z", "Artist A-Z"];
  let idx = (orders.indexOf(sortOrder) + 1) % orders.length;
  sortOrder = orders[idx];
  updateSortButton();
  showToast("Sorted by: " + labels[idx]);
  renderSongList(getSongs());
}

function updateSortButton() {
  let labelMap = { default: "Sort", title: "Title A-Z", artist: "Artist A-Z" };
  let label = labelMap[sortOrder] || "Sort";
  let span = btnSort.querySelector("span");
  if (span) span.textContent = label;

  btnSort.classList.toggle("active", sortOrder !== "default");
}

// ---- Profile ----

function toggleProfileDropdown() {
  let isOpen = !profileDropdown.classList.contains("hidden");
  profileDropdown.classList.toggle("hidden");
  userAvatar.classList.toggle("open", !isOpen);
}

function applyProfile() {
  let initial = profile.name.charAt(0).toUpperCase();
  userAvatar.textContent = initial;
  userAvatar.style.background = "linear-gradient(135deg, " + profile.color + ", " + profile.color + "cc)";
  dropdownName.textContent = profile.name;

  let ddAvatar = q(".dropdown-avatar");
  if (ddAvatar) {
    ddAvatar.textContent = initial;
    ddAvatar.style.background = "linear-gradient(135deg, " + profile.color + ", " + profile.color + "cc)";
  }
  let heroUser = q(".hero-user");
  if (heroUser) heroUser.textContent = profile.name;
}

function openEditProfile() {
  profileDropdown.classList.add("hidden");
  userAvatar.classList.remove("open");
  $("profileModalOverlay").classList.remove("hidden");
  $("profileNameInput").value = profile.name;
  $("colorPicker").querySelectorAll(".color-option").forEach(function (c) {
    c.classList.toggle("active", c.dataset.color === profile.color);
  });
}

function saveProfile() {
  let name = $("profileNameInput").value.trim();
  if (!name) {
    showToast("Name can't be empty");
    return;
  }
  let activeColor = $("colorPicker").querySelector(".color-option.active");
  profile.name = name;
  profile.color = activeColor ? activeColor.dataset.color : "#1db954";
  saveStorage("profile", profile);
  applyProfile();
  $("profileModalOverlay").classList.add("hidden");
  showToast("Profile updated!");
}

// ---- Settings ----

function openSettings() {
  profileDropdown.classList.add("hidden");
  userAvatar.classList.remove("open");
  $("settingsModalOverlay").classList.remove("hidden");
  $("settingQuality").value = settings.quality;
  $("settingNotifications").classList.toggle("active", settings.notifications);
  $("settingAutoplay").classList.toggle("active", settings.autoplay);
}

function saveSettings() {
  settings.quality = $("settingQuality").value;
  settings.notifications = $("settingNotifications").classList.contains("active");
  settings.autoplay = $("settingAutoplay").classList.contains("active");
  saveStorage("settings", settings);
  $("settingsModalOverlay").classList.add("hidden");
  showToast("Settings saved!");
}

// ---- Fullscreen ----

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(function () { });
  }
}

// ---- Keyboard Shortcuts ----

function handleKeyDown(e) {
  // don't capture when user is typing in an input
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

  switch (e.code) {
    case "Space":
      e.preventDefault();
      togglePlay();
      break;
    case "ArrowRight":
      e.preventDefault();
      if (e.shiftKey) playNext();
      else if (audio.duration) audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
      break;
    case "ArrowLeft":
      e.preventDefault();
      if (e.shiftKey) playPrev();
      else audio.currentTime = Math.max(audio.currentTime - 5, 0);
      break;
    case "ArrowUp":
      e.preventDefault();
      setVolume(volume + 0.05);
      break;
    case "ArrowDown":
      e.preventDefault();
      setVolume(volume - 0.05);
      break;
    case "KeyM":
      toggleMute();
      break;
    case "KeyS":
      toggleShuffle();
      break;
    case "KeyR":
      toggleRepeat();
      break;
    case "KeyV":
      isVisualizerOpen ? closeVisualizer() : openVisualizer();
      break;
    case "KeyQ":
      toggleQueuePanel();
      break;
    case "KeyF":
      toggleFullscreen();
      break;
    case "KeyL":
      toggleLike();
      break;
    case "Slash":
      e.preventDefault();
      searchInput.focus();
      break;
    case "Escape":
      closeContextMenu();
      if (isVisualizerOpen) closeVisualizer();
      qa(".modal-overlay:not(.hidden)").forEach(function (m) {
        m.classList.add("hidden");
      });
      break;
  }
}

// ---- Set Up All Event Listeners ----

function setupEvents() {
  // player controls
  btnPlay.addEventListener("click", togglePlay);
  btnNext.addEventListener("click", playNext);
  btnPrev.addEventListener("click", playPrev);
  btnShuffle.addEventListener("click", toggleShuffle);
  btnRepeat.addEventListener("click", toggleRepeat);
  btnLike.addEventListener("click", toggleLike);

  btnPlayAll.addEventListener("click", function () {
    if (isPlaying && currentSongIndex >= 0) pause();
    else if (currentSongIndex >= 0) resume();
    else playSong(0);
  });

  btnShuffleAll.addEventListener("click", function () {
    shuffleOn = true;
    btnShuffle.classList.add("active");
    saveStorage("shuffle", true);
    let songs = getSongs();
    if (songs.length > 0) {
      playSong(Math.floor(Math.random() * songs.length));
    }
    showToast("Shuffle Play");
  });

  btnSort.addEventListener("click", cycleSort);

  // progress bar dragging
  progressBar.addEventListener("mousedown", function (e) {
    isDraggingProgress = true;
    seekTo(e);
  });

  document.addEventListener("mousemove", function (e) {
    if (isDraggingProgress) seekTo(e);
    if (isDraggingVolume) {
      let rect = volumeBar.getBoundingClientRect();
      setVolume((e.clientX - rect.left) / rect.width);
    }
  });

  document.addEventListener("mouseup", function () {
    isDraggingProgress = false;
    isDraggingVolume = false;
  });

  // volume
  btnVolume.addEventListener("click", toggleMute);
  volumeBar.addEventListener("mousedown", function (e) {
    isDraggingVolume = true;
    let rect = volumeBar.getBoundingClientRect();
    setVolume((e.clientX - rect.left) / rect.width);
  });

  // visualizer
  btnVisualizer.addEventListener("click", openVisualizer);
  $("btnCloseVisualizer").addEventListener("click", closeVisualizer);

  // queue
  btnQueue.addEventListener("click", toggleQueuePanel);
  $("btnCloseQueue").addEventListener("click", toggleQueuePanel);
  $("btnClearQueue").addEventListener("click", clearQueue);

  // fullscreen
  btnFullscreen.addEventListener("click", toggleFullscreen);

  // navigation arrows
  btnBack.addEventListener("click", goBack);
  btnForward.addEventListener("click", goForward);

  // playlist sidebar items
  playlistListEl.querySelectorAll(".playlist-item").forEach(function (item) {
    item.addEventListener("click", function () {
      switchPlaylist(item.dataset.playlist);
    });
  });

  // nav menu (home / search / library)
  qa(".nav-item").forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      qa(".nav-item").forEach(function (n) { n.classList.remove("active"); });
      item.classList.add("active");
      if (item.dataset.section === "search") searchInput.focus();
      else if (item.dataset.section === "home") switchPlaylist("bollywood");
      else if (item.dataset.section === "library") showToast("Showing all playlists");
    });
  });

  // create playlist modal
  $("btnAddPlaylist").addEventListener("click", function () {
    modalOverlay.classList.remove("hidden");
    playlistNameInput.value = "";
    charCount.textContent = "0";
    setTimeout(function () { playlistNameInput.focus(); }, 100);
  });

  playlistNameInput.addEventListener("input", function () {
    charCount.textContent = playlistNameInput.value.length;
  });

  $("btnCancelModal").addEventListener("click", function () {
    modalOverlay.classList.add("hidden");
  });

  $("btnCreatePlaylist").addEventListener("click", function () {
    createPlaylist(playlistNameInput.value);
    modalOverlay.classList.add("hidden");
  });

  playlistNameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      createPlaylist(playlistNameInput.value);
      modalOverlay.classList.add("hidden");
    }
  });

  modalOverlay.addEventListener("click", function (e) {
    if (e.target === modalOverlay) modalOverlay.classList.add("hidden");
  });

  // search input
  searchInput.addEventListener("input", function (e) {
    handleSearch(e.target.value);
  });

  btnClearSearch.addEventListener("click", function () {
    searchInput.value = "";
    btnClearSearch.classList.add("hidden");
    isSearchActive = false;
    searchResults = [];
    currentSongIndex = -1;
    loadPlaylistSongs(currentPlaylist);
  });

  // close context menu on outside click
  document.addEventListener("click", function (e) {
    if (!contextMenu.contains(e.target) && !playlistSubmenu.contains(e.target)) {
      closeContextMenu();
    }
    if (!profileDropdown.contains(e.target) && !userAvatar.contains(e.target)) {
      profileDropdown.classList.add("hidden");
      userAvatar.classList.remove("open");
    }
  });

  contextMenu.querySelectorAll(".context-item").forEach(function (item) {
    item.addEventListener("click", function () {
      handleContextAction(item.dataset.action);
    });
  });

  // profile dropdown
  userAvatar.addEventListener("click", toggleProfileDropdown);
  $("btnEditProfile").addEventListener("click", openEditProfile);
  $("btnCancelProfile").addEventListener("click", function () {
    $("profileModalOverlay").classList.add("hidden");
  });
  $("btnSaveProfile").addEventListener("click", saveProfile);

  $("colorPicker").addEventListener("click", function (e) {
    let opt = e.target.closest(".color-option");
    if (opt) {
      $("colorPicker").querySelectorAll(".color-option").forEach(function (c) {
        c.classList.remove("active");
      });
      opt.classList.add("active");
    }
  });

  $("profileModalOverlay").addEventListener("click", function (e) {
    if (e.target === $("profileModalOverlay")) $("profileModalOverlay").classList.add("hidden");
  });

  // settings
  $("btnSettings").addEventListener("click", openSettings);
  $("btnCancelSettings").addEventListener("click", function () {
    $("settingsModalOverlay").classList.add("hidden");
  });
  $("btnSaveSettings").addEventListener("click", saveSettings);
  $("settingsModalOverlay").addEventListener("click", function (e) {
    if (e.target === $("settingsModalOverlay")) $("settingsModalOverlay").classList.add("hidden");
  });

  $("settingNotifications").addEventListener("click", function () {
    $("settingNotifications").classList.toggle("active");
  });
  $("settingAutoplay").addEventListener("click", function () {
    $("settingAutoplay").classList.toggle("active");
  });

  // keyboard shortcuts modal
  $("btnKeyboardShortcuts").addEventListener("click", function () {
    profileDropdown.classList.add("hidden");
    userAvatar.classList.remove("open");
    $("shortcutsModalOverlay").classList.remove("hidden");
  });
  $("btnCloseShortcuts").addEventListener("click", function () {
    $("shortcutsModalOverlay").classList.add("hidden");
  });
  $("shortcutsModalOverlay").addEventListener("click", function (e) {
    if (e.target === $("shortcutsModalOverlay")) $("shortcutsModalOverlay").classList.add("hidden");
  });

  // theme toggle (visual only for now)
  $("btnThemeToggle").addEventListener("click", function () {
    $("themeToggle").classList.toggle("active");
    showToast($("themeToggle").classList.contains("active") ? "Dark Mode On" : "Light theme coming soon!");
  });

  // logout
  $("btnLogout").addEventListener("click", function () {
    profileDropdown.classList.add("hidden");
    userAvatar.classList.remove("open");
    showToast("Logged out (demo)");
  });

  // favorites button in top bar
  btnFavorites.addEventListener("click", function () {
    switchPlaylist("liked");
  });

  // retry button for error state
  if ($("btnRetry")) {
    $("btnRetry").addEventListener("click", function () {
      loadPlaylistSongs(currentPlaylist);
    });
  }

  // keyboard
  document.addEventListener("keydown", handleKeyDown);

  // resize canvas when window resizes
  window.addEventListener("resize", function () {
    if (isVisualizerOpen) resizeCanvas();
  });
}

// ---- Initialize App ----

function init() {
  // make sure nothing plays on load
  audio.pause();
  audio.src = "";

  applyProfile();
  updateVolumeUI();
  updateFavCount();

  if (shuffleOn) btnShuffle.classList.add("active");
  if (repeatMode > 0) btnRepeat.classList.add("active");

  pushNav(currentPlaylist);
  setupEvents();

  // load the default playlist from iTunes
  loadPlaylistSongs(currentPlaylist);
}

document.addEventListener("DOMContentLoaded", init);
