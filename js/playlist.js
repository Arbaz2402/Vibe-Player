// Playlist switching, creation, and navigation
// Depends on: state.js, dom.js, helpers.js, ui.js, player.js, songlist.js, storage.js

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
  var key = name.trim().toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();

  playlists[key] = { name: name.trim(), query: name.trim(), songs: [], loaded: false };

  var custom = {};
  Object.keys(playlists).forEach(function (k) {
    if (!["liked", "bollywood", "chill", "workout", "focus"].includes(k)) {
      custom[k] = playlists[k];
    }
  });
  saveStorage("custom_playlists", custom);

  var li = document.createElement("li");
  li.className = "playlist-item";
  li.dataset.playlist = key;
  var hue = Math.floor(Math.random() * 360);
  li.innerHTML = '<div class="playlist-icon" style="background:hsl(' + hue + ',70%,50%)">' + name.charAt(0).toUpperCase() + '</div><span>' + name.trim() + '</span>';
  li.addEventListener("click", function () { switchPlaylist(key); });
  playlistListEl.appendChild(li);

  showToast('Created "' + name.trim() + '"');
}

// Navigation history

function pushNav(playlistKey) {
  navHistory = navHistory.slice(0, navHistoryPos + 1);
  navHistory.push(playlistKey);
  navHistoryPos = navHistory.length - 1;
}

function goBack() {
  if (navHistoryPos > 0) {
    stopPlayback();
    navHistoryPos--;
    var key = navHistory[navHistoryPos];
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
    var key = navHistory[navHistoryPos];
    currentPlaylist = key;
    heroTitleEl.textContent = playlists[key]?.name || "Unknown";
    qa(".playlist-item").forEach(function (item) {
      item.classList.toggle("active", item.dataset.playlist === key);
    });
    loadPlaylistSongs(key);
  }
}
