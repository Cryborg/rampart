import { GameManager } from './game/GameManager.js';

// Point d'entrée principal - KISS principle
class RampartApp {
    constructor() {
        this.gameManager = null;
        this.canvas = null;
    }
    
    // Initialisation simple et claire
    async init() {
        try {
            console.log('🏰 Initializing Rampart v2...');
            
            // Setup Canvas
            this.setupCanvas();
            
            // Créer le GameManager
            this.gameManager = new GameManager(this.canvas);
            
            // Setup UI events
            this.setupUI();
            
            console.log('✅ Rampart initialized successfully!');
            
            // Démarrer automatiquement le jeu
            console.log('🎮 Auto-starting game...');
            this.startGame();
            
        } catch (error) {
            console.error('❌ Failed to initialize Rampart:', error);
            this.showErrorMessage('Erreur d\'initialisation du jeu');
        }
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
        
        // Configuration de base
        this.canvas.setAttribute('tabindex', '0'); // Pour focus clavier
        this.canvas.focus();
        
        console.log('🖼️ Canvas setup complete');
    }
    
    setupUI() {
        // Bouton Start/Restart
        const startButton = this.createButton('🎮 Commencer', () => {
            this.startGame();
        });
        
        // Ajouter le bouton au DOM si pas déjà présent
        if (!document.getElementById('start-button')) {
            startButton.id = 'start-button';
            const gameUI = document.getElementById('game-ui');
            if (gameUI) {
                gameUI.appendChild(startButton);
            }
        }
        
        // Event listeners globaux
        this.setupGlobalEvents();
        
        console.log('🎮 UI setup complete');
    }
    
    setupGlobalEvents() {
        // Gestion du focus Canvas pour les événements clavier
        document.addEventListener('click', (e) => {
            if (e.target === this.canvas) {
                this.canvas.focus();
            }
        });
        
        // Gestion du resize
        window.addEventListener('resize', () => {
            if (this.gameManager) {
                this.gameManager.renderer.resizeCanvas();
            }
        });
        
        // Gestion de la visibilité de l'onglet
        document.addEventListener('visibilitychange', () => {
            if (this.gameManager && document.hidden) {
                this.gameManager.isPaused = true;
            }
        });
    }
    
    startGame() {
        if (!this.gameManager) {
            console.error('❌ GameManager not initialized');
            return;
        }
        
        console.log('🚀 Starting game...');
        this.gameManager.start();
        
        // Masquer le bouton start
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.style.display = 'none';
        }
    }
    
    // Utilitaire DRY pour créer des boutons
    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'game-button';
        button.addEventListener('click', onClick);
        return button;
    }
    
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(errorDiv);
        }
        
        console.error('💥 Error shown to user:', message);
    }
}

// Auto-démarrage quand le DOM est prêt
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, initializing app...');
    
    const app = new RampartApp();
    await app.init();
    
    // Exposer l'app globalement pour debug
    window.rampartApp = app;
});