// DOM Elements
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const viewDisconnected = document.getElementById('view-disconnected');
const viewIdle = document.getElementById('view-idle');
const viewActive = document.getElementById('view-active');
const timerDisplay = document.getElementById('timer-display');
const focusModeLabel = document.getElementById('focus-mode-label');
const activeMessage = document.getElementById('active-message');
const sitesList = document.getElementById('sites-list');
const sitesSection = document.getElementById('sites-section');

function updateUI(state) {
  if (!state) {
    showDisconnected();
    return;
  }

  // Update connection status
  if (state.connected) {
    statusBadge.className = 'status-badge connected';
    statusText.textContent = 'Connecté';
  } else {
    showDisconnected();
    return;
  }

  // Show correct view based on session activity
  if (state.isActive) {
    viewDisconnected.classList.add('hidden');
    viewIdle.classList.add('hidden');
    viewActive.classList.remove('hidden');

    // Update timer
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update labels based on mode (focus vs break)
    if (state.mode === 'focus') {
      focusModeLabel.textContent = 'Session Focus';
      focusModeLabel.style.color = '#a5b4fc';
      activeMessage.textContent = 'Vos distractions sont bloquées.';
    } else {
      focusModeLabel.textContent = 'Pause';
      focusModeLabel.style.color = '#34d399';
      activeMessage.textContent = 'Profitez de votre temps libre !';
    }
  } else {
    viewDisconnected.classList.add('hidden');
    viewIdle.classList.remove('hidden');
    viewActive.classList.add('hidden');
  }

  // Update blocked sites tags
  sitesList.innerHTML = '';
  if (state.blockedSites && state.blockedSites.length > 0) {
    sitesSection.classList.remove('hidden');
    state.blockedSites.forEach(site => {
      const tag = document.createElement('span');
      tag.className = 'site-tag';
      tag.textContent = site;
      sitesList.appendChild(tag);
    });
  } else {
    sitesSection.classList.add('hidden');
  }
}

function showDisconnected() {
  statusBadge.className = 'status-badge disconnected';
  statusText.textContent = 'Déconnecté';
  viewDisconnected.classList.remove('hidden');
  viewIdle.classList.add('hidden');
  viewActive.classList.add('hidden');
  sitesSection.classList.add('hidden');
}

// Load initial state
chrome.storage.local.get(['procrastopState'], (result) => {
  updateUI(result.procrastopState);
});

// Listen to storage updates in real time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.procrastopState) {
    updateUI(changes.procrastopState.newValue);
  }
});
