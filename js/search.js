// Search functionality using iTunes API
// Depends on: api.js, state.js, dom.js, helpers.js, songlist.js

function handleSearch(query) {
  clearTimeout(searchTimeout);
  var q_val = query.trim();

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
      var results = await fetchSongs(q_val, 30);
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
