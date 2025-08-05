import { GameState } from './GameState.js';
import { Grid } from './Grid.js';
import { Renderer } from '../ui/Renderer.js';
import { InputHandler } from '../ui/InputHandler.js';
import { Player } from './Player.js';
import { PieceGenerator } from './TetrisPieces.js';
import { PhaseManager } from './phases/PhaseManager.js';
import { CastleDetectionService } from './services/CastleDetectionService.js';

// Refactored GameManager following SOLID, DRY, KISS principles
export class GameManager {
    constructor(uiManager) {
        // Core dependencies (Dependency Injection)
        this.uiManager = uiManager;
        this.gameState = new GameState();
        this.grid = new Grid(48, 36); // Plus proche du vrai Rampart
        
        // Services (Single Responsibility)
        this.castleDetectionService = new CastleDetectionService(this.grid);
        this.pieceGenerator = new PieceGenerator(true);
        
        // UI components
        this.renderer = null;
        this.inputHandler = null;
        this.canvas = null;
        this.ctx = null;
        
        // Game state
        this.players = [];
        this.currentPlayer = 0;
        this.gameLoop = null;
        this.lastFrameTime = 0;
        this.isPaused = false;
        this.currentHoverPos = null;
        
        // Phase management (Strategy Pattern)
        this.phaseManager = new PhaseManager(this);
    }

