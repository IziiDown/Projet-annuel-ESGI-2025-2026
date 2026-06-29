const { ipcRenderer } = require('electron');

// LISTE PAR DÉFAUT DES SITES BLOQUÉS
let blockedSites = ['facebook.com', 'youtube.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'netflix.com'];

// SÉLECTEURS DOM
const homeScreen = document.getElementById('home-screen');
const settingsScreen = document.getElementById('settings-screen');
const sessionScreen = document.getElementById('session-screen');

const btnCommencer = document.getElementById('btn-commencer');
const btnBack = document.getElementById('btn-back');
const btnSave = document.getElementById('btn-save');
const btnStopSession = document.getElementById('btn-stop-session');
const btnSkipPause = document.getElementById('btn-skip-pause');

const inputSite = document.getElementById('input-site');
const btnAddSite = document.getElementById('btn-add-site');
const blockedSitesList = document.getElementById('blocked-sites-list');

const sliderFocusTime = document.getElementById('slider-focus-time');
const sliderBreakTime = document.getElementById('slider-break-time');
const focusTimeVal = document.getElementById('focus-time-val');
const breakTimeVal = document.getElementById('break-time-val');

const timerDisplay = document.getElementById('timer-display');
const sessionStatusText = document.getElementById('session-status-text');
const sessionMessageText = document.getElementById('session-message-text');
const sessionProgress = document.getElementById('session-progress');

// VARIABLES DE LA SESSION
let timerInterval = null;
let timeLeft = 0;
let totalDuration = 0;
let currentMode = 'focus'; // 'focus' | 'break'
let strictLevel = 'cool'; // 'cool' | 'normal' | 'hardcore'

// Fonction pour notifier le processus principal de l'état actuel
function updateBackendState() {
    if (typeof ipcRenderer !== 'undefined') {
        ipcRenderer.send('update-state', {
            blockedSites: blockedSites,
            isActive: (timerInterval !== null && currentMode === 'focus'),
            mode: currentMode,
            timeLeft: timeLeft,
            totalDuration: totalDuration,
            strictLevel: strictLevel
        });
    }
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Demander la permission de notification au démarrage
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    
    renderBlockedSites();
    setupEventListeners();
    updateBackendState();
});

// --- ENREGISTREMENT DES ÉVÉNEMENTS ---
function setupEventListeners() {
    // Navigation : Écran d'accueil -> Écran de Réglages
    btnCommencer.addEventListener('click', () => {
        switchScreen(homeScreen, settingsScreen);
    });

    // Navigation : Écran de Réglages -> Écran d'accueil
    btnBack.addEventListener('click', () => {
        switchScreen(settingsScreen, homeScreen);
    });

    // Synchronisation des sliders
    sliderFocusTime.addEventListener('input', (e) => {
        focusTimeVal.textContent = `${e.target.value} min`;
    });

    sliderBreakTime.addEventListener('input', (e) => {
        breakTimeVal.textContent = `${e.target.value} min`;
    });

    // Ajout de site internet
    btnAddSite.addEventListener('click', handleAddSite);
    inputSite.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleAddSite();
        }
    });

    // Lancement de la session
    btnSave.addEventListener('click', startSession);

    // Contrôles de session
    btnStopSession.addEventListener('click', stopSession);
    btnSkipPause.addEventListener('click', skipPause);
}

// --- LOGIQUE DES ÉCRANS ---
function switchScreen(fromScreen, toScreen) {
    fromScreen.classList.remove('active');
    fromScreen.classList.add('hidden');
    
    // Un petit délai pour permettre à la transition de se faire proprement
    setTimeout(() => {
        toScreen.classList.remove('hidden');
        toScreen.classList.add('active');
    }, 50);
}

// --- GESTION DES SITES BLOQUÉS ---
function renderBlockedSites() {
    blockedSitesList.innerHTML = '';
    blockedSites.forEach((site, index) => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `
            <span>${site}</span>
            <button class="tag-remove" data-index="${index}" aria-label="Supprimer ${site}">×</button>
        `;
        
        // Événement de suppression sur le bouton
        tag.querySelector('.tag-remove').addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            removeSite(idx);
        });
        
        blockedSitesList.appendChild(tag);
    });
    updateBackendState();
}

function handleAddSite() {
    const value = inputSite.value.trim().toLowerCase();
    if (!value) return;

    // Validation basique d'URL/nom de domaine
    const domainRegex = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-z]{2,10}$/;
    if (!domainRegex.test(value)) {
        alert("Veuillez entrer un domaine valide (ex: site.com ou sub.domain.fr)");
        return;
    }

    if (blockedSites.includes(value)) {
        alert("Ce site est déjà dans la liste !");
        return;
    }

    blockedSites.push(value);
    inputSite.value = '';
    renderBlockedSites();
}

