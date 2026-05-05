// Event listeners and keyboard shortcuts
// Depends on: all other modules

function handleKeyDown(e) {
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

function setupEvents() {
  // Player controls
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
    var songs = getSongs();
    if (songs.length > 0) {
      playSong(Math.floor(Math.random() * songs.length));
    }
    showToast("Shuffle Play");
  });

  btnSort.addEventListener("click", cycleSort);

  // Progress bar dragging
  progressBar.addEventListener("mousedown", function (e) {
    isDraggingProgress = true;
    seekTo(e);
  });

  document.addEventListener("mousemove", function (e) {
    if (isDraggingProgress) seekTo(e);
    if (isDraggingVolume) {
      var rect = volumeBar.getBoundingClientRect();
      setVolume((e.clientX - rect.left) / rect.width);
    }
  });

  document.addEventListener("mouseup", function () {
    isDraggingProgress = false;
    isDraggingVolume = false;
  });

  // Volume
  btnVolume.addEventListener("click", toggleMute);
  volumeBar.addEventListener("mousedown", function (e) {
    isDraggingVolume = true;
    var rect = volumeBar.getBoundingClientRect();
    setVolume((e.clientX - rect.left) / rect.width);
  });

  // Visualizer
  btnVisualizer.addEventListener("click", openVisualizer);
  $("btnCloseVisualizer").addEventListener("click", closeVisualizer);

  // Queue
  btnQueue.addEventListener("click", toggleQueuePanel);
  $("btnCloseQueue").addEventListener("click", toggleQueuePanel);
  $("btnClearQueue").addEventListener("click", clearQueue);

  // Fullscreen
  btnFullscreen.addEventListener("click", toggleFullscreen);

  // Navigation arrows
  btnBack.addEventListener("click", goBack);
  btnForward.addEventListener("click", goForward);

  // Playlist sidebar items
  playlistListEl.querySelectorAll(".playlist-item").forEach(function (item) {
    item.addEventListener("click", function () {
      switchPlaylist(item.dataset.playlist);
    });
  });

  // Nav menu (home / search / library)
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

  // Create playlist modal
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

  // Search input
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

  // Close context menu on outside click
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

  // Profile dropdown
  userAvatar.addEventListener("click", toggleProfileDropdown);
  $("btnEditProfile").addEventListener("click", openEditProfile);
  $("btnCancelProfile").addEventListener("click", function () {
    $("profileModalOverlay").classList.add("hidden");
  });
  $("btnSaveProfile").addEventListener("click", saveProfile);

  $("colorPicker").addEventListener("click", function (e) {
    var opt = e.target.closest(".color-option");
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

  // Keyboard shortcuts modal
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

  // Theme toggle
  $("btnThemeToggle").addEventListener("click", function () {
    $("themeToggle").classList.toggle("active");
    showToast($("themeToggle").classList.contains("active") ? "Dark Mode On" : "Light theme coming soon!");
  });

  // Logout
  $("btnLogout").addEventListener("click", function () {
    profileDropdown.classList.add("hidden");
    userAvatar.classList.remove("open");
    showToast("Logged out (demo)");
  });

  // Favorites button in top bar
  btnFavorites.addEventListener("click", function () {
    switchPlaylist("liked");
  });

  // Retry button for error state
  if ($("btnRetry")) {
    $("btnRetry").addEventListener("click", function () {
      loadPlaylistSongs(currentPlaylist);
    });
  }

  // Keyboard
  document.addEventListener("keydown", handleKeyDown);

  // Resize canvas when window resizes
  window.addEventListener("resize", function () {
    if (isVisualizerOpen) resizeCanvas();
  });
}
