// List of motivational quotes
const quotes = [
  { text: "La concentration est le secret de la force.", author: "Ralph Waldo Emerson" },
  { text: "Le meilleur moyen de prévoir l'avenir, c'est de le créer.", author: "Peter Drucker" },
  { text: "Rien ne se fait sans un peu d'enthousiasme.", author: "Ralph Waldo Emerson" },
  { text: "Commencez par faire ce qui est nécessaire, puis ce qui est possible, et soudain vous ferez l'impossible.", author: "François d'Assise" },
  { text: "Le succès, c'est de faire des choses ordinaires de manière extraordinaire.", author: "Albert Einstein" },
  { text: "La procrastination est l'art de rester au niveau d'hier.", author: "Anonyme" },
  { text: "La clé de la productivité est de faire ce que vous devez faire quand vous devez le faire, que vous le vouliez ou non.", author: "Elbert Hubbard" }
];

// Display site name from query parameters
const urlParams = new URLSearchParams(window.location.search);
const siteParam = urlParams.get('site');
const siteNameEl = document.getElementById('site-name');
if (siteParam) {
  siteNameEl.textContent = siteParam;
}

// Display random quote
const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
document.getElementById('quote-text').textContent = `"${randomQuote.text}"`;
document.getElementById('quote-author').textContent = randomQuote.author;

// Back button action
document.getElementById('btn-history-back').addEventListener('click', () => {
  // Go back to the previous page or close tab if no back history
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
});

// UI elements for session state
const timerDisplay = document.getElementById('timer-display');
const progressBar = document.getElementById('progress-bar');
const timerSection = document.getElementById('timer-section');

function updateUI(state) {
  if (!state || !state.isActive) {
    // If the session is no longer active, redirect the user back to the original URL or let them browse
    timerDisplay.textContent = "--:--";
    progressBar.style.width = "0%";
    
    // Auto-reload the blocked page. Since the dynamic net request rule is cleared,
    // reloading the tab will open the original web page immediately!
    if (siteParam) {
      window.location.href = "https://" + siteParam;
    }
    return;
  }

  // Update timer text
  const minutes = Math.floor(state.timeLeft / 60);
  const seconds = state.timeLeft % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Update progress bar
  if (state.totalDuration > 0) {
    const percentage = (state.timeLeft / state.totalDuration) * 100;
    progressBar.style.width = `${percentage}%`;
  } else {
    progressBar.style.width = "0%";
  }
}

// Initial state load
chrome.storage.local.get(['procrastopState'], (result) => {
  if (result.procrastopState) {
    updateUI(result.procrastopState);
  }
});

// Listen to storage changes in real time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.procrastopState) {
    updateUI(changes.procrastopState.newValue);
  }
});
