// Audio playback: play, pause, next, prev, seeking, volume
// Depends on: state.js, dom.js, helpers.js, ui.js, queue.js

function playSong(index) {
  var songs = getSongs();
  if (index < 0 || index >= songs.length) return;

  currentSongIndex = index;
  var song = songs[index];

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
  var songs = getSongs();
  if (songs.length === 0) return;

  if (queue.length > 0) {
    var nextId = queue.shift();
    var idx = songs.findIndex(function (s) { return s.id === nextId; });
    if (idx !== -1) {
      playSong(idx);
      return;
    }
  }

  if (repeatMode === 2) {
    playSong(currentSongIndex);
    return;
  }

  var next;
  if (shuffleOn) {
    next = Math.floor(Math.random() * songs.length);
  } else {
    next = (currentSongIndex + 1) % songs.length;
  }

  if (next === 0 && repeatMode === 0 && !shuffleOn) {
    pause();
    return;
  }

  playSong(next);
}

function playPrev() {
  var songs = getSongs();
  if (songs.length === 0) return;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  var prev;
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
  var duration = audio.duration || 30;
  var pct = (audio.currentTime / duration) * 100;
  progressFilled.style.width = pct + "%";
  progressThumb.style.left = "calc(" + pct + "% - 6px)";
  timeCurrent.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("loadedmetadata", function () {
  timeTotal.textContent = formatTime(audio.duration);
  var songs = getSongs();
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

// Shuffle / Repeat / Like controls

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

  var labels = ["Repeat Off", "Repeat All", "Repeat One"];
  showToast(labels[repeatMode]);
  saveStorage("repeat", repeatMode);
}

function toggleLike() {
  var song = getSongs()[currentSongIndex];
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
    var songObj = null;
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

  var current = getSongs()[currentSongIndex];
  if (current) updateLikeBtn(current.id);
  saveStorage("liked_ids", Array.from(likedSongIds));
  saveStorage("liked_songs_data", likedSongsData);
  updateFavCount();

  if (currentPlaylist === "liked") {
    renderSongList(getSongs());
  }
}

// Volume

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

// Seeking

function seekTo(e) {
  var duration = audio.duration;
  if (!duration) return;
  var rect = progressBar.getBoundingClientRect();
  var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = pct * duration;
}

// Sort

function cycleSort() {
  var orders = ["default", "title", "artist"];
  var labels = ["Default", "Title A-Z", "Artist A-Z"];
  var idx = (orders.indexOf(sortOrder) + 1) % orders.length;
  sortOrder = orders[idx];
  updateSortButton();
  showToast("Sorted by: " + labels[idx]);
  renderSongList(getSongs());
}

// Fullscreen

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(function () { });
  }
}
