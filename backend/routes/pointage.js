const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const { JWT_SECRET } = require('../utils/constants.js');
const { authenticateToken } = require('../utils/authUtils.js');

// __filename et __dirname sont automatiquement disponibles en CommonJS

const router = express.Router();
const POINTAGE_FILE = path.join(__dirname, '../data/pointage.json');

// Initialiser le fichier de pointage
async function initPointageFile() {
    try {
        await fs.access(POINTAGE_FILE);
    } catch (error) {
        await fs.mkdir(path.dirname(POINTAGE_FILE), { recursive: true });
        await fs.writeFile(POINTAGE_FILE, JSON.stringify([], null, 2));
        console.log('✅ Fichier de pointage initialisé');
    }
}

// Lire les données de pointage
async function getPointageData() {
    try {
        const data = await fs.readFile(POINTAGE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lors de la lecture du pointage:', error);
        return [];
    }
}

// Sauvegarder les données de pointage
async function savePointageData(data) {
    try {
        await fs.writeFile(POINTAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du pointage:', error);
        throw error;
    }
}

// Obtenir le statut actuel d'un utilisateur
async function getUserStatus(userId) {
    const pointageData = await getPointageData();
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    // Filtrer les données de l'utilisateur pour aujourd'hui
    const userTodayData = pointageData.filter(entry => 
        entry.userId === userId && entry.date === today
    );

    if (userTodayData.length === 0) {
        return { status: 'not_started', lastAction: null };
    }

    // Trier par heure pour avoir la dernière action
    userTodayData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const lastEntry = userTodayData[userTodayData.length - 1];

    // Déterminer le statut basé sur la dernière action
    let status = 'not_started';
    switch (lastEntry.action) {
        case 'start_day':
            status = 'working';
            break;
        case 'start_break':
            status = 'on_break';
            break;
        case 'end_break':
            status = 'working';
            break;
        case 'end_day':
            status = 'day_ended';
            break;
    }

    return {
        status,
        lastAction: lastEntry.action,
        lastTime: lastEntry.timestamp
    };
}

// Route pour enregistrer un pointage
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Requête de pointage reçue:', req.body);
        console.log('👤 Utilisateur authentifié:', req.user);
        
        const { action } = req.body;
        const userId = req.user.userId;
        const username = req.user.username;

        console.log('📝 Action:', action, 'UserID:', userId, 'Username:', username);

        if (!action) {
            return res.status(400).json({ message: 'Action requise' });
        }

        const validActions = ['start_day', 'start_break', 'end_break', 'end_day'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ message: 'Action invalide' });
        }

        // Vérifier le statut actuel
        const currentStatus = await getUserStatus(userId);
        
        // Vérifications de cohérence
        if (action === 'start_day' && currentStatus.status !== 'not_started') {
            return res.status(400).json({ 
                message: 'Vous avez déjà commencé votre journée' 
            });
        }

        if (action === 'start_break' && currentStatus.status !== 'working') {
            return res.status(400).json({ 
                message: 'Vous devez être en travail pour commencer une pause' 
            });
        }

        if (action === 'end_break' && currentStatus.status !== 'on_break') {
            return res.status(400).json({ 
                message: 'Vous n\'êtes pas en pause actuellement' 
            });
        }

        if (action === 'end_day' && currentStatus.status === 'day_ended') {
            return res.status(400).json({ 
                message: 'Votre journée est déjà terminée' 
            });
        }

        // Créer l'entrée de pointage
        const pointageEntry = {
            id: Date.now().toString(),
            userId,
            username,
            action,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        };

        // Sauvegarder
        const pointageData = await getPointageData();
        pointageData.push(pointageEntry);
        await savePointageData(pointageData);

        // Messages de confirmation
        const actionMessages = {
            'start_day': 'Journée commencée ! Bon travail !',
            'start_break': 'Pause commencée. Reposez-vous bien !',
            'end_break': 'Pause terminée. Retour au travail !',
            'end_day': 'Journée terminée. Bonne soirée !'
        };

        res.json({
            message: actionMessages[action],
            pointage: pointageEntry
        });

    } catch (error) {
        console.error('Erreur de pointage:', error);
        res.status(500).json({ message: 'Erreur serveur interne' });
    }
});

