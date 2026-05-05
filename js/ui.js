// UI update functions
// Depends on: state.js, dom.js, helpers.js

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

  var color = getColorFromString(song.title + song.artist);
  heroGradient.style.background = "linear-gradient(180deg, " + color + " 0%, var(--bg-secondary) 100%)";

  document.title = song.title + " - " + song.artist + " | Vibe Player";

  updatePlayBtn();
  updateLikeBtn(song.id);
}

function updatePlayBtn() {
  var iconPlay = btnPlay.querySelector(".icon-play");
  var iconPause = btnPlay.querySelector(".icon-pause");
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
  var items = songListEl.querySelectorAll(".song-item");
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
  var vol = isMuted ? 0 : volume;
  volumeFilled.style.width = (vol * 100) + "%";
  volumeThumb.style.left = "calc(" + (vol * 100) + "% - 6px)";

  var iconHigh = btnVolume.querySelector(".icon-vol-high");
  var iconMute = btnVolume.querySelector(".icon-vol-mute");
  if (isMuted || volume === 0) {
    iconHigh.classList.add("hidden");
    iconMute.classList.remove("hidden");
  } else {
    iconHigh.classList.remove("hidden");
    iconMute.classList.add("hidden");
  }
}

function updateFavCount() {
  favCountEl.textContent = likedSongsData.length;
}

function updateSortButton() {
  var labelMap = { default: "Sort", title: "Title A-Z", artist: "Artist A-Z" };
  var label = labelMap[sortOrder] || "Sort";
  var span = btnSort.querySelector("span");
  if (span) span.textContent = label;
  btnSort.classList.toggle("active", sortOrder !== "default");
}
