let socket = null;
let reconnectTimer = null;
let appState = {
  blockedSites: [],
  isActive: false,
  mode: 'focus',
  timeLeft: 0,
  totalDuration: 0,
  strictLevel: 'cool',
  connected: false
};

// Update storage and notify popup/blocked page if open
function updateState(newState) {
  appState = { ...appState, ...newState };
  chrome.storage.local.set({ procrastopState: appState });
  
  // Also update blocking rules
  updateBlockingRules();
}

function updateBlockingRules() {
  const { isActive, blockedSites } = appState;
  
  chrome.declarativeNetRequest.getDynamicRules(existingRules => {
    const existingIds = existingRules.map(r => r.id);
    const newRules = [];
    
    if (isActive && blockedSites && blockedSites.length > 0) {
      blockedSites.forEach((site, index) => {
        // Build a dynamic rule redirecting to our extension page.
        newRules.push({
          id: index + 1,
          priority: 1,
          action: {
            type: "redirect",
            redirect: {
              extensionPath: `/blocked.html?site=${encodeURIComponent(site)}`
            }
          },
          condition: {
            urlFilter: `||${site}`,
            resourceTypes: ["main_frame"]
          }
        });
      });
    }
    
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: newRules
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("[DNR] Error updating rules:", chrome.runtime.lastError.message);
      } else {
        console.log("[DNR] Rules updated, count:", newRules.length);
      }
    });
  });
}

function connectToApp() {
  if (socket) {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      return;
    }
    try {
      socket.close();
    } catch(e) {}
  }
  
  console.log("Connecting to Procrastop Electron app...");
  socket = new WebSocket("ws://127.0.0.1:3010");
  
  socket.onopen = () => {
    console.log("Connected to Procrastop WebSocket Server!");
    updateState({ connected: true });
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  };
  
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'state_update') {
        updateState({ ...message.data, connected: true });
      }
    } catch (e) {
      console.error("Error parsing message from Electron:", e);
    }
  };
  
  socket.onclose = () => {
    console.log("Disconnected from Procrastop WebSocket.");
    updateState({ connected: false, isActive: false }); // Disable blocking if app is closed
    startReconnectTimer();
  };
  
  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
    // onclose will be triggered automatically
  };
}

function startReconnectTimer() {
  if (!reconnectTimer) {
    reconnectTimer = setInterval(() => {
      connectToApp();
    }, 3000);
  }
}

// Set up periodic wake-ups/keep-alive alarm for Manifest V3 Service Worker
chrome.alarms.create("keepAlive", { periodInMinutes: 0.25 }); // every 15 seconds
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    console.log("[KeepAlive] Checking connection status...");
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectToApp();
    }
  }
});

// Connect immediately on startup
connectToApp();
