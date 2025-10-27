// Application principale - Frontend JavaScript
class PointeuseApp {
    constructor() {
        this.currentUser = null;
        this.currentStatus = 'disconnected';
        this.init();
    }

    init() {
        // Vérifier si l'utilisateur est déjà connecté
        this.checkAuth();
        
        // Event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Formulaire de connexion
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Boutons de pointage
        document.getElementById('startDay').addEventListener('click', () => this.pointage('start_day'));
        document.getElementById('startBreak').addEventListener('click', () => this.pointage('start_break'));
        document.getElementById('endBreak').addEventListener('click', () => this.pointage('end_break'));
        document.getElementById('endDay').addEventListener('click', () => this.pointage('end_day'));

        // Déconnexion
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
                    this.currentUser = user;
                    this.showPointageSection();
                    this.updateStatus();
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
                localStorage.setItem('token', data.data.token);
                this.currentUser = data.data.user;
                this.showMessage('Connexion réussie !', 'success');
                this.showPointageSection();
                this.updateStatus();
            } else {
                this.showMessage(data.message || 'Erreur de connexion', 'error');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            this.showMessage('Erreur de connexion au serveur', 'error');
        }
    }

    async pointage(action) {
        if (!this.currentUser) return;

        // Afficher le spinner de chargement
        this.showLoadingSpinner();

        // Vérifier la géolocalisation avant le pointage
        try {
            const position = await this.getCurrentPosition();
            const isInZone = await this.checkLocationInZone(position);
            
            if (!isInZone) {
                this.hideLoadingSpinner();
                this.showMessage('❌ Vous devez être sur le lieu de travail pour pointer !', 'error');
                return;
            }
        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.hideLoadingSpinner();
            this.showMessage('❌ Impossible de vérifier votre position. Pointage bloqué.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/pointage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ action })
            });

            const data = await response.json();

            if (response.ok) {
                this.hideLoadingSpinner();
                this.showMessage(data.message, 'success');
                this.updateStatus();
            } else {
                this.hideLoadingSpinner();
                this.showMessage(data.message || 'Erreur de pointage', 'error');
            }
        } catch (error) {
            console.error('Erreur de pointage:', error);
            this.hideLoadingSpinner();
            this.showMessage('Erreur de connexion au serveur', 'error');
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.currentUser = null;
        this.currentStatus = 'disconnected';
        this.showLoginSection();
        this.showMessage('Déconnexion réussie', 'success');
    }

    showLoginSection() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('pointageSection').style.display = 'none';
    }

    showPointageSection() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('pointageSection').style.display = 'block';
        document.getElementById('userName').textContent = this.currentUser.username;
    }

    async updateStatus() {
        if (!this.currentUser) return;

        try {
            const response = await fetch('/api/pointage/status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentStatus = data.status;
                
                document.getElementById('currentStatus').textContent = this.getStatusText(data.status);
                document.getElementById('lastAction').textContent = data.lastAction ? this.translateAction(data.lastAction) : '-';
            }
        } catch (error) {
            console.error('Erreur de mise à jour du statut:', error);
        }
    }

    getStatusText(status) {
        const statusTexts = {
            'disconnected': 'Non connecté',
            'not_started': 'Journée non commencée',
            'working': 'En travail',
            'on_break': 'En pause',
            'day_ended': 'Journée terminée'
        };
        return statusTexts[status] || 'Inconnu';
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

    showMessage(message, type) {
        const messageEl = document.getElementById('message');
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    // Afficher le spinner de chargement
    showLoadingSpinner() {
        // Désactiver tous les boutons de pointage
        const buttons = ['startDay', 'startBreak', 'endBreak', 'endDay'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = true;
                button.style.opacity = '0.6';
            }
        });

        // Afficher le message de chargement
        this.showMessage('🔄 Vérification de votre position...', 'info');
    }

    // Masquer le spinner de chargement
    hideLoadingSpinner() {
        // Réactiver tous les boutons de pointage
        const buttons = ['startDay', 'startBreak', 'endBreak', 'endDay'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = false;
                button.style.opacity = '1';
            }
        });
    }

    // Méthodes de géolocalisation
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
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }

    async checkLocationInZone(position) {
        try {
            const response = await fetch('/api/pointage/check-location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    latitude: position.latitude,
                    longitude: position.longitude
                })
            });

            const data = await response.json();
            return data.inZone;
        } catch (error) {
            console.error('Erreur vérification zone:', error);
            return false;
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    new PointeuseApp();
});
