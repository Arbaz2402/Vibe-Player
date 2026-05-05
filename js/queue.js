// Queue panel management
// Depends on: state.js, dom.js, helpers.js

function addToQueue(songId) {
  queue.push(songId);
  var songs = getSongs();
  var song = songs.find(function (s) { return s.id === songId; });
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
  var songs = getSongs();
  var song = songs[currentSongIndex];

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
    var s = songs.find(function (x) { return x.id === songId; });
    if (!s) return;

    var li = document.createElement("li");
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
      var from = parseInt(e.dataTransfer.getData("text/plain"));
      if (from !== i) {
        var moved = queue.splice(from, 1)[0];
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
