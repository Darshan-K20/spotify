import { songs } from './songs.js';

// ==========================================
// Application State & Globals
// ==========================================
let currentTrack = null;
let playbackList = [...songs];      // List currently playing from
let originalList = [...songs];      // Store un-shuffled list
let currentTrackIndex = 0;
let queue = [];
let playHistory = [];

let isPlaying = false;
let shuffleEnabled = false;
let repeatMode = 'off'; // 'off' | 'all' | 'one'

let likedSongs = [];    // Array of song IDs
let customPlaylists = []; // Array of { id, name, tracks: [songs] }
let localTracks = [];     // Array of locally imported songs

let activeView = 'home'; // 'home' | 'search' | 'liked' | 'local' | 'playlist' | 'queue'
let activePlaylistId = null; // Currently viewed playlist ID (preset or custom)

// ==========================================
// Web Audio API State & Effects Variables
// ==========================================
let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
let panNode = null;
let analyserNode = null;

// Delay feedback network for simulated spatial reverb
let reverbDelayNode = null;
let reverbFeedbackGain = null;
let reverbWetGain = null;
let reverbDryGain = null;

let crossfadeDuration = 0; // crossfade length in seconds (0 = disabled)
let currentVisualizerMode = 'retro-bars'; // 'retro-bars' | 'ambient-orb' | 'sine-wave'

const eqPresets = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'bass-boost': [6, 5, 3.5, 2, 0, 0, 0, 0, 0, 0],
  'vocal-boost': [-2, -2, -1, 1, 3, 4, 3, 2, 1, 0],
  acoustic: [2.5, 1.5, 1, 1.5, 1, 2, 2.5, 2, 1.5, 1],
  pop: [-1.5, 1.5, 2.5, 3, 1, -1, -2, -1.5, 1, 1.5],
  rock: [4, 3, -1, -2, -1.5, 1, 2.5, 3.5, 4, 4],
  classical: [3, 2, 1.5, 1.5, -1, -1, 0, 1, 2, 2.5],
  electronic: [5, 4, 1.5, 0, -2, 2, 1, 1, 3.5, 4.5]
};

// HTML5 Audio element
const audio = new Audio();
audio.volume = 0.7;

// IndexedDB instance for local files
let localFilesDB = null;

// ==========================================
// User Session & Premium System State
// ==========================================
let currentUser = {
  username: 'Darshtify Guest',
  email: '',
  password: '',
  tier: 'free' // 'free' | 'premium'
};

let registeredUsers = [];
let freeSkipCount = 0;
let adActive = false;
let adTimerInterval = null;

// ==========================================
// Preset Playlists Configuration
// ==========================================
const presetPlaylists = {
  'tamil-beats': {
    id: 'tamil-beats',
    name: 'Tamil Cinema Beats',
    description: 'High energy cinematic tracks from Kollywood.',
    color: 'hsl(10, 80%, 40%)',
    trackIds: ['danga-maari-oodhari', 'tvk-campaign-song', 'arjunar-villu', 'oorum-blood', 'god-mode', 'meesaya-murukku', 'verappa-extended', 'powerhouse', 'happy-raj-vibe-check']
  },
  'love-melodies': {
    id: 'love-melodies',
    name: 'Love Melodies',
    description: 'Smooth romantic numbers and soft melodies.',
    color: 'hsl(330, 80%, 40%)',
    trackIds: ['yathe-yathe', 'anbe-en-anbe', 'neeyum-naanum-anbe', 'megamo-aval', 'kannadi-poove', 'kadhale-kadhale', 'sirukki-vaasam']
  },
  'chill-vibes': {
    id: 'chill-vibes',
    name: 'Chill Vibes',
    description: 'Relaxing sounds and atmospheric chillouts.',
    color: 'hsl(180, 70%, 35%)',
    trackIds: ['oxygen', 'marappadhilai-nenje', 'o-maara', 'aura-10-10', 'love-detox', 'naan-konjam-karuppu']
  },
  'kollywood-classics': {
    id: 'kollywood-classics',
    name: 'Retro Classics',
    description: 'Iconic classical elements and funky retro rhythms.',
    color: 'hsl(45, 80%, 35%)',
    trackIds: ['theeratha-vilayattu-pillai', 'pala-palakura', 'goindhammavaala', 'jinguchaa', 'pappali-pazhamey', 'evanda-enakku-custody', 'vetrivel']
  }
};

// ==========================================
// DOM Elements Selection
// ==========================================
const els = {
  appContainer: document.getElementById('app-container'),
  welcomeText: document.getElementById('welcome-text'),
  sidebarPlaylists: document.getElementById('sidebar-playlists'),
  createPlaylistBtn: document.getElementById('create-playlist-btn'),
  
  // Views
  sections: {
    home: document.getElementById('section-home'),
    search: document.getElementById('section-search'),
    playlist: document.getElementById('section-playlist'),
    local: document.getElementById('section-local'),
    queue: document.getElementById('section-queue'),
    lyrics: document.getElementById('section-lyrics'),
  },
  
  // Navigation tabs
  nav: {
    home: document.getElementById('nav-home'),
    search: document.getElementById('nav-search'),
    liked: document.getElementById('nav-liked'),
    local: document.getElementById('nav-local'),
    queue: document.getElementById('nav-queue'),
    lyrics: document.getElementById('nav-lyrics'),
  },

  // Scroll Container
  contentScroll: document.getElementById('main-content-scroll'),
  
  // Header controls
  searchBoxWrapper: document.getElementById('search-box-wrapper'),
  searchBarInput: document.getElementById('search-bar-input'),
  historyBackBtn: document.getElementById('history-back-btn'),
  headerGlow: document.getElementById('header-glow'),
  
  // Account Header Triggers
  userProfileHeader: document.getElementById('user-profile-header'),
  userAvatar: document.getElementById('user-avatar'),
  userNameLabel: document.getElementById('user-name-label'),
  profileDropdownMenu: document.getElementById('profile-dropdown-menu'),
  
  dropProfileSettings: document.getElementById('drop-profile-settings'),
  dropUpgradePremium: document.getElementById('drop-upgrade-premium'),
  dropAuthAction: document.getElementById('drop-auth-action'),
  
  // Auth Modal Views
  accountAuthModal: document.getElementById('account-auth-modal'),
  authModalTitle: document.getElementById('auth-modal-title'),
  authModalCloseBtn: document.getElementById('auth-modal-close-btn'),
  
  paneLogin: document.getElementById('pane-login'),
  paneRegister: document.getElementById('pane-register'),
  paneSettings: document.getElementById('pane-settings'),
  
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  btnLoginSubmit: document.getElementById('btn-login-submit'),
  switchToRegister: document.getElementById('switch-to-register'),
  
  registerUsername: document.getElementById('register-username'),
  registerEmail: document.getElementById('register-email'),
  registerPassword: document.getElementById('register-password'),
  registerTier: document.getElementById('register-tier'),
  btnRegisterSubmit: document.getElementById('btn-register-submit'),
  switchToLogin: document.getElementById('switch-to-login'),
  
  settingsUsername: document.getElementById('settings-username'),
  settingsTier: document.getElementById('settings-tier'),
  btnSettingsSave: document.getElementById('btn-settings-save'),
  btnLogoutSubmit: document.getElementById('btn-logout-submit'),
  
  // Home dynamic elements
  quickAccessGrid: document.getElementById('quick-access-grid'),
  madeForYouGrid: document.getElementById('made-for-you-grid'),
  recommendedGrid: document.getElementById('recommended-grid'),
  
  // Search dynamic elements
  searchResultsContainer: document.getElementById('search-results-container'),
  searchResultsTableBody: document.getElementById('search-results-table-body'),
  genresCategoriesGrid: document.getElementById('genres-categories-grid'),
  genresTitle: document.getElementById('genres-title'),
  
  // Playlist dynamic elements
  playlistCoverArt: document.getElementById('playlist-cover-art'),
  playlistTypeLabel: document.getElementById('playlist-type-label'),
  playlistNameLabel: document.getElementById('playlist-name-label'),
  playlistOwnerLabel: document.getElementById('playlist-owner-label'),
  playlistCountLabel: document.getElementById('playlist-count-label'),
  playlistPlayMain: document.getElementById('playlist-play-main'),
  playlistLikeBtn: document.getElementById('playlist-like-btn'),
  playlistDeleteBtn: document.getElementById('playlist-delete-btn'),
  playlistTracksTableBody: document.getElementById('playlist-tracks-table-body'),
  
  // Local Files
  localFilesDropzone: document.getElementById('local-files-dropzone'),
  localFilesHiddenInput: document.getElementById('local-files-hidden-input'),
  localTracksTableBody: document.getElementById('local-tracks-table-body'),
  
  // Dedicated Main Panel Queue Views
  queueNowPlayingTableBody: document.getElementById('queue-now-playing-table-body'),
  queueUpcomingTableBody: document.getElementById('queue-upcoming-table-body'),
  queueClearAllBtn: document.getElementById('queue-clear-all-btn'),
  
  // Queue panel (Sidebar)
  rightQueueDrawer: document.getElementById('right-queue-drawer'),
  queueCloseBtn: document.getElementById('queue-close-btn'),
  queuePeekCoverArt: document.getElementById('queue-peek-cover-art'),
  queuePeekTitle: document.getElementById('queue-peek-title'),
  queuePeekArtist: document.getElementById('queue-peek-artist'),
  queuePeekLikeBtn: document.getElementById('queue-peek-like-btn'),
  queueTracksList: document.getElementById('queue-tracks-list'),
  
  // Bottom Player Bar
  playerTrackCover: document.getElementById('player-track-cover'),
  playerTrackTitle: document.getElementById('player-track-title'),
  playerTrackArtist: document.getElementById('player-track-artist'),
  playerLikeBtn: document.getElementById('player-like-btn'),
  
  playerShuffleBtn: document.getElementById('player-shuffle-btn'),
  playerPrevBtn: document.getElementById('player-prev-btn'),
  playerPlayBtn: document.getElementById('player-play-btn'),
  playerNextBtn: document.getElementById('player-next-btn'),
  playerRepeatBtn: document.getElementById('player-repeat-btn'),
  
  playerCurrentTime: document.getElementById('player-current-time'),
  playerTotalDuration: document.getElementById('player-total-duration'),
  playerSeekSlider: document.getElementById('player-seek-slider'),
  playerSeekProgress: document.getElementById('player-seek-progress'),
  
  playerMuteBtn: document.getElementById('player-mute-btn'),
  playerVolumeSlider: document.getElementById('player-volume-slider'),
  playerVolumeProgress: document.getElementById('player-volume-progress'),
  
  // Toggles
  focusModeToggleBtn: document.getElementById('focus-mode-toggle-btn'),
  visualizerToggleBtn: document.getElementById('visualizer-toggle-btn'),
  queueToggleBtn: document.getElementById('queue-toggle-btn'),
  
  // Modals & popups
  createPlaylistModal: document.getElementById('create-playlist-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalSaveBtn: document.getElementById('modal-save-btn'),
  newPlaylistName: document.getElementById('new-playlist-name'),
  
  toastNotification: document.getElementById('toast-notification'),
  toastMessage: document.getElementById('toast-message'),
  
  trackContextMenu: document.getElementById('track-context-menu'),
  contextPlaylistsSubmenu: document.getElementById('context-playlists-submenu'),
  
  // Fullscreen view
  focusModeOverlay: document.getElementById('focus-mode-overlay'),
  focusCloseBtn: document.getElementById('focus-close-btn'),
  focusBgGlow: document.getElementById('focus-bg-glow'),
  focusCoverArt: document.getElementById('focus-cover-art'),
  focusTrackTitle: document.getElementById('focus-track-title'),
  focusTrackArtist: document.getElementById('focus-track-artist'),
  focusPrevBtn: document.getElementById('focus-prev-btn'),
  focusPlayBtn: document.getElementById('focus-play-btn'),
  focusNextBtn: document.getElementById('focus-next-btn'),
  
  // Simulated Ad Breakers
  adOverlayPopup: document.getElementById('ad-overlay-popup'),
  adCountdownText: document.getElementById('ad-countdown-text'),
  btnAdUpgradeNow: document.getElementById('btn-ad-upgrade-now'),
  
  // Audio Wave Overlay Canvas
  musicVisualizerCanvas: document.getElementById('music-visualizer-canvas'),
  visualizerCanvasOverlay: document.getElementById('visualizer-canvas-overlay'),
  vizModePicker: document.getElementById('viz-mode-picker'),
  
  // Equalizer & FX drawer selectors
  eqToggleBtn: document.getElementById('eq-toggle-btn'),
  lyricsToggleBtn: document.getElementById('lyrics-toggle-btn'),
  equalizerDrawer: document.getElementById('equalizer-drawer'),
  eqCloseDrawerBtn: document.getElementById('eq-close-drawer-btn'),
  eqPresetSelect: document.getElementById('eq-preset-select'),
  eqSlidersContainer: document.getElementById('eq-sliders-container'),
  fxReverbSelect: document.getElementById('fx-reverb-select'),
  fxPanSlider: document.getElementById('fx-pan-slider'),
  fxPanLabel: document.getElementById('fx-pan-label'),
  fxPanProgress: document.getElementById('fx-pan-progress'),
  fxCrossfadeSlider: document.getElementById('fx-crossfade-slider'),
  fxCrossfadeLabel: document.getElementById('fx-crossfade-label'),
  fxCrossfadeProgress: document.getElementById('fx-crossfade-progress'),
  
  // Playlist filtering and sorting selectors
  playlistFilterInput: document.getElementById('playlist-filter-input'),
  playlistSortSelect: document.getElementById('playlist-sort-select'),
  
  // Synced Lyrics selectors
  lyricsLinesContainer: document.getElementById('lyrics-lines-container'),
  lyricsTrackCover: document.getElementById('lyrics-track-cover'),
  lyricsTrackTitleLabel: document.getElementById('lyrics-track-title-label'),
  lyricsTrackArtistLabel: document.getElementById('lyrics-track-artist-label'),
  lyricsBgGlow: document.getElementById('lyrics-bg-glow'),
  
  // Navigation
  navLyrics: document.getElementById('nav-lyrics'),
  
  // Custom dialogs & portability & avatars
  alertModal: document.getElementById('alert-modal'),
  alertMessageText: document.getElementById('alert-message-text'),
  alertModalOkBtn: document.getElementById('alert-modal-ok-btn'),
  
  confirmModal: document.getElementById('confirm-modal'),
  confirmMessageText: document.getElementById('confirm-message-text'),
  confirmModalOkBtn: document.getElementById('confirm-modal-ok-btn'),
  confirmModalCancelBtn: document.getElementById('confirm-modal-cancel-btn'),
  
  btnBackupExport: document.getElementById('btn-backup-export'),
  btnBackupImportTrigger: document.getElementById('btn-backup-import-trigger'),
  backupFileInput: document.getElementById('backup-file-input'),
  
  settingsAvatarWrapper: document.querySelector('.settings-avatar-wrapper'),
  settingsAvatarPreview: document.getElementById('settings-settings-avatar-preview') || document.getElementById('settings-avatar-preview'),
  settingsAvatarInput: document.getElementById('settings-avatar-input'),
};

function updatePlaybackPositionState() {
  if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
    if (audio.duration && !isNaN(audio.duration)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate || 1.0,
          position: audio.currentTime
        });
      } catch (e) {
        console.warn("Error setting mediaSession position state:", e);
      }
    }
  }
}

