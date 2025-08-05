import { GameManager } from './game/GameManager.js';
import { UIManager } from './ui/UIManager.js';

class RampartGame {
    constructor() {
        this.gameManager = null;
        this.uiManager = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            this.uiManager = new UIManager();
            this.gameManager = new GameManager(this.uiManager);

            await this.uiManager.init();
            await this.gameManager.init();

            this.setupEventListeners();
            this.isInitialized = true;

            console.log('🏰 Rampart initialized successfully');
            
            // Expose for debugging
            window.game = this;
        } catch (error) {
            console.error('❌ Failed to initialize Rampart:', error);
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            if (this.gameManager) {
                this.gameManager.handleResize();
            }
        });

        window.addEventListener('beforeunload', () => {
            if (this.gameManager) {
                this.gameManager.saveGameState();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (!this.gameManager) return;
            
            if (document.hidden) {
                this.gameManager.pause();
            } else {
                this.gameManager.resume();
            }
        });
    }

    start() {
        if (!this.isInitialized) {
            console.error('Game not initialized');
            return;
        }

        this.gameManager.start();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const game = new RampartGame();
    await game.init();
    game.start();
});

export { RampartGame };