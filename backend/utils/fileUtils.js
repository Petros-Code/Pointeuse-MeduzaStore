// Utilitaires pour la gestion des fichiers
const fs = require('fs').promises;
const path = require('path');

// __filename et __dirname sont automatiquement disponibles en CommonJS

/**
 * Obtient le chemin absolu d'un fichier de données
 */
function getDataPath(filename) {
    return path.join(__dirname, '../data', filename);
}

/**
 * Lit un fichier JSON de données
 */
async function readJsonFile(filename) {
    try {
        const filePath = getDataPath(filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erreur lecture ${filename}:`, error);
        return [];
    }
}

/**
 * Écrit un fichier JSON de données
 */
async function writeJsonFile(filename, data) {
    try {
        const filePath = getDataPath(filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Erreur écriture ${filename}:`, error);
        throw error;
    }
}

/**
 * Initialise un fichier JSON s'il n'existe pas
 */
async function initJsonFile(filename, defaultData = []) {
    try {
        const filePath = getDataPath(filename);
        await fs.access(filePath);
    } catch (error) {
        // Créer le dossier data s'il n'existe pas
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await writeJsonFile(filename, defaultData);
        console.log(`✅ Fichier ${filename} initialisé`);
    }
}

module.exports = { getDataPath, readJsonFile, writeJsonFile, initJsonFile };