// Custom dialog modals (Promise-based)
function showCustomAlert(message) {
  return new Promise((resolve) => {
    els.alertMessageText.textContent = message;
    els.alertModal.classList.add('active');
    
    const handleOk = () => {
      els.alertModal.classList.remove('active');
      els.alertModalOkBtn.removeEventListener('click', handleOk);
      resolve();
    };
    
    els.alertModalOkBtn.addEventListener('click', handleOk);
  });
}

function showCustomConfirm(message) {
  return new Promise((resolve) => {
    els.confirmMessageText.textContent = message;
    els.confirmModal.classList.add('active');
    
    const handleOk = () => {
      els.confirmModal.classList.remove('active');
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      els.confirmModal.classList.remove('active');
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      els.confirmModalOkBtn.removeEventListener('click', handleOk);
      els.confirmModalCancelBtn.removeEventListener('click', handleCancel);
    };
    
    els.confirmModalOkBtn.addEventListener('click', handleOk);
    els.confirmModalCancelBtn.addEventListener('click', handleCancel);
  });
}

function exportBackupData() {
  const data = {
    likedSongs: JSON.parse(localStorage.getItem('darshtify_liked_songs') || '[]'),
    customPlaylists: JSON.parse(localStorage.getItem('darshtify_playlists') || '[]'),
    registeredUsers: JSON.parse(localStorage.getItem('darshtify_accounts') || '[]'),
    currentUser: JSON.parse(localStorage.getItem('darshtify_active_session') || 'null'),
    fxSettings: JSON.parse(localStorage.getItem('darshtify_fx_settings') || '{}'),
    eqGains: JSON.parse(localStorage.getItem('darshtify_eq_gains') || '[]')
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `darshtify_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Backup exported successfully!");
}

async function importBackupData(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data || typeof data !== 'object') {
      await showCustomAlert("Invalid backup file format.");
      return;
    }
    
    const confirmImport = await showCustomConfirm(
      "Importing this backup will overwrite your current playlists, liked songs, and accounts. Do you want to proceed?"
    );
    if (!confirmImport) return;
    
    if (data.likedSongs) {
      localStorage.setItem('darshtify_liked_songs', JSON.stringify(data.likedSongs));
    }
    if (data.customPlaylists) {
      localStorage.setItem('darshtify_playlists', JSON.stringify(data.customPlaylists));
    }
    if (data.registeredUsers) {
      localStorage.setItem('darshtify_accounts', JSON.stringify(data.registeredUsers));
    }
    if (data.currentUser) {
      localStorage.setItem('darshtify_active_session', JSON.stringify(data.currentUser));
    }
    if (data.fxSettings) {
      localStorage.setItem('darshtify_fx_settings', JSON.stringify(data.fxSettings));
    }
    if (data.eqGains) {
      localStorage.setItem('darshtify_eq_gains', JSON.stringify(data.eqGains));
    }
    
    await showCustomAlert("Backup imported successfully! The page will now reload.");
    window.location.reload();
  } catch (err) {
    console.error("Backup import failed:", err);
    await showCustomAlert("Failed to import backup: " + err.message);
  }
}

// State trackers for context menu
let contextMenuSelectedTrackId = null;

// History tracking for navigation buttons
let navigationHistory = ['home'];
let historyPointer = 0;

// ==========================================
// IndexedDB Binary Storage Logic
// ==========================================
function initLocalDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DarshtifyLocalDB', 1);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('local_tracks')) {
        db.createObjectStore('local_tracks', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => {
      localFilesDB = e.target.result;
      resolve(localFilesDB);
    };

    request.onerror = (e) => {
      console.error("IndexedDB error:", e.target.error);
      reject(e.target.error);
    };
  });
}

function saveLocalTrackToDB(trackObj, fileBlob) {
  if (!localFilesDB) return;
  
  const transaction = localFilesDB.transaction(['local_tracks'], 'readwrite');
  const store = transaction.objectStore('local_tracks');
  
  const record = {
    id: trackObj.id,
    title: trackObj.title,
    artist: trackObj.artist,
    album: trackObj.album,
    size: trackObj.size,
    color: trackObj.color,
    file: fileBlob, // Save raw binary blob/File!
    addedAt: Date.now()
  };

  store.put(record);
}

function loadLocalTracksFromDB() {
  return new Promise((resolve, reject) => {
    if (!localFilesDB) {
      resolve([]);
      return;
    }

    const transaction = localFilesDB.transaction(['local_tracks'], 'readonly');
    const store = transaction.objectStore('local_tracks');
    const request = store.getAll();

    request.onsuccess = (e) => {
      const records = e.target.result || [];
      const tracks = records.map(record => {
        // Regenerate valid ObjectURL for raw Blob
        const blobUrl = URL.createObjectURL(record.file);
        return {
          id: record.id,
          title: record.title,
          artist: record.artist,
          album: record.album,
          size: record.size,
          color: record.color,
          url: blobUrl,
          fileRef: record.file
        };
      });
      resolve(tracks);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

function removeLocalTrackFromDB(trackId) {
  if (!localFilesDB) return;
  const transaction = localFilesDB.transaction(['local_tracks'], 'readwrite');
  const store = transaction.objectStore('local_tracks');
  store.delete(trackId);
}

// ==========================================
// Initialization & LocalStorage Load
// ==========================================
async function init() {
  // Setup Local Database for file persistence
  try {
    await initLocalDB();
    localTracks = await loadLocalTracksFromDB();
  } catch (err) {
    console.error("Failed to load persistent local tracks:", err);
  }

  // Load LocalStorage registries
  loadLocalStorage();

  // Load registered user accounts
  const accs = localStorage.getItem('darshtify_accounts');
  registeredUsers = accs ? JSON.parse(accs) : [];

  // Load active user session
  const session = localStorage.getItem('darshtify_active_session');
  if (session) {
    currentUser = JSON.parse(session);
  }
  updateUserUI();

  // Welcome Header text
  const hours = new Date().getHours();
  let welcome = "Good evening";
  if (hours < 12) welcome = "Good morning";
  else if (hours < 18) welcome = "Good afternoon";
  els.welcomeText.textContent = welcome;

  // Build Home dynamic collections
  buildHomeContent();

  // Build Search genres grid
  buildSearchGenres();

  // Build Equalizer sliders UI
  buildEqualizerUI();

  // Setup sidebar lists
  renderSidebarPlaylists();

  // Add event listeners
  setupEventListeners();

  // Pre-load the first track in player
  if (songs.length > 0) {
    loadTrack(songs[0], false);
  }

  // Visualizer initialization
  setupVisualizer();
}

function loadLocalStorage() {
  const likes = localStorage.getItem('darshtify_liked_songs');
  likedSongs = likes ? JSON.parse(likes) : [];

  const playlists = localStorage.getItem('darshtify_playlists');
  customPlaylists = playlists ? JSON.parse(playlists) : [];
}

function saveLikes() {
  localStorage.setItem('darshtify_liked_songs', JSON.stringify(likedSongs));
}

function savePlaylists() {
  localStorage.setItem('darshtify_playlists', JSON.stringify(customPlaylists));
  renderSidebarPlaylists();
}

// ==========================================
// User Authentication UI Handlers
// ==========================================
function updateUserUI() {
  els.userNameLabel.textContent = currentUser.username;
  
  // Set avatar image or text (Initials)
  if (currentUser.avatar) {
    els.userAvatar.style.backgroundImage = `url(${currentUser.avatar})`;
    els.userAvatar.style.backgroundSize = 'cover';
    els.userAvatar.style.backgroundPosition = 'center';
    els.userAvatar.textContent = '';
  } else {
    els.userAvatar.style.backgroundImage = 'none';
    const initials = currentUser.username.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    els.userAvatar.textContent = initials;
  }

  // Sync settings page avatar preview
  if (els.settingsAvatarPreview) {
    if (currentUser.avatar) {
      els.settingsAvatarPreview.style.backgroundImage = `url(${currentUser.avatar})`;
      els.settingsAvatarPreview.style.backgroundSize = 'cover';
      els.settingsAvatarPreview.style.backgroundPosition = 'center';
      els.settingsAvatarPreview.textContent = '';
    } else {
      els.settingsAvatarPreview.style.backgroundImage = 'none';
      const initials = currentUser.username.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      els.settingsAvatarPreview.textContent = initials;
    }
  }

  // Toggle dropdown item visual states
  if (currentUser.email === '') {
    // Guest User
    els.dropAuthAction.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login / Register';
    els.userProfileHeader.classList.remove('premium-user');
    els.dropUpgradePremium.style.display = 'flex';
  } else {
    // Logged In User
    els.dropAuthAction.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Log Out';
    
    if (currentUser.tier === 'premium') {
      els.userProfileHeader.classList.add('premium-user');
      els.userNameLabel.innerHTML = `${currentUser.username} <i class="fa-solid fa-crown" style="color:#ffd700; margin-left:2px;" title="Darshtify Premium"></i>`;
      els.dropUpgradePremium.style.display = 'none'; // already premium
    } else {
      els.userProfileHeader.classList.remove('premium-user');
      els.dropUpgradePremium.style.display = 'flex';
    }
  }

  // Sync owner names in headers
  els.playlistOwnerLabel.textContent = currentUser.username;
}

function switchAuthPane(paneName) {
  els.paneLogin.style.display = 'none';
  els.paneRegister.style.display = 'none';
  els.paneSettings.style.display = 'none';

  if (paneName === 'login') {
    els.authModalTitle.textContent = 'Log In to Darshtify';
    els.paneLogin.style.display = 'block';
  } else if (paneName === 'register') {
    els.authModalTitle.textContent = 'Create Darshtify Account';
    els.paneRegister.style.display = 'block';
  } else if (paneName === 'settings') {
    els.authModalTitle.textContent = 'Profile Settings';
    els.settingsUsername.value = currentUser.username;
    els.settingsTier.value = currentUser.tier;
    els.paneSettings.style.display = 'block';
  }
  
  els.accountAuthModal.classList.add('active');
}

async function registerNewAccount(username, email, password, tier) {
  if (username.trim() === '' || email.trim() === '' || password.trim() === '') {
    await showCustomAlert("Please fill in all account fields.");
    return;
  }
  
  if (registeredUsers.some(u => u.email === email)) {
    await showCustomAlert("An account with this email already exists.");
    return;
  }

  const newUser = {
    username: username.trim(),
    email: email.trim(),
    password: password,
    tier: tier
  };

  registeredUsers.push(newUser);
  localStorage.setItem('darshtify_accounts', JSON.stringify(registeredUsers));

  // Log in immediately
  currentUser = newUser;
  localStorage.setItem('darshtify_active_session', JSON.stringify(currentUser));
  
  updateUserUI();
  showToast(`Welcome to Darshtify, ${currentUser.username}!`);
  els.accountAuthModal.classList.remove('active');
}

async function loginAccount(email, password) {
  const match = registeredUsers.find(u => u.email === email && u.password === password);
  if (!match) {
    await showCustomAlert("Invalid email or password.");
    return;
  }

  currentUser = match;
  localStorage.setItem('darshtify_active_session', JSON.stringify(currentUser));

  updateUserUI();
  showToast(`Welcome back, ${currentUser.username}!`);
  els.accountAuthModal.classList.remove('active');
}

async function saveProfileSettings(username, tier) {
  if (username.trim() === '') {
    await showCustomAlert("Username cannot be blank.");
    return;
  }

  currentUser.username = username.trim();
  currentUser.tier = tier;
  localStorage.setItem('darshtify_active_session', JSON.stringify(currentUser));

  // Save changes back to accounts registry database
  const idx = registeredUsers.findIndex(u => u.email === currentUser.email);
  if (idx !== -1) {
    registeredUsers[idx].username = currentUser.username;
    registeredUsers[idx].tier = currentUser.tier;
    localStorage.setItem('darshtify_accounts', JSON.stringify(registeredUsers));
  }

  updateUserUI();
  showToast("Profile settings saved successfully");
  els.accountAuthModal.classList.remove('active');
}

function logout() {
  currentUser = { username: 'Darshtify Guest', email: '', password: '', tier: 'free' };
  localStorage.removeItem('darshtify_active_session');
  
  updateUserUI();
  showToast("Logged out of Darshtify");
  els.accountAuthModal.classList.remove('active');
  showView('home');
}

// ==========================================
// Simulated Free Ad Break System
// ==========================================
function triggerAdBreak() {
  if (adActive) return;
  adActive = true;
  pauseTrack();
  
  // Open Ad Popup Overlay
  els.adOverlayPopup.classList.add('active');

  let countdown = 5;
  els.adCountdownText.textContent = `Ad playing... ${countdown}s remaining`;

  // Start synthetic chime or mock audio ad sound
  const osc = audio.context ? audio.context.createOscillator() : null;
  if (osc) {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, audio.context.currentTime); // A4
    osc.connect(audio.context.destination);
    osc.start();
    osc.stop(audio.context.currentTime + 0.15);
  }

  adTimerInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(adTimerInterval);
      els.adOverlayPopup.classList.remove('active');
      adActive = false;
      freeSkipCount = 0; // reset
      showToast("Ad break complete. Resuming music!");
      playTrack();
    } else {
      els.adCountdownText.textContent = `Ad playing... ${countdown}s remaining`;
    }
  }, 1000);
}

// Check locks for visualizers / focus
async function checkPremiumFeature(featureName) {
  if (currentUser.tier === 'premium') return true;
  
  // Locked! Offer Upgrade
  const confirmUpgrade = await showCustomConfirm(`👑 Darshtify Premium Feature!\n\n"${featureName}" is exclusive to premium users. Would you like to manage your subscription tier and upgrade now for free?`);
  if (confirmUpgrade) {
    if (currentUser.email === '') {
      switchAuthPane('register');
    } else {
      switchAuthPane('settings');
    }
  }
  return false;
}

// ==========================================
// UI Rendering - Content builders
// ==========================================
// Skeleton HTML strings
const skeletonCardHTML = `
  <div class="music-card skeleton-card">
    <div class="card-img-wrapper skeleton-image skeleton-shimmer-bg"></div>
    <div class="skeleton-line title skeleton-shimmer-bg"></div>
    <div class="skeleton-line desc skeleton-shimmer-bg"></div>
  </div>
`;

const skeletonWelcomeHTML = `
  <div class="welcome-card skeleton-card" style="display: flex; align-items: center; gap: 12px; height: 80px; padding: 0 16px;">
    <div style="width: 80px; height: 80px; border-radius: 8px;" class="skeleton-shimmer-bg"></div>
    <div style="flex: 1; height: 16px; border-radius: 4px;" class="skeleton-shimmer-bg"></div>
  </div>
`;

let homeInitialized = false;

function buildHomeContent() {
  if (!homeInitialized) {
    els.quickAccessGrid.innerHTML = Array(6).fill(skeletonWelcomeHTML).join('');
    els.madeForYouGrid.innerHTML = Array(4).fill(skeletonCardHTML).join('');
    els.recommendedGrid.innerHTML = Array(6).fill(skeletonCardHTML).join('');
    
    homeInitialized = true;
    setTimeout(() => {
      renderActualHomeContent();
    }, 600);
  } else {
    renderActualHomeContent();
  }
}

function renderActualHomeContent() {
  // 1. Quick Access (recently played look) - 6 items
  const quickItems = songs.slice(0, 6);
  els.quickAccessGrid.innerHTML = quickItems.map(song => `
    <div class="welcome-card" data-id="${song.id}">
      <div class="welcome-card-img">
        <img src="${song.cover}" alt="${song.title}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <div class="welcome-card-title">${song.title}</div>
      <button class="play-btn-hover"><i class="fa-solid fa-play"></i></button>
    </div>
  `).join('');

  // 2. Made For You - 4 Featured Playlists
  els.madeForYouGrid.innerHTML = Object.values(presetPlaylists).map(pl => {
    const plTracks = pl.trackIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
    const coverUrl = plTracks.length > 0 ? plTracks[0].cover : '';

    return `
      <div class="music-card" data-playlist-id="${pl.id}">
        <div class="card-img-wrapper">
          <div class="card-cover">
            <img src="${coverUrl}" alt="${pl.name}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <button class="play-btn-hover"><i class="fa-solid fa-play"></i></button>
        </div>
        <div class="card-title">${pl.name}</div>
        <div class="card-desc">${pl.description}</div>
      </div>
    `;
  }).join('');

  // 3. Recommended Tracks - random sample of 6 songs
  const recommendedTracks = songs.slice(6, 12);
  els.recommendedGrid.innerHTML = recommendedTracks.map(song => `
    <div class="music-card" data-track-id="${song.id}">
      <div class="card-img-wrapper">
        <div class="card-cover">
          <img src="${song.cover}" alt="${song.title}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <button class="play-btn-hover"><i class="fa-solid fa-play"></i></button>
      </div>
      <div class="card-title">${song.title}</div>
      <div class="card-desc">${song.artist}</div>
    </div>
  `).join('');
}

function buildSearchGenres() {
  const genres = [
    { title: "Tamil Hits", color: "rgb(71, 126, 192)", icon: "fa-solid fa-fire" },
    { title: "Independent", color: "rgb(232, 17, 137)", icon: "fa-solid fa-guitar" },
    { title: "Romance", color: "rgb(225, 17, 140)", icon: "fa-solid fa-heart" },
    { title: "Energy Boost", color: "rgb(230, 120, 20)", icon: "fa-solid fa-bolt" },
    { title: "Chill & Relax", color: "rgb(30, 50, 100)", icon: "fa-solid fa-mug-hot" },
    { title: "Focus", color: "rgb(80, 55, 80)", icon: "fa-solid fa-brain" },
    { title: "Sleep", color: "rgb(30, 20, 75)", icon: "fa-solid fa-moon" },
    { title: "Kollywood Hits", color: "rgb(175, 40, 150)", icon: "fa-solid fa-clapperboard" }
  ];

  els.genresCategoriesGrid.innerHTML = genres.map(genre => `
    <div class="genre-card" style="background-color: ${genre.color};" data-genre="${genre.title}">
      <span class="genre-title">${genre.title}</span>
      <div class="genre-img-decor">
        <i class="${genre.icon}"></i>
      </div>
    </div>
  `).join('');
}

function renderSidebarPlaylists() {
  let html = `
    <div class="playlist-item" id="sidebar-liked-playlist">
      <div class="playlist-thumb" style="background: linear-gradient(135deg, #450af5, #c4b5fd); color: #fff;">
        <i class="fa-solid fa-heart"></i>
      </div>
      <div class="playlist-info">
        <span class="playlist-title">Liked Songs</span>
        <span class="playlist-subtitle">Playlist • ${likedSongs.length} songs</span>
      </div>
    </div>
    <div class="playlist-item" id="sidebar-local-playlist">
      <div class="playlist-thumb" style="background: linear-gradient(135deg, #374151, #1f2937); color: #fff;">
        <i class="fa-solid fa-folder-open"></i>
      </div>
      <div class="playlist-info">
        <span class="playlist-title">Local Files</span>
        <span class="playlist-subtitle">Virtual • ${localTracks.length} files</span>
      </div>
    </div>
  `;

  // Custom playlists
  customPlaylists.forEach(pl => {
    let coverHtml = '<i class="fa-solid fa-music"></i>';
    if (pl.tracks.length > 0 && pl.tracks[0].cover) {
      coverHtml = `<img src="${pl.tracks[0].cover}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
    }
    
    html += `
      <div class="playlist-item custom-playlist-item" data-playlist-id="${pl.id}">
        <div class="playlist-thumb">
          ${coverHtml}
        </div>
        <div class="playlist-info">
          <span class="playlist-title">${pl.name}</span>
          <span class="playlist-subtitle">Playlist • ${pl.tracks.length} songs</span>
        </div>
      </div>
    `;
  });

  els.sidebarPlaylists.innerHTML = html;

  // Add click events to newly generated list items
  document.getElementById('sidebar-liked-playlist').addEventListener('click', () => showView('liked'));
  document.getElementById('sidebar-local-playlist').addEventListener('click', () => showView('local'));
  
  els.sidebarPlaylists.querySelectorAll('.custom-playlist-item').forEach(item => {
    item.addEventListener('click', () => {
      showView('playlist', { playlistId: item.getAttribute('data-playlist-id'), isCustom: true });
    });
  });
}

