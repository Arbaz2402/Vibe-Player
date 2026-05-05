// Song list rendering and loading
// Depends on: api.js, state.js, dom.js, helpers.js, ui.js, player.js, contextmenu.js

async function loadPlaylistSongs(key) {
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

  var pl = playlists[key];
  if (!pl) return;

  if (pl.loaded && pl.songs.length > 0) {
    renderSongList(getSongs());
    return;
  }

  songListEl.innerHTML = "";
  loadingState.classList.remove("hidden");
  errorState.classList.add("hidden");

  try {
    var songs = await fetchSongs(pl.query);

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

function renderSongList(songs) {
  songListEl.innerHTML = "";
  songCountEl.textContent = songs.length;
  totalDurationEl.textContent = Math.floor(songs.length * 30 / 60) + " min";

  songs.forEach(function (song, i) {
    var li = document.createElement("li");
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
