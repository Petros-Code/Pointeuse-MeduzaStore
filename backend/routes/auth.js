const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readJsonFile, writeJsonFile, initJsonFile } = require('../utils/fileUtils.js');
const { generateToken } = require('../utils/authUtils.js');
const { successResponse, errorResponse, serverErrorResponse, validationErrorResponse } = require('../utils/responseUtils.js');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, JWT_SECRET } = require('../utils/constants.js');

const router = express.Router();


// Lire les utilisateurs depuis le fichier
async function getUsers() {
    return await readJsonFile('users.json');
}

// Sauvegarder les utilisateurs
async function saveUsers(users) {
    await writeJsonFile('users.json', users);
}

// Route de connexion
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return validationErrorResponse(res, 'Nom d\'utilisateur et mot de passe requis');
        }

        const users = await getUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            return errorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return errorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
        }

        const token = generateToken(user);
        const userInfo = {
            userId: user.id,
            username: user.username,
            role: user.role
        };

        return successResponse(res, SUCCESS_MESSAGES.LOGIN_SUCCESS, { token, user: userInfo });

    } catch (error) {
        return serverErrorResponse(res, error);
    }
});

// Route de vérification du token
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 'Token manquant', 401);
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        const users = await getUsers();
        const user = users.find(u => u.id === decoded.userId);

        if (!user) {
            return errorResponse(res, 'Utilisateur non trouvé', 401);
        }

        return successResponse(res, 'Token valide', {
            userId: user.id,
            username: user.username,
            role: user.role
        });

    } catch (error) {
        console.error('Erreur de vérification:', error);
        return errorResponse(res, 'Token invalide', 401);
    }
});

// Route d'inscription (optionnelle, pour ajouter de nouveaux utilisateurs)
router.post('/register', async (req, res) => {
    try {
        const { username, password, role = 'employee' } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                message: 'Nom d\'utilisateur et mot de passe requis' 
            });
        }

        const users = await getUsers();
        
        // Vérifier si l'utilisateur existe déjà
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ 
                message: 'Ce nom d\'utilisateur existe déjà' 
            });
        }

        // Créer le nouvel utilisateur
        const newUser = {
            id: Date.now().toString(), // ID simple basé sur le timestamp
            username,
            password: await bcrypt.hash(password, 10),
            role,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        await saveUsers(users);

        res.json({
            message: 'Utilisateur créé avec succès',
            user: {
                userId: newUser.id,
                username: newUser.username,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        res.status(500).json({ message: 'Erreur serveur interne' });
    }
});


module.exports = router;