// ==========================================
// View Router & History Management
// ==========================================
function showView(viewId, metadata = null) {
  // Update state
  activeView = viewId;
  
  // Reset playlist filters on view transitions
  if (els.playlistFilterInput) {
    els.playlistFilterInput.value = '';
  }
  
  // Hide all sections
  Object.values(els.sections).forEach(section => {
    if (section) section.classList.remove('active');
  });
  
  // Reset active sidebar items classes
  Object.values(els.nav).forEach(navItem => {
    if (navItem) navItem.classList.remove('active');
  });
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Hide Search input by default
  els.searchBoxWrapper.style.display = 'none';

  // Toggle active styling
  if (viewId === 'home') {
    els.sections.home.classList.add('active');
    els.nav.home.classList.add('active');
    els.headerGlow.style.setProperty('--theme-color', 'rgba(30, 215, 96, 0.15)');
  } else if (viewId === 'search') {
    els.sections.search.classList.add('active');
    els.nav.search.classList.add('active');
    els.searchBoxWrapper.style.display = 'block';
    els.searchBarInput.focus();
    els.headerGlow.style.setProperty('--theme-color', 'rgba(120, 50, 200, 0.15)');
  } else if (viewId === 'liked') {
    els.sections.playlist.classList.add('active');
    els.nav.liked.classList.add('active');
    activePlaylistId = 'liked';
    renderPlaylistView('liked');
  } else if (viewId === 'lyrics') {
    els.sections.lyrics.classList.add('active');
    els.nav.lyrics.classList.add('active');
    if (currentTrack) {
      renderLyrics(currentTrack);
      els.headerGlow.style.setProperty('--theme-color', currentTrack.color || 'rgba(30, 215, 96, 0.15)');
    } else {
      els.headerGlow.style.setProperty('--theme-color', 'rgba(30, 215, 96, 0.15)');
    }
  } else if (viewId === 'local') {
    els.sections.local.classList.add('active');
    els.nav.local.classList.add('active');
    renderLocalTracksTable();
    els.headerGlow.style.setProperty('--theme-color', 'rgba(70, 80, 95, 0.15)');
  } else if (viewId === 'queue') {
    els.sections.queue.classList.add('active');
    els.nav.queue.classList.add('active');
    renderMainQueueView();
    els.headerGlow.style.setProperty('--theme-color', 'rgba(30, 215, 96, 0.15)');
  } else if (viewId === 'playlist' && metadata) {
    els.sections.playlist.classList.add('active');
    activePlaylistId = metadata.playlistId;
    renderPlaylistView(metadata.playlistId, metadata.isCustom);
  }

  // Set active mobile tab
  const activeMobItem = document.querySelector(`.mobile-nav-item[data-view="${viewId}"]`);
  if (activeMobItem) {
    activeMobItem.classList.add('active');
  }

  // Scroll to top
  els.contentScroll.scrollTop = 0;

  // Save history state (simplified)
  if (navigationHistory[historyPointer] !== viewId) {
    navigationHistory = navigationHistory.slice(0, historyPointer + 1);
    navigationHistory.push(viewId);
    historyPointer++;
    els.historyBackBtn.style.opacity = '1';
    els.historyBackBtn.style.cursor = 'pointer';
  }
}

// Reused detailed view for lists of tracks (Liked, Custom Playlist, Album)
function renderPlaylistView(playlistId, isCustom = false) {
  let plName = '';
  let plCoverContent = '';
  let plTracks = [];
  let plType = 'Playlist';
  
  els.playlistDeleteBtn.style.display = 'none'; // Default hidden

  if (playlistId === 'liked') {
    plName = 'Liked Songs';
    plCoverContent = '<i class="fa-solid fa-heart"></i>';
    els.playlistCoverArt.setAttribute('style', 'background: linear-gradient(135deg, #450af5, #c4b5fd)');
    plType = 'System Playlist';
    
    // Resolve track lists
    plTracks = [...songs, ...localTracks].filter(s => likedSongs.includes(s.id));
  } else if (isCustom) {
    const plObj = customPlaylists.find(p => p.id === playlistId);
    if (!plObj) {
      showView('home');
      return;
    }
    plName = plObj.name;
    plTracks = plObj.tracks;
    
    // Custom Playlist Cover design
    if (plTracks.length > 0) {
      const firstTrack = plTracks[0];
      if (firstTrack.cover) {
        plCoverContent = `<img src="${firstTrack.cover}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
      } else {
        plCoverContent = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, ${firstTrack.color}, #111); border-radius:8px;"><i class="fa-solid fa-folder" style="font-size:64px;"></i></div>`;
      }
    } else {
      plCoverContent = '<i class="fa-solid fa-music"></i>';
    }
    
    els.playlistCoverArt.setAttribute('style', 'background: linear-gradient(135deg, #2b2b2b, #111111)');
    els.playlistDeleteBtn.style.display = 'flex'; // Allow deleting custom ones
  } else {
    // Preset featured playlists
    const plObj = presetPlaylists[playlistId];
    if (!plObj) {
      showView('home');
      return;
    }
    plName = plObj.name;
    els.headerGlow.style.setProperty('--theme-color', plObj.color);
    
    // Map IDs to actual track objects
    plTracks = plObj.trackIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
    
    if (plTracks.length > 0) {
      plCoverContent = `<img src="${plTracks[0].cover}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
    } else {
      plCoverContent = '<i class="fa-solid fa-music"></i>';
    }
    
    els.playlistCoverArt.setAttribute('style', `background: linear-gradient(135deg, ${plObj.color}, #111)`);
  }

  // Cache original list before sorting/filtering for play sequence mapping
  let originalTracksList = [...plTracks];
  const filterQuery = els.playlistFilterInput ? els.playlistFilterInput.value.trim().toLowerCase() : '';
  const sortBy = els.playlistSortSelect ? els.playlistSortSelect.value : 'default';

  if (filterQuery !== '') {
    plTracks = plTracks.filter(track => 
      track.title.toLowerCase().includes(filterQuery) ||
      track.artist.toLowerCase().includes(filterQuery) ||
      (track.album && track.album.toLowerCase().includes(filterQuery))
    );
  }

  if (sortBy === 'title') {
    plTracks.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'artist') {
    plTracks.sort((a, b) => a.artist.localeCompare(b.artist));
  } else if (sortBy === 'album') {
    plTracks.sort((a, b) => (a.album || '').localeCompare(b.album || ''));
  }

  // Update DOM details
  els.playlistNameLabel.textContent = plName;
  els.playlistCoverArt.innerHTML = plCoverContent;
  els.playlistTypeLabel.textContent = plType;
  els.playlistCountLabel.textContent = `${plTracks.length} songs`;

  // Render Table rows
  if (plTracks.length === 0) {
    els.playlistTracksTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 48px; color: var(--text-muted);">
          No songs in this playlist. Start adding songs!
        </td>
      </tr>
    `;
  } else {
    els.playlistTracksTableBody.innerHTML = plTracks.map((track, idx) => {
      const activeClass = (currentTrack && currentTrack.id === track.id) ? 'active-playing' : '';
      const isLiked = likedSongs.includes(track.id);
      const heartIcon = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      const heartClass = isLiked ? 'liked' : '';
      
      let miniCover = '<i class="fa-solid fa-music"></i>';
      if (track.cover) {
        miniCover = `<img src="${track.cover}" style="width:100%; height:100%; object-fit:cover; border-radius: 4px;">`;
      } else {
        miniCover = `<i class="fa-solid fa-folder"></i>`;
      }

      return `
        <tr class="${activeClass}" data-track-id="${track.id}">
          <td class="track-index-col">
            <span class="track-index-num">${idx + 1}</span>
            <span class="track-index-play" data-track-id="${track.id}"><i class="fa-solid fa-play"></i></span>
          </td>
          <td>
            <div class="track-title-info">
              <div class="track-mini-art" style="background: linear-gradient(135deg, ${track.color || '#222'}, #111)">
                ${miniCover}
              </div>
              <div class="track-meta-block">
                <span class="track-title">${track.title}</span>
                <span class="track-artist">${track.artist}</span>
              </div>
            </div>
          </td>
          <td>${track.album || 'Unknown Album'}</td>
          <td>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span>3:45</span>
              <button class="like-button ${heartClass}" data-track-id="${track.id}"><i class="${heartIcon}"></i></button>
              <button class="track-options-btn" data-track-id="${track.id}"><i class="fa-solid fa-ellipsis"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Table click play handlers
    els.playlistTracksTableBody.querySelectorAll('.track-index-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trId = btn.getAttribute('data-track-id');
        playTrackFromList(trId, plTracks);
      });
    });

    els.playlistTracksTableBody.querySelectorAll('tbody tr').forEach(row => {
      row.addEventListener('dblclick', () => {
        const trId = row.getAttribute('data-track-id');
        playTrackFromList(trId, plTracks);
      });
    });

    // Heart toggle inside table
    els.playlistTracksTableBody.querySelectorAll('.like-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trId = btn.getAttribute('data-track-id');
        toggleLike(trId);
        renderPlaylistView(playlistId, isCustom); // refresh UI list
      });
    });

    // Triple Dot option handler
    els.playlistTracksTableBody.querySelectorAll('.track-options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trId = btn.getAttribute('data-track-id');
        showContextMenu(e, trId, playlistId, isCustom);
      });
    });
  }

  // Play button click: play the first song, load the list
  els.playlistPlayMain.onclick = () => {
    if (plTracks.length > 0) {
      if (currentTrack && plTracks.some(t => t.id === currentTrack.id)) {
        togglePlay();
      } else {
        playTrackFromList(plTracks[0].id, plTracks);
      }
    }
  };
}

