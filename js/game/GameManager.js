import { GameState } from './GameState.js';
import { Grid } from './Grid.js';
import { Renderer } from '../ui/Renderer.js';
import { InputHandler } from '../ui/InputHandler.js';
import { Player } from './Player.js';
import { PieceGenerator } from './TetrisPieces.js';

export class GameManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.gameState = new GameState();
        this.grid = new Grid(48, 36); // Plus proche du vrai Rampart
        this.renderer = null;
        this.inputHandler = null;
        
        this.players = [];
        this.currentPlayer = 0;
        this.gameLoop = null;
        this.lastFrameTime = 0;
        this.isPaused = false;
        this.repairPhaseTimer = null;
        
        this.pieceGenerator = new PieceGenerator(true);
        this.currentHoverPos = null;
        
        this.canvas = null;
        this.ctx = null;
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
        
        console.log('🎮 GameManager initialized');
    }

    initializePlayers() {
        const player1 = new Player(1, 'Joueur 1', '#ff6b35', 'mouse');
        player1.territory = { startX: 0, startY: 0, width: 12, height: 12 };
        // Le core sera créé dans createTestCastle()
        
        this.players.push(player1);
        this.currentPlayer = 0;
    }

    setupDefaultLevel() {
        this.grid.generateTerrain();
        this.createStartingCastle();
    }

    createStartingCastle() {
        const player = this.players[0];
        
        // Placer le château au centre de la grille (où il est protégé de l'eau)
        const coreX = Math.floor(this.grid.width / 2);
        const coreY = Math.floor(this.grid.height / 2);
        
        // Mettre à jour la position du château du joueur
        player.castle.core = { x: coreX, y: coreY };
        
        this.grid.setCellType(coreX, coreY, 'castle-core');
        
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
        // Convertir les coordonnées client en coordonnées canvas
        const rect = this.canvas.getBoundingClientRect();
        
        // Prendre en compte le scaling CSS du canvas
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        const gridPos = this.renderer.screenToGrid(canvasX, canvasY);
        this.currentHoverPos = gridPos;
        
        // Update piece position during repair phase
        if (this.gameState.currentState === 'REPAIR') {
            const player = this.players[this.currentPlayer];
            if (player.currentPiece) {
                // Place piece with top-left corner at cursor position
                player.piecePosition = { 
                    x: gridPos.x, 
                    y: gridPos.y
                };
                
                // Clamp to grid bounds
                player.piecePosition.x = Math.max(0, Math.min(this.grid.width - player.currentPiece.width, player.piecePosition.x));
                player.piecePosition.y = Math.max(0, Math.min(this.grid.height - player.currentPiece.height, player.piecePosition.y));
                
                // Log for debug - plus fréquent pour voir si ça marche
                if (Math.random() < 0.05) { // Log 5% of moves
                    console.log(`🖱️ Client: (${clientX}, ${clientY}) → Canvas: (${canvasX}, ${canvasY}) → Grid: (${gridPos.x}, ${gridPos.y})`);
                    console.log(`🧱 Piece position: ${player.piecePosition.x}, ${player.piecePosition.y}`);
                }
            }
        }
        
        // Update cannon preview during cannon placement phase
        if (this.gameState.currentState === 'PLACE_CANNONS') {
            // Store cannon preview position
            this.cannonPreviewPos = gridPos;
        }
    }

    handleMouseClick(x, y, button) {
        const gridPos = this.renderer.screenToGrid(x, y);
        
        console.log(`🖱️ Click at screen(${x}, ${y}) → grid(${gridPos.x}, ${gridPos.y}) | State: ${this.gameState.currentState} | Button: ${button}`);
        
        switch (this.gameState.currentState) {
            case 'SELECT_TERRITORY':
                this.handleTerritorySelection(gridPos);
                break;
            case 'PLACE_CANNONS':
                this.handleCannonPlacement(gridPos, button);
                break;
            case 'REPAIR':
                this.handlePiecePlacement(gridPos, button);
                break;
            default:
                console.log(`⚠️ No handler for state: ${this.gameState.currentState}`);
        }
    }

    handleKeyPress(key) {
        switch (key) {
            case 'Escape':
                this.pauseGame();
                break;
            case ' ':
            case 'r':
                if (this.gameState.currentState === 'REPAIR') {
                    this.rotatePiece();
                }
                break;
        }
    }

    handleTerritorySelection(gridPos) {
        console.log('Territory selection at:', gridPos);
        this.gameState.transition('PLACE_CANNONS');
    }

    handleCannonPlacement(gridPos, button) {
        if (button === 0) { // Left click - placer un canon
            if (this.canPlaceCannonAt(gridPos.x, gridPos.y)) {
                if (this.grid.placeCannon(gridPos.x, gridPos.y, this.players[this.currentPlayer].id)) {
                    console.log(`🎯 Canon placé à (${gridPos.x}, ${gridPos.y})`);
                    
                    // Ajouter à la liste des canons du joueur
                    this.players[this.currentPlayer].cannons.push({
                        x: gridPos.x,
                        y: gridPos.y,
                        firing: false
                    });
                } else {
                    console.log(`❌ Impossible de placer un canon à (${gridPos.x}, ${gridPos.y})`);
                }
            } else {
                console.log(`❌ Position invalide pour un canon à (${gridPos.x}, ${gridPos.y})`);
            }
        } else if (button === 2) { // Right click - supprimer un canon
            this.removeCannonAt(gridPos.x, gridPos.y);
        }
    }

    canPlaceCannonAt(x, y) {
        // Vérifier que la position est dans une zone constructible (dorée)
        const topLeft = this.grid.getCell(x, y);
        if (!topLeft || !topLeft.cannonZone) {
            return false;
        }
        
        // Vérifier que les 4 cellules sont toutes dans la zone constructible
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const cell = this.grid.getCell(x + dx, y + dy);
                if (!cell || !cell.cannonZone || cell.type !== 'land') {
                    return false;
                }
            }
        }
        
        return this.grid.canPlaceCannon(x, y, this.players[this.currentPlayer].id);
    }

    removeCannonAt(x, y) {
        // Chercher un canon qui occupe cette position
        const player = this.players[this.currentPlayer];
        
        for (let i = 0; i < player.cannons.length; i++) {
            const cannon = player.cannons[i];
            
            // Vérifier si le clic est sur ce canon (2x2)
            if (x >= cannon.x && x < cannon.x + 2 && 
                y >= cannon.y && y < cannon.y + 2) {
                
                // Supprimer le canon de la grille
                for (let dx = 0; dx < 2; dx++) {
                    for (let dy = 0; dy < 2; dy++) {
                        this.grid.setCellType(cannon.x + dx, cannon.y + dy, 'land');
                        // Remettre le marquage cannonZone
                        const cell = this.grid.getCell(cannon.x + dx, cannon.y + dy);
                        if (cell) cell.cannonZone = true;
                    }
                }
                
                // Supprimer de la liste du joueur
                player.cannons.splice(i, 1);
                console.log(`🗑️ Canon supprimé à (${cannon.x}, ${cannon.y})`);
                return;
            }
        }
        
        console.log(`❌ Aucun canon trouvé à (${x}, ${y})`);
    }

    handlePiecePlacement(gridPos, button) {
        const player = this.players[this.currentPlayer];
        
        if (button === 0) { // Left click - place piece
            if (player.currentPiece) {
                // Use the piece position, not the click position
                const pieceX = player.piecePosition.x;
                const pieceY = player.piecePosition.y;
                
                if (this.grid.canPlacePiece(player.currentPiece, pieceX, pieceY)) {
                    this.grid.placePiece(player.currentPiece, pieceX, pieceY, player.id);
                    player.stats.piecesPlaced++;
                    
                    // Check if castle is now closed
                    this.checkCastleClosure();
                    
                    // Generate next piece
                    player.currentPiece = this.pieceGenerator.generatePiece(player.id);
                    console.log(`✅ Piece placed at: (${pieceX}, ${pieceY})`);
                } else {
                    console.log(`❌ Cannot place piece at: (${pieceX}, ${pieceY})`);
                }
            }
        } else if (button === 2) { // Right click - rotate
            this.rotatePiece();
        }
    }

    checkCastleClosure() {
        const closedCastles = this.grid.findClosedCastles();
        
        if (closedCastles.length > 0) {
            console.log(`🏰 ${closedCastles.length} château(x) fermé(s) détecté(s) !`);
            
            // Colorier TOUS les châteaux fermés
            closedCastles.forEach((castle, index) => {
                console.log(`🏰 Château ${index + 1}: Zone de ${castle.size} cellules`);
                this.highlightConstructibleArea(castle.area);
            });
            
            console.log('🎯 Zones constructibles colorées ! Continue à construire jusqu\'à la fin du timer.');
        }
    }

    highlightConstructibleArea(area) {
        // Marquer toutes les cellules de la zone comme constructibles
        area.forEach(({x, y}) => {
            const cell = this.grid.getCell(x, y);
            if (cell && cell.type === 'land') {
                // Ajouter une propriété pour marquer comme zone de canons
                cell.cannonZone = true;
            }
        });
        
        console.log(`🎯 Zone constructible mise en surbrillance: ${area.length} cellules`);
    }

    rotatePiece() {
        const player = this.players[this.currentPlayer];
        if (player.currentPiece) {
            player.currentPiece.rotate();
            console.log('🔄 Piece rotated');
        }
    }

    createStartingCastle() {
        const player = this.players[0];
        
        // Trouver une position sûre loin de l'eau (centre de la grille)
        let coreX = Math.floor(this.grid.width / 2);
        let coreY = Math.floor(this.grid.height / 2);
        
        // Vérifier qu'on est bien sur terre et loin de l'eau
        let attempts = 0;
        while (attempts < 10) {
            const safeArea = this.isSafeForCastle(coreX, coreY, 4); // Rayon de 4 pour château 7x7
            if (safeArea) break;
            
            // Essayer une autre position
            coreX = Math.floor(this.grid.width * 0.3 + Math.random() * this.grid.width * 0.4);
            coreY = Math.floor(this.grid.height * 0.3 + Math.random() * this.grid.height * 0.4);
            attempts++;
        }
        
        // Créer un château fermé 7x7 (contour seulement)
        for (let x = coreX - 3; x <= coreX + 3; x++) {
            for (let y = coreY - 3; y <= coreY + 3; y++) {
                // SEULEMENT les bords du carré (contour fermé)
                if (x === coreX - 3 || x === coreX + 3 || y === coreY - 3 || y === coreY + 3) {
                    this.grid.setCellType(x, y, 'wall', player.id);
                }
            }
        }
        
        // Placer le core DANS la zone fermée
        this.grid.setCellType(coreX, coreY, 'castle-core', player.id);
        player.castle.core = { x: coreX, y: coreY };
        
        console.log(`🏰 Château de base 7x7 créé avec core à (${coreX}, ${coreY})`);
        
        // Forcer la détection de fermeture
        this.checkCastleClosure();
    }
    
    isSafeForCastle(centerX, centerY, radius) {
        // Vérifier qu'il n'y a pas d'eau dans un rayon donné
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                if (!this.grid.isValidPosition(x, y)) return false;
                const cell = this.grid.getCell(x, y);
                if (cell.type === 'water') return false;
            }
        }
        return true;
    }

    startRepairPhase() {
        const player = this.players[this.currentPlayer];
        
        // Force generate a piece for repair phase
        player.currentPiece = this.pieceGenerator.generatePiece(player.id);
        
        // Set initial position to center of territory
        player.piecePosition = { 
            x: player.territory.startX + 5, 
            y: player.territory.startY + 5 
        };
        
        console.log(`🧱 Repair phase started - Piece: ${player.currentPiece.type} at (${player.piecePosition.x}, ${player.piecePosition.y})`);
        
        // Initialiser le timer visible
        this.repairTimeLeft = 15.0; // Timer de 15 secondes
        this.repairStartTime = Date.now();
        
        // Timer de 30 secondes pour la phase de réparation
        this.repairPhaseTimer = setTimeout(() => {
            console.log('⏰ Temps de réparation écoulé ! Transition vers placement des canons.');
            this.repairTimeLeft = 0;
            
            // Cacher la pièce courante
            const player = this.players[this.currentPlayer];
            player.currentPiece = null;
            player.piecePosition = null;
            
            this.gameState.transition('PLACE_CANNONS');
        }, 15000); // 15 secondes
        
        console.log('⏰ Timer de réparation : 15 secondes');
    }

    start() {
        this.uiManager.showMenu();
        this.uiManager.onStartSolo = () => this.startSoloGame();
        this.uiManager.onStartMulti = () => this.startMultiGame();
    }

    startSoloGame() {
        this.uiManager.hideMenu();
        
        // Setup state change callbacks
        this.gameState.onStateChange((newState, oldState) => {
            console.log(`🔄 State: ${oldState} → ${newState}`);
            
            if (oldState === 'REPAIR') {
                this.clearRepairTimer();
            }
            
            if (newState === 'REPAIR') {
                this.startRepairPhase();
            }
        });
        
        // Créer château de base fermé 7x7
        this.createStartingCastle();
        
        // Start directly in repair phase for testing
        this.gameState.transition('REPAIR');
        this.startRepairPhase();
        
        this.startGameLoop();
    }

    startMultiGame() {
        console.log('Multi-player not implemented yet');
    }

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
        
        // Mettre à jour le timer de réparation
        if (this.gameState.currentState === 'REPAIR' && this.repairStartTime) {
            const elapsed = (Date.now() - this.repairStartTime) / 1000;
            this.repairTimeLeft = Math.max(0, 30 - elapsed);
        }
        
        this.players.forEach(player => {
            player.update(deltaTime);
        });

        this.updateUI();
    }

    updateUI() {
        const player = this.players[this.currentPlayer];
        
        this.uiManager.updateScore(player.score);
        this.uiManager.updateLives(player.lives);
        this.uiManager.updateRound(this.gameState.round);
        this.uiManager.updatePhase(this.gameState.currentState, this.gameState.phaseTimeLeft);
        
        // Update piece preview
        if (this.gameState.currentState === 'REPAIR' && player.currentPiece) {
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

    render() {
        this.renderer.clear();
        this.renderer.renderGrid(this.grid);
        
        // Render hover indicators based on current state
        if (this.currentHoverPos) {
            if (this.gameState.currentState === 'REPAIR') {
                this.renderer.renderHoverIndicator(this.currentHoverPos);
            } else if (this.gameState.currentState === 'PLACE_CANNONS' && this.cannonPreviewPos) {
                this.renderCannonPreview(this.cannonPreviewPos);
            }
        }
        
        this.renderer.renderPlayers(this.players);
        
        // Timer très visible en phase REPAIR
        if (this.gameState.currentState === 'REPAIR' && this.repairTimeLeft !== undefined) {
            // Fond semi-transparent pour le timer
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(this.canvas.width / 2 - 100, 10, 200, 60);
            
            // Bordure
            this.ctx.strokeStyle = '#ff6b35';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(this.canvas.width / 2 - 100, 10, 200, 60);
            
            // Texte du timer
            this.ctx.fillStyle = this.repairTimeLeft <= 5 ? '#ff0000' : '#ffffff'; // Rouge si moins de 5s
            this.ctx.font = 'bold 32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${Math.ceil(this.repairTimeLeft)}s`, this.canvas.width / 2, 45);
            
            // Label
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText('RÉPARATION', this.canvas.width / 2, 62);
            
            // Reset text align
            this.ctx.textAlign = 'left';
        }
        
        // Indicateur de phase PLACE_CANNONS
        if (this.gameState.currentState === 'PLACE_CANNONS') {
            // Fond semi-transparent
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(this.canvas.width / 2 - 120, 10, 240, 50);
            
            // Bordure
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(this.canvas.width / 2 - 120, 10, 240, 50);
            
            // Texte
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PLACEMENT CANONS', this.canvas.width / 2, 40);
            
            // Instructions
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('Clic gauche: placer • Clic droit: supprimer', this.canvas.width / 2, 55);
            
            // Reset text align
            this.ctx.textAlign = 'left';
        }
        
        // Debug info
        if (this.gameState.currentState === 'REPAIR') {
            const player = this.players[this.currentPlayer];
            if (player.currentPiece) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.fillText(`Pièce: ${player.currentPiece.type}`, 10, 100);
                this.ctx.fillText(`État: ${this.gameState.currentState}`, 10, 120);
                this.ctx.fillText(`Pos: (${player.piecePosition.x}, ${player.piecePosition.y})`, 10, 140);
            }
        }
    }

    handleResize() {
        if (this.renderer) {
            this.renderer.handleResize();
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    pauseGame() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? '⏸️ Game paused' : '▶️ Game resumed');
    }

    renderCannonPreview(gridPos) {
        // Vérifier si on peut placer un canon à cette position
        const canPlace = this.canPlaceCannonAt(gridPos.x, gridPos.y);
        
        // Couleur de l'aperçu : vert si possible, rouge si impossible
        const previewColor = canPlace ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        
        // Dessiner l'aperçu 2x2
        this.ctx.fillStyle = previewColor;
        
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const screenPos = this.renderer.gridToScreen(gridPos.x + dx, gridPos.y + dy);
                this.ctx.fillRect(screenPos.x, screenPos.y, this.renderer.cellSize - 1, this.renderer.cellSize - 1);
            }
        }
        
        // Bordure pour mieux voir l'aperçu
        this.ctx.strokeStyle = canPlace ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = 2;
        const topLeftScreen = this.renderer.gridToScreen(gridPos.x, gridPos.y);
        this.ctx.strokeRect(topLeftScreen.x, topLeftScreen.y, this.renderer.cellSize * 2 - 1, this.renderer.cellSize * 2 - 1);
        
        // Symbole de canon au centre
        if (canPlace) {
            const centerScreen = this.renderer.gridToScreen(gridPos.x + 0.5, gridPos.y + 0.5);
            this.ctx.fillStyle = '#8b4513';
            this.ctx.fillRect(centerScreen.x - 4, centerScreen.y - 4, 8, 8);
            this.ctx.fillStyle = '#2c1810';
            this.ctx.fillRect(centerScreen.x - 2, centerScreen.y - 6, 4, 4);
        }
    }

    clearRepairTimer() {
        if (this.repairPhaseTimer) {
            clearTimeout(this.repairPhaseTimer);
            this.repairPhaseTimer = null;
            this.repairTimeLeft = undefined;
            this.repairStartTime = null;
            console.log('⏰ Timer de réparation annulé');
        }
    }

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