const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const bcrypt = require('bcrypt')
const { connectDB, User } = require('./database')

// Se connecter à la base de données MongoDB
connectDB();

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

app.whenReady().then(() => {
    createWindow()
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
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
        
        // Comme on a utilisé .lean(), user est un objet javascript standard !
        return { success: true, user: { username: user.username, blockedWebsites: user.blockedWebsites || [] } };
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
        return { success: true };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
});