// ==========================================
// Playback Engine Actions
// ==========================================
function loadTrack(track, playImmediately = true) {
  if (!track) return;
  
  currentTrack = track;
  audio.src = track.url;
  
  // Set index
  currentTrackIndex = playbackList.findIndex(t => t.id === track.id);
  if (currentTrackIndex === -1) currentTrackIndex = 0;

  // Update Player UI (left panel)
  els.playerTrackTitle.textContent = track.title;
  els.playerTrackArtist.textContent = track.artist;
  els.playerTrackCover.setAttribute('style', `background: linear-gradient(135deg, ${track.color}, #111)`);
  
  if (track.cover) {
    els.playerTrackCover.innerHTML = `<img src="${track.cover}" style="width: 100%; height: 100%; object-fit: cover;">`;
    els.queuePeekCoverArt.innerHTML = `<img src="${track.cover}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`;
    els.focusCoverArt.innerHTML = `<img src="${track.cover}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;">`;
  } else {
    // Local fallback
    const folderIcon = '<i class="fa-solid fa-folder-open"></i>';
    els.playerTrackCover.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:20px;">${folderIcon}</div>`;
    els.queuePeekCoverArt.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:48px;">${folderIcon}</div>`;
    els.focusCoverArt.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:72px;">${folderIcon}</div>`;
  }
  
  // Update browser document title
  document.title = `${track.title} • ${track.artist}`;

  // Update Media Session metadata
  if ('mediaSession' in navigator) {
    const fallbackCover = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80';
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'Darshtify',
      artwork: [
        { src: track.cover || fallbackCover, sizes: '96x96', type: 'image/png' },
        { src: track.cover || fallbackCover, sizes: '128x128', type: 'image/png' },
        { src: track.cover || fallbackCover, sizes: '192x192', type: 'image/png' },
        { src: track.cover || fallbackCover, sizes: '256x256', type: 'image/png' },
        { src: track.cover || fallbackCover, sizes: '384x384', type: 'image/png' },
        { src: track.cover || fallbackCover, sizes: '512x512', type: 'image/png' }
      ]
    });
  }

  // Heart button status
  const isLiked = likedSongs.includes(track.id);
  if (isLiked) {
    els.playerLikeBtn.classList.add('liked');
    els.playerLikeBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
  } else {
    els.playerLikeBtn.classList.remove('liked');
    els.playerLikeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
  }

  // Update Right Queue Peek preview
  els.queuePeekTitle.textContent = track.title;
  els.queuePeekArtist.textContent = track.artist;
  els.queuePeekCoverArt.setAttribute('style', `background: linear-gradient(135deg, ${track.color}, #111)`);
  
  if (isLiked) {
    els.queuePeekLikeBtn.classList.add('liked');
    els.queuePeekLikeBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
  } else {
    els.queuePeekLikeBtn.classList.remove('liked');
    els.queuePeekLikeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
  }

  // Fullscreen view details
  els.focusTrackTitle.textContent = track.title;
  els.focusTrackArtist.textContent = track.artist;
  els.focusCoverArt.setAttribute('style', `background: linear-gradient(135deg, ${track.color}, #111)`);

  // Accent Theme color overrides
  document.documentElement.style.setProperty('--theme-color', track.color);

  // Reset Seek slider
  els.playerSeekSlider.value = 0;
  els.playerSeekProgress.style.width = '0%';
  els.playerCurrentTime.textContent = '0:00';
  els.playerTotalDuration.textContent = '0:00';

  // Highlight in lists
  updateActiveSongHighlights();

  // Load upcoming queue UI
  renderQueueList();

  // Update dedicated main view if open
  if (activeView === 'queue') {
    renderMainQueueView();
  }

  // Update lyrics content panel
  renderLyrics(track);

  if (playImmediately) {
    playTrack();
  }
}

function playTrack() {
  initAudioContext();
  audio.play()
    .then(() => {
      isPlaying = true;
      els.playerPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      els.focusPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      els.playerTrackCover.classList.add('playing');
      els.focusCoverArt.classList.add('playing');
      updateActiveSongHighlights();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    })
    .catch(err => {
      console.warn("Audio play failed or was blocked: ", err);
      isPlaying = false;
      els.playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      els.focusPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      els.playerTrackCover.classList.remove('playing');
      els.focusCoverArt.classList.remove('playing');
      updateActiveSongHighlights();
    });
}

function pauseTrack() {
  audio.pause();
  isPlaying = false;
  els.playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  els.focusPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  els.playerTrackCover.classList.remove('playing');
  els.focusCoverArt.classList.remove('playing');
  updateActiveSongHighlights();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = "paused";
  }
}

function togglePlay() {
  if (isPlaying) {
    pauseTrack();
  } else {
    playTrack();
  }
}

function playTrackFromList(trackId, trackList) {
  playbackList = [...trackList];
  originalList = [...trackList];
  
  if (shuffleEnabled) {
    // Keep current selected track first, shuffle the rest
    const selected = trackList.find(t => t.id === trackId);
    const rest = trackList.filter(t => t.id !== trackId);
    shuffleArray(rest);
    playbackList = [selected, ...rest];
  }

  const trackObj = trackList.find(t => t.id === trackId);
  loadTrack(trackObj, true);
}

function nextTrack() {
  // Free User Ad break simulation triggers on 3 skips
  if (currentUser.tier === 'free') {
    freeSkipCount++;
    if (freeSkipCount >= 3) {
      triggerAdBreak();
      return;
    }
  }

  // 1. Check queue drawer
  if (queue.length > 0) {
    const nextQTrack = queue.shift();
    playHistory.push(currentTrack);
    playTrackWithCrossfade(nextQTrack, true);
    return;
  }

  if (playbackList.length === 0) return;

  playHistory.push(currentTrack);

  if (repeatMode === 'one') {
    audio.currentTime = 0;
    playTrack();
    return;
  }

  currentTrackIndex++;
  if (currentTrackIndex >= playbackList.length) {
    if (repeatMode === 'all') {
      currentTrackIndex = 0;
    } else {
      currentTrackIndex = playbackList.length - 1;
      pauseTrack();
      return;
    }
  }

  playTrackWithCrossfade(playbackList[currentTrackIndex], true);
}

function prevTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  if (playbackList.length === 0) return;

  if (currentTrackIndex > 0) {
    currentTrackIndex--;
  } else {
    if (repeatMode === 'all') {
      currentTrackIndex = playbackList.length - 1;
    } else {
      currentTrackIndex = 0;
    }
  }

  playTrackWithCrossfade(playbackList[currentTrackIndex], true);
}

function toggleShuffle() {
  shuffleEnabled = !shuffleEnabled;
  els.playerShuffleBtn.classList.toggle('active', shuffleEnabled);

  if (shuffleEnabled) {
    // Shuffle active playing list, keeping currently playing song at the top
    const otherTracks = playbackList.filter(t => t.id !== currentTrack.id);
    shuffleArray(otherTracks);
    playbackList = [currentTrack, ...otherTracks];
    showToast("Shuffle turned on");
  } else {
    playbackList = [...originalList];
    currentTrackIndex = playbackList.findIndex(t => t.id === currentTrack.id);
    showToast("Shuffle turned off");
  }

  renderQueueList();
}

function toggleRepeat() {
  if (repeatMode === 'off') {
    repeatMode = 'all';
    els.playerRepeatBtn.classList.add('active');
    els.playerRepeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    showToast("Repeat all songs");
  } else if (repeatMode === 'all') {
    repeatMode = 'one';
    els.playerRepeatBtn.classList.add('active');
    els.playerRepeatBtn.innerHTML = '<i class="fa-solid fa-repeat-1"></i>';
    showToast("Repeat current song");
  } else {
    repeatMode = 'off';
    els.playerRepeatBtn.classList.remove('active');
    els.playerRepeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    showToast("Repeat turned off");
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function updateActiveSongHighlights() {
  const allTables = [
    { tbody: els.playlistTracksTableBody },
    { tbody: els.searchResultsTableBody },
    { tbody: els.localTracksTableBody }
  ];

  allTables.forEach(({ tbody }) => {
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
      const rowId = row.getAttribute('data-track-id');
      const isCurrent = (currentTrack && rowId === currentTrack.id);
      
      row.classList.toggle('active-playing', isCurrent);
      
      // Update the index column content dynamically
      const indexCol = row.querySelector('.track-index-col');
      if (indexCol) {
        if (isCurrent) {
          indexCol.innerHTML = `
            <div class="mini-css-visualizer ${isPlaying ? 'playing' : ''}">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="track-index-play" data-track-id="${rowId}"><i class="${isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'}"></i></span>
          `;
        } else {
          indexCol.innerHTML = `
            <span class="track-index-num">${idx + 1}</span>
            <span class="track-index-play" data-track-id="${rowId}"><i class="fa-solid fa-play"></i></span>
          `;
        }
        
        // Re-bind play button click handlers
        const playBtn = indexCol.querySelector('.track-index-play');
        if (playBtn) {
          playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isCurrent) {
              togglePlay();
            } else {
              // Find track list context
              let list = [];
              if (tbody === els.playlistTracksTableBody) {
                if (activePlaylistId === 'liked') {
                  list = [...songs, ...localTracks].filter(s => likedSongs.includes(s.id));
                } else if (presetPlaylists[activePlaylistId]) {
                  list = presetPlaylists[activePlaylistId].trackIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
                } else {
                  const pl = customPlaylists.find(p => p.id === activePlaylistId);
                  if (pl) list = pl.tracks;
                }
              } else if (tbody === els.searchResultsTableBody) {
                list = [...songs, ...localTracks];
              } else if (tbody === els.localTracksTableBody) {
                list = localTracks;
              }
              if (list.length === 0) list = songs;
              playTrackFromList(rowId, list);
            }
          });
        }
      }
    });
  });

  // Re-sync main queue view Now Playing index col to visualizer
  if (els.queueNowPlayingTableBody) {
    const iconCell = els.queueNowPlayingTableBody.querySelector('.track-index-col');
    if (iconCell) {
      iconCell.innerHTML = `
        <div class="mini-css-visualizer ${isPlaying ? 'playing' : ''}">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
    }
  }
}

// ==========================================
// Queue Management Logic (Sidebar & Main Panel)
// ==========================================
function renderQueueList() {
  if (queue.length === 0 && playbackList.length === 0) {
    els.queueTracksList.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">Queue is empty</span>`;
    return;
  }

  // Items to show: (1) manual queue array, (2) rest of the active playbackList
  let html = '';
  
  // 1. Manually added queue items
  queue.forEach((track, idx) => {
    let coverHtml = '<i class="fa-solid fa-music"></i>';
    if (track.cover) {
      coverHtml = `<img src="${track.cover}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
    }
    
    html += `
      <div class="queue-track-row" data-queue-idx="${idx}">
        <div class="queue-track-art" style="background: linear-gradient(135deg, ${track.color}, #111)">
          ${coverHtml}
        </div>
        <div class="queue-track-meta">
          <div class="queue-track-title">${track.title}</div>
          <div class="queue-track-artist">${track.artist}</div>
        </div>
        <button class="queue-track-remove" data-queue-idx="${idx}"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `;
  });

  // 2. Natural upcoming items from the active playbackList
  const sliceIndex = currentTrackIndex + 1;
  const upcomingList = playbackList.slice(sliceIndex);
  
  upcomingList.slice(0, 10).forEach((track) => {
    let coverHtml = '<i class="fa-solid fa-music"></i>';
    if (track.cover) {
      coverHtml = `<img src="${track.cover}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
    } else {
      coverHtml = '<i class="fa-solid fa-folder"></i>';
    }

    html += `
      <div class="queue-track-row natural-upcoming" data-track-id="${track.id}">
        <div class="queue-track-art" style="background: linear-gradient(135deg, ${track.color}, #111)">
          ${coverHtml}
        </div>
        <div class="queue-track-meta">
          <div class="queue-track-title">${track.title}</div>
          <div class="queue-track-artist">${track.artist}</div>
        </div>
        <span style="font-size: 11px; color: var(--text-muted); padding-right: 4px;">Next</span>
      </div>
    `;
  });

  if (html === '') {
    els.queueTracksList.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">End of playlist</span>`;
  } else {
    els.queueTracksList.innerHTML = html;

    // Events for removing manually added queue items
    els.queueTracksList.querySelectorAll('.queue-track-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const qIdx = parseInt(btn.getAttribute('data-queue-idx'));
        queue.splice(qIdx, 1);
        renderQueueList();
        if (activeView === 'queue') renderMainQueueView();
        showToast("Removed from queue");
      });
    });

    // Play queue items
    els.queueTracksList.querySelectorAll('.queue-track-row').forEach(row => {
      row.addEventListener('click', () => {
        if (row.classList.contains('natural-upcoming')) {
          const tId = row.getAttribute('data-track-id');
          const tObj = playbackList.find(t => t.id === tId);
          loadTrack(tObj, true);
        } else {
          const qIdx = parseInt(row.getAttribute('data-queue-idx'));
          const targetTrack = queue[qIdx];
          queue.splice(0, qIdx + 1); // remove all manual queue items up to this one
          loadTrack(targetTrack, true);
        }
      });
    });
  }
}