    async init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas || !this.ctx) {
            throw new Error('Canvas not found or context not supported');
        }

        this.renderer = new Renderer(this.canvas, this.ctx);
        this.inputHandler = new InputHandler(this.canvas);
        
        await this.renderer.init();
        this.inputHandler.init();
        
        this.setupInputHandlers();
        this.initializePlayers();
        this.setupDefaultLevel();
        
        console.log('🎮 GameManager initialized (Refactored)');
    }

    // Player management (extracted for clarity)
    initializePlayers() {
        const player1 = new Player(1, 'Joueur 1', '#ff6b35', 'mouse');
        player1.territory = { startX: 0, startY: 0, width: 12, height: 12 };
        player1.castle.core = { x: 6, y: 6 };
        
        this.players.push(player1);
        this.currentPlayer = 0;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayer];
    }

    // Level setup (extracted for reusability)
    setupDefaultLevel() {
        this.grid.generateTerrain();
        this.createStartingCastle();
    }

    createStartingCastle() {
        const player = this.getCurrentPlayer();
        
        // Place castle at grid center (protected from water)
        const coreX = Math.floor(this.grid.width / 2);
        const coreY = Math.floor(this.grid.height / 2);
        
        player.castle.core = { x: coreX, y: coreY };
        this.grid.setCellType(coreX, coreY, 'castle-core');
        
        // Create initial walls around castle
        const walls = [
            {x: coreX - 1, y: coreY - 1}, {x: coreX, y: coreY - 1}, {x: coreX + 1, y: coreY - 1},
            {x: coreX - 1, y: coreY}, {x: coreX + 1, y: coreY},
            {x: coreX - 1, y: coreY + 1}, {x: coreX, y: coreY + 1}, {x: coreX + 1, y: coreY + 1}
        ];
        
        walls.forEach(wall => {
            if (this.grid.isValidPosition(wall.x, wall.y)) {
                this.grid.setCellType(wall.x, wall.y, 'wall');
                player.castle.walls.push(wall);
            }
        });
    }

    // Input handling (delegated to phases)
    setupInputHandlers() {
        this.inputHandler.onMouseMove = (x, y) => {
            this.handleMouseMove(x, y);
        };

        this.inputHandler.onMouseClick = (x, y, button) => {
            this.handleMouseClick(x, y, button);
        };

        this.inputHandler.onKeyPress = (key) => {
            this.handleKeyPress(key);
        };
    }

    handleMouseMove(clientX, clientY) {
        // Convert client coordinates to grid coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        const gridPos = this.renderer.screenToGrid(canvasX, canvasY);
        this.currentHoverPos = gridPos;
        
        // Delegate to current phase
        this.phaseManager.handleMouseMove(gridPos);
    }

    handleMouseClick(x, y, button) {
        const gridPos = this.renderer.screenToGrid(x, y);
        console.log(`🖱️ Click at grid(${gridPos.x}, ${gridPos.y}) | Button: ${button}`);
        
        // Delegate to current phase
        this.phaseManager.handleMouseClick(gridPos, button);
    }

    handleKeyPress(key) {
        switch (key) {
            case 'Escape':
                this.pauseGame();
                break;
            default:
                // Delegate to current phase
                this.phaseManager.handleKeyPress(key);
                break;
        }
    }

    // Phase management (simplified)
    transitionToPhase(phaseName) {
        return this.phaseManager.transitionTo(phaseName);
    }

    // Castle detection (delegated to service)
    checkCastleClosure() {
        return this.castleDetectionService.checkForClosedCastles();
    }

    // Game lifecycle
    start() {
        this.uiManager.showMenu();
        this.uiManager.onStartSolo = () => this.startSoloGame();
        this.uiManager.onStartMulti = () => this.startMultiGame();
    }

    startSoloGame() {
        this.uiManager.hideMenu();
        
        // Start directly in repair phase
        this.transitionToPhase('REPAIR');
        this.startGameLoop();
    }

    startMultiGame() {
        console.log('Multi-player not implemented yet');
    }

    // Game loop (cleaner separation)
    startGameLoop() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }

        const loop = (currentTime) => {
            if (!this.isPaused) {
                const deltaTime = currentTime - this.lastFrameTime;
                this.update(deltaTime);
                this.render();
            }
            
            this.lastFrameTime = currentTime;
            this.gameLoop = requestAnimationFrame(loop);
        };

        this.gameLoop = requestAnimationFrame(loop);
    }

    update(deltaTime) {
        this.gameState.update(deltaTime);
        
        // Update current phase
        this.phaseManager.update(deltaTime);
        
        // Update players
        this.players.forEach(player => {
            player.update(deltaTime);
        });

        this.updateUI();
    }

    render() {
        this.renderer.clear();
        this.renderer.renderGrid(this.grid);
        
        // Phase-specific rendering
        this.phaseManager.render();
        
        this.renderer.renderPlayers(this.players);
        
        // Phase-specific UI
        this.phaseManager.renderUI();
        
        // Debug info (could be extracted to DebugRenderer)
        this.renderDebugInfo();
    }

    renderDebugInfo() {
        const currentPhase = this.phaseManager.getCurrentPhase();
        if (currentPhase?.constructor.name === 'RepairPhase') {
            const player = this.getCurrentPlayer();
            if (player.currentPiece) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.fillText(`Pièce: ${player.currentPiece.type}`, 10, 100);
                this.ctx.fillText(`État: ${currentPhase.constructor.name}`, 10, 120);
                this.ctx.fillText(`Pos: (${player.piecePosition.x}, ${player.piecePosition.y})`, 10, 140);
            }
        }
    }

    updateUI() {
        const player = this.getCurrentPlayer();
        
        this.uiManager.updateScore(player.score);
        this.uiManager.updateLives(player.lives);
        this.uiManager.updateRound(this.gameState.round);
        this.uiManager.updatePhase(this.gameState.currentState, this.gameState.phaseTimeLeft);
        
        // Update piece preview
        const currentPhase = this.phaseManager.getCurrentPhase();
        if (currentPhase?.constructor.name === 'RepairPhase' && player.currentPiece) {
            this.renderPiecePreview(player.currentPiece);
        }
    }

    renderPiecePreview(piece) {
        const previewCanvas = document.getElementById('piecePreview');
        if (!previewCanvas) return;
        
        const ctx = previewCanvas.getContext('2d');
        const cellSize = 20;
        
        // Clear
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        // Draw piece centered
        const offsetX = Math.floor((previewCanvas.width - piece.width * cellSize) / 2);
        const offsetY = Math.floor((previewCanvas.height - piece.height * cellSize) / 2);
        
        ctx.fillStyle = piece.color;
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] === 1) {
                    ctx.fillRect(
                        offsetX + x * cellSize, 
                        offsetY + y * cellSize, 
                        cellSize - 1, 
                        cellSize - 1
                    );
                }
            }
        }
    }

    // Utility methods
    handleResize() {
        this.renderer?.handleResize();
    }

    pauseGame() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? '⏸️ Game paused' : '▶️ Game resumed');
    }

    // Save/Load (could be extracted to SaveGameService)
    saveGameState() {
        const gameData = {
            players: this.players,
            gameState: this.gameState.serialize(),
            grid: this.grid.serialize()
        };
        
        localStorage.setItem('rampart_save', JSON.stringify(gameData));
        console.log('💾 Game state saved');
    }

    loadGameState() {
        const saved = localStorage.getItem('rampart_save');
        if (saved) {
            try {
                const gameData = JSON.parse(saved);
                console.log('📂 Game state loaded');
                return gameData;
            } catch (error) {
                console.error('❌ Failed to load save:', error);
            }
        }
        return null;
    }
}