function removeSite(index) {
    blockedSites.splice(index, 1);
    renderBlockedSites();
}

// --- LOGIQUE DE MINUTEUR ---
function startSession() {
    const focusMinutes = parseInt(sliderFocusTime.value, 10);
    strictLevel = document.querySelector('input[name="strict-level"]:checked').value;

    currentMode = 'focus';
    timeLeft = focusMinutes * 60;
    totalDuration = timeLeft;

    // Adapter le bouton Abandonner selon le niveau de strictness
    if (strictLevel === 'hardcore') {
        btnStopSession.disabled = true;
        btnStopSession.textContent = 'Bloqué (Hardcore)';
        btnStopSession.style.cursor = 'not-allowed';
        btnStopSession.style.opacity = '0.5';
    } else {
        btnStopSession.disabled = false;
        btnStopSession.textContent = 'Abandonner';
        btnStopSession.style.cursor = 'pointer';
        btnStopSession.style.opacity = '1';
    }

    btnSkipPause.classList.add('hidden');
    updateSessionUI();
    switchScreen(settingsScreen, sessionScreen);

    // Démarrer l'intervalle du minuteur
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
}

function tick() {
    if (timeLeft > 0) {
        timeLeft--;
        updateSessionUI();
    } else {
        // Le temps est écoulé
        handleTimerEnd();
    }
}

function updateSessionUI() {
    // Calcul de la min:sec
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Calcul de la barre de progression
    const percentage = (timeLeft / totalDuration) * 100;
    sessionProgress.style.width = `${percentage}%`;

    // Met à jour les textes selon le mode
    if (currentMode === 'focus') {
        sessionStatusText.textContent = "Session de Concentration";
        sessionStatusText.style.color = "#a5b4fc";
        sessionMessageText.textContent = `Vos distractions (${blockedSites.length} sites) sont bloquées. Restez concentré !`;
    } else {
        sessionStatusText.textContent = "Pause bien méritée";
        sessionStatusText.style.color = "#34d399";
        sessionMessageText.textContent = "Détendez-vous les yeux, étirez-vous et buvez de l'eau.";
    }

    updateBackendState();
}

function handleTimerEnd() {
    clearInterval(timerInterval);
    timerInterval = null;
    playAlertSound();

    if (currentMode === 'focus') {
        showNotification("Félicitations !", "C'est l'heure de la pause. Profitez-en pour vous détendre.");
        
        // Passer en mode pause
        currentMode = 'break';
        const breakMinutes = parseInt(sliderBreakTime.value, 10);
        timeLeft = breakMinutes * 60;
        totalDuration = timeLeft;
        
        // En mode pause, on autorise à passer la pause, et l'abandon redevient actif
        btnSkipPause.classList.remove('hidden');
        btnStopSession.disabled = false;
        btnStopSession.textContent = "Arrêter la session";
        btnStopSession.style.opacity = '1';
        btnStopSession.style.cursor = 'pointer';

        updateSessionUI();
        timerInterval = setInterval(tick, 1000);
    } else {
        // La pause est finie -> Retour aux réglages
        showNotification("La pause est finie !", "Prêt pour une nouvelle session de focus ?");
        updateBackendState();
        switchScreen(sessionScreen, settingsScreen);
    }
}

function stopSession() {
    if (strictLevel === 'hardcore' && currentMode === 'focus') {
        // Juste une sécurité supplémentaire au cas où
        return;
    }

    if (strictLevel === 'normal' && currentMode === 'focus') {
        const confirmAbort = confirm("Êtes-vous sûr de vouloir abandonner ? Vous perdrez votre jauge de focus en cours.");
        if (!confirmAbort) return;
    }

    clearInterval(timerInterval);
    timerInterval = null;
    updateBackendState();
    switchScreen(sessionScreen, settingsScreen);
}

function skipPause() {
    clearInterval(timerInterval);
    timerInterval = null;
    updateBackendState();
    // On revient à l'écran de réglages après la fin de la session globale
    switchScreen(sessionScreen, settingsScreen);
}

// --- SYNTHÉTISEUR DE SONS (Web Audio API) ---
function playAlertSound() {
    if (!document.getElementById('toggle-sounds').checked) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // bip 1
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // Do 5
        gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.3);
        
        // bip 2 (légèrement décalé)
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // Mi 5
            gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.4);
        }, 150);
    } catch (e) {
        console.error("Impossible de jouer le son :", e);
    }
}

// --- NOTIFICATIONS DE BUREAU ---
function showNotification(title, body) {
    if (!document.getElementById('toggle-notifications').checked) return;
    try {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    } catch (e) {
        console.error("Impossible d'afficher la notification :", e);
    }
}