function renderMainQueueView() {
  // Render Now Playing Row
  if (!currentTrack) {
    els.queueNowPlayingTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">Not playing anything yet</td></tr>`;
  } else {
    let coverHtml = '<i class="fa-solid fa-music"></i>';
    if (currentTrack.cover) {
      coverHtml = `<img src="${currentTrack.cover}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
    }
    
    els.queueNowPlayingTableBody.innerHTML = `
      <tr class="active-playing">
        <td class="track-index-col"><i class="fa-solid fa-volume-high"></i></td>
        <td>
          <div class="track-title-info">
            <div class="track-mini-art" style="background: linear-gradient(135deg, ${currentTrack.color}, #111)">
              ${coverHtml}
            </div>
            <div class="track-meta-block">
              <span class="track-title">${currentTrack.title}</span>
              <span class="track-artist">${currentTrack.artist}</span>
            </div>
          </div>
        </td>
        <td>${currentTrack.album || 'Unknown Album'}</td>
        <td>3:45</td>
      </tr>
    `;
  }

  // Render Upcoming lists
  let rowsHtml = '';
  let indexCounter = 1;

  // 1. Manual Queue
  queue.forEach((track, idx) => {
    let coverHtml = '<i class="fa-solid fa-music"></i>';
    if (track.cover) {
      coverHtml = `<img src="${track.cover}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
    }
    
    rowsHtml += `
      <tr data-queue-idx="${idx}">
        <td class="track-index-col">
          <span class="track-index-num">${indexCounter}</span>
          <span class="track-index-play q-manual-play" data-queue-idx="${idx}"><i class="fa-solid fa-play"></i></span>
        </td>
        <td>
          <div class="track-title-info">
            <div class="track-mini-art" style="background: linear-gradient(135deg, ${track.color}, #111)">
              ${coverHtml}
            </div>
            <div class="track-meta-block">
              <span class="track-title">${track.title}</span>
              <span class="track-artist">${track.artist} <span style="font-size:10px; color:#ffd700; background:rgba(255,215,0,0.1); padding:2px 6px; border-radius:4px; margin-left:4px; font-weight:700;">QUEUED</span></span>
            </div>
          </div>
        </td>
        <td>${track.album || 'Local Storage'}</td>
        <td>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span>3:45</span>
            <button class="btn-secondary-circle q-manual-remove" data-queue-idx="${idx}" style="width:28px; height:28px; font-size:12px;" title="Remove"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </td>
      </tr>
    `;
    indexCounter++;
  });

  // 2. Normal Upcoming progression
  const upcomingProgression = playbackList.slice(currentTrackIndex + 1);
  upcomingProgression.slice(0, 15).forEach((track) => {
    let coverHtml = '<i class="fa-solid fa-music"></i>';
    if (track.cover) {
      coverHtml = `<img src="${track.cover}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
    }
    
    rowsHtml += `
      <tr data-track-id="${track.id}">
        <td class="track-index-col">
          <span class="track-index-num">${indexCounter}</span>
          <span class="track-index-play q-prog-play" data-track-id="${track.id}"><i class="fa-solid fa-play"></i></span>
        </td>
        <td>
          <div class="track-title-info">
            <div class="track-mini-art" style="background: linear-gradient(135deg, ${track.color || '#222'}, #111)">
              ${coverHtml}
            </div>
            <div class="track-meta-block">
              <span class="track-title">${track.title}</span>
              <span class="track-artist">${track.artist}</span>
            </div>
          </div>
        </td>
        <td>${track.album || 'Unknown Album'}</td>
        <td>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span>3:45</span>
            <button class="track-options-btn" data-track-id="${track.id}"><i class="fa-solid fa-ellipsis"></i></button>
          </div>
        </td>
      </tr>
    `;
    indexCounter++;
  });

  if (rowsHtml === '') {
    els.queueUpcomingTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">End of playlist. Queue some songs!</td></tr>`;
  } else {
    els.queueUpcomingTableBody.innerHTML = rowsHtml;

    // Remove handlers
    els.queueUpcomingTableBody.querySelectorAll('.q-manual-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const qIdx = parseInt(btn.getAttribute('data-queue-idx'));
        queue.splice(qIdx, 1);
        renderMainQueueView();
        renderQueueList();
        showToast("Removed from queue");
      });
    });

    // Play manual items
    els.queueUpcomingTableBody.querySelectorAll('.q-manual-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const qIdx = parseInt(btn.getAttribute('data-queue-idx'));
        const targetTrack = queue[qIdx];
        queue.splice(0, qIdx + 1);
        loadTrack(targetTrack, true);
      });
    });

    // Play natural items
    els.queueUpcomingTableBody.querySelectorAll('.q-prog-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tId = btn.getAttribute('data-track-id');
        const targetTrack = playbackList.find(t => t.id === tId);
        loadTrack(targetTrack, true);
      });
    });

    // Dbl clicks
    els.queueUpcomingTableBody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('dblclick', () => {
        const tId = row.getAttribute('data-track-id');
        const qIdx = row.getAttribute('data-queue-idx');
        if (tId) {
          const targetTrack = playbackList.find(t => t.id === tId);
          loadTrack(targetTrack, true);
        } else if (qIdx) {
          const targetTrack = queue[parseInt(qIdx)];
          queue.splice(0, parseInt(qIdx) + 1);
          loadTrack(targetTrack, true);
        }
      });
    });

    // Ellipsis binding
    els.queueUpcomingTableBody.querySelectorAll('.track-options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trId = btn.getAttribute('data-track-id');
        showContextMenu(e, trId, 'queue');
      });
    });
  }
}

function addToQueue(trackId) {
  const allAvailable = [...songs, ...localTracks];
  const track = allAvailable.find(s => s.id === trackId);
  if (track) {
    queue.push(track);
    renderQueueList();
    if (activeView === 'queue') renderMainQueueView();
    showToast("Added to queue");
  }
}

// ==========================================
// Playlists & Likes Controls
// ==========================================
function toggleLike(trackId) {
  const index = likedSongs.indexOf(trackId);
  if (index === -1) {
    likedSongs.push(trackId);
    showToast("Added to Liked Songs");
  } else {
    likedSongs.splice(index, 1);
    showToast("Removed from Liked Songs");
  }
  
  saveLikes();
  
  // Re-sync UI states
  if (currentTrack && currentTrack.id === trackId) {
    const isLiked = likedSongs.includes(trackId);
    els.playerLikeBtn.classList.toggle('liked', isLiked);
    els.playerLikeBtn.innerHTML = isLiked ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
    
    els.queuePeekLikeBtn.classList.toggle('liked', isLiked);
    els.queuePeekLikeBtn.innerHTML = isLiked ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
  }

  // Refresh Sidebar stats
  renderSidebarPlaylists();
}

function createPlaylist(name) {
  const cleanName = name.trim() || `My Playlist #${customPlaylists.length + 1}`;
  const id = `playlist_${Date.now()}`;
  
  customPlaylists.push({
    id: id,
    name: cleanName,
    tracks: []
  });
  
  savePlaylists();
  showToast("Playlist created");
  showView('playlist', { playlistId: id, isCustom: true });
}

function deletePlaylist(playlistId) {
  customPlaylists = customPlaylists.filter(p => p.id !== playlistId);
  savePlaylists();
  showToast("Playlist deleted");
  showView('home');
}

function addTrackToPlaylist(trackId, playlistId) {
  const playlist = customPlaylists.find(p => p.id === playlistId);
  if (!playlist) return;

  const track = songs.find(s => s.id === trackId) || localTracks.find(s => s.id === trackId);
  if (!track) return;

  // Avoid duplicates in custom playlist
  if (playlist.tracks.some(t => t.id === trackId)) {
    showToast("Song already in playlist");
    return;
  }

  playlist.tracks.push(track);
  savePlaylists();
  showToast(`Added to ${playlist.name}`);
}

function removeTrackFromPlaylist(trackId, playlistId) {
  const playlist = customPlaylists.find(p => p.id === playlistId);
  if (!playlist) return;

  playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
  savePlaylists();
  showToast(`Removed from ${playlist.name}`);
  renderPlaylistView(playlistId, true); // Refresh list
}

// ==========================================
// Search Queries Filtering
// ==========================================
function handleSearch(query) {
  const q = query.trim().toLowerCase();
  
  if (q === '') {
    els.searchResultsContainer.style.display = 'none';
    els.genresCategoriesGrid.style.display = 'grid';
    els.genresTitle.style.display = 'block';
    return;
  }

  // Hide genres, show search layout
  els.genresCategoriesGrid.style.display = 'none';
  els.genresTitle.style.display = 'none';
  els.searchResultsContainer.style.display = 'block';

  // Search local files + preset tracks
  const searchPool = [...songs, ...localTracks];
  const matches = searchPool.filter(track => {
    return track.title.toLowerCase().includes(q) || 
           track.artist.toLowerCase().includes(q) || 
           (track.album && track.album.toLowerCase().includes(q));
  });

  if (matches.length === 0) {
    els.searchResultsTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 36px; color: var(--text-muted);">
          No results found for "${query}"
        </td>
      </tr>
    `;
  } else {
    els.searchResultsTableBody.innerHTML = matches.map((track, idx) => {
      const activeClass = (currentTrack && currentTrack.id === track.id) ? 'active-playing' : '';
      const isLiked = likedSongs.includes(track.id);
      const heartIcon = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      const heartClass = isLiked ? 'liked' : '';

      let miniCover = '<i class="fa-solid fa-music"></i>';
      if (track.cover) {
        miniCover = `<img src="${track.cover}" style="width:100%; height:100%; object-fit:cover; border-radius: 4px;">`;
      } else {
        miniCover = `<i class="fa-solid fa-folder"></i>`;
      }

      return `
        <tr class="${activeClass}" data-track-id="${track.id}">
          <td class="track-index-col">
            <span class="track-index-num">${idx + 1}</span>
            <span class="track-index-play" data-track-id="${track.id}"><i class="fa-solid fa-play"></i></span>
          </td>
          <td>
            <div class="track-title-info">
              <div class="track-mini-art" style="background: linear-gradient(135deg, ${track.color || '#222'}, #111)">
                ${miniCover}
              </div>
              <div class="track-meta-block">
                <span class="track-title">${track.title}</span>
                <span class="track-artist">${track.artist}</span>
              </div>
            </div>
          </td>
          <td>${track.album || 'Local Track'}</td>
          <td>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span>3:45</span>
              <button class="like-button ${heartClass}" data-track-id="${track.id}"><i class="${heartIcon}"></i></button>
              <button class="track-options-btn" data-track-id="${track.id}"><i class="fa-solid fa-ellipsis"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind triggers on results table
    els.searchResultsTableBody.querySelectorAll('.track-index-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trId = btn.getAttribute('data-track-id');
        playTrackFromList(trId, matches);
      });
    });

    els.searchResultsTableBody.querySelectorAll('tbody tr').forEach(row => {
      row.addEventListener('dblclick', () => {
        const trId = row.getAttribute('data-track-id');
        playTrackFromList(trId, matches);
      });
    });

    els.searchResultsTableBody.querySelectorAll('.like-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trId = btn.getAttribute('data-track-id');
        toggleLike(trId);
        handleSearch(query); // refresh UI
      });
    });

    els.searchResultsTableBody.querySelectorAll('.track-options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trId = btn.getAttribute('data-track-id');
        showContextMenu(e, trId, 'search');
      });
    });
  }
}

// ==========================================
// Local Files Import & IndexedDB Store Hook
// ==========================================
function handleLocalFiles(files) {
  let count = 0;
  const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/') || f.name.endsWith('.mp3'));

  audioFiles.forEach(file => {
    const objectUrl = URL.createObjectURL(file);
    const filename = file.name.replace(/\.[^/.]+$/, ""); // strip extension
    
    // Attempt parsing title & artist: e.g. "Artist - Title" or "Title"
    let title = filename;
    let artist = "Local Artist";
    
    if (filename.includes(' - ')) {
      const parts = filename.split(' - ');
      artist = parts[0].trim();
      title = parts[1].trim();
    } else if (filename.includes('-')) {
      const parts = filename.split('-');
      artist = parts[0].trim();
      title = parts[1].trim();
    }

    // Clean mass-download titles
    title = title.replace(/-MassTamilan\.(com|fm|dev|io)/gi, "").replace(/_/, " ").trim();
    artist = artist.replace(/-MassTamilan\.(com|fm|dev|io)/gi, "").replace(/_/, " ").trim();

    // Create a virtual track object
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const trackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const trackObj = {
      id: trackId,
      title: title,
      artist: artist,
      album: "Local Storage",
      url: objectUrl,
      color: `hsl(${Math.floor(Math.random() * 360)}, 40%, 35%)`, // random accent
      size: `${sizeMB} MB`
    };

    localTracks.push(trackObj);
    count++;

    // Persistence: Save binary File + metadata to IndexedDB
    saveLocalTrackToDB(trackObj, file);
  });

  if (count > 0) {
    showToast(`Imported ${count} local track(s). Saved to Darshtify DB!`);
    renderSidebarPlaylists();
    renderLocalTracksTable();
  }
}

function renderLocalTracksTable() {
  if (localTracks.length === 0) {
    els.localTracksTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No local files imported yet. Drag & drop files or choose files above.
        </td>
      </tr>
    `;
    return;
  }

  els.localTracksTableBody.innerHTML = localTracks.map((track, idx) => {
    const activeClass = (currentTrack && currentTrack.id === track.id) ? 'active-playing' : '';

    return `
      <tr class="${activeClass}" data-track-id="${track.id}">
        <td class="track-index-col">
          <span class="track-index-num">${idx + 1}</span>
          <span class="track-index-play" data-track-id="${track.id}"><i class="fa-solid fa-play"></i></span>
        </td>
        <td>
          <div class="track-title-info">
            <div class="track-mini-art" style="background: linear-gradient(135deg, ${track.color}, #111); display:flex; align-items:center; justify-content:center;">
              <i class="fa-solid fa-folder"></i>
            </div>
            <div class="track-meta-block">
              <span class="track-title">${track.title}</span>
              <span class="track-artist">${track.artist}</span>
            </div>
          </div>
        </td>
        <td>${track.size}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <button class="track-options-btn" data-track-id="${track.id}"><i class="fa-solid fa-ellipsis"></i></button>
            <button class="btn-secondary-circle remove-local-btn" data-track-id="${track.id}" style="width:28px; height:28px; font-size:12px;" title="Delete Permanently"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind clicks
  els.localTracksTableBody.querySelectorAll('.track-index-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trId = btn.getAttribute('data-track-id');
      playTrackFromList(trId, localTracks);
    });
  });

  els.localTracksTableBody.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('dblclick', () => {
      const trId = row.getAttribute('data-track-id');
      playTrackFromList(trId, localTracks);
    });
  });

  // Permanently delete file from DB & Page
  els.localTracksTableBody.querySelectorAll('.remove-local-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trId = btn.getAttribute('data-track-id');
      
      const track = localTracks.find(t => t.id === trId);
      if (track && track.url) {
        URL.revokeObjectURL(track.url); // free resources
      }
      
      localTracks = localTracks.filter(t => t.id !== trId);
      
      // Delete from IndexedDB
      removeLocalTrackFromDB(trId);
      
      renderLocalTracksTable();
      renderSidebarPlaylists();
      showToast("Track deleted from browser storage");
    });
  });

  // Options context menu
  els.localTracksTableBody.querySelectorAll('.track-options-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trId = btn.getAttribute('data-track-id');
      showContextMenu(e, trId, 'local');
    });
  });
}

