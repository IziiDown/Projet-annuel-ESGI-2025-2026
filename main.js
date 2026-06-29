const { app, BrowserWindow, ipcMain } = require('electron')
const WebSocket = require('ws')
const http = require('http')

let wss = null
let server = null
let currentAppState = {
    blockedSites: ['facebook.com', 'youtube.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'netflix.com'],
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
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    win.loadFile('index.html')
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
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('will-quit', () => {
    if (server) {
        server.close()
    }
})

// Listen to IPC events from renderer process
ipcMain.on('update-state', (event, newState) => {
    currentAppState = { ...currentAppState, ...newState }
    broadcastState()
})
