// Utilitaires pour les réponses API
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('./constants.js');

/**
 * Réponse de succès standardisée
 */
function successResponse(res, message, data = null, statusCode = 200) {
    const response = { message };
    if (data) response.data = data;
    return res.status(statusCode).json(response);
}

/**
 * Réponse d'erreur standardisée
 */
function errorResponse(res, message, statusCode = 500, error = null) {
    const response = { message };
    if (error) response.error = error;
    return res.status(statusCode).json(response);
}

/**
 * Réponse d'erreur serveur interne
 */
function serverErrorResponse(res, error) {
    console.error('Erreur serveur:', error);
    return errorResponse(res, ERROR_MESSAGES.SERVER_ERROR);
}

/**
 * Réponse d'authentification échouée
 */
function authErrorResponse(res, message = ERROR_MESSAGES.TOKEN_INVALID) {
    return errorResponse(res, message, 401);
}

/**
 * Réponse d'accès refusé
 */
function forbiddenResponse(res, message = ERROR_MESSAGES.ACCESS_DENIED) {
    return errorResponse(res, message, 403);
}

/**
 * Réponse de validation échouée
 */
function validationErrorResponse(res, message) {
    return errorResponse(res, message, 400);
}

module.exports = { 
    successResponse, 
    errorResponse, 
    serverErrorResponse, 
    authErrorResponse, 
    forbiddenResponse, 
    validationErrorResponse 
};