// ==========================================
// Custom Context Menus Controls
// ==========================================
function showContextMenu(e, trackId, playlistContextId = null, isCustomPlaylistContext = false) {
  contextMenuSelectedTrackId = trackId;
  
  // Set context variables
  const isLiked = likedSongs.includes(trackId);
  const likeMenuText = isLiked ? '<i class="fa-solid fa-heart" style="color:var(--spotify-green)"></i> Liked' : '<i class="fa-regular fa-heart"></i> Add to Liked Songs';
  document.getElementById('menu-toggle-like').innerHTML = likeMenuText;

  // Show/hide 'Remove from playlist' option
  const removeBtn = document.getElementById('menu-remove-from-playlist');
  if (isCustomPlaylistContext && playlistContextId) {
    removeBtn.style.display = 'flex';
    removeBtn.onclick = () => {
      removeTrackFromPlaylist(trackId, playlistContextId);
      hideContextMenu();
    };
  } else {
    removeBtn.style.display = 'none';
  }

  // Populate Add to Playlist submenu
  if (customPlaylists.length === 0) {
    els.contextPlaylistsSubmenu.innerHTML = `<div class="menu-item" style="color: var(--text-muted);">No Playlists</div>`;
  } else {
    els.contextPlaylistsSubmenu.innerHTML = customPlaylists.map(pl => `
      <div class="menu-item context-submenu-item" data-playlist-id="${pl.id}">${pl.name}</div>
    `).join('');

    els.contextPlaylistsSubmenu.querySelectorAll('.context-submenu-item').forEach(item => {
      item.addEventListener('click', () => {
        const plId = item.getAttribute('data-playlist-id');
        addTrackToPlaylist(trackId, plId);
        hideContextMenu();
      });
    });
  }

  // Position the context menu
  const menu = els.trackContextMenu;
  menu.style.display = 'block';

  // Prevent menu going offscreen
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let x = mouseX;
  let y = mouseY;

  if (mouseX + menuWidth > windowWidth) {
    x = mouseX - menuWidth;
  }
  if (mouseY + menuHeight > windowHeight) {
    y = mouseY - menuHeight;
  }

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

function hideContextMenu() {
  els.trackContextMenu.style.display = 'none';
}

// ==========================================
// Toast popup Utilities
// ==========================================
let toastTimer = null;
function showToast(message) {
  els.toastMessage.textContent = message;
  els.toastNotification.classList.add('show');
  
  if (toastTimer) clearTimeout(toastTimer);
  
  toastTimer = setTimeout(() => {
    els.toastNotification.classList.remove('show');
  }, 2500);
}

// ==========================================
// Event Listeners Binding
// ==========================================
function setupEventListeners() {
  // Navigation sidebar buttons
  els.nav.home.onclick = () => showView('home');
  els.nav.search.onclick = () => showView('search');
  els.nav.liked.onclick = () => showView('liked');
  els.nav.local.onclick = () => showView('local');
  els.nav.queue.onclick = () => showView('queue');

  // HTML5 Media Session API controls
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
      playTrack();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      pauseTrack();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      prevTrack();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      nextTrack();
    });
    
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in audio) {
          audio.fastSeek(details.seekTime);
        } else {
          audio.currentTime = details.seekTime;
        }
        updatePlaybackProgress();
      });
    } catch (e) {
      console.warn("Media Session seekto handler error:", e);
    }
  }

  // Mobile Bottom Navigation clicks
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.onclick = () => {
      const view = item.getAttribute('data-view');
      showView(view);
    };
  });

  // Profile Dropdown Toggle Click
  els.userProfileHeader.addEventListener('click', (e) => {
    e.stopPropagation();
    els.profileDropdownMenu.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    els.profileDropdownMenu.classList.remove('active');
  });

  // Profile Action items
  els.dropProfileSettings.onclick = () => {
    if (currentUser.email === '') {
      switchAuthPane('login'); // login first if guest
    } else {
      switchAuthPane('settings');
    }
  };

  els.dropUpgradePremium.onclick = () => {
    if (currentUser.email === '') {
      switchAuthPane('register');
    } else {
      switchAuthPane('settings');
    }
  };

  els.dropAuthAction.onclick = () => {
    if (currentUser.email === '') {
      switchAuthPane('login');
    } else {
      logout();
    }
  };

  // Auth modal switch triggers
  els.switchToRegister.onclick = () => switchAuthPane('register');
  els.switchToLogin.onclick = () => switchAuthPane('login');
  els.authModalCloseBtn.onclick = () => els.accountAuthModal.classList.remove('active');

  // Submit Sign up / Login Form handlers
  els.btnRegisterSubmit.onclick = async () => {
    const name = els.registerUsername.value;
    const email = els.registerEmail.value;
    const pass = els.registerPassword.value;
    const tier = els.registerTier.value;
    await registerNewAccount(name, email, pass, tier);
  };

  els.btnLoginSubmit.onclick = async () => {
    const email = els.loginEmail.value;
    const pass = els.loginPassword.value;
    await loginAccount(email, pass);
  };

  els.btnSettingsSave.onclick = async () => {
    const name = els.settingsUsername.value;
    const tier = els.settingsTier.value;
    await saveProfileSettings(name, tier);
  };

  els.btnLogoutSubmit.onclick = logout;

  // Settings profile image upload triggers
  if (els.settingsAvatarWrapper && els.settingsAvatarInput) {
    els.settingsAvatarWrapper.onclick = () => {
      els.settingsAvatarInput.click();
    };
    
    els.settingsAvatarInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          showCustomAlert("Please choose an image smaller than 2MB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          currentUser.avatar = event.target.result;
          if (els.settingsAvatarPreview) {
            els.settingsAvatarPreview.style.backgroundImage = `url(${currentUser.avatar})`;
            els.settingsAvatarPreview.style.backgroundSize = 'cover';
            els.settingsAvatarPreview.style.backgroundPosition = 'center';
            els.settingsAvatarPreview.textContent = '';
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // Backup Import/Export triggers
  if (els.btnBackupExport) {
    els.btnBackupExport.onclick = () => {
      exportBackupData();
    };
  }

  if (els.btnBackupImportTrigger && els.backupFileInput) {
    els.btnBackupImportTrigger.onclick = () => {
      els.backupFileInput.click();
    };

    els.backupFileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await importBackupData(file);
      }
    };
  }

  // Ad upgrade now click
  els.btnAdUpgradeNow.onclick = () => {
    clearInterval(adTimerInterval);
    els.adOverlayPopup.classList.remove('active');
    adActive = false;
    freeSkipCount = 0;
    if (currentUser.email === '') {
      switchAuthPane('register');
    } else {
      switchAuthPane('settings');
    }
  };

  // Welcome Cards click
  els.quickAccessGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.welcome-card');
    if (!card) return;
    const songId = card.getAttribute('data-id');
    const songObj = songs.find(s => s.id === songId);
    
    if (e.target.closest('.play-btn-hover')) {
      playTrackFromList(songId, songs);
    } else {
      loadTrack(songObj, true);
    }
  });

  // Featured Playlists click
  els.madeForYouGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.music-card');
    if (!card) return;
    const plId = card.getAttribute('data-playlist-id');
    
    if (e.target.closest('.play-btn-hover')) {
      const plObj = presetPlaylists[plId];
      const plTracks = plObj.trackIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
      if (plTracks.length > 0) playTrackFromList(plTracks[0].id, plTracks);
    } else {
      showView('playlist', { playlistId: plId, isCustom: false });
    }
  });

  // Recommended Cards click
  els.recommendedGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.music-card');
    if (!card) return;
    const trackId = card.getAttribute('data-track-id');
    const trackObj = songs.find(s => s.id === trackId);
    
    if (e.target.closest('.play-btn-hover')) {
      playTrackFromList(trackId, [trackObj]);
    } else {
      loadTrack(trackObj, true);
    }
  });

  // Playlist Delete button
  els.playlistDeleteBtn.onclick = async () => {
    if (activePlaylistId) {
      if (await showCustomConfirm("Are you sure you want to delete this playlist?")) {
        deletePlaylist(activePlaylistId);
      }
    }
  };

  // Search input typing
  els.searchBarInput.addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });

  // Clear play queue
  els.queueClearAllBtn.onclick = () => {
    queue = [];
    renderQueueList();
    renderMainQueueView();
    showToast("Queue cleared");
  };

  // Navigation history buttons
  els.historyBackBtn.onclick = () => {
    if (historyPointer > 0) {
      historyPointer--;
      const view = navigationHistory[historyPointer];
      
      // Navigate without pushing new history
      activeView = view;
      Object.values(els.sections).forEach(section => {
        if (section) section.classList.remove('active');
      });
      Object.values(els.nav).forEach(n => {
        if (n) n.classList.remove('active');
      });
      els.searchBoxWrapper.style.display = 'none';

      if (view === 'home') {
        els.sections.home.classList.add('active');
        els.nav.home.classList.add('active');
      } else if (view === 'search') {
        els.sections.search.classList.add('active');
        els.nav.search.classList.add('active');
        els.searchBoxWrapper.style.display = 'block';
      } else if (view === 'liked') {
        els.sections.playlist.classList.add('active');
        els.nav.liked.classList.add('active');
        activePlaylistId = 'liked';
        renderPlaylistView('liked');
      } else if (view === 'lyrics') {
        els.sections.lyrics.classList.add('active');
        els.nav.lyrics.classList.add('active');
        if (currentTrack) renderLyrics(currentTrack);
      } else if (view === 'local') {
        els.sections.local.classList.add('active');
        els.nav.local.classList.add('active');
        renderLocalTracksTable();
      } else if (view === 'queue') {
        els.sections.queue.classList.add('active');
        els.nav.queue.classList.add('active');
        renderMainQueueView();
      }
      
      if (historyPointer === 0) {
        els.historyBackBtn.style.opacity = '0.4';
        els.historyBackBtn.style.cursor = 'not-allowed';
      }
    }
  };

  // Create Playlist Modal triggers
  els.createPlaylistBtn.onclick = () => {
    els.createPlaylistModal.classList.add('active');
    els.newPlaylistName.value = '';
    els.newPlaylistName.focus();
  };

  const closeModal = () => els.createPlaylistModal.classList.remove('active');
  els.modalCloseBtn.onclick = closeModal;
  els.modalCancelBtn.onclick = closeModal;
  
  els.modalSaveBtn.onclick = () => {
    const plName = els.newPlaylistName.value;
    createPlaylist(plName);
    closeModal();
  };
  els.newPlaylistName.onkeydown = (e) => {
    if (e.key === 'Enter') {
      createPlaylist(els.newPlaylistName.value);
      closeModal();
    }
  };

  // Context Menu Actions
  document.getElementById('menu-play-now').onclick = () => {
    if (contextMenuSelectedTrackId) {
      const allAvailable = [...songs, ...localTracks];
      const trackObj = allAvailable.find(s => s.id === contextMenuSelectedTrackId);
      loadTrack(trackObj, true);
    }
    hideContextMenu();
  };

  document.getElementById('menu-add-queue').onclick = () => {
    if (contextMenuSelectedTrackId) addToQueue(contextMenuSelectedTrackId);
    hideContextMenu();
  };

  document.getElementById('menu-toggle-like').onclick = () => {
    if (contextMenuSelectedTrackId) toggleLike(contextMenuSelectedTrackId);
    hideContextMenu();
  };

  document.addEventListener('click', hideContextMenu);

  // Audio Playback Events
  els.playerPlayBtn.onclick = togglePlay;
  els.playerNextBtn.onclick = nextTrack;
  els.playerPrevBtn.onclick = prevTrack;
  els.playerShuffleBtn.onclick = toggleShuffle;
  els.playerRepeatBtn.onclick = toggleRepeat;

  // Seeker Slider Inputs
  els.playerSeekSlider.oninput = (e) => {
    if (audio.duration) {
      const seekTarget = (e.target.value / 100) * audio.duration;
      els.playerCurrentTime.textContent = formatTime(seekTarget);
      els.playerSeekProgress.style.width = `${e.target.value}%`;
    }
  };

  els.playerSeekSlider.onchange = (e) => {
    if (audio.duration) {
      audio.currentTime = (e.target.value / 100) * audio.duration;
      if (isPlaying) playTrack();
    }
  };

  // Seeker Hover Tooltip Tracker
  const seekTooltip = document.getElementById('player-seek-tooltip');
  if (els.playerSeekSlider && seekTooltip) {
    els.playerSeekSlider.addEventListener('mousemove', (e) => {
      if (!audio.duration) return;
      const rect = els.playerSeekSlider.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const percent = Math.min(Math.max(0, mouseX / rect.width), 1);
      const targetTime = percent * audio.duration;
      
      seekTooltip.textContent = formatTime(targetTime);
      seekTooltip.style.left = `${percent * 100}%`;
    });
  }

  // Audio Timeupdate hooks
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    
    if (document.activeElement !== els.playerSeekSlider) {
      els.playerSeekSlider.value = progress;
      els.playerSeekProgress.style.width = `${progress}%`;
      els.playerCurrentTime.textContent = formatTime(audio.currentTime);
    }
    
    // Update native Media Session position timeline
    updatePlaybackPositionState();

    // Sync lyrics scroll highlighting
    updateLyricsHighlight(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    els.playerTotalDuration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', nextTrack);

  // Volume sliders
  els.playerVolumeSlider.oninput = (e) => {
    const vol = e.target.value / 100;
    audio.volume = vol;
    audio.muted = (vol === 0);
    els.playerVolumeProgress.style.width = `${e.target.value}%`;
    updateVolumeIcon(vol, audio.muted);
  };

  els.playerMuteBtn.onclick = () => {
    audio.muted = !audio.muted;
    updateVolumeIcon(audio.volume, audio.muted);
    els.playerVolumeProgress.style.width = audio.muted ? '0%' : `${audio.volume * 100}%`;
    els.playerVolumeSlider.value = audio.muted ? 0 : audio.volume * 100;
  };

  // Hearts triggers
  els.playerLikeBtn.onclick = () => {
    if (currentTrack) toggleLike(currentTrack.id);
  };
  els.queuePeekLikeBtn.onclick = () => {
    if (currentTrack) toggleLike(currentTrack.id);
  };

  // Panel Toggles
  els.queueToggleBtn.onclick = () => {
    els.appContainer.classList.toggle('queue-open');
    els.queueToggleBtn.classList.toggle('active');
    renderQueueList();
  };
  
  els.queueCloseBtn.onclick = () => {
    els.appContainer.classList.remove('queue-open');
    els.queueToggleBtn.classList.remove('active');
  };

  // Fullscreen visualizer focus screen overlays with PREMIUM gates
  els.focusModeToggleBtn.onclick = async () => {
    if (await checkPremiumFeature("Fullscreen Ambient Focus Mode")) {
      els.focusModeOverlay.classList.add('active');
    }
  };
  
  els.focusCloseBtn.onclick = () => {
    els.focusModeOverlay.classList.remove('active');
  };

  // Sync Focus controls
  els.focusPlayBtn.onclick = togglePlay;
  els.focusNextBtn.onclick = nextTrack;
  els.focusPrevBtn.onclick = prevTrack;

  // Local Drag & drop handlers
  const dropzone = els.localFilesDropzone;
  
  dropzone.onclick = () => els.localFilesHiddenInput.click();
  els.localFilesHiddenInput.onchange = (e) => handleLocalFiles(e.target.files);

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files) {
      handleLocalFiles(e.dataTransfer.files);
    }
  });

  // Global Key listeners for shortcuts
  document.addEventListener('keydown', (e) => {
    // Avoid firing shortcuts when typing in inputs
    if (document.activeElement.tagName === 'INPUT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowRight' && e.ctrlKey) {
      nextTrack();
    } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
      prevTrack();
    }
  });

  // Toggle canvas wave visualizer overlay with PREMIUM gates
  els.visualizerToggleBtn.onclick = async () => {
    if (await checkPremiumFeature("Live Audio Wave Visualizer")) {
      const isShowing = els.visualizerCanvasOverlay.classList.toggle('active');
      els.visualizerToggleBtn.classList.toggle('active', isShowing);
      showToast(isShowing ? "Audio visualizer activated" : "Audio visualizer deactivated");
    }
  };

  // ==========================================
  // Equalizer & Spatial FX Drawer Listeners
  // ==========================================
  els.eqToggleBtn.onclick = () => {
    initAudioContext();
    els.equalizerDrawer.classList.toggle('active');
  };
  
  els.eqCloseDrawerBtn.onclick = () => {
    els.equalizerDrawer.classList.remove('active');
  };

  els.eqPresetSelect.onchange = (e) => {
    applyEqPreset(e.target.value);
  };

  els.fxReverbSelect.onchange = (e) => {
    initAudioContext();
    applyReverbEffect(e.target.value);
    saveEffectsSettings();
  };

  els.fxPanSlider.oninput = (e) => {
    initAudioContext();
    applyPanEffect(parseInt(e.target.value));
    saveEffectsSettings();
  };

  els.fxCrossfadeSlider.oninput = (e) => {
    applyCrossfadeSetting(parseInt(e.target.value));
    saveEffectsSettings();
  };

  // ==========================================
  // Lyrics View & Sorting Listeners
  // ==========================================
  els.lyricsToggleBtn.onclick = () => {
    if (activeView === 'lyrics') {
      els.historyBackBtn.click();
    } else {
      showView('lyrics');
    }
  };

  if (els.playlistFilterInput) {
    els.playlistFilterInput.oninput = () => {
      if (activePlaylistId) {
        renderPlaylistView(activePlaylistId, activePlaylistId !== 'liked' && !presetPlaylists[activePlaylistId]);
      }
    };
  }

  if (els.playlistSortSelect) {
    els.playlistSortSelect.onchange = () => {
      if (activePlaylistId) {
        renderPlaylistView(activePlaylistId, activePlaylistId !== 'liked' && !presetPlaylists[activePlaylistId]);
      }
    };
  }

  // ==========================================
  // Visualizer Mode Selector Picker click
  // ==========================================
  if (els.vizModePicker) {
    els.vizModePicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.viz-mode-btn');
      if (!btn) return;
      
      els.vizModePicker.querySelectorAll('.viz-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentVisualizerMode = btn.getAttribute('data-mode');
      
      showToast(`Visualizer: ${btn.textContent.trim()}`);
    });
  }

  // ==========================================
  // CORS Safety Fallback Error Interceptor
  // ==========================================
  audio.addEventListener('error', () => {
    if (audio.crossOrigin === 'anonymous') {
      console.warn("CORS issue detected. Retrying playback bypassing Web Audio nodes...");
      audio.removeAttribute('crossOrigin');
      const currentSrc = audio.src;
      audio.src = currentSrc;
      if (isPlaying) {
        audio.play().catch(err => console.error("Audio fallback play failed:", err));
      }
    }
  });
}

