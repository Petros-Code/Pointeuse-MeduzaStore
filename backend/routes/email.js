const express = require('express');
const emailService = require('../services/emailService.js');
const { authenticateAdmin } = require('../utils/authUtils.js');
const { readJsonFile } = require('../utils/fileUtils.js');
const { calculateWorkTime, calculateMonthlyWorkTime } = require('../utils/timeUtils.js');
const { successResponse, errorResponse, serverErrorResponse } = require('../utils/responseUtils.js');

const router = express.Router();

// Route pour tester l'envoi d'email
router.post('/test', authenticateAdmin, async (req, res) => {
    try {
        const result = await emailService.sendTestEmail();
        
        if (result.success) {
            return successResponse(res, 'Email de test envoyé avec succès', { messageId: result.messageId });
        } else {
            return errorResponse(res, 'Erreur lors de l\'envoi de l\'email', 500, result.error);
        }
    } catch (error) {
        return serverErrorResponse(res, error);
    }
});

// Route pour envoyer le résumé quotidien manuellement
router.post('/daily-summary', authenticateAdmin, async (req, res) => {
    try {
        const { date } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        const pointageData = await readJsonFile('pointage.json');
        const users = await readJsonFile('users.json');
        
        const dayData = pointageData.filter(entry => entry.date === targetDate);
        const userSummary = {};
        
        users.forEach(user => {
            if (user.role === 'employee') {
                const userPointages = dayData.filter(entry => entry.userId === user.id);
                
                if (userPointages.length > 0) {
                    const timeCalculation = calculateWorkTime(userPointages);
                    userSummary[user.id] = {
                        username: user.username,
                        ...timeCalculation,
                        pointages: userPointages
                    };
                }
            }
        });
        
        const summaryData = { date: targetDate, summary: userSummary };
        const result = await emailService.sendDailySummary(targetDate, summaryData);
        
        if (result.success) {
            return successResponse(res, 'Résumé quotidien envoyé avec succès', { 
                messageId: result.messageId, 
                summary: summaryData 
            });
        } else {
            return errorResponse(res, 'Erreur lors de l\'envoi du résumé', 500, result.error);
        }
        
    } catch (error) {
        return serverErrorResponse(res, error);
    }
});

// Route pour envoyer le résumé mensuel manuellement
router.post('/monthly-summary', authenticateAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('fr-FR', { month: 'long' });
        
        const pointageData = await readJsonFile('pointage.json');
        const users = await readJsonFile('users.json');
        
        const monthlyData = pointageData.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate.getFullYear() === year && entryDate.getMonth() === month;
        });
        
        const userSummary = {};
        
        users.forEach(user => {
            if (user.role === 'employee') {
                const userPointages = monthlyData.filter(entry => entry.userId === user.id);
                
                if (userPointages.length > 0) {
                    const monthlyCalculation = calculateMonthlyWorkTime(userPointages);
                    userSummary[user.id] = {
                        username: user.username,
                        ...monthlyCalculation,
                        pointages: userPointages
                    };
                } else {
                    userSummary[user.id] = {
                        username: user.username,
                        totalWorkTime: 0,
                        totalBreakTime: 0,
                        workingDays: 0,
                        avgTimePerDay: 0,
                        pointages: []
                    };
                }
            }
        });
        
        const summaryData = { month: monthName, year, summary: userSummary };
        const result = await emailService.sendMonthlySummary(monthName, year, summaryData);
        
        if (result.success) {
            return successResponse(res, 'Résumé mensuel envoyé avec succès', { 
                messageId: result.messageId, 
                summary: summaryData 
            });
        } else {
            return errorResponse(res, 'Erreur lors de l\'envoi du résumé mensuel', 500, result.error);
        }
        
    } catch (error) {
        return serverErrorResponse(res, error);
    }
});

module.exports = router;
