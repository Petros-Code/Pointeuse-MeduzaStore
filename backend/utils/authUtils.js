// Utilitaires d'authentification
const jwt = require('jsonwebtoken');
const { JWT_SECRET, ERROR_MESSAGES, USER_ROLES } = require('./constants.js');

/**
 * Middleware d'authentification standard
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: ERROR_MESSAGES.TOKEN_REQUIRED });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: ERROR_MESSAGES.TOKEN_INVALID });
        }
        req.user = user;
        next();
    });
}

/**
 * Middleware d'authentification admin
 */
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: ERROR_MESSAGES.TOKEN_REQUIRED });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: ERROR_MESSAGES.TOKEN_INVALID });
        }
        
        if (user.role !== USER_ROLES.ADMIN) {
            return res.status(403).json({ message: ERROR_MESSAGES.ADMIN_REQUIRED });
        }
        
        req.user = user;
        next();
    });
}

/**
 * Génère un token JWT
 */
function generateToken(user) {
    return jwt.sign(
        { 
            userId: user.id, 
            username: user.username, 
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

/**
 * Vérifie un token JWT
 */
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = { authenticateToken, generateToken, verifyToken, authenticateAdmin };