// Helpers
function formatTime(secs) {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateVolumeIcon(vol, muted) {
  let iconClass = 'fa-solid fa-volume-high';
  if (muted || vol === 0) {
    iconClass = 'fa-solid fa-volume-xmark';
  } else if (vol < 0.3) {
    iconClass = 'fa-solid fa-volume-low';
  } else if (vol < 0.7) {
    iconClass = 'fa-solid fa-volume-off'; // medium
  }
  els.playerMuteBtn.innerHTML = `<i class="${iconClass}"></i>`;
}

// ==========================================
// Canvas Wave Audio Visualizer
// ==========================================
let canvasCtx = null;
let visualizerAnimationId = null;

function setupVisualizer() {
  const canvas = els.musicVisualizerCanvas;
  canvasCtx = canvas.getContext('2d');
  
  // Set dimensions
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Start animation loop
  drawVisualizer();
}

function resizeCanvas() {
  const canvas = els.musicVisualizerCanvas;
  canvas.width = canvas.parentElement.offsetWidth;
  canvas.height = canvas.parentElement.offsetHeight;
}

function drawVisualizer() {
  visualizerAnimationId = requestAnimationFrame(drawVisualizer);
  
  if (!canvasCtx) return;
  
  const canvas = els.musicVisualizerCanvas;
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas with transparent fade to create trails
  canvasCtx.fillStyle = 'rgba(9, 9, 11, 0.16)';
  canvasCtx.fillRect(0, 0, width, height);
  
  const waveColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim() || '#1ed760';
  const transparentColor = waveColor.includes('hsl') ? waveColor.replace(')', ', 0.15)').replace('hsl', 'hsla') : 'rgba(30, 215, 96, 0.15)';
  const glowColor = waveColor.includes('hsl') ? waveColor.replace(')', ', 0.5)').replace('hsl', 'hsla') : 'rgba(30, 215, 96, 0.5)';
  
  // Check if we can use real audio analyser data
  const hasRealData = (analyserNode !== null && audioCtx !== null && audioCtx.state !== 'suspended');
  
  // Reset shadow effects
  canvasCtx.shadowBlur = 0;
  canvasCtx.shadowColor = 'transparent';

  if (hasRealData && currentVisualizerMode === 'retro-bars') {
    // ==========================================
    // 1. PREMIUM RETRO EQUALIZER BARS
    // ==========================================
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);
    
    // We only draw a subset of frequencies (up to 70%) to avoid drawing high-freq silences
    const activeLength = Math.floor(bufferLength * 0.72);
    const barWidth = (width / activeLength) * 1.05;
    let barHeight;
    let x = 0;
    
    if (!window.barPeaks || window.barPeaks.length !== activeLength) {
      window.barPeaks = Array(activeLength).fill(0);
    }
    
    for (let i = 0; i < activeLength; i++) {
      let percent = dataArray[i] / 255;
      if (!isPlaying) percent *= 0.1;
      
      // Scale logarithmic-ish for visual density
      barHeight = percent * height * 0.8;
      
      if (barHeight > window.barPeaks[i]) {
        window.barPeaks[i] = barHeight;
      } else {
        window.barPeaks[i] = Math.max(0, window.barPeaks[i] - 1.8);
      }
      
      const gradient = canvasCtx.createLinearGradient(x, height, x, height - barHeight);
      gradient.addColorStop(0, transparentColor);
      gradient.addColorStop(0.6, waveColor);
      gradient.addColorStop(1, '#ffffff');
      
      canvasCtx.fillStyle = gradient;
      
      // Draw rounded rectangle bars
      canvasCtx.beginPath();
      if (canvasCtx.roundRect) {
        canvasCtx.roundRect(x, height - barHeight, Math.max(1, barWidth - 4), barHeight, [6, 6, 0, 0]);
      } else {
        canvasCtx.rect(x, height - barHeight, Math.max(1, barWidth - 4), barHeight);
      }
      canvasCtx.fill();
      
      // Draw rounded peak dot
      canvasCtx.fillStyle = '#ffffff';
      canvasCtx.beginPath();
      const peakY = height - window.barPeaks[i] - 3;
      if (canvasCtx.roundRect) {
        canvasCtx.roundRect(x, Math.max(0, peakY), Math.max(1, barWidth - 4), 3, 1.5);
      } else {
        canvasCtx.rect(x, Math.max(0, peakY), Math.max(1, barWidth - 4), 3);
      }
      canvasCtx.fill();
      
      x += barWidth;
    }
    
  } else if (hasRealData && currentVisualizerMode === 'ambient-orb') {
    // ==========================================
    // 2. REACTIVE GLOWING BASS ORB & TENTACLES
    // ==========================================
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);
    
    // Average sub-bass (bins 0 to 8)
    let bassSum = 0;
    for (let i = 0; i < 8; i++) {
      bassSum += dataArray[i];
    }
    const bassAvg = (bassSum / 8) / 255;
    const pulseIntensity = isPlaying ? bassAvg : 0.05;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.16;
    const targetRadius = baseRadius + pulseIntensity * 100;
    
    if (!window.smoothOrbRadius) window.smoothOrbRadius = baseRadius;
    // Exponential smoothing (interpolation) for fluid elastic scaling
    window.smoothOrbRadius += (targetRadius - window.smoothOrbRadius) * 0.18;
    
    // 1. Draw outer giant blur glow aura
    const outerGlow = canvasCtx.createRadialGradient(centerX, centerY, window.smoothOrbRadius * 0.6, centerX, centerY, window.smoothOrbRadius * 2.8);
    outerGlow.addColorStop(0, waveColor.replace(')', ', 0.35)').replace('hsl', 'hsla'));
    outerGlow.addColorStop(0.5, waveColor.replace(')', ', 0.08)').replace('hsl', 'hsla'));
    outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    
    canvasCtx.fillStyle = outerGlow;
    canvasCtx.beginPath();
    canvasCtx.arc(centerX, centerY, window.smoothOrbRadius * 2.8, 0, Math.PI * 2);
    canvasCtx.fill();
    
    // 2. Draw frequency tentacles (Reactive Ring)
    const numPoints = 120;
    canvasCtx.strokeStyle = waveColor;
    canvasCtx.lineWidth = 2.5;
    canvasCtx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      // Map index log-like
      const binIdx = Math.floor(Math.pow(i / numPoints, 1.5) * (bufferLength * 0.6));
      const val = dataArray[binIdx] / 255;
      const factor = isPlaying ? val * 70 : Math.sin(Date.now() * 0.002 + i * 0.1) * 3;
      const r = window.smoothOrbRadius + factor;
      const px = centerX + Math.cos(angle) * r;
      const py = centerY + Math.sin(angle) * r;
      if (i === 0) canvasCtx.moveTo(px, py);
      else canvasCtx.lineTo(px, py);
    }
    canvasCtx.closePath();
    canvasCtx.stroke();
    
    // 3. Draw inner solid concentric core
    const coreGlow = canvasCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, window.smoothOrbRadius);
    coreGlow.addColorStop(0, '#ffffff');
    coreGlow.addColorStop(0.3, waveColor);
    coreGlow.addColorStop(1, waveColor.replace(')', ', 0.8)').replace('hsl', 'hsla'));
    
    canvasCtx.fillStyle = coreGlow;
    canvasCtx.beginPath();
    canvasCtx.arc(centerX, centerY, window.smoothOrbRadius * 0.82, 0, Math.PI * 2);
    canvasCtx.fill();
    
    // 4. Draw orbiting particle stream
    const time = Date.now() * 0.0008;
    canvasCtx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI / 6) + time * (0.4 + pulseIntensity * 0.8);
      const orbitRad = window.smoothOrbRadius + 20 + Math.sin(time * 3 + i) * 12;
      const px = centerX + Math.cos(angle) * orbitRad;
      const py = centerY + Math.sin(angle) * orbitRad;
      
      canvasCtx.beginPath();
      canvasCtx.arc(px, py, 2 + pulseIntensity * 4, 0, Math.PI * 2);
      canvasCtx.fill();
    }
    
  } else {
    // ==========================================
    // 3. NEON GLOWING SINE OSCILLOSCOPE (Real/Sim)
    // ==========================================
    let bufferLength = 120;
    let dataArray = [];
    
    if (hasRealData) {
      bufferLength = analyserNode.frequencyBinCount;
      const timeData = new Uint8Array(bufferLength);
      analyserNode.getByteTimeDomainData(timeData);
      dataArray = Array.from(timeData).map(v => (v - 128) / 128); // normalize
    }
    
    // Enable glowing neon lines
    canvasCtx.shadowBlur = isPlaying ? 18 : 6;
    canvasCtx.shadowColor = waveColor;
    
    // A. Main wave
    canvasCtx.strokeStyle = '#ffffff';
    canvasCtx.lineWidth = 3.5;
    canvasCtx.beginPath();
    
    const sliceWidth = width / bufferLength;
    let x = 0;
    const time = Date.now() * 0.0035;
    const intensity = isPlaying ? 65 : 3;
    
    for (let i = 0; i < bufferLength; i++) {
      let yValue;
      if (hasRealData) {
        let val = dataArray[i];
        if (!isPlaying) val *= 0.1;
        yValue = (height / 2) + val * height * 0.38;
      } else {
        const sin1 = Math.sin(i * 0.045 + time);
        const cos2 = Math.cos(i * 0.082 - time * 0.65);
        const envelope = Math.sin((i / bufferLength) * Math.PI);
        yValue = (height / 2) + (sin1 + cos2) * intensity * envelope;
      }
      
      if (i === 0) {
        canvasCtx.moveTo(x, yValue);
      } else {
        canvasCtx.lineTo(x, yValue);
      }
      x += sliceWidth;
    }
    canvasCtx.stroke();
    
    // B. Sub-wave (out of phase for 3D stereoscopic depth)
    canvasCtx.strokeStyle = glowColor;
    canvasCtx.lineWidth = 1.8;
    canvasCtx.shadowBlur = 0; // disable shadow for back-wave to keep it sharp
    canvasCtx.beginPath();
    x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      let yValue;
      if (hasRealData) {
        const nextIdx = (i + 22) % bufferLength;
        let val = dataArray[nextIdx] * 0.45;
        if (!isPlaying) val *= 0.1;
        yValue = (height / 2) + val * height * 0.38;
      } else {
        const sin1 = Math.sin(i * 0.055 - time * 1.3);
        const cos2 = Math.cos(i * 0.038 + time * 0.48);
        const envelope = Math.sin((i / bufferLength) * Math.PI);
        yValue = (height / 2) + (sin1 + cos2) * (intensity * 0.65) * envelope;
      }
      
      if (i === 0) {
        canvasCtx.moveTo(x, yValue);
      } else {
        canvasCtx.lineTo(x, yValue);
      }
      x += sliceWidth;
    }
    canvasCtx.stroke();
  }
  
  // Clean up canvas shadow states
  canvasCtx.shadowBlur = 0;
  canvasCtx.shadowColor = 'transparent';
}

