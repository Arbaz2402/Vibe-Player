// Persistent storage helpers using localStorage

function loadStorage(key, fallback) {
  try {
    var raw = localStorage.getItem("vibe_" + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStorage(key, val) {
  try {
    localStorage.setItem("vibe_" + key, JSON.stringify(val));
  } catch (e) { }
}
