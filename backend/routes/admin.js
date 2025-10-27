const express = require('express');
const { authenticateAdmin } = require('../utils/authUtils.js');

const router = express.Router();

// Route pour obtenir la liste des utilisateurs
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const { readJsonFile } = await import('../utils/fileUtils.js');
        const users = await readJsonFile('users.json');
        const userList = users.map(user => ({
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt
        }));
        
        res.json(userList);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ message: 'Erreur serveur interne' });
    }
});

// Route pour configurer la géolocalisation
router.post('/geo-config', authenticateAdmin, async (req, res) => {
    try {
        const { enabled, center, radius, description } = req.body;
        
        const geoConfig = {
            enabled: enabled || false,
            center: center || { latitude: 0, longitude: 0 },
            radius: radius || 100,
            description: description || 'Zone de travail'
        };

        // Sauvegarder la configuration
        const { writeJsonFile } = await import('../utils/fileUtils.js');
        await writeJsonFile('location.json', geoConfig);

        res.json({
            message: 'Configuration géolocalisation sauvegardée',
            config: geoConfig
        });

    } catch (error) {
        console.error('Erreur sauvegarde config géo:', error);
        res.status(500).json({ message: 'Erreur serveur interne' });
    }
});

// Route pour récupérer la configuration géolocalisation
router.get('/geo-config', authenticateAdmin, async (req, res) => {
    try {
        const { readJsonFile } = await import('../utils/fileUtils.js');
        
        let geoConfig;
        try {
            geoConfig = await readJsonFile('location.json');
        } catch (error) {
            // Configuration par défaut
            geoConfig = {
                enabled: false,
                center: { latitude: 0, longitude: 0 },
                radius: 100,
                description: 'Zone non configurée'
            };
        }

        res.json(geoConfig);

    } catch (error) {
        console.error('Erreur lecture config géo:', error);
        res.status(500).json({ message: 'Erreur serveur interne' });
    }
});

module.exports = router;