// ==========================================
// Web Audio API & FX Core Engine
function initAudioContext() {
  if (audioCtx) return;
  
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Connect Web Audio API to HTML5 Audio Element
    audio.crossOrigin = "anonymous";
    sourceNode = audioCtx.createMediaElementSource(audio);
    
    // Create 10-band Equalizer filters chain
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    let lastNode = sourceNode;
    
    // Read saved gains or default to flat (0dB)
    const savedGains = localStorage.getItem('darshtify_eq_gains');
    const gains = savedGains ? JSON.parse(savedGains) : Array(10).fill(0);
    
    eqFilters = frequencies.map((freq, idx) => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      filter.gain.value = gains[idx];
      
      lastNode.connect(filter);
      lastNode = filter;
      return filter;
    });
    
    // Create Reverb Nodes (Delay Feedback Loop)
    reverbDelayNode = audioCtx.createDelay(2.0);
    reverbFeedbackGain = audioCtx.createGain();
    reverbWetGain = audioCtx.createGain();
    reverbDryGain = audioCtx.createGain();
    
    reverbDelayNode.delayTime.value = 0.15;
    reverbFeedbackGain.gain.value = 0.4;
    reverbWetGain.gain.value = 0.0;
    reverbDryGain.gain.value = 1.0;
    
    // Connect dry path
    lastNode.connect(reverbDryGain);
    
    // Connect wet feedback loop
    lastNode.connect(reverbDelayNode);
    reverbDelayNode.connect(reverbFeedbackGain);
    reverbFeedbackGain.connect(reverbDelayNode); // feedback loop
    reverbDelayNode.connect(reverbWetGain);
    
    // Mix dry and wet signals
    const mixerNode = audioCtx.createGain();
    reverbDryGain.connect(mixerNode);
    reverbWetGain.connect(mixerNode);
    
    lastNode = mixerNode;
    
    // Create Stereo Panner Node for balance
    if (audioCtx.createStereoPanner) {
      panNode = audioCtx.createStereoPanner();
      panNode.pan.value = 0;
      lastNode.connect(panNode);
      lastNode = panNode;
    }
    
    // Create Analyser Node for visualizer
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
    
    lastNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    
    console.log("Web Audio API pipeline successfully started!");
    
    // Load local storage values for effects settings
    loadEffectsSettings();
    
  } catch (err) {
    console.error("Failed to initialize Web Audio API pipeline:", err);
  }
}

function updateEqSliderFill(slider) {
  const val = parseFloat(slider.value);
  const min = parseFloat(slider.min || -12);
  const max = parseFloat(slider.max || 12);
  const percent = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--theme-color) 0%, var(--theme-color) ${percent}%, rgba(255,255,255,0.15) ${percent}%, rgba(255,255,255,0.15) 100%)`;
}

// 1. Equalizer UI Builder & Settings Saver
function buildEqualizerUI() {
  const container = els.eqSlidersContainer;
  const labels = ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1k', '2k', '4k', '8k', '16k'];
  
  const savedGains = localStorage.getItem('darshtify_eq_gains');
  const gains = savedGains ? JSON.parse(savedGains) : Array(10).fill(0);
  
  let html = '';
  labels.forEach((label, idx) => {
    const gainVal = gains[idx];
    const displayVal = gainVal > 0 ? `+${gainVal.toFixed(0)}` : gainVal.toFixed(0);
    
    html += `
      <div class="eq-slider-col">
        <span class="eq-slider-value" id="eq-val-${idx}">${displayVal}</span>
        <div class="eq-slider-wrapper">
          <input type="range" class="eq-band-slider" data-index="${idx}" min="-12" max="12" value="${gainVal}">
        </div>
        <span class="eq-slider-label">${label}</span>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Set up listeners on the EQ sliders
  container.querySelectorAll('.eq-band-slider').forEach(slider => {
    updateEqSliderFill(slider);
    slider.addEventListener('input', () => {
      initAudioContext();
      
      const idx = parseInt(slider.getAttribute('data-index'));
      const gainVal = parseFloat(slider.value);
      
      // Update node gain if active
      if (eqFilters[idx]) {
        eqFilters[idx].gain.value = gainVal;
      }
      
      // Update label
      const valLabel = document.getElementById(`eq-val-${idx}`);
      if (valLabel) {
        valLabel.textContent = gainVal > 0 ? `+${gainVal.toFixed(0)}` : gainVal.toFixed(0);
      }
      
      updateEqSliderFill(slider);
      
      // Set preset selector to custom
      els.eqPresetSelect.value = 'custom';
      
      saveEqGains();
    });
  });
}

function saveEqGains() {
  const gains = Array.from(els.eqSlidersContainer.querySelectorAll('.eq-band-slider')).map(s => parseFloat(s.value));
  localStorage.setItem('darshtify_eq_gains', JSON.stringify(gains));
}

function applyEqPreset(presetName) {
  const preset = eqPresets[presetName];
  if (!preset) return;
  
  initAudioContext();
  
  const sliders = els.eqSlidersContainer.querySelectorAll('.eq-band-slider');
  sliders.forEach((slider, idx) => {
    const gainVal = preset[idx];
    slider.value = gainVal;
    
    if (eqFilters[idx]) {
      eqFilters[idx].gain.value = gainVal;
    }
    
    const valLabel = document.getElementById(`eq-val-${idx}`);
    if (valLabel) {
      valLabel.textContent = gainVal > 0 ? `+${gainVal.toFixed(0)}` : gainVal.toFixed(0);
    }
    
    updateEqSliderFill(slider);
  });
  
  saveEqGains();
}

// 2. Spatial Effects Load & Save Handlers
function saveEffectsSettings() {
  const settings = {
    reverb: els.fxReverbSelect.value,
    pan: parseInt(els.fxPanSlider.value),
    crossfade: parseInt(els.fxCrossfadeSlider.value)
  };
  localStorage.setItem('darshtify_fx_settings', JSON.stringify(settings));
}

function loadEffectsSettings() {
  const saved = localStorage.getItem('darshtify_fx_settings');
  if (!saved) return;
  
  try {
    const settings = JSON.parse(saved);
    
    // 1. Reverb
    els.fxReverbSelect.value = settings.reverb || 'none';
    applyReverbEffect(settings.reverb || 'none');
    
    // 2. Pan
    els.fxPanSlider.value = settings.pan || 0;
    applyPanEffect(settings.pan || 0);
    
    // 3. Crossfade
    els.fxCrossfadeSlider.value = settings.crossfade || 0;
    applyCrossfadeSetting(settings.crossfade || 0);
    
  } catch (err) {
    console.error("Failed to parse saved FX settings:", err);
  }
}

function applyReverbEffect(roomType) {
  if (!audioCtx) return;
  
  let delay = 0.15;
  let feedback = 0.4;
  let wet = 0.0;
  let dry = 1.0;
  
  switch (roomType) {
    case 'room':
      delay = 0.08;
      feedback = 0.25;
      wet = 0.3;
      dry = 0.95;
      break;
    case 'hall':
      delay = 0.25;
      feedback = 0.48;
      wet = 0.55;
      dry = 0.75;
      break;
    case 'stadium':
      delay = 0.45;
      feedback = 0.55;
      wet = 0.65;
      dry = 0.65;
      break;
    case 'space':
      delay = 0.85;
      feedback = 0.72;
      wet = 0.78;
      dry = 0.45;
      break;
    case 'none':
    default:
      wet = 0.0;
      dry = 1.0;
      break;
  }
  
  if (reverbDelayNode && reverbFeedbackGain && reverbWetGain && reverbDryGain) {
    reverbDelayNode.delayTime.setValueAtTime(delay, audioCtx.currentTime);
    reverbFeedbackGain.gain.setValueAtTime(feedback, audioCtx.currentTime);
    reverbWetGain.gain.setValueAtTime(wet, audioCtx.currentTime);
    reverbDryGain.gain.setValueAtTime(dry, audioCtx.currentTime);
  }
}

function applyPanEffect(val) {
  let text = 'Center';
  if (val < 0) text = `Left ${Math.abs(val)}%`;
  else if (val > 0) text = `Right ${val}%`;
  els.fxPanLabel.textContent = text;
  
  const progressPercent = ((val + 100) / 200) * 100;
  els.fxPanProgress.style.width = `${progressPercent}%`;
  
  if (panNode) {
    panNode.pan.setValueAtTime(val / 100, audioCtx ? audioCtx.currentTime : 0);
  }
}

function applyCrossfadeSetting(val) {
  crossfadeDuration = val;
  els.fxCrossfadeLabel.textContent = val > 0 ? `${val}s` : 'Disabled';
  els.fxCrossfadeProgress.style.width = `${(val / 12) * 100}%`;
}

// 3. Audio Crossfade Transitions Manager
let crossfadeActive = false;
function playTrackWithCrossfade(nextTrackObj, loadImmediately = true) {
  if (!currentTrack || crossfadeDuration === 0 || crossfadeActive) {
    loadTrack(nextTrackObj, loadImmediately);
    return;
  }
  
  crossfadeActive = true;
  const fadeTime = crossfadeDuration * 1000;
  const steps = 25;
  const stepTime = fadeTime / steps;
  
  // Cache user's current volume setting
  const initialVolume = audio.volume;
  let currentStep = 0;
  
  // Fade Out Current Track
  const fadeOutInterval = setInterval(() => {
    currentStep++;
    audio.volume = Math.max(0, initialVolume * (1 - currentStep / steps));
    
    if (currentStep >= steps) {
      clearInterval(fadeOutInterval);
      
      // Load next track silently
      loadTrack(nextTrackObj, false);
      audio.volume = 0;
      
      if (loadImmediately) {
        audio.play().then(() => {
          isPlaying = true;
          els.playerPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          els.focusPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          
          // Fade In Next Track
          let inStep = 0;
          const fadeInInterval = setInterval(() => {
            inStep++;
            audio.volume = Math.min(initialVolume, initialVolume * (inStep / steps));
            
            if (inStep >= steps) {
              clearInterval(fadeInInterval);
              audio.volume = initialVolume; // restore original volume
              crossfadeActive = false;
            }
          }, stepTime);
        }).catch(err => {
          console.warn("Crossfade play failed:", err);
          audio.volume = initialVolume;
          crossfadeActive = false;
        });
      } else {
        audio.volume = initialVolume;
        crossfadeActive = false;
      }
    }
  }, stepTime);
}

// 4. Apple Music-Style Synced Lyrics Scrolling Engine
function renderLyrics(track) {
  const container = els.lyricsLinesContainer;
  const title = els.lyricsTrackTitleLabel;
  const artist = els.lyricsTrackArtistLabel;
  
  title.textContent = track.title;
  artist.textContent = track.artist;
  
  if (track.cover) {
    els.lyricsTrackCover.innerHTML = `<img src="${track.cover}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
  } else {
    els.lyricsTrackCover.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:48px;"><i class="fa-solid fa-folder-open"></i></div>`;
  }
  
  if (!track.lyrics || track.lyrics.length === 0) {
    container.innerHTML = `<div class="lyrics-line-placeholder">No synced lyrics available for this song.<br><span style="font-size:13px; font-weight:500; color:var(--text-muted);">Try playing "Danga Maari Oodhari", "TVK Campaign Song", or "Yathe Yathe" to see time-synced lyrics scroll!</span></div>`;
    return;
  }
  
  container.innerHTML = track.lyrics.map(line => `
    <div class="lyrics-line" data-time="${line.time}">${line.text}</div>
  `).join('');
  
  container.querySelectorAll('.lyrics-line').forEach(lineEl => {
    lineEl.addEventListener('click', () => {
      initAudioContext();
      const time = parseFloat(lineEl.getAttribute('data-time'));
      audio.currentTime = time;
      if (!isPlaying) playTrack();
    });
  });
}

function updateLyricsHighlight(currentTime) {
  if (activeView !== 'lyrics') return;
  
  const container = els.lyricsLinesContainer;
  const lines = container.querySelectorAll('.lyrics-line');
  if (lines.length === 0) return;
  
  let activeLine = null;
  
  for (let i = 0; i < lines.length; i++) {
    const time = parseFloat(lines[i].getAttribute('data-time'));
    if (currentTime >= time) {
      activeLine = lines[i];
    } else {
      break;
    }
  }
  
  if (activeLine && !activeLine.classList.contains('active')) {
    lines.forEach(l => l.classList.remove('active'));
    activeLine.classList.add('active');
    
    // Center scroll
    const containerHeight = container.clientHeight;
    const lineOffset = activeLine.offsetTop;
    const lineHeight = activeLine.clientHeight;
    
    container.scrollTo({
      top: lineOffset - (containerHeight / 2) + (lineHeight / 2),
      behavior: 'smooth'
    });
  }
}

// Kick off
init();
