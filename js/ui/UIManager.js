export class UIManager {
    constructor() {
        this.elements = {
            // Overlays
            menuOverlay: null,
            controlsOverlay: null,
            gameOverOverlay: null,
            
            // Game UI
            score: null,
            lives: null,
            round: null,
            timer: null,
            phaseTitle: null,
            phaseDescription: null,
            phaseTimer: null,
            
            // Stats
            shipsDestroyed: null,
            cannonsPlaced: null,
            castlesClosed: null,
            
            // Wave info
            currentWave: null,
            waveTimer: null,
            enemyShips: null,
            landUnits: null,
            
            // Buttons
            startSolo: null,
            startMulti: null,
            showControls: null,
            showHighscores: null,
            
            // Controls
            player1Controls: null,
            player2Controls: null,
            player3Controls: null,
            player1Active: null,
            player2Active: null,
            player3Active: null
        };
        
        this.callbacks = {
            onStartSolo: null,
            onStartMulti: null,
            onShowControls: null,
            onConfigureControls: null
        };
        
        this.currentPhase = null;
        this.phaseDescriptions = {
            'select_territory': 'Choisissez votre château de départ',
            'place_cannons': 'Placez vos canons dans le château',
            'combat': 'Défendez votre territoire !',
            'repair': 'Réparez vos fortifications',
            'round_end': 'Fin du round',
            'game_over': 'Partie terminée'
        };
    }

    async init() {
        this.findElements();
        this.setupEventListeners();
        this.setupInitialState();
        console.log('🖥️ UIManager initialized');
    }

    findElements() {
        // Overlays
        this.elements.menuOverlay = document.getElementById('menuOverlay');
        this.elements.controlsOverlay = document.getElementById('controlsOverlay');
        this.elements.gameOverOverlay = document.getElementById('gameOverOverlay');
        
        // Game info
        this.elements.score = document.getElementById('score');
        this.elements.lives = document.getElementById('lives');
        this.elements.round = document.getElementById('round');
        this.elements.timer = document.getElementById('timer');
        
        // Phase info
        this.elements.phaseTitle = document.getElementById('phaseTitle');
        this.elements.phaseDescription = document.getElementById('phaseDescription');
        this.elements.phaseTimer = document.querySelector('.timer-fill');
        
        // Stats
        this.elements.shipsDestroyed = document.getElementById('shipsDestroyed');
        this.elements.cannonsPlaced = document.getElementById('cannonsPlaced');
        this.elements.castlesClosed = document.getElementById('castlesClosed');
        
        // Wave info
        this.elements.currentWave = document.getElementById('currentWave');
        this.elements.waveTimer = document.getElementById('waveTimer');
        this.elements.enemyShips = document.getElementById('enemyShips');
        this.elements.landUnits = document.getElementById('landUnits');
        
        // Menu buttons
        this.elements.startSolo = document.getElementById('startSolo');
        this.elements.startMulti = document.getElementById('startMulti');
        this.elements.showControls = document.getElementById('showControls');
        this.elements.showHighscores = document.getElementById('showHighscores');
        
        // Control elements
        this.elements.player1Controls = document.getElementById('player1Controls');
        this.elements.player2Controls = document.getElementById('player2Controls');
        this.elements.player3Controls = document.getElementById('player3Controls');
        this.elements.player1Active = document.getElementById('player1Active');
        this.elements.player2Active = document.getElementById('player2Active');
        this.elements.player3Active = document.getElementById('player3Active');
    }

    setupEventListeners() {
        // Menu buttons
        if (this.elements.startSolo) {
            this.elements.startSolo.addEventListener('click', () => {
                if (this.callbacks.onStartSolo) this.callbacks.onStartSolo();
            });
        }
        
        if (this.elements.startMulti) {
            this.elements.startMulti.addEventListener('click', () => {
                if (this.callbacks.onStartMulti) this.callbacks.onStartMulti();
            });
        }
        
        if (this.elements.showControls) {
            this.elements.showControls.addEventListener('click', () => {
                this.showControlsPanel();
            });
        }
        
        // Controls panel
        const saveControls = document.getElementById('saveControls');
        if (saveControls) {
            saveControls.addEventListener('click', () => {
                this.saveControlsConfiguration();
                this.hideControlsPanel();
            });
        }
        
        const closeControls = document.getElementById('closeControls');
        if (closeControls) {
            closeControls.addEventListener('click', () => {
                this.hideControlsPanel();
            });
        }
        
        const testControls = document.getElementById('testControls');
        if (testControls) {
            testControls.addEventListener('click', () => {
                this.testControlsConfiguration();
            });
        }
        
        // Game over buttons
        const restartGame = document.getElementById('restartGame');
        if (restartGame) {
            restartGame.addEventListener('click', () => {
                this.hideGameOver();
                if (this.callbacks.onRestart) this.callbacks.onRestart();
            });
        }
        
        const backToMenu = document.getElementById('backToMenu');
        if (backToMenu) {
            backToMenu.addEventListener('click', () => {
                this.hideGameOver();
                this.showMenu();
            });
        }
    }

    setupInitialState() {
        this.showMenu();
        this.updateScore(0);
        this.updateLives(3);
        this.updateRound(1);
        this.updateStats(0, 0, 0);
    }

    // Menu management
    showMenu() {
        this.elements.menuOverlay?.classList.remove('hidden');
    }

    hideMenu() {
        this.elements.menuOverlay?.classList.add('hidden');
    }

    showControlsPanel() {
        this.elements.controlsOverlay?.classList.remove('hidden');
        this.loadControlsConfiguration();
    }

    hideControlsPanel() {
        this.elements.controlsOverlay?.classList.add('hidden');
    }

    showGameOver(finalStats) {
        if (this.elements.gameOverOverlay) {
            this.elements.gameOverOverlay.classList.remove('hidden');
            
            // Update final stats
            const finalScore = document.getElementById('finalScore');
            const finalRound = document.getElementById('finalRound');
            const finalShips = document.getElementById('finalShips');
            
            if (finalScore) finalScore.textContent = finalStats.score || 0;
            if (finalRound) finalRound.textContent = finalStats.round || 1;
            if (finalShips) finalShips.textContent = finalStats.shipsDestroyed || 0;
        }
    }

    hideGameOver() {
        this.elements.gameOverOverlay?.classList.add('hidden');
    }

    // Game state updates
    updateScore(score) {
        if (this.elements.score) {
            this.elements.score.textContent = score.toLocaleString();
        }
    }

    updateLives(lives) {
        if (this.elements.lives) {
            this.elements.lives.textContent = lives;
            
            // Visual feedback for low lives
            if (lives <= 1) {
                this.elements.lives.style.color = '#e74c3c';
                this.elements.lives.style.animation = 'pulse 1s infinite';
            } else {
                this.elements.lives.style.color = '';
                this.elements.lives.style.animation = '';
            }
        }
    }

    updateRound(round) {
        if (this.elements.round) {
            this.elements.round.textContent = round;
        }
    }

    updateTimer(timeLeft) {
        if (this.elements.timer) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            this.elements.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updatePhase(phase, timeLeft) {
        this.currentPhase = phase;
        
        // Update phase title and description
        if (this.elements.phaseTitle) {
            this.elements.phaseTitle.textContent = this.getPhaseName(phase);
        }
        
        if (this.elements.phaseDescription) {
            this.elements.phaseDescription.textContent = this.phaseDescriptions[phase] || '';
        }
        
        // Update timer
        if (timeLeft > 0) {
            const seconds = Math.ceil(timeLeft / 1000);
            this.updateTimer(seconds);
            
            // Update visual timer bar
            this.updatePhaseTimer(timeLeft);
        }
    }

    updatePhaseTimer(timeLeft, maxTime = 30000) {
        if (this.elements.phaseTimer) {
            const progress = Math.max(0, Math.min(1, timeLeft / maxTime));
            this.elements.phaseTimer.style.width = `${progress * 100}%`;
            
            // Color coding based on time left
            if (progress > 0.6) {
                this.elements.phaseTimer.style.background = '#2ecc71'; // Green
            } else if (progress > 0.3) {
                this.elements.phaseTimer.style.background = '#f7931e'; // Orange
            } else {
                this.elements.phaseTimer.style.background = '#e74c3c'; // Red
            }
        }
    }

    updateStats(shipsDestroyed, cannonsPlaced, castlesClosed) {
        if (this.elements.shipsDestroyed) {
            this.elements.shipsDestroyed.textContent = shipsDestroyed;
        }
        
        if (this.elements.cannonsPlaced) {
            this.elements.cannonsPlaced.textContent = cannonsPlaced;
        }
        
        if (this.elements.castlesClosed) {
            this.elements.castlesClosed.textContent = castlesClosed;
        }
    }

    updateWaveInfo(waveData) {
        if (this.elements.currentWave) {
            this.elements.currentWave.textContent = waveData.currentWave || '-';
        }
        if (this.elements.waveTimer) {
            if (waveData.timeRemaining !== undefined && waveData.timeRemaining > 0) {
                const seconds = Math.ceil(waveData.timeRemaining / 1000);
                this.elements.waveTimer.textContent = `${seconds}s`;
            } else {
                this.elements.waveTimer.textContent = '-';
            }
        }
        if (this.elements.enemyShips) {
            this.elements.enemyShips.textContent = waveData.enemyShips || 0;
        }
        if (this.elements.landUnits) {
            this.elements.landUnits.textContent = waveData.landUnits || 0;
        }
    }

    // Controls configuration
    loadControlsConfiguration() {
        const saved = localStorage.getItem('rampart_controls');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                
                if (this.elements.player1Controls) this.elements.player1Controls.value = config.player1?.control || 'mouse';
                if (this.elements.player2Controls) this.elements.player2Controls.value = config.player2?.control || 'keyboard_wasd';
                if (this.elements.player3Controls) this.elements.player3Controls.value = config.player3?.control || 'keyboard_numpad';
                
                if (this.elements.player1Active) this.elements.player1Active.checked = config.player1?.active !== false;
                if (this.elements.player2Active) this.elements.player2Active.checked = config.player2?.active || false;
                if (this.elements.player3Active) this.elements.player3Active.checked = config.player3?.active || false;
            } catch (error) {
                console.warn('Failed to load controls configuration:', error);
            }
        }
    }

    saveControlsConfiguration() {
        const config = {
            player1: {
                control: this.elements.player1Controls?.value || 'mouse',
                active: this.elements.player1Active?.checked !== false
            },
            player2: {
                control: this.elements.player2Controls?.value || 'keyboard_wasd',
                active: this.elements.player2Active?.checked || false
            },
            player3: {
                control: this.elements.player3Controls?.value || 'keyboard_numpad',
                active: this.elements.player3Active?.checked || false
            }
        };
        
        localStorage.setItem('rampart_controls', JSON.stringify(config));
        console.log('💾 Controls configuration saved');
        
        if (this.callbacks.onConfigureControls) {
            this.callbacks.onConfigureControls(config);
        }
    }

    testControlsConfiguration() {
        console.log('🎮 Testing controls...');
        // TODO: Implement controls testing
        this.showNotification('Testez vos contrôles dans le jeu !', 'info');
    }

    getControlsConfiguration() {
        const saved = localStorage.getItem('rampart_controls');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.warn('Failed to parse controls configuration:', error);
            }
        }
        
        // Default configuration
        return {
            player1: { control: 'mouse', active: true },
            player2: { control: 'keyboard_wasd', active: false },
            player3: { control: 'keyboard_numpad', active: false }
        };
    }

    // Utility methods
    getPhaseName(phase) {
        const names = {
            'select_territory': '🏰 Sélection territoire',
            'place_cannons': '🔫 Placement canons',
            'combat': '⚔️ Combat',
            'repair': '🧱 Réparation',
            'round_end': '🏁 Fin de round',
            'game_over': '💀 Game Over'
        };
        
        return names[phase] || phase;
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 2rem',
            borderRadius: '8px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '700',
            zIndex: '9999',
            animation: 'slideIn 0.3s ease-out'
        });
        
        // Type-specific styling
        const colors = {
            info: '#004e89',
            success: '#2ecc71',
            warning: '#f7931e',
            error: '#e74c3c'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // Public callback setters
    set onStartSolo(callback) { this.callbacks.onStartSolo = callback; }
    set onStartMulti(callback) { this.callbacks.onStartMulti = callback; }
    set onShowControls(callback) { this.callbacks.onShowControls = callback; }
    set onConfigureControls(callback) { this.callbacks.onConfigureControls = callback; }
    set onRestart(callback) { this.callbacks.onRestart = callback; }
}