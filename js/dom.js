// DOM element references
// Depends on: the HTML being loaded

var $ = function (id) { return document.getElementById(id); };
var q = function (sel) { return document.querySelector(sel); };
var qa = function (sel) { return document.querySelectorAll(sel); };

var songListEl = $("songList");
var songCountEl = $("songCount");
var totalDurationEl = $("totalDuration");
var heroTitleEl = $("heroTitle");
var heroGradient = q(".hero-gradient");

var nowPlayingTitle = $("nowPlayingTitle");
var nowPlayingArtist = $("nowPlayingArtist");
var nowPlayingArt = $("nowPlayingArt");

var btnPlay = $("btnPlay");
var btnPrev = $("btnPrev");
var btnNext = $("btnNext");
var btnShuffle = $("btnShuffle");
var btnRepeat = $("btnRepeat");
var btnLike = $("btnLike");
var btnPlayAll = $("btnPlayAll");
var btnShuffleAll = $("btnShuffleAll");
var btnVolume = $("btnVolume");
var btnVisualizer = $("btnVisualizer");
var btnQueue = $("btnQueue");
var btnFullscreen = $("btnFullscreen");
var btnSort = $("btnSort");
var btnBack = $("btnBack");
var btnForward = $("btnForward");

var progressBar = $("progressBar");
var progressFilled = $("progressFilled");
var progressThumb = $("progressThumb");
var timeCurrent = $("timeCurrent");
var timeTotal = $("timeTotal");

var volumeBar = $("volumeBar");
var volumeFilled = $("volumeFilled");
var volumeThumb = $("volumeThumb");

var visualizerOverlay = $("visualizerOverlay");
var visualizerCanvas = $("visualizerCanvas");
var vizTitle = $("vizTitle");
var vizArtist = $("vizArtist");
var vizArt = $("vizArt");

var queuePanel = $("queuePanel");
var queueListEl = $("queueList");
var queueCountEl = $("queueCount");
var queueCurrentEl = $("queueCurrent");
var queueEmptyState = $("queueEmptyState");

var contextMenu = $("contextMenu");
var contextLikeText = $("contextLikeText");
var playlistSubmenu = $("playlistSubmenu");

var modalOverlay = $("modalOverlay");
var playlistNameInput = $("playlistNameInput");
var charCount = $("charCount");
var playlistListEl = $("playlistList");

var profileDropdown = $("profileDropdown");
var userAvatar = $("userAvatar");
var dropdownName = $("dropdownName");

var btnFavorites = $("btnFavorites");
var favCountEl = $("favCount");

var searchInput = $("searchInput");
var btnClearSearch = $("btnClearSearch");
var toastEl = $("toast");
var toastMsg = $("toastMessage");

var loadingState = $("loadingState");
var errorState = $("errorState");
