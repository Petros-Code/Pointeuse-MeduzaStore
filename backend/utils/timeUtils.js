// Utilitaires de calcul de temps
const { VALID_ACTIONS } = require('./constants.js');

/**
 * Calcule le temps de travail et de pause pour une liste de pointages
 */
function calculateWorkTime(pointages) {
    if (!pointages || pointages.length === 0) {
        return {
            totalWorkTime: 0,
            totalBreakTime: 0,
            startTime: null,
            endTime: null
        };
    }

    // Trier par timestamp
    const sortedPointages = [...pointages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    let startTime = null;
    let endTime = null;
    let totalBreakTime = 0;
    let breakStartTime = null;
    let totalWorkTime = 0;

    sortedPointages.forEach(entry => {
        const timestamp = new Date(entry.timestamp);

        switch (entry.action) {
            case 'start_day':
                startTime = timestamp;
                break;
            case 'start_break':
                if (startTime) {
                    totalWorkTime += (timestamp - startTime) / (1000 * 60); // en minutes
                }
                breakStartTime = timestamp;
                break;
            case 'end_break':
                if (breakStartTime) {
                    totalBreakTime += (timestamp - breakStartTime) / (1000 * 60); // en minutes
                }
                startTime = timestamp;
                break;
            case 'end_day':
                if (startTime) {
                    totalWorkTime += (timestamp - startTime) / (1000 * 60); // en minutes
                }
                endTime = timestamp;
                break;
        }
    });

    return {
        totalWorkTime: Math.round(totalWorkTime),
        totalBreakTime: Math.round(totalBreakTime),
        startTime: startTime ? startTime.toISOString() : null,
        endTime: endTime ? endTime.toISOString() : null
    };
}

/**
 * Calcule le temps de travail mensuel pour un utilisateur
 */
function calculateMonthlyWorkTime(userPointages) {
    if (!userPointages || userPointages.length === 0) {
        return {
            totalWorkTime: 0,
            totalBreakTime: 0,
            workingDays: 0,
            avgTimePerDay: 0
        };
    }

    // Grouper par jour
    const dailyData = {};
    userPointages.forEach(pointage => {
        if (!dailyData[pointage.date]) {
            dailyData[pointage.date] = [];
        }
        dailyData[pointage.date].push(pointage);
    });

    let totalWorkTime = 0;
    let totalBreakTime = 0;
    let workingDays = 0;

    // Calculer pour chaque jour
    Object.values(dailyData).forEach(dayPointages => {
        const dayCalculation = calculateWorkTime(dayPointages);
        totalWorkTime += dayCalculation.totalWorkTime;
        totalBreakTime += dayCalculation.totalBreakTime;
        if (dayCalculation.totalWorkTime > 0) workingDays++;
    });

    return {
        totalWorkTime: Math.round(totalWorkTime),
        totalBreakTime: Math.round(totalBreakTime),
        workingDays: workingDays,
        avgTimePerDay: workingDays > 0 ? Math.round(totalWorkTime / workingDays) : 0
    };
}

/**
 * Détermine le statut actuel d'un utilisateur basé sur ses pointages
 */
function getUserStatus(pointages) {
    if (!pointages || pointages.length === 0) {
        return { status: 'not_started', lastAction: null };
    }

    // Trier par timestamp pour avoir la dernière action
    const sortedPointages = [...pointages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const lastEntry = sortedPointages[sortedPointages.length - 1];

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

/**
 * Valide une action de pointage selon le statut actuel
 */
function validatePointageAction(action, currentStatus) {
    const validations = {
        'start_day': currentStatus.status === 'not_started',
        'start_break': currentStatus.status === 'working',
        'end_break': currentStatus.status === 'on_break',
        'end_day': currentStatus.status !== 'day_ended'
    };

    return validations[action] || false;
}

/**
 * Formate une durée en millisecondes en format lisible
 */
function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds < 0) {
        return '00:00';
    }
    
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Obtient la date actuelle au format YYYY-MM-DD
 */
function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

module.exports = { 
    calculateWorkTime, 
    calculateMonthlyWorkTime, 
    getUserStatus, 
    validatePointageAction, 
    formatDuration, 
    getCurrentDate 
};
