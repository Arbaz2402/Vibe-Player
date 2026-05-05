// App initialization — entry point
// Depends on: all other modules

function init() {
  audio.pause();
  audio.src = "";

  applyProfile();
  updateVolumeUI();
  updateFavCount();

  if (shuffleOn) btnShuffle.classList.add("active");
  if (repeatMode > 0) btnRepeat.classList.add("active");

  pushNav(currentPlaylist);
  setupEvents();

  loadPlaylistSongs(currentPlaylist);
}

document.addEventListener("DOMContentLoaded", init);
