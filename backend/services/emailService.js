const nodemailer = require('nodemailer');
const { EMAIL_CONFIG } = require('../utils/constants.js');

class EmailService {
    constructor() {
        // Configuration Gmail avec debug
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_CONFIG.USER,
                pass: EMAIL_CONFIG.PASS
            },
            debug: true, // Active les logs détaillés
            logger: true  // Affiche les logs dans la console
        });
        
        this.adminEmail = EMAIL_CONFIG.ADMIN_EMAIL;
        
        console.log('📧 Configuration email:');
        console.log('   - User:', EMAIL_CONFIG.USER);
        console.log('   - Admin:', this.adminEmail);
        console.log('   - Configuré:', !!(EMAIL_CONFIG.USER && EMAIL_CONFIG.PASS));
    }

    // Méthode pour envoyer un email de test
    async sendTestEmail() {
        try {
            console.log('📧 Tentative d\'envoi d\'email de test...');
            console.log('📧 Vers:', this.adminEmail);
            console.log('📧 Depuis:', this.transporter.options.auth.user);
            
            const info = await this.transporter.sendMail({
                from: this.transporter.options.auth.user,
                to: this.adminEmail,
                subject: '🧪 Test - Service Email Pointeuse',
                html: `
                    <h2>Test du service email</h2>
                    <p>Si vous recevez cet email, le service fonctionne correctement !</p>
                    <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                `
            });
            
            console.log('✅ Email de test envoyé:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur envoi email de test:', error);
            console.error('❌ Code d\'erreur:', error.code);
            console.error('❌ Réponse SMTP:', error.response);
            return { success: false, error: error.message };
        }
    }

    // Méthode pour envoyer le résumé quotidien
    async sendDailySummary(date, summaryData) {
        try {
            const htmlContent = this.generateSummaryHTML(date, summaryData);
            
            console.log('📧 Envoi résumé quotidien...');
            console.log('📧 Date:', date);
            console.log('📧 Vers:', this.adminEmail);
            
            const info = await this.transporter.sendMail({
                from: this.transporter.options.auth.user,
                to: this.adminEmail,
                subject: `📊 Résumé quotidien - ${date}`,
                html: htmlContent
            });
            
            console.log('✅ Résumé quotidien envoyé:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur envoi résumé:', error);
            console.error('❌ Code d\'erreur:', error.code);
            console.error('❌ Réponse SMTP:', error.response);
            return { success: false, error: error.message };
        }
    }

    // Générer le HTML du résumé
    generateSummaryHTML(date, summaryData) {
        let html = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <h1 style="color: #333; text-align: center;">📊 Résumé quotidien - ${date}</h1>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
        `;

        if (Object.keys(summaryData.summary).length === 0) {
            html += '<p style="text-align: center; color: #666;">Aucun pointage enregistré aujourd\'hui.</p>';
        } else {
            html += '<h2>👥 Employés</h2>';
            
            Object.entries(summaryData.summary).forEach(([userId, data]) => {
                const workHours = Math.floor(data.totalWorkTime / 60);
                const workMinutes = data.totalWorkTime % 60;
                const breakMinutes = data.totalBreakTime;
                
                html += `
                    <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007bff;">
                        <h3 style="margin: 0 0 10px 0; color: #333;">👤 ${data.username}</h3>
                        <p><strong>Début :</strong> ${data.startTime ? new Date(data.startTime).toLocaleTimeString('fr-FR') : 'Non enregistré'}</p>
                        <p><strong>Fin :</strong> ${data.endTime ? new Date(data.endTime).toLocaleTimeString('fr-FR') : 'Non enregistré'}</p>
                        <p><strong>Temps de travail :</strong> ${workHours}h ${workMinutes}min</p>
                        <p><strong>Temps de pause :</strong> ${breakMinutes}min</p>
                `;
                
                // Vérifier les anomalies
                if (!data.startTime) {
                    html += '<p style="color: #dc3545;">⚠️ <strong>Attention :</strong> Début de journée non enregistré</p>';
                }
                if (!data.endTime) {
                    html += '<p style="color: #ffc107;">⚠️ <strong>Attention :</strong> Fin de journée non enregistrée</p>';
                }
                
                html += '</div>';
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

    // Méthode pour envoyer le résumé mensuel (même logique que sendDailySummary)
    async sendMonthlySummary(monthName, year, summaryData) {
        try {
            const htmlContent = this.generateMonthlySummaryHTML(monthName, year, summaryData);
            
            console.log('📧 Envoi résumé mensuel...');
            console.log('📧 Mois:', monthName, year);
            console.log('📧 Vers:', this.adminEmail);
            
            const info = await this.transporter.sendMail({
                from: this.transporter.options.auth.user,
                to: this.adminEmail,
                subject: `📅 Résumé mensuel - ${monthName} ${year}`,
                html: htmlContent
            });
            
            console.log('✅ Résumé mensuel envoyé:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur envoi résumé mensuel:', error);
            console.error('❌ Code d\'erreur:', error.code);
            console.error('❌ Réponse SMTP:', error.response);
            return { success: false, error: error.message };
        }
    }

    // Générer le HTML du résumé mensuel (même logique que generateSummaryHTML)
    generateMonthlySummaryHTML(monthName, year, summaryData) {
        let html = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <h1 style="color: #333; text-align: center;">📅 Résumé mensuel - ${monthName} ${year}</h1>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
        `;

        if (Object.keys(summaryData.summary).length === 0) {
            html += '<p style="text-align: center; color: #666;">Aucun pointage enregistré ce mois.</p>';
        } else {
            html += '<h2>👥 Employés</h2>';
            
            Object.entries(summaryData.summary).forEach(([userId, data]) => {
                const workHours = Math.floor(data.totalWorkTime / 60);
                const workMinutes = data.totalWorkTime % 60;
                const breakHours = Math.floor(data.totalBreakTime / 60);
                const breakMinutes = data.totalBreakTime % 60;
                const avgHours = Math.floor(data.avgTimePerDay / 60);
                const avgMinutes = data.avgTimePerDay % 60;
                
                html += `
                    <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007bff;">
                        <h3 style="margin: 0 0 10px 0; color: #333;">👤 ${data.username}</h3>
                        <p><strong>Jours travaillés :</strong> ${data.workingDays}</p>
                        <p><strong>Temps total de travail :</strong> ${workHours}h ${workMinutes}min</p>
                        <p><strong>Temps total de pause :</strong> ${breakHours}h ${breakMinutes}min</p>
                        <p><strong>Temps moyen par jour :</strong> ${avgHours}h ${avgMinutes}min</p>
                    </div>
                `;
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

    // Méthode pour envoyer un email d'alerte
    async sendAlert(subject, message) {
        try {
            const info = await this.transporter.sendMail({
                from: this.transporter.options.auth.user,
                to: this.adminEmail,
                subject: `🚨 ${subject}`,
                html: `
                    <div style="font-family: Arial, sans-serif;">
                        <h2 style="color: #dc3545;">🚨 Alerte</h2>
                        <p>${message}</p>
                        <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                    </div>
                `
            });
            
            console.log('✅ Alerte envoyée:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur envoi alerte:', error);
            return { success: false, error: error.message };
        }
    }
}

// Créer une instance singleton
const emailService = new EmailService();

module.exports = emailService;
