const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const emailService = require('./emailService.js');

// __filename et __dirname sont automatiquement disponibles en CommonJS

class CronService {
    constructor() {
        this.isRunning = false;
        this.tasks = new Map();
        console.log('⏰ Service Cron initialisé');
    }

    // Démarrer le service cron
    start() {
        if (this.isRunning) {
            console.log('⚠️ Service cron déjà en cours d\'exécution');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Démarrage du service cron...');

        // Tâche mensuelle - dernier jour du mois à minuit
        this.scheduleMonthlyReport();
        
        // Tâche d'archivage annuel - 31 décembre à 23h50
        this.scheduleYearlyArchive();

        console.log('✅ Service cron démarré avec succès');
    }

    // Arrêter le service cron
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Service cron n\'est pas en cours d\'exécution');
            return;
        }

        this.tasks.forEach((task, name) => {
            task.destroy();
            console.log(`🛑 Tâche "${name}" arrêtée`);
        });

        this.tasks.clear();
        this.isRunning = false;
        console.log('🛑 Service cron arrêté');
    }

    // Programmer le rapport mensuel
    scheduleMonthlyReport() {
        const task = cron.schedule("0 0 28-31 * *", async () => {
            const now = new Date();
            const lastDayOfMonth = this.getLastDayOfMonth(now);

            // Vérifier si c'est bien le dernier jour du mois
            if (now.getDate() === lastDayOfMonth) {
                console.log("📊 Exécution du rapport mensuel...");
                await this.generateMonthlyReport(now);
            }
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });

        this.tasks.set('monthly-report', task);
        console.log('📅 Rapport mensuel programmé (dernier jour du mois à 00:00)');
    }

    // Programmer l'archivage annuel
    scheduleYearlyArchive() {
        const task = cron.schedule("50 23 31 12 *", async () => {
            console.log("📦 Exécution de l'archivage annuel...");
            await this.performYearlyArchive();
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });

        this.tasks.set('yearly-archive', task);
        console.log('📦 Archivage annuel programmé (31 décembre à 23h50)');
    }


    // Générer le rapport mensuel
    async generateMonthlyReport(currentDate) {
        try {
            console.log('📊 Génération du rapport mensuel...');
            
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthName = currentDate.toLocaleString('fr-FR', { month: 'long' });
            
            // Charger les données avec optimisation
            const users = await this.loadUsers();
            const pointages = await this.loadPointagesOptimized(year, month);
            
            console.log(`📊 ${pointages.length} pointages trouvés pour ${monthName} ${year}`);

            // Générer les rapports pour chaque employé
            const reports = [];
            for (const user of users) {
                if (user.role === 'employee') {
                    const userReport = await this.generateUserMonthlyReport(user, pointages, year, month);
                    // Toujours ajouter le rapport, même s'il n'y a pas de pointages
                    reports.push(userReport);
                }
            }

            // Envoyer les rapports par email (même si aucun pointage)
            await this.sendMonthlyReports(reports, monthName, year);

            console.log('✅ Rapport mensuel généré et envoyé avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de la génération du rapport mensuel:', error);
            await emailService.sendAlert(
                'Erreur Rapport Mensuel',
                `Erreur lors de la génération du rapport mensuel: ${error.message}`
            );
        }
    }

    // Générer le rapport pour un utilisateur
    async generateUserMonthlyReport(user, monthlyPointages, year, month) {
        const userPointages = monthlyPointages.filter(p => p.userId === user.id);
        
        if (userPointages.length === 0) {
            console.log(`⚠️ Aucun pointage trouvé pour ${user.username}`);
            // Retourner un rapport vide mais valide
            return {
                user,
                dailyReports: {},
                totalWorkTime: 0,
                totalBreakTime: 0,
                workingDays: 0,
                monthName: new Date(year, month).toLocaleString('fr-FR', { month: 'long' }),
                year,
                hasData: false
            };
        }

        // Grouper par jour
        const dailyReports = {};
        userPointages.forEach(pointage => {
            const date = pointage.date;
            if (!dailyReports[date]) {
                dailyReports[date] = {
                    date,
                    pointages: [],
                    totalWorkTime: 0,
                    totalBreakTime: 0
                };
            }
            dailyReports[date].pointages.push(pointage);
        });

        // Calculer les temps pour chaque jour
        Object.values(dailyReports).forEach(dayReport => {
            const { totalWorkTime, totalBreakTime } = this.calculateDayTimes(dayReport.pointages);
            dayReport.totalWorkTime = totalWorkTime;
            dayReport.totalBreakTime = totalBreakTime;
        });

        // Calculer les totaux mensuels
        const totalWorkTime = Object.values(dailyReports).reduce((sum, day) => sum + day.totalWorkTime, 0);
        const totalBreakTime = Object.values(dailyReports).reduce((sum, day) => sum + day.totalBreakTime, 0);
        const workingDays = Object.keys(dailyReports).length;

        return {
            user,
            dailyReports,
            totalWorkTime,
            totalBreakTime,
            workingDays,
            monthName: new Date(year, month).toLocaleString('fr-FR', { month: 'long' }),
            year,
            hasData: true
        };
    }

    // Calculer les temps d'une journée
    calculateDayTimes(pointages) {
        let totalWorkTime = 0;
        let totalBreakTime = 0;
        let startTime = null;
        let endTime = null;
        let breakStartTime = null;

        // Trier par timestamp
        pointages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        pointages.forEach(pointage => {
            const timestamp = new Date(pointage.timestamp);

            switch (pointage.action) {
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

        return { totalWorkTime: Math.round(totalWorkTime), totalBreakTime: Math.round(totalBreakTime) };
    }

    // Envoyer le rapport mensuel (un seul email)
    async sendMonthlyReports(reports, monthName, year) {
        // Toujours envoyer un email, même si aucun rapport ou aucune donnée
        try {
            // Envoyer un seul email de récapitulatif global
            await this.sendAdminMonthlyReport(reports, monthName, year);
            console.log('✅ Rapport mensuel envoyé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi du rapport:', error);
        }
    }

    // Envoyer le rapport global à l'admin
    async sendAdminMonthlyReport(reports, monthName, year) {
        const htmlContent = this.generateAdminMonthlyReportHTML(reports, monthName, year);
        
        try {
            const info = await emailService.transporter.sendMail({
                from: emailService.transporter.options.auth.user,
                to: emailService.adminEmail,
                subject: `📊 Rapport Mensuel - ${monthName} ${year}`,
                html: htmlContent
            });
            
            console.log('✅ Rapport mensuel admin envoyé:', info.messageId);
        } catch (error) {
            console.error('❌ Erreur envoi rapport admin:', error);
        }
    }


    // Générer le HTML du rapport admin
    generateAdminMonthlyReportHTML(reports, monthName, year) {
        let html = `
            <div style="font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto;">
                <h1 style="color: #333; text-align: center;">📊 Rapport Mensuel - ${monthName} ${year}</h1>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
        `;

        if (reports.length === 0) {
            html += '<p style="text-align: center; color: #666;">Aucun employé enregistré dans le système.</p>';
        } else {
            // Vérifier s'il y a des données dans les rapports
            const reportsWithData = reports.filter(report => report.hasData);
            
            if (reportsWithData.length === 0) {
                html += `
                    <div style="background: #fff3cd; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Aucun pointage enregistré</h3>
                        <p style="color: #856404;">Aucun pointage n'a été enregistré pour le mois de ${monthName} ${year}.</p>
                    </div>
                `;
            } else {
                html += '<h2>👥 Résumé par Employé</h2>';
            }
            
            reports.forEach(report => {
                if (report.hasData) {
                    const workTimeFormatted = this.formatTime(report.totalWorkTime);
                    const breakTimeFormatted = this.formatTime(report.totalBreakTime);
                    const avgTimeFormatted = report.workingDays > 0 ? 
                        this.formatTime(Math.round(report.totalWorkTime / report.workingDays)) : 
                        '0h 0min';
                    
                    html += `
                        <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007bff;">
                            <h3 style="margin: 0 0 10px 0; color: #333;">👤 ${report.user.username}</h3>
                            <p><strong>Jours travaillés :</strong> ${report.workingDays}</p>
                            <p><strong>Temps total de travail :</strong> ${workTimeFormatted}</p>
                            <p><strong>Temps total de pause :</strong> ${breakTimeFormatted}</p>
                            <p><strong>Temps moyen par jour :</strong> ${avgTimeFormatted}</p>
                        </div>
                    `;
                } else {
                    html += `
                        <div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #6c757d;">
                            <h3 style="margin: 0 0 10px 0; color: #6c757d;">👤 ${report.user.username}</h3>
                            <p style="color: #6c757d; font-style: italic;">Aucun pointage enregistré ce mois</p>
                        </div>
                    `;
                }
            });
        }

        html += `
                </div>
                <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
                    <p>Rapport généré automatiquement par le système de pointage</p>
                    <p>Date de génération : ${new Date().toLocaleString('fr-FR')}</p>
                </div>
            </div>
        `;

        return html;
    }


    // Charger les utilisateurs
    async loadUsers() {
        try {
            const data = await fs.readFile(path.join(__dirname, '../data/users.json'), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Erreur lecture users.json:', error);
            return [];
        }
    }

    // Charger les pointages
    async loadPointages() {
        try {
            const data = await fs.readFile(path.join(__dirname, '../data/pointage.json'), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Erreur lecture pointage.json:', error);
            return [];
        }
    }

    // Charger les pointages avec optimisation (filtrage pendant la lecture)
    async loadPointagesOptimized(year, month) {
        try {
            const data = await fs.readFile(path.join(__dirname, '../data/pointage.json'), 'utf8');
            const allPointages = JSON.parse(data);
            
            // Filtrer directement pendant le parsing pour économiser la mémoire
            return allPointages.filter(pointage => {
                const pointageDate = new Date(pointage.timestamp);
                return pointageDate.getFullYear() === year && 
                       pointageDate.getMonth() === month;
            });
        } catch (error) {
            console.error('❌ Erreur lecture pointage.json:', error);
            return [];
        }
    }

    // Effectuer l'archivage annuel
    async performYearlyArchive() {
        try {
            const currentYear = new Date().getFullYear();
            console.log(`📦 Archivage des données de l'année ${currentYear}...`);
            
            // Créer le dossier archives s'il n'existe pas
            const archivesDir = path.join(__dirname, '../data/archives');
            await fs.mkdir(archivesDir, { recursive: true });
            console.log('📁 Dossier archives créé/vérifié');
            
            // Lire le fichier pointage.json actuel
            const pointageData = await this.loadPointages();
            console.log(`📊 ${pointageData.length} pointages trouvés à archiver`);
            
            if (pointageData.length > 0) {
                // Créer le fichier d'archive
                const archiveFileName = `pointage_${currentYear}.json`;
                const archivePath = path.join(archivesDir, archiveFileName);
                
                // Sauvegarder dans le fichier d'archive
                await fs.writeFile(archivePath, JSON.stringify(pointageData, null, 2));
                console.log(`✅ Archive créée : ${archiveFileName}`);
                
                // Nettoyer le fichier pointage.json (le vider)
                await fs.writeFile(path.join(__dirname, '../data/pointage.json'), JSON.stringify([], null, 2));
                console.log('🧹 Fichier pointage.json nettoyé');
                
                // Envoyer une notification par email
                await this.sendArchiveNotification(currentYear, pointageData.length);
                
                console.log('✅ Archivage annuel terminé avec succès');
            } else {
                console.log('⚠️ Aucune donnée à archiver');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'archivage annuel:', error);
            await emailService.sendAlert(
                'Erreur Archivage Annuel',
                `Erreur lors de l'archivage annuel: ${error.message}`
            );
        }
    }

    // Envoyer une notification d'archivage
    async sendArchiveNotification(year, pointageCount) {
        try {
            // Calculer le temps total de l'année
            const totalYearlyTime = await this.calculateYearlyTotalTime(year);
            
            // Générer le HTML des stats par employé
            let employeeStatsHTML = '';
            if (totalYearlyTime.employeeStats && totalYearlyTime.employeeStats.length > 0) {
                employeeStatsHTML = '<h3>👥 Détail par Employé</h3>';
                totalYearlyTime.employeeStats.forEach(emp => {
                    employeeStatsHTML += `
                        <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007bff;">
                            <h4 style="margin: 0 0 10px 0; color: #333;">👤 ${emp.username}</h4>
                            <p><strong>Temps total de travail :</strong> ${emp.totalWorkTime}</p>
                            <p><strong>Temps total de pause :</strong> ${emp.totalBreakTime}</p>
                            <p><strong>Jours travaillés :</strong> ${emp.workingDays}</p>
                        </div>
                    `;
                });
            }

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">📦 Archivage Annuel - ${year}</h1>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h2>📊 Résumé de l'archivage</h2>
                        <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px;">
                            <p><strong>Année archivée :</strong> ${year}</p>
                            <p><strong>Nombre de pointages archivés :</strong> ${pointageCount}</p>
                            <p><strong>Temps total de l'année :</strong> ${totalYearlyTime.totalWorkTime}</p>
                            <p><strong>Temps total de pause :</strong> ${totalYearlyTime.totalBreakTime}</p>
                            <p><strong>Jours travaillés :</strong> ${totalYearlyTime.workingDays}</p>
                            <p><strong>Fichier d'archive :</strong> pointage_${year}.json</p>
                            <p><strong>Date d'archivage :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                        </div>
                        ${employeeStatsHTML}
                        <p style="color: #28a745; font-weight: bold;">✅ Le fichier pointage.json a été nettoyé et les données ont été archivées avec succès.</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
                        <p>Archivage automatique effectué par le système de pointage</p>
                    </div>
                </div>
            `;
            
            const info = await emailService.transporter.sendMail({
                from: emailService.transporter.options.auth.user,
                to: emailService.adminEmail,
                subject: `📦 Archivage Annuel - ${year}`,
                html: htmlContent
            });
            
            console.log('✅ Notification d\'archivage envoyée:', info.messageId);
        } catch (error) {
            console.error('❌ Erreur envoi notification archivage:', error);
        }
    }

    // Méthode pour tester manuellement le rapport mensuel
    async testMonthlyReport() {
        console.log('🧪 Test manuel du rapport mensuel...');
        await this.generateMonthlyReport(new Date());
    }

    // Calculer le temps total de l'année par employé
    async calculateYearlyTotalTime(year) {
        try {
            const archivePath = path.join(__dirname, `../data/archives/pointage_${year}.json`);
            const archiveData = JSON.parse(await fs.readFile(archivePath, 'utf8'));
            
            let totalWorkTime = 0;
            let totalBreakTime = 0;
            const workingDays = new Set();
            const employeeStats = {};
            
            // Grouper par utilisateur et par jour
            const userData = {};
            archiveData.forEach(pointage => {
                const userId = pointage.userId;
                const username = pointage.username;
                const date = pointage.date;
                
                if (!userData[userId]) {
                    userData[userId] = {};
                }
                if (!userData[userId][date]) {
                    userData[userId][date] = [];
                }
                
                userData[userId][date].push(pointage);
                workingDays.add(date);
                
                // Initialiser les stats de l'employé
                if (!employeeStats[userId]) {
                    employeeStats[userId] = {
                        username: username,
                        totalWorkTime: 0,
                        totalBreakTime: 0,
                        workingDays: new Set()
                    };
                }
                employeeStats[userId].workingDays.add(date);
            });
            
            // Calculer pour chaque utilisateur et chaque jour
            Object.entries(userData).forEach(([userId, userDays]) => {
                Object.values(userDays).forEach(dayPointages => {
                    const { totalWorkTime: dayWorkTime, totalBreakTime: dayBreakTime } = this.calculateDayTimes(dayPointages);
                    totalWorkTime += dayWorkTime;
                    totalBreakTime += dayBreakTime;
                    
                    // Ajouter aux stats de l'employé
                    employeeStats[userId].totalWorkTime += dayWorkTime;
                    employeeStats[userId].totalBreakTime += dayBreakTime;
                });
            });
            
            // Formater les stats des employés
            const formattedEmployeeStats = Object.values(employeeStats).map(emp => ({
                username: emp.username,
                totalWorkTime: this.formatTime(emp.totalWorkTime),
                totalBreakTime: this.formatTime(emp.totalBreakTime),
                workingDays: emp.workingDays.size
            }));
            
            return {
                totalWorkTime: this.formatTime(totalWorkTime),
                totalBreakTime: this.formatTime(totalBreakTime),
                workingDays: workingDays.size,
                employeeStats: formattedEmployeeStats
            };
            
        } catch (error) {
            console.error('❌ Erreur calcul temps annuel:', error);
            return {
                totalWorkTime: '0h 0min',
                totalBreakTime: '0h 0min',
                workingDays: 0,
                employeeStats: []
            };
        }
    }

    // Méthode pour tester manuellement l'archivage
    async testYearlyArchive() {
        console.log('🧪 Test manuel de l\'archivage annuel...');
        await this.performYearlyArchive();
    }

    // Méthode utilitaire pour formater les heures
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    }

    // Méthode utilitaire pour calculer le dernier jour du mois
    getLastDayOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }
}

// Créer une instance singleton
const cronService = new CronService();

module.exports = cronService;
