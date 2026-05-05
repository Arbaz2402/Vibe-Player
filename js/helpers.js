// Utility / helper functions
// Depends on: state.js, dom.js

function formatTime(sec) {
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

var toastTimer = null;
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
  var songs;
  if (isSearchActive) {
    songs = searchResults;
  } else if (currentPlaylist === "liked") {
    songs = likedSongsData;
  } else {
    songs = playlists[currentPlaylist]?.songs || [];
  }

  if (sortOrder === "title") {
    songs = [].concat(songs).sort(function (a, b) { return a.title.localeCompare(b.title); });
  } else if (sortOrder === "artist") {
    songs = [].concat(songs).sort(function (a, b) { return a.artist.localeCompare(b.artist); });
  }
  return songs;
}

function getColorFromString(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var h = Math.abs(hash % 360);
  return "hsl(" + h + ", 60%, 40%)";
}
