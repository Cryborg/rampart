import { GameState } from './GameState.js';
import { Grid } from './Grid.js';
import { Renderer } from '../ui/Renderer.js';
import { InputHandler } from '../ui/InputHandler.js';
import { Player } from './Player.js';
import { GAME_CONFIG } from '../config/GameConstants.js';
import { PieceGenerator } from './TetrisPieces.js';
import { CombatSystem } from './CombatSystem.js';
import { WaveManager } from './WaveManager.js';

export class GameManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.gameState = new GameState();
        this.grid = new Grid(GAME_CONFIG.GRID_WIDTH, GAME_CONFIG.GRID_HEIGHT);
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
        
        // Compteur pour la phase actuelle de placement de canons
        this.cannonsPlacedThisPhase = 0;
        this.maxCannonsThisPhase = 0;
        
        // Systèmes de combat et ennemis
        this.combatSystem = null;
        this.waveManager = null;
        this.gameMode = 'solo';
        
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
        this.initializeCombatSystems();
        
        console.log('🎮 GameManager initialized');
    }

    initializePlayers() {
        const player1 = new Player(1, 'Joueur 1', '#ff6b35', 'mouse');
        player1.territory = { startX: 0, startY: 0, width: 12, height: 12 };
        // Le core sera créé dans createTestCastle()
        
        this.players.push(player1);
        this.currentPlayer = 0;
    }

    /**
     * Initialiser plusieurs joueurs pour multijoueur local
     */
    initializeMultiPlayers(playerCount = 2, gameMode = '2players') {
        this.players = []; // Reset des joueurs
        this.gameMode = gameMode;
        
        const configs = [
            { name: 'Joueur 1', color: '#ff6b35', controlType: 'mouse' },
            { name: 'Joueur 2', color: '#004e89', controlType: 'keyboard_arrows' },
            { name: 'Joueur 3', color: '#2ecc71', controlType: 'keyboard_wasd' }
        ];

        for (let i = 0; i < Math.min(playerCount, 3); i++) {
            const config = configs[i];
            const player = new Player(i + 1, config.name, config.color, config.controlType);
            
            // Les territoires seront assignés dans setupLevel selon le mode
            this.players.push(player);
        }
        
        this.currentPlayer = 0;
        
        // Configurer GameState en mode multijoueur
        this.gameState.setMultiplayerMode(playerCount);
        
        console.log(`👥 ${playerCount} joueurs initialisés en mode ${gameMode}`);
    }

    /**
     * Passer au joueur suivant (rotation des tours)
     */
    nextPlayer() {
        const previousPlayer = this.currentPlayer;
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        
        console.log(`🔄 Tour: Joueur ${previousPlayer + 1} → Joueur ${this.currentPlayer + 1}`);
        
        // Émettre un événement pour l'UI
        this.onPlayerChanged?.(this.currentPlayer, previousPlayer);
        
        return this.currentPlayer;
    }

    /**
     * Obtenir le joueur actuel
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayer];
    }

    /**
     * Obtenir un joueur par ID
     */
    getPlayerById(id) {
        return this.players.find(p => p.id === id);
    }

    /**
     * Vérifier si tous les joueurs ont terminé leur tour (pour phases séquentielles)
     */
    allPlayersFinishedTurn() {
        // Cette méthode sera utilisée pour les phases séquentielles
        return this.players.every(player => player.turnFinished === true);
    }

    /**
     * Réinitialiser les tours de tous les joueurs
     */
    resetAllPlayerTurns() {
        this.players.forEach(player => {
            player.turnFinished = false;
        });
    }

    initializeCombatSystems() {
        // Initialiser le système de combat
        this.combatSystem = new CombatSystem(this);
        
        // Initialiser le gestionnaire de vagues
        this.waveManager = new WaveManager(this);
        
        console.log('⚔️ Systèmes de combat initialisés');
    }

    setupDefaultLevel(mode = 'solo') {
        this.gameMode = mode;
        this.grid.generateTerrain(mode);
        this.createStartingCastles(mode);
    }

    // Ancienne méthode supprimée - on utilise maintenant celle ligne 317

    setupInputHandlers() {
        this.inputHandler.onMouseMove = (x, y) => {
            // La souris est gérée par le joueur actuel (ou joueur souris en multijoueur)
            this.handleMouseMove(x, y);
        };

        this.inputHandler.onMouseClick = (x, y, button) => {
            // La souris est gérée par le joueur actuel (ou joueur souris en multijoueur)
            this.handleMouseClick(x, y, button);
        };

        this.inputHandler.onKeyPress = (key) => {
            this.handleKeyPress(key);
        };
        
        this.inputHandler.onKeyDown = (key) => {
            // Distribuer les inputs clavier aux bons joueurs
            this.distributeKeyboardInput(key);
        };
    }

    /**
     * Distribuer les inputs clavier aux joueurs appropriés
     */
    distributeKeyboardInput(keyCode) {
        // D'abord gérer les touches globales
        if (this.handleGlobalKeys(keyCode)) {
            return; // Touche globale gérée
        }

        // Trouver le joueur qui possède cette touche
        const targetPlayer = this.players.find(player => player.ownsKey(keyCode));
        
        if (targetPlayer) {
            const action = targetPlayer.getActionForKey(keyCode);
            
            // En mode multijoueur, vérifier si c'est le tour de ce joueur pour certaines actions
            if (this.players.length > 1) {
                if (this.isPlayerActionAllowed(targetPlayer, action)) {
                    this.handlePlayerKeyboardAction(targetPlayer, action, keyCode);
                }
            } else {
                // Mode solo : laisser passer toutes les actions
                this.handlePlayerKeyboardAction(targetPlayer, action, keyCode);
            }
        } else {
            // Fallback : si aucun joueur ne possède cette touche, l'envoyer au joueur actuel
            this.handleKeyDown(keyCode);
        }
    }

    /**
     * Gérer les touches globales (pause, debug, etc.)
     */
    handleGlobalKeys(keyCode) {
        switch (keyCode) {
            case 'Escape':
                // Pause globale (sauf si un joueur l'utilise pour annuler)
                if (!this.players.some(p => p.ownsKey(keyCode))) {
                    this.togglePause();
                    return true;
                }
                break;
            case 'F1':
                // Debug toggle
                this.toggleDebugMode();
                return true;
        }
        return false;
    }

    /**
     * Vérifier si un joueur peut effectuer une action selon le mode de jeu
     */
    isPlayerActionAllowed(player, action) {
        // En mode multijoueur simultané (combat) : toutes les actions autorisées
        if (this.gameState.currentState === 'COMBAT') {
            return true;
        }
        
        // En phases séquentielles : seul le joueur actuel peut agir
        if (this.gameState.currentState === 'PLACE_CANNONS' || this.gameState.currentState === 'REPAIR') {
            return player.id === this.getCurrentPlayer().id;
        }
        
        return true;
    }

    /**
     * Gérer l'action clavier d'un joueur spécifique
     */
    handlePlayerKeyboardAction(player, action, keyCode) {
        console.log(`⌨️ Joueur ${player.id} - Action: ${action} (${keyCode})`);
        
        switch (action) {
            case 'up':
            case 'down':
            case 'left':
            case 'right':
                this.handlePlayerMovement(player, action);
                break;
            case 'action':
                this.handlePlayerAction(player);
                break;
            case 'rotate':
                this.handlePlayerRotate(player);
                break;
            case 'cancel':
                this.handlePlayerCancel(player);
                break;
        }
    }

    /**
     * Gérer le mouvement d'un joueur (pour les pièces en mode REPAIR)
     */
    handlePlayerMovement(player, direction) {
        if (this.gameState.currentState !== 'REPAIR' || !player.currentPiece) return;
        
        const moveAmount = 1;
        switch (direction) {
            case 'up':
                player.piecePosition.y = Math.max(0, player.piecePosition.y - moveAmount);
                break;
            case 'down':
                player.piecePosition.y = Math.min(this.grid.height - 1, player.piecePosition.y + moveAmount);
                break;
            case 'left':
                player.piecePosition.x = Math.max(0, player.piecePosition.x - moveAmount);
                break;
            case 'right':
                player.piecePosition.x = Math.min(this.grid.width - 1, player.piecePosition.x + moveAmount);
                break;
        }
    }

    /**
     * Gérer l'action principale d'un joueur
     */
    handlePlayerAction(player) {
        if (this.gameState.currentState === 'PLACE_CANNONS') {
            // Placer un canon à la position actuelle
            // TODO: Implémenter placement canon au clavier
        } else if (this.gameState.currentState === 'REPAIR' && player.currentPiece) {
            // Placer la pièce actuelle
            const pieceX = player.piecePosition.x;
            const pieceY = player.piecePosition.y;
            
            if (this.grid.canPlacePiece(player.currentPiece, pieceX, pieceY, this)) {
                this.grid.placePiece(player.currentPiece, pieceX, pieceY, player.id);
                player.stats.piecesPlaced++;
                
                // Vérifier fermeture château et revalider canons
                this.checkCastleClosure();
                this.validatePlayerCannons();
                
                // Prendre une nouvelle pièce
                player.currentPiece = this.pieceGenerator.getRandomPiece();
                console.log(`🧩 ${player.name} place une pièce et en prend une nouvelle`);
            }
        }
    }

    /**
     * Gérer la rotation pour un joueur
     */
    handlePlayerRotate(player) {
        if (this.gameState.currentState === 'REPAIR' && player.currentPiece) {
            player.currentPiece.rotate();
            console.log(`🔄 ${player.name} fait tourner sa pièce`);
        }
    }

    /**
     * Gérer l'annulation pour un joueur
     */
    handlePlayerCancel(player) {
        // En phases séquentielles, permettre de terminer le tour
        if (this.gameState.isSequentialPhase && player.id === this.getCurrentPlayer().id + 1) {
            this.finishPlayerTurn(player);
        } else {
            console.log(`❌ ${player.name} annule`);
        }
    }

    /**
     * Terminer le tour d'un joueur
     */
    finishPlayerTurn(player) {
        if (!this.gameState.isSequentialPhase) return;
        
        const playerId = player.id - 1; // Convertir en index (base 0)
        console.log(`✅ ${player.name} termine son tour`);
        
        // Marquer le joueur comme ayant terminé dans Player
        player.turnFinished = true;
        
        // Notifier GameState
        this.gameState.finishCurrentPlayerTurn(playerId);
    }

    /**
     * Vérifier si le joueur actuel peut effectuer une action
     */
    canCurrentPlayerAct() {
        const currentPlayer = this.getCurrentPlayer();
        return this.gameState.canPlayerAct(currentPlayer.id - 1);
    }

    handleMouseMove(canvasX, canvasY) {
        // On reçoit directement les coordonnées canvas depuis InputHandler
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
                
            }
        }
        
        // Update cannon preview during cannon placement phase
        if (this.gameState.currentState === 'PLACE_CANNONS') {
            // Store cannon preview position
            this.cannonPreviewPos = gridPos;
        }
        
        // Stocker la position exacte de la souris pour la croix de visée en combat (libre)
        if (this.gameState.currentState === 'COMBAT') {
            this.combatCrosshairScreenPos = { x: canvasX, y: canvasY };
            this.combatCrosshairGridPos = gridPos; // Position de grille pour le tir
        }
    }

    handleMouseClick(x, y, button) {
        const gridPos = this.renderer.screenToGrid(x, y);
        
        switch (this.gameState.currentState) {
            case 'SELECT_TERRITORY':
                this.handleTerritorySelection(gridPos);
                break;
            case 'PLACE_CANNONS':
                this.handleCannonPlacement(gridPos, button);
                break;
            case 'COMBAT':
                this.handleCombatClick(gridPos, button);
                break;
            case 'REPAIR':
                this.handlePiecePlacement(gridPos, button);
                break;
            default:
                console.log(`⚠️ No handler for state: ${this.gameState.currentState}`);
        }
    }

    handleCombatClick(gridPos, button) {
        if (!this.combatSystem) return;
        
        if (button === 0) { // Clic gauche
            // Tir direct vers la case cliquée
            const player = this.players[this.currentPlayer];
            this.combatSystem.handleCannonClick(gridPos.x, gridPos.y, player.id);
        } else if (button === 2) { // Clic droit
            this.combatSystem.handleRightClick();
        }
    }

    handleKeyPress(key) {
        console.log(`🔧 Touche pressée: "${key}"`); // Debug
        switch (key) {
            case ' ':
            case 'r':
                if (this.gameState.currentState === 'REPAIR') {
                    this.rotatePiece();
                }
                break;
        }
    }
    
    handleKeyDown(key) {
        console.log(`🔧 Touche keydown: "${key}"`); // Debug
        switch (key) {
            case 'Escape':
                this.pauseGame();
                break;
            case 'Enter':
            case 'NumpadEnter':
                if (this.gameState.currentState === 'PLACE_CANNONS') {
                    console.log('⏩ Passage forcé au combat (Entrée pressée)');
                    this.gameState.transition('COMBAT');
                }
                break;
        }
    }

    handleTerritorySelection(gridPos) {
        console.log('Territory selection at:', gridPos);
        this.gameState.transition('PLACE_CANNONS');
    }

    handleCannonPlacement(gridPos, button) {
        // Vérifier si le joueur peut agir
        if (!this.canCurrentPlayerAct()) {
            console.log(`❌ Ce n'est pas le tour du joueur ${this.currentPlayer + 1}`);
            return;
        }
        
        if (button === 0) { // Left click - placer un canon
            if (this.canPlaceCannonAt(gridPos.x, gridPos.y)) {
                if (this.grid.placeCannon(gridPos.x, gridPos.y, this.players[this.currentPlayer].id)) {
                    console.log(`🎯 Canon placé à (${gridPos.x}, ${gridPos.y})`);
                    
                    // Ajouter à la liste des canons du joueur
                    const newCannon = {
                        x: gridPos.x,
                        y: gridPos.y,
                        firing: false,
                        canFire: true
                    };
                    this.players[this.currentPlayer].cannons.push(newCannon);
                    console.log(`🎯 Canon ajouté à la liste du joueur ${this.currentPlayer}: (${gridPos.x}, ${gridPos.y}). Total: ${this.players[this.currentPlayer].cannons.length}`);
                    
                    // Incrémenter le compteur de cette phase
                    this.cannonsPlacedThisPhase++;
                    console.log(`🎯 Canon ${this.cannonsPlacedThisPhase}/${this.maxCannonsThisPhase} placé dans cette phase`);
                    
                    // Vérifier si plus de canons à placer pour ce joueur
                    const cannonsToPlace = this.calculateCannonsToPlace();
                    if (cannonsToPlace <= 0) {
                        console.log(`🎯 Joueur ${this.currentPlayer + 1} a terminé de placer ses canons`);
                        
                        // En multijoueur, terminer automatiquement le tour
                        if (this.gameState.isMultiplayer) {
                            setTimeout(() => {
                                this.finishPlayerTurn(this.getCurrentPlayer());
                            }, 500);
                        } else {
                            // En solo, transition directe au combat
                            setTimeout(() => {
                                this.gameState.transition('COMBAT');
                            }, 1000);
                        }
                    }
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
        // Validation des coordonnées dans les limites de la grille
        if (x < 0 || y < 0 || x >= GAME_CONFIG.GRID_WIDTH - 1 || y >= GAME_CONFIG.GRID_HEIGHT - 1) {
            return false;
        }
        
        // Vérifier s'il reste des canons à placer
        const cannonsToPlace = this.calculateCannonsToPlace();
        if (cannonsToPlace <= 0) {
            return false;
        }
        
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

    calculateCannonsToPlace() {
        // Retourner combien il reste à placer dans cette phase
        return Math.max(0, this.maxCannonsThisPhase - this.cannonsPlacedThisPhase);
    }
    
    calculateMaxCannonsForPhase() {
        // Compter SEULEMENT les cases dorées LIBRES (pas occupées par des canons)
        let freeGoldenCells = 0;
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const cell = this.grid.getCell(x, y);
                // Case dorée ET libre (pas un canon)
                if (cell && cell.cannonZone && cell.type === 'land') {
                    freeGoldenCells++;
                }
            }
        }
        
        // Formule Rampart : floor(40% * (cases_dorées_libres / 4))
        const maxCannons = Math.floor(GAME_CONFIG.GAMEPLAY.CANNON_RATIO * (freeGoldenCells / 4));
        
        console.log(`🎯 Cases dorées libres: ${freeGoldenCells}, Max canons cette phase: ${maxCannons}`);
        return Math.max(GAME_CONFIG.GAMEPLAY.MIN_CANNONS, maxCannons);
    }

    destroyCannon(player, cannonIndex) {
        // Méthode pour détruire un canon spécifique (sera utilisée durant le combat)
        const cannon = player.cannons[cannonIndex];
        if (!cannon) return;
        
        // Supprimer le canon de la grille
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const cell = this.grid.getCell(cannon.x + dx, cannon.y + dy);
                if (cell && cell.type === 'cannon') {
                    this.grid.setCellType(cannon.x + dx, cannon.y + dy, 'destroyed');
                    // Retirer le marquage cannonZone car c'est détruit
                    cell.cannonZone = false;
                }
            }
        }
        
        // Supprimer de la liste du joueur
        player.cannons.splice(cannonIndex, 1);
        
        console.log(`💥 Canon à (${cannon.x}, ${cannon.y}) détruit !`);
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
                
                // Décrémenter le compteur de cette phase
                this.cannonsPlacedThisPhase = Math.max(0, this.cannonsPlacedThisPhase - 1);
                console.log(`🗑️ Canon supprimé à (${cannon.x}, ${cannon.y}) - ${this.cannonsPlacedThisPhase}/${this.maxCannonsThisPhase}`);
                return;
            }
        }
        
        console.log(`❌ Aucun canon trouvé à (${x}, ${y})`);
    }

    handlePiecePlacement(gridPos, button) {
        // Vérifier si le joueur peut agir
        if (!this.canCurrentPlayerAct()) {
            console.log(`❌ Ce n'est pas le tour du joueur ${this.currentPlayer + 1} (REPAIR)`);
            return;
        }
        
        const player = this.players[this.currentPlayer];
        
        if (button === 0) { // Left click - place piece
            if (player.currentPiece) {
                // Use the piece position, not the click position
                const pieceX = player.piecePosition.x;
                const pieceY = player.piecePosition.y;
                
                if (this.grid.canPlacePiece(player.currentPiece, pieceX, pieceY, this)) {
                    this.grid.placePiece(player.currentPiece, pieceX, pieceY, player.id);
                    player.stats.piecesPlaced++;
                    
                    // Check if castle is now closed and update cannon zones
                    this.checkCastleClosure();
                    
                    // CORRECTION: Après reconstruction, vérifier quels canons peuvent à nouveau tirer
                    this.validatePlayerCannons();
                    
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

    /**
     * CORRECTION: Marque les canons comme utilisables/inutilisables selon leur zone,
     * mais ne les supprime JAMAIS de la liste (sauf s'ils sont vraiment détruits)
     */
    validatePlayerCannons() {
        this.players.forEach(player => {
            const stats = this.validateSinglePlayerCannons(player);
            this.logCannonValidationResults(player, stats);
        });
    }
    
    /**
     * Valide les canons d'un seul joueur
     */
    validateSinglePlayerCannons(player) {
        let activeCount = 0;
        let inactiveCount = 0;
        
        console.log(`🔍 DEBUG: Validation canons joueur ${player.id} - ${player.cannons.length} canons à vérifier`);
        
        player.cannons.forEach((cannon, i) => {
            const validation = this.checkCannonInClosedZone(cannon);
            cannon.canFire = validation.inClosedZone;
            
            if (validation.inClosedZone) {
                activeCount++;
            } else {
                inactiveCount++;
            }
            
            console.log(`  Canon ${i} (${cannon.x},${cannon.y}): canFire=${cannon.canFire} (${validation.cannonZoneCells}/4 cellules)`);
        });
        
        return { activeCount, inactiveCount, totalCount: player.cannons.length };
    }
    
    /**
     * Vérifie si un canon 2x2 est dans une zone fermée
     */
    checkCannonInClosedZone(cannon) {
        let inClosedZone = true;
        let cannonZoneCells = 0;
        
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const cell = this.grid.getCell(cannon.x + dx, cannon.y + dy);
                if (!cell) {
                    inClosedZone = false;
                    break;
                }
                if (cell.cannonZone) {
                    cannonZoneCells++;
                }
                if (!cell.cannonZone) {
                    inClosedZone = false;
                }
            }
            if (!inClosedZone) break;
        }
        
        return { inClosedZone, cannonZoneCells };
    }
    
    /**
     * Log les résultats de validation des canons
     */
    logCannonValidationResults(player, stats) {
        console.log(`🎯 Joueur ${player.id}: ${stats.activeCount} canons actifs, ${stats.inactiveCount} inactifs (total: ${stats.totalCount})`);
        
        if (stats.inactiveCount > 0) {
            console.log(`⚠️ ${stats.inactiveCount} canon(s) temporairement désactivé(s) - répare ton château !`);
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
            
            // Réactiver les canons qui sont maintenant dans des zones fermées
            this.validatePlayerCannons();
        } else {
            // Pas de zones fermées, mais on validate quand même pour être sûr
            this.validatePlayerCannons();
        }
    }

    highlightConstructibleArea(area) {
        // Marquer toutes les cellules de la zone comme constructibles
        area.forEach(({x, y}) => {
            const cell = this.grid.getCell(x, y);
            // Inclure: terre libre, canons existants, château, et cellules détruites
            if (cell && (cell.type === 'land' || cell.type === 'cannon' || cell.type === 'castle-core' || cell.type === 'destroyed')) {
                // Ajouter une propriété pour marquer comme zone de canons
                // Important: inclure TOUS les types de cellules dans les zones fermées !
                cell.cannonZone = true;
            }
        });
        
        console.log(`🎯 Zone constructible mise en surbrillance: ${area.length} cellules`);
    }

    recalculateCannonZones() {
        console.log('🔄 Recalcul des zones fermées après combat/destruction...');
        
        // Effacer TOUTES les zones canons existantes
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell) {
                    cell.cannonZone = false;
                }
            }
        }
        
        // Recalculer les châteaux fermés
        const closedCastles = this.grid.findClosedCastles();
        
        if (closedCastles.length > 0) {
            console.log(`🏰 ${closedCastles.length} château(x) fermé(s) détecté(s) après recalcul`);
            
            // Remarquer les zones fermées
            closedCastles.forEach((castle, index) => {
                console.log(`🏰 Château ${index + 1}: Zone de ${castle.size} cellules (recalculé)`);
                this.highlightConstructibleArea(castle.area);
            });
        } else {
            console.log('🏚️ Aucun château fermé détecté - tous les châteaux ont été ouverts !');
        }
        
        // CRUCIAL : Valider les canons selon les nouvelles zones fermées
        // Ceci se fait APRÈS le recalcul, donc on connaît les vraies zones ouvertes
        this.validatePlayerCannons();
    }


    rotatePiece() {
        const player = this.players[this.currentPlayer];
        if (player.currentPiece) {
            player.currentPiece.rotate();
            console.log('🔄 Piece rotated');
        }
    }

    createStartingCastles(mode = 'solo') {
        const positions = this.grid.getOptimalCastlePositions(mode, this.players.length);
        
        for (let i = 0; i < positions.length && i < this.players.length; i++) {
            const position = positions[i];
            const player = this.players[i];
            
            this.createCastleAt(position.x, position.y, player);
        }
        
        // Forcer la détection de fermeture pour tous les châteaux
        this.checkCastleClosure();
    }

    createCastleAt(coreX, coreY, player) {
        // Vérifier qu'on est bien sur terre et loin de l'eau
        let attempts = 0;
        while (attempts < 10) {
            const safeArea = this.isSafeForCastle(coreX, coreY, GAME_CONFIG.SIZES.SAFETY_RADIUS);
            if (safeArea) break;
            
            // Essayer une position proche
            coreX += (Math.random() - 0.5) * 4;
            coreY += (Math.random() - 0.5) * 4;
            coreX = Math.max(3, Math.min(this.grid.width - 4, coreX));
            coreY = Math.max(3, Math.min(this.grid.height - 4, coreY));
            attempts++;
        }
        
        // Créer un château fermé avec constante (contour seulement)
        const halfSize = Math.floor(GAME_CONFIG.SIZES.CASTLE_SIZE / 2);
        for (let x = coreX - halfSize; x <= coreX + halfSize; x++) {
            for (let y = coreY - halfSize; y <= coreY + halfSize; y++) {
                // SEULEMENT les bords du carré (contour fermé)
                if (x === coreX - halfSize || x === coreX + halfSize || y === coreY - halfSize || y === coreY + halfSize) {
                    this.grid.setCellType(x, y, 'wall', player.id);
                }
            }
        }
        
        // Placer le core DANS la zone fermée
        this.grid.setCellType(coreX, coreY, 'castle-core', player.id);
        player.castle.core = { x: coreX, y: coreY };
        
        console.log(`🏰 Château joueur ${player.id} créé ${GAME_CONFIG.SIZES.CASTLE_SIZE}x${GAME_CONFIG.SIZES.CASTLE_SIZE} avec core à (${coreX}, ${coreY})`);
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
        console.log('🧱 Phase de réparation démarrée');
        
        // CRUCIAL : Recalculer les zones fermées MAINTENANT que le combat est fini
        console.log('🔄 Recalcul post-combat des zones fermées (début réparation)...');
        this.recalculateCannonZones();
        
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
        this.repairTimeLeft = GAME_CONFIG.TIMERS.REPAIR_PHASE / 1000; // En secondes
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
        }, GAME_CONFIG.TIMERS.REPAIR_PHASE);
        
        console.log('⏰ Timer de réparation : 15 secondes');
    }

    startCannonPlacementPhase() {
        console.log('🎯 Phase placement des canons démarrée');
        
        // Les zones fermées ont déjà été recalculées à la fin du combat
        
        // RÉGÉNÉRER LES HP DE TOUS LES CANONS DU JOUEUR
        const player = this.players[this.currentPlayer];
        this.grid.regenerateCannonHealth(player.id);
        
        // Le cleanup des canons se fait maintenant à la fin du combat et à chaque pose de pièce
        
        // Réinitialiser le compteur de cette phase
        this.cannonsPlacedThisPhase = 0;
        this.maxCannonsThisPhase = this.calculateMaxCannonsForPhase();
        
        const currentCannons = player.cannons.length;
        
        // Les canons restent en place ! Ils ne sont supprimés qu'au combat s'ils sont détruits
        console.log(`🎯 Canons actuels: ${currentCannons}, Max cette phase: ${this.maxCannonsThisPhase}`);
        
        // Si aucun canon à placer, transition automatique après un délai
        if (this.maxCannonsThisPhase <= 0) {
            console.log(`🎯 Aucun canon à placer. Transition automatique vers combat dans 2s.`);
            setTimeout(() => {
                this.gameState.transition('COMBAT');
            }, 2000);
        }
        
        // TODO: Ajouter timer optionnel pour cette phase si nécessaire
    }

    startCombatPhase() {
        console.log('⚔️ Phase de combat démarrée');
        
        // Debug: lister tous les canons des joueurs
        this.players.forEach((player, idx) => {
            console.log(`👤 Joueur ${player.id} - ${player.cannons.length} canons:`, 
                player.cannons.map(c => `(${c.x},${c.y})`).join(', '));
        });
        
        if (this.waveManager) {
            // Démarrer une nouvelle vague d'ennemis
            this.waveManager.startWave();
        } else {
            console.warn('⚠️ WaveManager non initialisé, combat simulé');
            // Fallback: transition automatique après 10 secondes
            setTimeout(() => {
                console.log('⚔️ Combat simulé terminé ! Transition vers réparation.');
                this.gameState.transition('REPAIR');
            }, 10000);
        }
    }

    onWaveEnd(waveNumber, stats) {
        console.log(`🌊 Fin de vague ${waveNumber}:`, stats);
        
        // Le recalcul des zones se fera automatiquement dans startRepairPhase()
        
        // Transition vers la réparation après un délai
        setTimeout(() => {
            console.log('⚔️ Combat terminé ! Transition vers réparation.');
            this.gameState.transition('REPAIR');
        }, 2000); // 2 secondes de pause
    }

    onGameEnd(winner) {
        console.log(`🏆 Fin de partie - Vainqueur:`, winner);
        
        // Transition vers l'écran de fin
        // TODO: Implémenter écran de fin de partie
        this.gameState.transition('GAME_OVER');
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
            
            // Recalcul des zones fermées déplacé vers startRepairPhase() pour éviter la régression
            
            if (newState === 'REPAIR') {
                this.startRepairPhase();
                // Cacher le curseur pendant la réparation
                this.renderer.setCursorVisibility(false);
            }
            
            if (newState === 'COMBAT') {
                this.startCombatPhase();
                // Montrer le curseur pendant le combat (visée)
                this.renderer.setCursorVisibility(true);
            }
            
            if (newState === 'PLACE_CANNONS') {
                this.startCannonPlacementPhase();
                // Cacher le curseur pendant le placement des canons
                this.renderer.setCursorVisibility(false);
            }
        });

        // Setup callback for player turn changes (multiplayer)
        this.gameState.onPlayerTurnChange((currentPlayer, previousPlayer) => {
            console.log(`👥 Tour: Joueur ${previousPlayer + 1} → Joueur ${currentPlayer + 1}`);
            
            // Synchroniser avec le currentPlayer du GameManager
            this.currentPlayer = currentPlayer;
            
            // Callback optional pour l'UI
            this.onPlayerChanged?.(currentPlayer, previousPlayer);
        });
        
        // Château déjà créé dans setupDefaultLevel()
        
        // Commencer par la phase de placement des canons (ordre Rampart officiel)
        this.gameState.transition('PLACE_CANNONS');
        
        this.startGameLoop();
    }

    startMultiGame() {
        // Lire la configuration des joueurs depuis l'UI
        const playerConfig = this.uiManager.getControlsConfiguration();
        
        // Compter les joueurs actifs
        let activePlayers = 1; // Joueur 1 toujours actif
        if (playerConfig.player2?.active) activePlayers++;
        if (playerConfig.player3?.active) activePlayers++;
        
        console.log(`🎮 Démarrage du jeu multijoueur avec ${activePlayers} joueurs`);
        
        // Arrêter la boucle actuelle si elle existe
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        // Réinitialiser le jeu
        this.reset();
        
        // Initialiser le mode multijoueur avec la config de l'UI
        this.initializeMultiPlayersFromConfig(playerConfig, activePlayers);
        
        // Configurer le niveau multijoueur
        const gameMode = activePlayers === 2 ? '2players' : '3players';
        this.setupDefaultLevel(gameMode);
        
        // Démarrer le jeu
        this.startGameLoop();
        
        console.log('✅ Jeu multijoueur démarré !');
    }

    /**
     * Initialiser les joueurs multiples depuis la configuration UI
     */
    initializeMultiPlayersFromConfig(config, playerCount) {
        this.players = []; // Reset des joueurs
        this.gameMode = playerCount === 2 ? '2players' : '3players';
        
        // Toujours créer le joueur 1
        const player1 = new Player(1, 'Joueur 1', '#ff6b35', config.player1?.control || 'mouse');
        this.players.push(player1);
        
        // Créer le joueur 2 si actif
        if (config.player2?.active && playerCount >= 2) {
            const player2 = new Player(2, 'Joueur 2', '#004e89', config.player2?.control || 'keyboard_arrows');
            this.players.push(player2);
        }
        
        // Créer le joueur 3 si actif
        if (config.player3?.active && playerCount >= 3) {
            const player3 = new Player(3, 'Joueur 3', '#2ecc71', config.player3?.control || 'keyboard_wasd');
            this.players.push(player3);
        }
        
        this.currentPlayer = 0;
        
        // Configurer GameState en mode multijoueur
        this.gameState.setMultiplayerMode(this.players.length);
        
        console.log(`👥 ${this.players.length} joueurs initialisés depuis la configuration UI`);
        this.players.forEach((player, i) => {
            console.log(`  Joueur ${i+1}: ${player.name} (${player.controlType})`);
        });
    }

    /**
     * Réinitialiser le jeu pour un nouveau démarrage
     */
    reset() {
        // Arrêter les systèmes existants
        if (this.waveManager) {
            this.waveManager.destroy();
        }
        if (this.combatSystem) {
            this.combatSystem.destroy();
        }
        
        // Réinitialiser les variables
        this.players = [];
        this.currentPlayer = 0;
        this.gameState.currentState = 'MENU';
        
        console.log('🔄 Jeu réinitialisé');
    }

    startGameLoop() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }

        this.lastFrameTime = performance.now(); // Initialiser correctement

        const loop = (currentTime) => {
            if (!this.isPaused) {
                const deltaTime = currentTime - this.lastFrameTime;
                // Limiter le deltaTime pour éviter les gros sauts
                const clampedDeltaTime = Math.min(deltaTime, 50); // Max 50ms par frame
                this.update(clampedDeltaTime);
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
            this.repairTimeLeft = Math.max(0, GAME_CONFIG.TIMERS.REPAIR_PHASE / 1000 - elapsed);
        }
        
        // Mettre à jour les systèmes de combat
        if (this.combatSystem) {
            this.combatSystem.update(deltaTime);
        }
        
        if (this.waveManager) {
            this.waveManager.update(deltaTime);
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
        
        // Mettre à jour les infos de vague
        if (this.waveManager) {
            const waveStatus = this.waveManager.getWaveStatus();
            this.uiManager.updateWaveInfo({
                currentWave: waveStatus.currentWave,
                timeRemaining: waveStatus.timeRemaining,
                enemyShips: waveStatus.enemyCount,
                landUnits: this.waveManager.landUnits ? this.waveManager.landUnits.length : 0
            });
        }
        
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
        
        // Rendre l'interface multijoueur si plusieurs joueurs
        if (this.players.length > 1) {
            this.renderer.renderMultiPlayerStats(this.players, this.currentPlayer, this.gameState);
            this.renderer.renderCurrentPlayerIndicator(this.currentPlayer, this.players);
        }
        
        // Rendre les systèmes de combat
        if (this.combatSystem && this.gameState.currentState === 'COMBAT') {
            this.combatSystem.render(this.ctx, this.renderer);
            
            // Afficher la croix de visée
            this.renderCombatCrosshair();
        }
        
        if (this.waveManager) {
            this.waveManager.render(this.ctx, this.renderer);
        }
        
        // Timer très visible en phase REPAIR
        if (this.gameState.currentState === 'REPAIR' && this.repairTimeLeft !== undefined) {
            // Positionnement à droite
            const uiX = this.canvas.width - 220;
            const uiY = 10;
            
            // Fond semi-transparent pour le timer
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(uiX, uiY, 200, 60);
            
            // Bordure
            this.ctx.strokeStyle = '#ff6b35';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(uiX, uiY, 200, 60);
            
            // Texte du timer
            this.ctx.fillStyle = this.repairTimeLeft <= 5 ? '#ff0000' : '#ffffff'; // Rouge si moins de 5s
            this.ctx.font = 'bold 32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${Math.ceil(this.repairTimeLeft)}s`, uiX + 100, uiY + 35);
            
            // Label
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText('RÉPARATION', uiX + 100, uiY + 52);
            
            // Reset text align
            this.ctx.textAlign = 'left';
        }
        
        // Indicateur de phase PLACE_CANNONS
        if (this.gameState.currentState === 'PLACE_CANNONS') {
            const player = this.players[this.currentPlayer];
            const cannonsToPlace = this.calculateCannonsToPlace();
            const currentCannons = player.cannons.length;
            
            // Positionnement à droite
            const uiX = this.canvas.width - 300;
            const uiY = 10;
            
            // Fond semi-transparent
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(uiX, uiY, 280, 70);
            
            // Bordure
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(uiX, uiY, 280, 70);
            
            // Texte principal
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PLACEMENT CANONS', uiX + 140, uiY + 25);
            
            // Compteur de canons à placer
            const cannonCountColor = cannonsToPlace === 0 ? '#ff0000' : '#00ff00';
            this.ctx.fillStyle = cannonCountColor;
            this.ctx.font = 'bold 16px Arial';
            if (cannonsToPlace > 0) {
                this.ctx.fillText(`${cannonsToPlace} canons à placer`, uiX + 140, uiY + 45);
            } else {
                this.ctx.fillText(`Aucun canon à placer`, uiX + 140, uiY + 45);
            }
            
            // Instructions
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.fillText('Clic gauche: placer • Clic droit: supprimer • Entrée: combat', uiX + 140, uiY + 60);
            
            // Reset text align
            this.ctx.textAlign = 'left';
        }
        
        // Plus d'indicateur de phase COMBAT dans le canvas - maintenant dans l'UI à droite
        
    }

    renderCombatCrosshair() {
        if (!this.combatCrosshairScreenPos) return;
        
        // Utiliser directement les coordonnées écran pour un viseur libre
        const screenPos = this.combatCrosshairScreenPos;
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        // Croix de visée simple
        const size = 8;
        this.ctx.moveTo(screenPos.x - size, screenPos.y);
        this.ctx.lineTo(screenPos.x + size, screenPos.y);
        this.ctx.moveTo(screenPos.x, screenPos.y - size);
        this.ctx.lineTo(screenPos.x, screenPos.y + size);
        
        this.ctx.stroke();
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
        // Calculer le nombre de canons restants pour cette phase
        const cannonsLeft = this.maxCannonsThisPhase - this.cannonsPlacedThisPhase;
        
        // Déléguer au renderer pour utiliser le bon contexte et les bons offsets
        this.renderer.renderCannonPreview(gridPos, (x, y) => this.canPlaceCannonAt(x, y), cannonsLeft);
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

    /**
     * Méthode de test pour initialiser rapidement un mode 2 joueurs
     */
    initTest2Players() {
        console.log('🎮 Initialisation test 2 joueurs');
        
        // Initialiser les joueurs multiples
        this.initializeMultiPlayers(2, '2players');
        
        // Configurer le terrain 2 joueurs
        this.setupDefaultLevel('2players');
        
        // Démarrer directement en phase canons
        this.gameState.transition('PLACE_CANNONS');
        
        console.log('✅ Test 2 joueurs prêt !');
    }
}