// Right-click context menu and playlist submenu
// Depends on: state.js, dom.js, helpers.js, player.js, queue.js

function openContextMenu(e, songIndex) {
  e.preventDefault();
  contextSongIndex = songIndex;
  var songs = getSongs();
  var song = songs[songIndex];

  contextLikeText.textContent = likedSongIds.has(song.id) ? "Unlike" : "Like";
  playlistSubmenu.classList.add("hidden");
  contextMenu.classList.remove("hidden");

  var menuW = contextMenu.offsetWidth || 220;
  var menuH = contextMenu.offsetHeight || 260;

  var x = e.clientX;
  var y = e.clientY;

  if (x + menuW > window.innerWidth - 10) {
    x = window.innerWidth - menuW - 10;
  }
  if (y + menuH > window.innerHeight - 100) {
    y = window.innerHeight - menuH - 100;
  }

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
  var songs = getSongs();
  var song = songs[contextSongIndex];
  if (!song) return;

  if (action === "play") {
    playSong(contextSongIndex);
  } else if (action === "queue") {
    addToQueue(song.id);
  } else if (action === "like") {
    toggleLikeSong(song.id);
  } else if (action === "share") {
    var text = 'Listening to "' + song.title + '" by ' + song.artist + ' on Vibe Player!';
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
    var pl = playlists[key];
    var btn = document.createElement("button");
    btn.className = "context-item";
    btn.textContent = pl.name;
    btn.addEventListener("click", function () {
      var song = getSongs()[contextSongIndex];
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

  var menuRect = contextMenu.getBoundingClientRect();
  playlistSubmenu.classList.remove("hidden");

  var subW = playlistSubmenu.offsetWidth || 180;
  var subH = playlistSubmenu.offsetHeight || 200;

  var subX = menuRect.right + 4;
  var subY = menuRect.top;

  if (subX + subW > window.innerWidth - 10) {
    subX = menuRect.left - subW - 4;
  }
  if (subX < 10) {
    subX = 10;
  }
  if (subY + subH > window.innerHeight - 100) {
    subY = window.innerHeight - subH - 100;
  }
  if (subY < 10) subY = 10;

  playlistSubmenu.style.left = subX + "px";
  playlistSubmenu.style.top = subY + "px";
}
