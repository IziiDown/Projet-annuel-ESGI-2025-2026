const mongoose = require('mongoose');

// Définition du schéma pour les utilisateurs
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  blockedPrograms: [{
    type: String,
    trim: true
  }],
  blockedWebsites: [{
    type: String,
    trim: true
  }],
  focusTime: {
    type: Number,
    default: 25
  },
  breakTime: {
    type: Number,
    default: 5
  }
}, {
  timestamps: true // Ajoute createdAt et updatedAt automatiquement
});

const User = mongoose.model('User', userSchema);

// Fonction pour se connecter à la base de données
async function connectDB(uri = 'mongodb://127.0.0.1:27017/focus_app') {
  try {
    await mongoose.connect(uri);
    console.log('✅ Connexion à MongoDB réussie !');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
}

module.exports = {
  User,
  connectDB
};
