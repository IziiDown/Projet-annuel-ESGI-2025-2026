const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Authentification
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    register: (username, password) => ipcRenderer.invoke('auth:register', username, password),
    
    // Base de données : Sites bloqués
    getBlockedSites: (username) => ipcRenderer.invoke('user:getBlockedSites', username),
    updateBlockedSites: (username, blockedSites) => ipcRenderer.invoke('user:updateBlockedSites', username, blockedSites),
    
    // Base de données : Programmes bloqués
    getBlockedPrograms: (username) => ipcRenderer.invoke('user:getBlockedPrograms', username),
    updateBlockedPrograms: (username, blockedPrograms) => ipcRenderer.invoke('user:updateBlockedPrograms', username, blockedPrograms),
    
    // Réglages du minuteur (temps de focus/pause)
    updateFocusSettings: (username, focusTime, breakTime) => ipcRenderer.invoke('user:updateFocusSettings', username, focusTime, breakTime),
    
    // Notification de l'état (WebSocket)
    updateState: (state) => ipcRenderer.send('update-state', state)
});