// Route pour obtenir le statut actuel
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const status = await getUserStatus(userId);
        res.json(status);
    } catch (error) {
        console.error('Erreur de statut:', error);
        res.status(500).json({ message: 'Erreur serveur interne' });
    }
});

// Route pour obtenir l'historique de pointage
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { date } = req.query;
        
        const pointageData = await getPointageData();
        let userData = pointageData.filter(entry => entry.userId === userId);
        
        if (date) {
            userData = userData.filter(entry => entry.date === date);
        }

        res.json(userData);
    } catch (error) {
        console.error('Erreur d\'historique:', error);
        res.status(500).json({ message: 'Erreur serveur interne' });
    }
});

// Route pour obtenir le statut de la géolocalisation (publique)
router.get('/geo-status', async (req, res) => {
    try {
        console.log('🔍 Requête geo-status reçue');
        const LOCATION_FILE = path.join(__dirname, '../data/location.json');

        let locationConfig;
        try {
            const data = await fs.readFile(LOCATION_FILE, 'utf8');
            locationConfig = JSON.parse(data);
            console.log('📄 Configuration géolocalisation lue:', locationConfig);
        } catch (error) {
            console.log('⚠️ Fichier location.json non trouvé, utilisation de la config par défaut');
            // Configuration par défaut si le fichier n'existe pas
            locationConfig = {
                enabled: false,
                center: { latitude: 0, longitude: 0 },
                radius: 100,
                description: 'Géolocalisation désactivée'
            };
        }

        const response = {
            enabled: locationConfig.enabled,
            center: locationConfig.center,
            radius: locationConfig.radius
        };
        
        console.log('✅ Réponse geo-status:', response);
        res.json(response);

    } catch (error) {
        console.error('❌ Erreur récupération statut geo:', error);
        res.status(500).json({ 
            enabled: false,
            message: 'Erreur serveur interne'
        });
    }
});

// Route pour vérifier la position
router.post('/check-location', authenticateToken, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ 
                message: 'Coordonnées requises',
                inZone: false 
            });
        }

        // Lire la configuration de géolocalisation
        // fs et path sont déjà importés en haut du fichier
        // __filename et __dirname sont automatiquement disponibles en CommonJS
        const LOCATION_FILE = path.join(__dirname, '../data/location.json');

        let locationConfig;
        try {
            const data = await fs.readFile(LOCATION_FILE, 'utf8');
            locationConfig = JSON.parse(data);
        } catch (error) {
            // Configuration par défaut si le fichier n'existe pas
            locationConfig = {
                enabled: false,
                center: { latitude: 0, longitude: 0 },
                radius: 100
            };
        }

        // Si la géolocalisation est désactivée, autoriser le pointage
        if (!locationConfig.enabled) {
            return res.json({ 
                inZone: true,
                message: 'Géolocalisation désactivée'
            });
        }

        // Calculer la distance entre la position de l'utilisateur et le centre
        const distance = calculateDistance(
            locationConfig.center.latitude,
            locationConfig.center.longitude,
            latitude,
            longitude
        );

        const inZone = distance <= locationConfig.radius;

        res.json({
            inZone,
            distance: Math.round(distance),
            maxDistance: locationConfig.radius,
            message: inZone 
                ? `Position validée (${Math.round(distance)}m du centre)`
                : `Hors zone (${Math.round(distance)}m > ${locationConfig.radius}m)`
        });

    } catch (error) {
        console.error('Erreur vérification position:', error);
        res.status(500).json({ 
            message: 'Erreur serveur interne',
            inZone: false 
        });
    }
});

// Fonction pour calculer la distance entre deux points (formule de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance en mètres
}

// Initialiser le fichier de pointage au démarrage
initPointageFile();

module.exports = router;
