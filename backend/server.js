// ===============================
// 🚀 Serveur Node.js (CommonJS)
// ===============================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PORT } = require('./utils/constants.js');
const logger = require('./utils/logger.js');

// Import des routes
const authRoutes = require('./routes/auth.js');
const pointageRoutes = require('./routes/pointage.js');
const adminRoutes = require('./routes/admin.js');
const emailRoutes = require('./routes/email.js');

// Import du service cron
const cronService = require('./services/cronService.js');

const app = express();

// ===============================
// 🚀 Informations de démarrage
// ===============================
logger.info('🚀 Démarrage du serveur', { 
    port: PORT, 
    nodeVersion: process.version,
    platform: process.platform,
    workingDirectory: process.cwd(),
    env: process.env.NODE_ENV
});

// ===============================
// 🧩 Middlewares
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger.logRequest.bind(logger));

// ===============================
// 🌐 Fichiers statiques frontend
// ===============================
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

logger.info('📂 Fichiers statiques configurés', {
    frontendPath,
    cssExists: fs.existsSync(path.join(frontendPath, 'css/style.css')),
    jsAppExists: fs.existsSync(path.join(frontendPath, 'js/app.js')),
    jsAdminExists: fs.existsSync(path.join(frontendPath, 'js/admin.js')),
    logoExists: fs.existsSync(path.join(frontendPath, 'images/logo_meduza.png'))
});

// ===============================
// 🔧 Routes
// ===============================

// Route de test simple
app.get('/test', (req, res) => {
    logger.info('🧪 Route /test appelée');
    res.json({ 
        message: 'Serveur Node.js fonctionne !', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        passenger: process.env.PASSENGER_APP_ENV || 'non défini'
    });
});

// Route ping
app.get('/ping', (req, res) => {
    logger.info('🏓 Route /ping appelée');
    res.send('PONG - Serveur fonctionne !');
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/pointage', pointageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);

// Route explicite pour /admin
app.get('/admin', (req, res) => {
    const adminPath = path.join(frontendPath, 'admin.html');
    logger.info('🔧 Route /admin appelée', { adminPath, exists: fs.existsSync(adminPath) });
    res.sendFile(adminPath);
});

// Fallback SPA
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'Route API non trouvée' });
    }

    let filePath = path.join(frontendPath, req.path);
    if (req.path.endsWith('/')) filePath = path.join(filePath, 'index.html');
    else if (!path.extname(req.path)) {
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
            return res.sendFile(htmlPath);
        }
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
    }

    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ===============================
// ⚠️ Gestion des erreurs
// ===============================
app.use((err, req, res, next) => {
    logger.error('❌ Erreur serveur', { 
        message: err.message, 
        stack: err.stack,
        url: req.url,
        method: req.method
    });
    res.status(500).json({ message: 'Erreur serveur interne' });
});

// ===============================
// ⏰ Service cron
// ===============================
try {
    cronService.start();
    logger.info('⏰ Service cron démarré');
    console.log('⏰ Service cron démarré');
} catch (e) {
    logger.error('⚠️ Erreur lors du démarrage du cron', { message: e.message });
}

// ===============================
// 🚀 Démarrage / Export
// ===============================
if (process.env.NODE_ENV !== 'production' || !process.env.PASSENGER_APP_ENV) {
    // Mode local
    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info('✅ Serveur démarré en local', { 
            port: PORT,
            url: `http://localhost:${PORT}`,
            interface: `http://<IP_du_serveur>:${PORT}`,
            admin: `http://<IP_du_serveur>:${PORT}/admin`
        });
        console.log(`🚀 Serveur démarré sur http://<IP_du_serveur>:${PORT}`);
    });
} else {
    // Mode Passenger (production)
    logger.info('🚀 Serveur prêt (Passenger)');
    console.log('🚀 Serveur prêt, géré par Passenger');
    module.exports = app;
}
