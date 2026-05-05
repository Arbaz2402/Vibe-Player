// iTunes Search API integration

var API_URL = "https://itunes.apple.com/search";

async function fetchSongs(query, limit) {
  if (!limit) limit = 25;
  try {
    var url = API_URL + "?term=" + encodeURIComponent(query) + "&media=music&limit=" + limit + "&country=IN";
    var response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    var data = await response.json();

    if (!data || !data.results) return [];

    return data.results
      .filter(function (track) { return track.previewUrl; })
      .map(function (track) {
        return {
          id: track.trackId,
          title: track.trackName || "Unknown Title",
          artist: track.artistName || "Unknown Artist",
          album: track.collectionName || "Single",
          artwork: (track.artworkUrl100 || "").replace("100x100", "300x300") || "assets/img/default-art.png",
          artworkSmall: track.artworkUrl100 || "assets/img/default-art.png",
          previewUrl: track.previewUrl,
          duration: 30
        };
      });
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}
