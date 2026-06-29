const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const bcrypt = require('bcrypt')
const WebSocket = require('ws')
const http = require('http')
const { connectDB, User } = require('./database')

// Se connecter à la base de données MongoDB
connectDB();

let wss = null
let server = null
let currentAppState = {
    blockedSites: ['facebook.com', 'youtube.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'netflix.com'],
    blockedPrograms: [],
    isActive: false,
    mode: 'focus',
    timeLeft: 0,
    totalDuration: 0,
    strictLevel: 'cool'
}

// Function to broadcast state to all connected extension clients
function broadcastState() {
    if (!wss) return
    const payload = JSON.stringify({
        type: 'state_update',
        data: currentAppState
    })
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload)
        }
    })
}

const createWindow = () => {
    const win = new BrowserWindow({
        width: 900,
        height: 650,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    win.loadFile('index.html')
    win.webContents.openDevTools() // Ouvre la console de développement
}

// Start WebSocket and HTTP server
function startServer() {
    server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
            res.writeHead(200)
            res.end()
            return
        }

        if (req.url === '/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(currentAppState))
        } else {
            res.writeHead(404)
            res.end()
        }
    })

    wss = new WebSocket.Server({ server })

    wss.on('connection', (ws) => {
        console.log('[WS] Extension connectée')
        // Send state immediately on connection
        ws.send(JSON.stringify({
            type: 'state_update',
            data: currentAppState
        }))

        ws.on('close', () => {
            console.log('[WS] Extension déconnectée')
        })
    })

    server.listen(3010, '127.0.0.1', () => {
        console.log('[Serveur] En écoute sur http://127.0.0.1:3010')
    })
}

app.whenReady().then(() => {
    startServer()
    createWindow()
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    if (server) {
        server.close()
    }
})

// --- IPC HANDLERS ---

// Inscription
ipcMain.handle('auth:register', async (event, username, password) => {
    try {
        const existingUser = await User.findOne({ username }).lean();
        if (existingUser) {
            return { success: false, message: 'Ce nom d\'utilisateur existe déjà.' };
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            password: hashedPassword,
            blockedWebsites: ['facebook.com', 'youtube.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'netflix.com']
        });
        
        await newUser.save();
        return { success: true, message: 'Compte créé avec succès !' };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
});

// Connexion
ipcMain.handle('auth:login', async (event, username, password) => {
    try {
        const user = await User.findOne({ username }).lean();
        if (!user) {
            return { success: false, message: 'Nom d\'utilisateur incorrect.' };
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return { success: false, message: 'Mot de passe incorrect.' };
        }
        
        return { success: true, user: { username: user.username, blockedWebsites: user.blockedWebsites || [], blockedPrograms: user.blockedPrograms || [] } };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
});

// Récupérer les sites bloqués
ipcMain.handle('user:getBlockedSites', async (event, username) => {
    try {
        const user = await User.findOne({ username }).lean();
        return { success: true, blockedSites: user ? (user.blockedWebsites || []) : [] };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
});

// Mettre à jour les sites bloqués
ipcMain.handle('user:updateBlockedSites', async (event, username, blockedSites) => {
    try {
        await User.updateOne({ username }, { blockedWebsites: blockedSites });
        // Synchroniser également avec l'état en mémoire
        currentAppState.blockedSites = blockedSites;
        broadcastState();
        return { success: true };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
});

// Récupérer les programmes bloqués
ipcMain.handle('user:getBlockedPrograms', async (event, username) => {
    try {
        const user = await User.findOne({ username }).lean();
        return { success: true, blockedPrograms: user ? (user.blockedPrograms || []) : [] };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
});

// Mettre à jour les programmes bloqués
ipcMain.handle('user:updateBlockedPrograms', async (event, username, blockedPrograms) => {
    try {
        await User.updateOne({ username }, { blockedPrograms: blockedPrograms });
        // Synchroniser également avec l'état en mémoire
        currentAppState.blockedPrograms = blockedPrograms;
        broadcastState();
        return { success: true };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
});

// Listen to IPC events from renderer process
ipcMain.on('update-state', (event, newState) => {
    currentAppState = { ...currentAppState, ...newState }
    broadcastState()
})
