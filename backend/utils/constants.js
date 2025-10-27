// Constantes partagées du système
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '24h';

// Configuration serveur
const PORT = process.env.PORT || 3001;

// Configuration email
const EMAIL_CONFIG = {
    USER: process.env.EMAIL_USER,
    PASS: process.env.EMAIL_PASS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL
};

// Validation de sécurité
if (!JWT_SECRET) {
    throw new Error('❌ JWT_SECRET manquant dans les variables d\'environnement !');
}

if (!EMAIL_CONFIG.USER || !EMAIL_CONFIG.PASS) {
    console.warn('⚠️ Configuration email incomplète dans les variables d\'environnement');
}

// Chemins des fichiers de données
const DATA_PATHS = {
    POINTAGE: '../data/pointage.json',
    USERS: '../data/users.json',
    LOCATION: '../data/location.json'
};

// Actions de pointage valides
const VALID_ACTIONS = ['start_day', 'start_break', 'end_break', 'end_day'];

// Rôles utilisateur
const USER_ROLES = {
    ADMIN: 'admin',
    EMPLOYEE: 'employee'
};

// Messages d'erreur standardisés
const ERROR_MESSAGES = {
    TOKEN_REQUIRED: 'Token d\'accès requis',
    TOKEN_INVALID: 'Token invalide',
    ACCESS_DENIED: 'Accès refusé',
    ADMIN_REQUIRED: 'Accès admin requis',
    SERVER_ERROR: 'Erreur serveur interne',
    USER_NOT_FOUND: 'Utilisateur non trouvé',
    INVALID_CREDENTIALS: 'Nom d\'utilisateur ou mot de passe incorrect',
    USER_EXISTS: 'Ce nom d\'utilisateur existe déjà',
    INVALID_ACTION: 'Action invalide',
    ALREADY_STARTED: 'Vous avez déjà commencé votre journée',
    NOT_WORKING: 'Vous devez être en travail pour commencer une pause',
    NOT_ON_BREAK: 'Vous n\'êtes pas en pause actuellement',
    DAY_ENDED: 'Votre journée est déjà terminée',
    COORDINATES_REQUIRED: 'Coordonnées requises'
};

// Messages de succès standardisés
const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Connexion réussie',
    USER_CREATED: 'Utilisateur créé avec succès',
    POINTAGE_RECORDED: 'Pointage enregistré avec succès',
    EMAIL_SENT: 'Email envoyé avec succès',
    CONFIG_SAVED: 'Configuration sauvegardée'
};

// Export des constantes
module.exports = {
    JWT_SECRET,
    TOKEN_EXPIRY,
    PORT,
    EMAIL_CONFIG,
    DATA_PATHS,
    VALID_ACTIONS,
    USER_ROLES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
};
