const fs = require('fs');
const path = require('path');

// __filename et __dirname sont automatiquement disponibles en CommonJS

class Logger {
    constructor() {
        this.logFile = path.join(__dirname, '../app.log');
        this.initializeLogFile();
    }

    initializeLogFile() {
        // Créer le fichier de log s'il n'existe pas
        if (!fs.existsSync(this.logFile)) {
            fs.writeFileSync(this.logFile, '');
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: data || null
        };
        return JSON.stringify(logEntry) + '\n';
    }

    writeToFile(message) {
        try {
            fs.appendFileSync(this.logFile, message);
        } catch (error) {
            console.error('Erreur lors de l\'écriture dans le fichier de log:', error);
        }
    }

    log(level, message, data = null) {
        const formattedMessage = this.formatMessage(level, message, data);
        
        // Afficher dans la console
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        
        // Écrire dans le fichier
        this.writeToFile(formattedMessage);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    debug(message, data = null) {
        this.log('debug', message, data);
    }

    // Méthode pour logger les requêtes HTTP
    logRequest(req, res, next) {
        const startTime = Date.now();
        
        // Logger la requête entrante
        this.info('Requête entrante', {
            method: req.method,
            url: req.url,
            headers: req.headers,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Intercepter la réponse
        const originalSend = res.send;
        res.send = function(data) {
            const duration = Date.now() - startTime;
            
            // Logger la réponse
            logger.info('Réponse envoyée', {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                contentLength: data ? data.length : 0
            });
            
            return originalSend.call(this, data);
        };

        next();
    }

    // Méthode pour logger les erreurs
    logError(error, req = null) {
        this.error('Erreur détectée', {
            message: error.message,
            stack: error.stack,
            request: req ? {
                method: req.method,
                url: req.url,
                headers: req.headers
            } : null
        });
    }

    // Méthode pour nettoyer les anciens logs (optionnel)
    cleanOldLogs(maxSize = 10 * 1024 * 1024) { // 10MB par défaut
        try {
            const stats = fs.statSync(this.logFile);
            if (stats.size > maxSize) {
                // Garder seulement la dernière moitié du fichier
                const content = fs.readFileSync(this.logFile, 'utf8');
                const lines = content.split('\n');
                const keepLines = lines.slice(-Math.floor(lines.length / 2));
                fs.writeFileSync(this.logFile, keepLines.join('\n'));
                this.info('Logs nettoyés', { oldSize: stats.size, newSize: keepLines.join('\n').length });
            }
        } catch (error) {
            this.error('Erreur lors du nettoyage des logs', { error: error.message });
        }
    }
}

// Créer une instance singleton
const logger = new Logger();

module.exports = logger;
