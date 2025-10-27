// Script d'administration
class AdminApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Formulaire de connexion
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Formulaire de création d'utilisateur
        document.getElementById('createUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createUser();
        });

        // Configuration géolocalisation
        document.getElementById('geoEnabled').addEventListener('change', (e) => {
            this.toggleGeoLocation(e.target.checked);
        });
        document.getElementById('configureGeoBtn').addEventListener('click', () => this.openGeoConfig());
        document.getElementById('closeGeoModal').addEventListener('click', () => this.closeGeoConfig());
        document.getElementById('getCurrentLocationBtn').addEventListener('click', () => this.getCurrentLocation());
        document.getElementById('saveGeoConfigBtn').addEventListener('click', () => this.saveGeoConfig());

        // Boutons d'administration
        document.getElementById('testEmailBtn').addEventListener('click', () => this.testEmail());
        document.getElementById('dailySummaryBtn').addEventListener('click', () => this.sendDailySummary());
        document.getElementById('monthlySummaryBtn').addEventListener('click', () => this.sendMonthlySummary());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }

    async checkAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    if (user.role === 'admin') {
                        this.currentUser = user;
                        this.showAdminSection();
                    } else {
                        this.showMessage('Accès admin requis', 'error');
                        localStorage.removeItem('token');
                    }
                } else {
                    localStorage.removeItem('token');
                }
            } catch (error) {
                console.error('Erreur de vérification:', error);
                localStorage.removeItem('token');
            }
        }
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.data.user.role === 'admin') {
                    localStorage.setItem('token', data.data.token);
                    this.currentUser = data.data.user;
                    this.showMessage('Connexion réussie !', 'success');
                    this.showAdminSection();
                } else {
                    this.showMessage('Accès admin requis', 'error');
                }
            } else {
                this.showMessage(data.message || 'Erreur de connexion', 'error');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            this.showMessage('Erreur de connexion au serveur', 'error');
        }
    }

    async createUser() {
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;

        if (!username || !password) {
            this.showResult('userResult', 'error', '❌ Veuillez remplir tous les champs');
            return;
        }

        this.showLoading('createUserForm button', 'Création...');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ username, password, role: 'employee' })
            });

            const data = await response.json();

            if (response.ok) {
                this.showResult('userResult', 'success', 
                    `✅ Compte créé avec succès !<br>Utilisateur: ${data.user.username}<br>Rôle: ${data.user.role}`);
                
                // Vider le formulaire
                document.getElementById('createUserForm').reset();
            } else {
                this.showResult('userResult', 'error', 
                    `❌ Erreur: ${data.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            this.showResult('userResult', 'error', '❌ Erreur de connexion au serveur');
        } finally {
            this.hideLoading('createUserForm button', '➕ Créer le compte');
        }
    }

    async testEmail() {
        this.showLoading('testEmailBtn', 'Envoi en cours...');
        
        try {
            const response = await fetch('/api/email/test', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showResult('emailResult', 'success', 
                    `✅ Email de test envoyé avec succès !<br>Message ID: ${data.messageId}`);
            } else {
                this.showResult('emailResult', 'error', 
                    `❌ Erreur: ${data.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error('Erreur test email:', error);
            this.showResult('emailResult', 'error', '❌ Erreur de connexion au serveur');
        } finally {
            this.hideLoading('testEmailBtn', '🧪 Envoyer un email de test');
        }
    }

    async sendDailySummary() {
        this.showLoading('dailySummaryBtn', 'Envoi en cours...');
        
        try {
            const response = await fetch('/api/email/daily-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ date: new Date().toISOString().split('T')[0] })
            });

            const data = await response.json();

            if (response.ok) {
                this.showResult('emailResult', 'success', 
                    `✅ Résumé quotidien envoyé avec succès !<br>Message ID: ${data.messageId}`);
            } else {
                this.showResult('emailResult', 'error', 
                    `❌ Erreur: ${data.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error('Erreur envoi résumé:', error);
            this.showResult('emailResult', 'error', '❌ Erreur de connexion au serveur');
        } finally {
            this.hideLoading('dailySummaryBtn', '📊 Envoyer le résumé quotidien');
        }
    }

    async sendMonthlySummary() {
        this.showLoading('monthlySummaryBtn', 'Envoi en cours...');
        
        try {
            const response = await fetch('/api/email/monthly-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showResult('emailResult', 'success', 
                    `✅ Résumé mensuel envoyé avec succès !<br>Message ID: ${data.messageId}`);
            } else {
                this.showResult('emailResult', 'error', 
                    `❌ Erreur: ${data.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error('Erreur envoi résumé mensuel:', error);
            this.showResult('emailResult', 'error', '❌ Erreur de connexion au serveur');
        } finally {
            this.hideLoading('monthlySummaryBtn', '📅 Envoyer le résumé mensuel');
        }
    }


    showAdminSection() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminSection').style.display = 'block';
        document.getElementById('adminName').textContent = this.currentUser.username;
        this.loadInitialGeoState();
    }

    async loadInitialGeoState() {
        try {
            const response = await fetch('/api/admin/geo-config', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const config = await response.json();
                document.getElementById('geoEnabled').checked = config.enabled;
                document.querySelector('.switch-label').textContent = 
                    `Géolocalisation ${config.enabled ? 'activée' : 'désactivée'}`;
            }
        } catch (error) {
            console.error('Erreur chargement état géo:', error);
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.currentUser = null;
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('adminSection').style.display = 'none';
        this.showMessage('Déconnexion réussie', 'success');
    }

    showLoading(buttonId, text) {
        const button = document.querySelector(buttonId);
        if (button) {
            button.disabled = true;
            button.textContent = text;
        }
    }

    hideLoading(buttonId, originalText) {
        const button = document.querySelector(buttonId);
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    showResult(elementId, type, message) {
        const element = document.getElementById(elementId);
        element.className = `result ${type}`;
        element.innerHTML = message;
        element.style.display = 'block';
    }

    showMessage(message, type) {
        const errorEl = document.getElementById('loginError');
        errorEl.textContent = message;
        errorEl.className = `error ${type}`;
    }

    // Traduire les actions en français
    translateAction(action) {
        const actionTranslations = {
            'start_day': 'Début journée',
            'start_break': 'Début pause',
            'end_break': 'Fin pause',
            'end_day': 'Fin journée'
        };
        return actionTranslations[action] || action;
    }


    // Méthodes de géolocalisation
    async toggleGeoLocation(enabled) {
        try {
            const response = await fetch('/api/admin/geo-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    enabled,
                    center: { latitude: 0, longitude: 0 },
                    radius: 100,
                    description: `Géolocalisation ${enabled ? 'activée' : 'désactivée'} le ${new Date().toLocaleDateString('fr-FR')}`
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showResult('geoResult', 'success', 
                    `✅ Géolocalisation ${enabled ? 'activée' : 'désactivée'} !`);
                document.querySelector('.switch-label').textContent = 
                    `Géolocalisation ${enabled ? 'activée' : 'désactivée'}`;
            } else {
                this.showResult('geoResult', 'error', 
                    `❌ Erreur: ${data.message || 'Erreur inconnue'}`);
                // Remettre le switch dans l'état précédent
                document.getElementById('geoEnabled').checked = !enabled;
            }
        } catch (error) {
            console.error('Erreur toggle géo:', error);
            this.showResult('geoResult', 'error', '❌ Erreur de connexion au serveur');
            // Remettre le switch dans l'état précédent
            document.getElementById('geoEnabled').checked = !enabled;
        }
    }

    openGeoConfig() {
        document.getElementById('geoConfigModal').style.display = 'flex';
        this.loadGeoConfig();
    }

    closeGeoConfig() {
        document.getElementById('geoConfigModal').style.display = 'none';
    }

    async loadGeoConfig() {
        try {
            const response = await fetch('/api/admin/geo-config', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const config = await response.json();
                document.getElementById('geoLatitude').value = config.center.latitude;
                document.getElementById('geoLongitude').value = config.center.longitude;
                document.getElementById('geoRadius').value = config.radius;
            }
        } catch (error) {
            console.error('Erreur chargement config:', error);
        }
    }

    async getCurrentLocation() {
        this.showLoading('getCurrentLocationBtn', 'Détection...');
        
        try {
            const position = await this.getCurrentPosition();
            
            document.getElementById('geoLatitude').value = position.latitude;
            document.getElementById('geoLongitude').value = position.longitude;
            
            this.showResult('geoResult', 'success', 
                `📍 Position détectée : ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`);
        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.showResult('geoResult', 'error', '❌ Impossible de détecter votre position');
        } finally {
            this.hideLoading('getCurrentLocationBtn', '📍 Utiliser ma position actuelle');
        }
    }

    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Géolocalisation non supportée'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    async saveGeoConfig() {
        const enabled = document.getElementById('geoEnabled').checked;
        const latitude = parseFloat(document.getElementById('geoLatitude').value);
        const longitude = parseFloat(document.getElementById('geoLongitude').value);
        const radius = parseInt(document.getElementById('geoRadius').value);

        if (enabled && (!latitude || !longitude || !radius)) {
            this.showResult('geoResult', 'error', '❌ Veuillez remplir tous les champs');
            return;
        }

        this.showLoading('saveGeoConfigBtn', 'Sauvegarde...');

        try {
            const response = await fetch('/api/admin/geo-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    enabled,
                    center: { latitude, longitude },
                    radius,
                    description: `Zone configurée le ${new Date().toLocaleDateString('fr-FR')}`
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showResult('geoResult', 'success', 
                    `✅ Configuration sauvegardée !<br>Zone: ${enabled ? 'Activée' : 'Désactivée'}<br>Centre: ${latitude}, ${longitude}<br>Rayon: ${radius}m`);
                this.closeGeoConfig();
            } else {
                this.showResult('geoResult', 'error', 
                    `❌ Erreur: ${data.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error('Erreur sauvegarde config:', error);
            this.showResult('geoResult', 'error', '❌ Erreur de connexion au serveur');
        } finally {
            this.hideLoading('saveGeoConfigBtn', '💾 Sauvegarder la configuration');
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    new AdminApp();
});
