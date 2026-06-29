const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Authentification
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    register: (username, password) => ipcRenderer.invoke('auth:register', username, password),
    
    // Base de données : Sites bloqués
    getBlockedSites: (username) => ipcRenderer.invoke('user:getBlockedSites', username),
    updateBlockedSites: (username, blockedSites) => ipcRenderer.invoke('user:updateBlockedSites', username, blockedSites)
});
