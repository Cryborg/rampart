import { GAME_CONFIG } from '../config/GameConstants.js';
import { MultiplayerGrid } from './MultiplayerGrid.js';
import { Renderer } from '../ui/Renderer.js';

export class MultiplayerGameManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.grid = new MultiplayerGrid();
        
        // État du jeu
        this.currentState = GAME_CONFIG.GAME_STATES.MENU;
        this.gameMode = 'multiplayer2';
        this.currentRound = 1;
        this.isGameRunning = false;
        this.isPaused = false;
        
        // Gestion multijoueur simultané
        this.activePlayer = null; // Joueur actuellement actif pour le preview (souris ou clavier)
        this.lastActiveDevice = 'mouse'; // Pour déterminer quel joueur a le preview
        
        // Timers
        this.phaseTimer = null;
        this.phaseTimeRemaining = 0;
        this.lastUpdateTime = 0;
        
        // Joueurs
        this.players = [];
        this.currentPlayer = null;
        
        // Entités de jeu
        this.cannons = [];
        this.enemies = [];
        this.projectiles = [];
        this.currentTetrisPiece = null;
        
        // Statistiques
        this.gameStats = {
            score: 0,
            shipsDestroyed: 0,
            shotsFired: 0,
            shotsHit: 0,
            roundsCompleted: 0,
            gameStartTime: null
        };
        
        // Curseurs et interactions multijoueur
        this.cursors = {
            mouse: { x: 0, y: 0, player: this.players[0] },
            keyboard: { x: 24, y: 18, player: this.players[1] } // Commence au centre
        };
        this.previews = {
            mouse: null,
            keyboard: null
        };
        
        // Pièces Tetris pour chaque joueur
        this.tetrisPieces = {
            player1: null,
            player2: null
        };
        
        this.initializeGame();
        this.bindEvents();
        
        // Démarrer le rendu immédiatement (même en menu)
        this.startRendering();
    }
    
    initializeGame() {
        // Créer les deux joueurs
        this.players = [
            {
                id: 1,
                name: 'Joueur 1',
                color: '#3b82f6', // Bleu
                controlType: 'mouse',
                score: 0,
                cannons: [],
                cannonQuota: 0,
                territory: 'left',
                castleHP: 10
            },
            {
                id: 2,
                name: 'Joueur 2',
                color: '#ef4444', // Rouge
                controlType: 'keyboard',
                score: 0,
                cannons: [],
                cannonQuota: 0,
                territory: 'right',
                castleHP: 10
            }
        ];
        
        this.currentPlayer = this.players[0];
        
        // Générer le terrain multijoueur
        this.grid.generateTerrain('multiplayer2');
        
        // Calculer les zones constructibles pour chaque joueur
        const goldenCellsP1 = this.grid.updateCannonZones(1);
        this.players[0].cannonQuota = this.grid.calculateCannonQuota(goldenCellsP1);
        
        const goldenCellsP2 = this.grid.updateCannonZones(2);
        this.players[1].cannonQuota = this.grid.calculateCannonQuota(goldenCellsP2);
        
        this.updateUI();
        
        console.log('👥 Multiplayer game initialized');
        console.log('🏰 Player 1 golden cells:', goldenCellsP1, '- Quota:', this.players[0].cannonQuota);
        console.log('🏰 Player 2 golden cells:', goldenCellsP2, '- Quota:', this.players[1].cannonQuota);
    }
    
    bindEvents() {
        // Événements souris (Joueur 1)
        this.canvas.addEventListener('click', (e) => this.handleMouseClick(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleMouseRightClick(e);
        });
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Événements clavier (Joueur 2 + touches globales)
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Empêcher les touches de navigation par défaut pour le Joueur 2
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code)) {
                e.preventDefault();
            }
        });
    }
    
    // Démarrer le rendu (séparé du gameplay)
    startRendering() {
        this.gameLoop();
        console.log('🎨 Rendering started');
    }
    
    // GAME LOOP PRINCIPAL
    start() {
        if (this.isGameRunning) return;
        
        this.isGameRunning = true;
        this.gameStats.gameStartTime = Date.now();
        
        // Transition vers première phase
        this.transitionToState(GAME_CONFIG.GAME_STATES.PLACE_CANNONS);
        
        console.log('🚀 Game started!');
    }
    
    gameLoop(currentTime = 0) {
        // Toujours faire le rendu, même si le jeu n'est pas lancé
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        // Update seulement si le jeu tourne et n'est pas en pause
        if (this.isGameRunning && !this.isPaused) {
            this.update(deltaTime);
        }
        
        // Toujours faire le rendu pour voir le terrain
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.updateTimers(deltaTime);
        this.updateEntities(deltaTime);
        this.checkGameConditions();
        this.updateUI();
    }
    
    render() {
        const gameState = {
            grid: this.grid,
            cannons: this.cannons,
            enemies: this.enemies,
            projectiles: this.projectiles,
            currentState: this.currentState,
            cursors: this.cursors,
            previews: this.previews,
            // Legacy pour compatibilité
            cursorPosition: this.cursors.mouse,
            previewPosition: this.previews.mouse || this.previews.keyboard
        };
        
        this.renderer.render(gameState);
    }
    
    // GESTION DES ÉTATS
    transitionToState(newState) {
        const oldState = this.currentState;
        this.currentState = newState;
        
        this.onStateExit(oldState);
        this.onStateEnter(newState);
        
        console.log(`🔄 State transition: ${oldState} → ${newState}`);
    }
    
    onStateEnter(state) {
        switch (state) {
            case GAME_CONFIG.GAME_STATES.PLACE_CANNONS:
                this.startPlaceCanonsPhase();
                break;
            case GAME_CONFIG.GAME_STATES.COMBAT:
                this.startCombatPhase();
                break;
            case GAME_CONFIG.GAME_STATES.REPAIR:
                this.startRepairPhase();
                break;
            case GAME_CONFIG.GAME_STATES.ROUND_END:
                this.startRoundEndPhase();
                break;
            case GAME_CONFIG.GAME_STATES.GAME_OVER:
                this.startGameOverPhase();
                break;
        }
    }
    
    onStateExit(state) {
        // Cleanup spécifique à chaque état
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = null;
        }
    }
    
    // PHASES DU JEU
    startPlaceCanonsPhase() {
        this.showPhaseModal('PLACEMENT DES CANONS', 'Les deux joueurs placent leurs canons simultanément !');
        
        // Recalculer les zones pour chaque joueur
        const goldenCellsP1 = this.grid.updateCannonZones(1);
        this.players[0].cannonQuota = this.grid.calculateCannonQuota(goldenCellsP1);
        
        const goldenCellsP2 = this.grid.updateCannonZones(2);
        this.players[1].cannonQuota = this.grid.calculateCannonQuota(goldenCellsP2);
        
        console.log('🔫 Simultaneous Cannon Phase');
        console.log(`🟦 ${this.players[0].name} quota:`, this.players[0].cannonQuota);
        console.log(`🟥 ${this.players[1].name} quota:`, this.players[1].cannonQuota);
    }
    
    startCombatPhase() {
        // Pas de limite de temps pour le combat !
        this.phaseTimeRemaining = null;
        
        // Spawner les ennemis
        this.spawnEnemyWave();
        
        console.log('⚔️ Combat Phase started - No time limit, destroy all ships!');
    }
    
    startRepairPhase() {
        this.showPhaseModal('RÉPARATIONS', 'Les deux joueurs réparent leurs murs simultanément !');
        
        // Générer une pièce Tetris pour chaque joueur
        this.generateTetrisPieceForPlayer(1);
        this.generateTetrisPieceForPlayer(2);
        
        // Timer de réparation (15 secondes) - géré dans updateTimers
        this.phaseTimeRemaining = GAME_CONFIG.TIMERS.REPAIR_PHASE;
        
        console.log('🔧 Simultaneous Repair Phase started');
    }
    
    startRoundEndPhase() {
        this.currentRound++;
        this.gameStats.roundsCompleted++;
        
        // Transition automatique vers prochain round
        setTimeout(() => {
            this.transitionToState(GAME_CONFIG.GAME_STATES.PLACE_CANNONS);
        }, 3000);
        
        console.log('🏁 Round', this.currentRound - 1, 'completed! Starting round', this.currentRound);
    }
    
    startGameOverPhase() {
        this.isGameRunning = false;
        this.showGameOverModal();
        console.log('💀 Game Over!');
    }
    
    // GESTION DES ENTITÉS
    updateEntities(deltaTime) {
        // Update ennemis (seulement pendant COMBAT)
        if (this.currentState === GAME_CONFIG.GAME_STATES.COMBAT) {
            this.enemies.forEach((enemy, index) => {
                this.updateEnemy(enemy, deltaTime);
                if (enemy.hp <= 0) {
                    this.destroyEnemy(index);
                }
            });
            
            // Vérifier si tous les navires sont détruits pour terminer le combat
            this.checkCombatCompletion();
        }
        
        // Update projectiles
        this.projectiles.forEach((projectile, index) => {
            this.updateProjectile(projectile, deltaTime);
            if (projectile.shouldRemove) {
                this.projectiles.splice(index, 1);
            }
        });
        
        // Mise à jour des cooldowns des canons (mais pas d'auto-fire)
        if (this.currentState === GAME_CONFIG.GAME_STATES.COMBAT) {
            this.cannons.forEach(cannon => {
                if (cannon.cooldown > 0) {
                    cannon.cooldown -= deltaTime;
                }
            });
            
            // Vérifier si tous les ennemis sont détruits pour passer à la phase de réparation
            if (this.enemies.length === 0) {
                console.log('✅ All enemies destroyed! Moving to repair phase');
                this.transitionToState(GAME_CONFIG.GAME_STATES.REPAIR);
            }
        }
    }
    
    updateEnemy(enemy, deltaTime) {
        // Utiliser la vitesse spécifique de l'ennemi (déjà calculée au spawn)
        const speed = enemy.speed;
        
        // Pathfinding vers le point de débarquement spécifique (navires) ou cible la plus proche (troupes)
        let targetX, targetY;
        if (enemy.type === 'ship') {
            targetX = enemy.targetX;
            targetY = enemy.targetY;
        } else {
            // Troupes terrestres vont vers la cible la plus proche (canons ou château)
            const nearestTarget = this.findNearestTargetForLandUnit(enemy.x, enemy.y);
            
            // Si c'est un tank et qu'il est à portée d'attaque, ne pas bouger
            if (enemy.unitType === 'TANK') {
                const distanceToTarget = Math.sqrt((nearestTarget.x - enemy.x) ** 2 + (nearestTarget.y - enemy.y) ** 2);
                if (distanceToTarget <= enemy.range) {
                    // Tank à portée, ne pas bouger
                    return;
                }
            }
            
            targetX = nearestTarget.x;
            targetY = nearestTarget.y;
        }
        
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        // Pour les navires, s'arrêter quand on est proche de la destination ET de la côte
        // Pour les unités terrestres, continuer jusqu'à être très proche (0.5 case)
        const stopDistance = (enemy.type === 'ship') ? 1.0 : 0.5;
        
        if (distance > stopDistance) {
            let newX = enemy.x + (dx / distance) * speed * (deltaTime / 1000);
            let newY = enemy.y + (dy / distance) * speed * (deltaTime / 1000);
            
            // Anti-collision pour les navires
            if (enemy.type === 'ship') {
                // Vérifier que le navire ne va pas sur la terre
                const gridX = Math.floor(newX);
                const gridY = Math.floor(newY);
                const targetCell = this.grid.getCell(gridX, gridY);
                
                // Navires avec évitement de collision
                if (this.isValidTerrainForUnit(enemy, newX, newY)) {
                    const collisionResult = this.checkUnitCollisions(enemy, newX, newY);
                    if (!collisionResult.collision) {
                        enemy.x = newX;
                        enemy.y = newY;
                    } else {
                        // Calculer une trajectoire de contournement
                        const avoidanceMove = this.calculateAvoidanceMove(enemy, newX, newY, collisionResult);
                        if (avoidanceMove) {
                            enemy.x = avoidanceMove.x;
                            enemy.y = avoidanceMove.y;
                        }
                    }
                }
                // Si terrain invalide, rester sur place cette frame
            } else {
                // Troupes terrestres avec évitement de collision
                if (this.isValidTerrainForUnit(enemy, newX, newY)) {
                    const collisionResult = this.checkUnitCollisions(enemy, newX, newY);
                    if (!collisionResult.collision) {
                        enemy.x = newX;
                        enemy.y = newY;
                    } else {
                        // Calculer une trajectoire de contournement
                        const avoidanceMove = this.calculateAvoidanceMove(enemy, newX, newY, collisionResult);
                        if (avoidanceMove) {
                            enemy.x = avoidanceMove.x;
                            enemy.y = avoidanceMove.y;
                        }
                        // Si pas de mouvement d'évitement possible, rester sur place cette frame
                    }
                }
                // Si terrain invalide, rester sur place cette frame
            }
        }
        
        // Logique spécifique aux navires
        if (enemy.type === 'ship') {
            this.updateEnemyFiring(enemy, deltaTime);
            
            // Vérifier si le navire peut débarquer des troupes
            this.checkShipLanding(enemy);
        } 
        // Logique spécifique aux troupes terrestres
        else if (enemy.type === 'land_unit') {
            this.updateLandUnitCombat(enemy, deltaTime);
        }
    }
    
    checkShipLanding(ship) {
        if (ship.hasLanded) return;
        
        // D'abord vérifier si le navire a atteint sa destination
        const distanceToTarget = Math.sqrt((ship.targetX - ship.x) ** 2 + (ship.targetY - ship.y) ** 2);
        
        // Le navire doit être proche de sa destination ET proche de la côte
        if (distanceToTarget <= 1.5) {
            const landDistance = this.findDistanceToLand(ship.x, ship.y);
            
            if (landDistance <= GAME_CONFIG.ENEMIES.DISEMBARK_DISTANCE) {
                if (!ship.isNearCoast) {
                    ship.isNearCoast = true;
                    console.log(`🏖️ ${GAME_CONFIG.ENEMIES.SHIP_TYPES[ship.shipType].name} ship reached landing point`);
                }
                
                // Débarquer seulement une fois arrivé à destination
                this.landTroops(ship);
            }
        } else {
            // Si pas encore arrivé à destination, signaler approche de la côte
            const landDistance = this.findDistanceToLand(ship.x, ship.y);
            if (landDistance <= GAME_CONFIG.ENEMIES.DISEMBARK_DISTANCE && !ship.isNearCoast) {
                ship.isNearCoast = true;
                console.log(`🏖️ ${GAME_CONFIG.ENEMIES.SHIP_TYPES[ship.shipType].name} ship approaching coast`);
            }
        }
    }
    
    findDistanceToLand(shipX, shipY) {
        let minDistance = Infinity;
        
        // Chercher la terre la plus proche
        for (let y = Math.max(0, Math.floor(shipY - 5)); y < Math.min(GAME_CONFIG.GRID_HEIGHT, Math.ceil(shipY + 5)); y++) {
            for (let x = Math.max(0, Math.floor(shipX - 5)); x < Math.min(GAME_CONFIG.GRID_WIDTH, Math.ceil(shipX + 5)); x++) {
                const cell = this.grid.getCell(x, y);
                if (cell && cell.type === GAME_CONFIG.CELL_TYPES.LAND) {
                    const distance = Math.sqrt((x - shipX) ** 2 + (y - shipY) ** 2);
                    minDistance = Math.min(minDistance, distance);
                }
            }
        }
        
        return minDistance;
    }
    
    updateEnemyFiring(enemy, deltaTime) {
        // Décrémenter le cooldown
        if (enemy.cannonCooldown > 0) {
            enemy.cannonCooldown -= deltaTime;
            return;
        }
        
        // Trouver le mur le plus proche à cibler
        const target = this.findNearestWall(enemy);
        if (!target) return;
        
        // Obtenir la config du type de navire
        const shipConfig = GAME_CONFIG.ENEMIES.SHIP_TYPES[enemy.shipType];
        
        // Calculer la précision actuelle
        const accuracy = Math.min(enemy.currentAccuracy, shipConfig.maxAccuracy);
        const hitChance = Math.random() * 100;
        
        if (hitChance <= accuracy) {
            // Tir réussi !
            this.fireEnemyProjectile(enemy, target);
            console.log(`🎯 ${shipConfig.name} ship hit wall at (${target.x}, ${target.y}) - Accuracy: ${accuracy}%`);
        } else {
            // Tir raté
            console.log(`❌ ${shipConfig.name} ship missed - Accuracy: ${accuracy}%`);
        }
        
        // Augmenter la précision pour le prochain tir
        enemy.currentAccuracy = Math.min(
            enemy.currentAccuracy + shipConfig.accuracyIncrement,
            shipConfig.maxAccuracy
        );
        enemy.shotsFired++;
        
        // Reset du cooldown
        enemy.cannonCooldown = shipConfig.cooldown;
    }
    
    findNearestWall(enemy) {
        let nearestWall = null;
        let minDistance = Infinity;
        
        for (let y = 0; y < GAME_CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < GAME_CONFIG.GRID_WIDTH; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell && cell.type === GAME_CONFIG.CELL_TYPES.WALL) {
                    const distance = Math.sqrt((x - enemy.x) ** 2 + (y - enemy.y) ** 2);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestWall = { x, y };
                    }
                }
            }
        }
        
        return nearestWall;
    }
    
    updateLandUnitCombat(unit, deltaTime) {
        // Décrémenter le cooldown d'attaque
        if (unit.attackCooldown > 0) {
            unit.attackCooldown -= deltaTime;
            return;
        }
        
        // Trouver la cible la plus proche dans la portée (canon ou château)
        const target = this.findNearestCannonInRange(unit);
        if (!target) return;
        
        // Attaquer selon le type d'unité
        if (unit.unitType === 'TANK') {
            // Tank attaque à distance
            this.tankAttackTarget(unit, target);
        } else if (unit.unitType === 'INFANTRY') {
            // Infanterie attaque au corps à corps
            this.infantryAttackTarget(unit, target);
        }
        
        // Reset du cooldown
        unit.attackCooldown = unit.attackInterval;
    }
    
    findNearestCannonInRange(unit) {
        let nearestTarget = null;
        let minDistance = Infinity;
        
        // Parcourir toutes les cases pour trouver les canons ET le château
        for (let y = 0; y < GAME_CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < GAME_CONFIG.GRID_WIDTH; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell && (
                    (cell.type === GAME_CONFIG.CELL_TYPES.CANNON && cell.hp > 0) ||
                    cell.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE
                )) {
                    const distance = Math.sqrt((x - unit.x) ** 2 + (y - unit.y) ** 2);
                    
                    // Vérifier si dans la portée
                    if (distance <= unit.range && distance < minDistance) {
                        minDistance = distance;
                        nearestTarget = { x, y, cell };
                    }
                }
            }
        }
        
        return nearestTarget;
    }
    
    tankAttackTarget(tank, target) {
        // Tank tire un projectile vers la cible (canon ou château)
        const targetType = target.cell.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE ? 'castle' : 'cannon';
        console.log(`💥 Tank firing at ${targetType} at (${target.x}, ${target.y}) - Range: ${Math.sqrt((target.x - tank.x) ** 2 + (target.y - tank.y) ** 2).toFixed(1)}`);
        
        const tankPixelX = tank.x * GAME_CONFIG.CELL_SIZE;
        const tankPixelY = tank.y * GAME_CONFIG.CELL_SIZE;
        const targetPixelX = target.x * GAME_CONFIG.CELL_SIZE;
        const targetPixelY = target.y * GAME_CONFIG.CELL_SIZE;
        
        const dx = targetPixelX - tankPixelX;
        const dy = targetPixelY - tankPixelY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const speed = 260; // Vitesse des projectiles de tank (+30%)
        
        this.projectiles.push({
            x: tankPixelX,
            y: tankPixelY,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            damage: tank.damage, // 5 dégâts
            shouldRemove: false,
            isLandUnitProjectile: true,
            fromUnit: 'TANK',
            targetX: target.x,
            targetY: target.y
        });
    }
    
    infantryAttackTarget(infantry, target) {
        // Infanterie attaque directement (pas de projectile)
        const targetType = target.cell.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE ? 'castle' : 'cannon';
        console.log(`⚔️ Infantry attacking ${targetType} at (${target.x}, ${target.y}) - Melee attack!`);
        
        // Infliger directement les dégâts
        const damaged = this.grid.damageCell(target.x, target.y, infantry.damage);
        
        if (damaged) {
            console.log(`💀 Cannon destroyed by infantry at (${target.x}, ${target.y})`);
            // Effet d'explosion au niveau du canon
            this.renderer.addExplosion(target.x * GAME_CONFIG.CELL_SIZE, target.y * GAME_CONFIG.CELL_SIZE);
        } else {
            console.log(`🔨 Cannon damaged by infantry at (${target.x}, ${target.y}) - HP: ${target.cell.hp}`);
        }
    }
    
    fireEnemyProjectile(enemy, target) {
        // Créer un projectile ennemi
        const enemyPixelX = enemy.x * GAME_CONFIG.CELL_SIZE;
        const enemyPixelY = enemy.y * GAME_CONFIG.CELL_SIZE;
        const targetPixelX = target.x * GAME_CONFIG.CELL_SIZE;
        const targetPixelY = target.y * GAME_CONFIG.CELL_SIZE;
        
        const dx = targetPixelX - enemyPixelX;
        const dy = targetPixelY - enemyPixelY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const speed = 390; // Même vitesse que les projectiles de canons (+30%)
        
        this.projectiles.push({
            x: enemyPixelX,
            y: enemyPixelY,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            damage: 1,
            shouldRemove: false,
            isEnemyProjectile: true,
            targetX: target.x,
            targetY: target.y
        });
    }
    
    updateProjectile(projectile, deltaTime) {
        const oldX = projectile.x;
        const oldY = projectile.y;
        
        projectile.x += projectile.vx * (deltaTime / 1000);
        projectile.y += projectile.vy * (deltaTime / 1000);
        
        // Calculer la distance parcourue
        if (projectile.distanceTraveled !== undefined) {
            const deltaDistance = Math.sqrt(
                (projectile.x - oldX) ** 2 + (projectile.y - oldY) ** 2
            );
            projectile.distanceTraveled += deltaDistance;
        }
        
        // Projectiles ennemis touchent les murs
        if (projectile.isEnemyProjectile) {
            const gridX = Math.floor(projectile.x / GAME_CONFIG.CELL_SIZE);
            const gridY = Math.floor(projectile.y / GAME_CONFIG.CELL_SIZE);
            const cell = this.grid.getCell(gridX, gridY);
            
            if (cell && cell.type === GAME_CONFIG.CELL_TYPES.WALL) {
                // Détruire le mur
                cell.type = GAME_CONFIG.CELL_TYPES.DESTROYED;
                cell.hp = 0;
                projectile.shouldRemove = true;
                
                // Effet d'explosion
                this.renderer.addExplosion(projectile.x, projectile.y);
                console.log(`💥 Wall destroyed at (${gridX}, ${gridY})`);
                return;
            }
        }
        
        // Projectiles des troupes terrestres touchent les canons
        if (projectile.isLandUnitProjectile) {
            const gridX = Math.floor(projectile.x / GAME_CONFIG.CELL_SIZE);
            const gridY = Math.floor(projectile.y / GAME_CONFIG.CELL_SIZE);
            const cell = this.grid.getCell(gridX, gridY);
            
            if (cell && cell.type === GAME_CONFIG.CELL_TYPES.CANNON) {
                // Endommager le canon
                const damaged = this.grid.damageCell(gridX, gridY, projectile.damage);
                projectile.shouldRemove = true;
                
                // Effet d'explosion
                this.renderer.addExplosion(projectile.x, projectile.y);
                
                if (damaged) {
                    console.log(`💀 Cannon destroyed by ${projectile.fromUnit} at (${gridX}, ${gridY})`);
                } else {
                    console.log(`🔨 Cannon damaged by ${projectile.fromUnit} at (${gridX}, ${gridY}) - HP: ${cell.hp}`);
                }
                return;
            }
        }
        
        // Vérifier collisions avec ennemis (projectiles de canons seulement)
        if (!projectile.isEnemyProjectile && !projectile.isLandUnitProjectile) {
            this.enemies.forEach((enemy, enemyIndex) => {
                const dx = projectile.x - (enemy.x * GAME_CONFIG.CELL_SIZE);
                const dy = projectile.y - (enemy.y * GAME_CONFIG.CELL_SIZE);
                const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < GAME_CONFIG.CELL_SIZE) {
                // Hit!
                enemy.hp--;
                this.gameStats.shotsHit++;
                projectile.shouldRemove = true;
                
                // Effet d'explosion
                this.renderer.addExplosion(projectile.x, projectile.y);
                
                // Log des dégâts avec type de navire
                const shipConfig = GAME_CONFIG.ENEMIES.SHIP_TYPES[enemy.shipType];
                console.log(`💥 ${shipConfig ? shipConfig.name : 'Unknown'} ship hit! HP: ${enemy.hp}/${enemy.maxHP}`);
                
                if (enemy.hp <= 0) {
                    this.gameStats.shipsDestroyed++;
                    this.gameStats.score += 100;
                    console.log(`🔥 ${shipConfig ? shipConfig.name : 'Enemy'} ship destroyed!`);
                }
            }
            });
        }
        
        // Les projectiles de canons peuvent détruire les murs SEULEMENT s'ils visaient un mur
        if (!projectile.isEnemyProjectile && projectile.canDestroyWalls) {
            const gridX = Math.floor(projectile.x / GAME_CONFIG.CELL_SIZE);
            const gridY = Math.floor(projectile.y / GAME_CONFIG.CELL_SIZE);
            const cell = this.grid.getCell(gridX, gridY);
            
            if (cell && cell.type === GAME_CONFIG.CELL_TYPES.WALL) {
                // Détruire le mur seulement si on le visait intentionnellement
                cell.type = GAME_CONFIG.CELL_TYPES.DESTROYED;
                cell.hp = 0;
                projectile.shouldRemove = true;
                
                // Effet d'explosion
                this.renderer.addExplosion(projectile.x, projectile.y);
                console.log(`💥 Player intentionally destroyed wall at (${gridX}, ${gridY})`);
                
                // Recalculer les zones fermées immédiatement
                const goldenCells = this.grid.updateCannonZones(this.currentPlayer.id);
                console.log(`🔄 Zones updated after wall destruction: ${goldenCells} golden cells`);
            }
        }
        
        // Remove projectiles seulement s'ils sont vraiment très loin de la grille de jeu
        const gridPixelWidth = GAME_CONFIG.GRID_WIDTH * GAME_CONFIG.CELL_SIZE;
        const gridPixelHeight = GAME_CONFIG.GRID_HEIGHT * GAME_CONFIG.CELL_SIZE;
        const margin = 200; // Marge de 200 pixels au-delà de la grille
        
        if (projectile.x < -margin || projectile.x > gridPixelWidth + margin || 
            projectile.y < -margin || projectile.y > gridPixelHeight + margin) {
            projectile.shouldRemove = true;
            console.log(`🗑️ Projectile removed - out of bounds at (${projectile.x.toFixed(1)}, ${projectile.y.toFixed(1)})`);
        }
    }
    
    updateCannon(cannon, deltaTime) {
        cannon.cooldown = Math.max(0, cannon.cooldown - deltaTime);
        // Tir automatique désactivé - le joueur doit cliquer pour tirer
    }
    
    findClosestEnemy(cannonX, cannonY) {
        let closest = null;
        let minDistance = Infinity;
        
        this.enemies.forEach(enemy => {
            const distance = Math.sqrt(
                (enemy.x - cannonX) ** 2 + (enemy.y - cannonY) ** 2
            );
            if (distance < minDistance) {
                minDistance = distance;
                closest = enemy;
            }
        });
        
        return closest;
    }
    
    fireCannon(cannon, target) {
        // Centre du canon (canons font 2x2, donc centre à +1 case)
        const cannonPixelX = cannon.gridX * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE;
        const cannonPixelY = cannon.gridY * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE;
        // Centre de la case cible
        const targetPixelX = target.x * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2;
        const targetPixelY = target.y * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2;
        
        const dx = targetPixelX - cannonPixelX;
        const dy = targetPixelY - cannonPixelY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const speed = 468; // pixels per second (+30% de 360)
        
        // Vérifier si la cible est un mur
        const targetCell = this.grid.getCell(target.x, target.y);
        const isTargetingWall = targetCell && targetCell.type === GAME_CONFIG.CELL_TYPES.WALL;
        
        const projectile = {
            x: cannonPixelX,
            y: cannonPixelY,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            damage: 1,
            shouldRemove: false,
            targetX: target.x,
            targetY: target.y,
            canDestroyWalls: isTargetingWall, // Ne peut détruire les murs que si on les visait
            distanceTraveled: 0,
            maxDistance: distance // Distance totale à parcourir
        };
        
        this.projectiles.push(projectile);
        
        console.log(`🚀 Projectile created: from (${cannonPixelX}, ${cannonPixelY}) to (${targetPixelX}, ${targetPixelY}) - distance: ${distance.toFixed(1)}px`);
        
        this.gameStats.shotsFired++;
    }
    
    destroyEnemy(index) {
        this.enemies.splice(index, 1);
    }
    
    spawnEnemyWave() {
        // Progression du nombre d'ennemis selon le round
        let waveSize;
        if (this.currentRound === 1) {
            waveSize = 3; // Commencer doucement
        } else if (this.currentRound <= 3) {
            waveSize = 3 + this.currentRound;
        } else {
            waveSize = Math.min(5 + Math.floor(this.currentRound / 2), 10); // Max 10 navires
        }
        
        console.log(`🌊 Wave ${this.currentRound}: Spawning ${waveSize} ships`);
        
        for (let i = 0; i < waveSize; i++) {
            setTimeout(() => {
                this.spawnEnemy();
            }, i * 2000); // Spawn toutes les 2 secondes
        }
    }
    
    spawnEnemy() {
        // Spawn depuis le bord droit (mer)
        const spawnX = GAME_CONFIG.GRID_WIDTH - 1;
        const spawnY = Math.random() * GAME_CONFIG.GRID_HEIGHT;
        
        // Choisir un type de navire selon le round actuel
        let availableShipTypes = [];
        
        // Round 1-2 : Seulement des navires faibles (NOVICE)
        if (this.currentRound <= 2) {
            availableShipTypes = ['NOVICE'];
        }
        // Round 3-4 : Navires faibles et moyens
        else if (this.currentRound <= 4) {
            availableShipTypes = ['NOVICE', 'NOVICE', 'VETERAN']; // Plus de chance d'avoir des NOVICE
        }
        // Round 5+ : Tous les types avec probabilités croissantes
        else {
            // Plus le round est élevé, plus il y a de chance d'avoir des navires forts
            availableShipTypes = ['NOVICE', 'VETERAN'];
            
            // Ajouter des navires experts après le round 5
            if (this.currentRound >= 5) {
                availableShipTypes.push('EXPERT');
                
                // Augmenter les chances de navires forts selon le round
                if (this.currentRound >= 7) {
                    availableShipTypes.push('VETERAN', 'EXPERT'); // Double les chances
                }
                if (this.currentRound >= 10) {
                    availableShipTypes.push('EXPERT'); // Triple les chances pour experts
                }
            }
        }
        
        const randomType = availableShipTypes[Math.floor(Math.random() * availableShipTypes.length)];
        const shipConfig = GAME_CONFIG.ENEMIES.SHIP_TYPES[randomType];
        
        // Choisir un point de débarquement sur la côte
        const landingPoint = this.findRandomLandingPoint();
        
        this.enemies.push({
            x: spawnX,
            y: spawnY,
            type: 'ship',
            shipType: randomType,
            hp: shipConfig.hp,
            maxHP: shipConfig.hp,
            speed: GAME_CONFIG.ENEMIES.SHIP_SPEED * shipConfig.speed, // Vitesse différenciée
            
            // Point de débarquement unique
            targetX: landingPoint.x,
            targetY: landingPoint.y,
            
            // Propriétés de tir  
            cannonCooldown: shipConfig.cooldown, // Doit attendre son premier cooldown avant de tirer
            shotsFired: 0,
            currentAccuracy: shipConfig.baseAccuracy,
            
            // Propriétés de débarquement
            hasLanded: false,
            isNearCoast: false
        });
        
        console.log(`🚢 ${shipConfig.name} ship spawned: ${shipConfig.hp} HP, ${(shipConfig.speed * 100)}% speed - targeting (${landingPoint.x}, ${landingPoint.y})`);
    }
    
    findRandomLandingPoint() {
        // Chercher des points sur la côte (cases de terre adjacentes à l'eau)
        const coastPoints = [];
        
        for (let y = 0; y < GAME_CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < GAME_CONFIG.GRID_WIDTH; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell && cell.type === GAME_CONFIG.CELL_TYPES.LAND) {
                    // Vérifier si cette terre est adjacent à de l'eau
                    const directions = [
                        [-1, -1], [-1, 0], [-1, 1],
                        [0, -1],           [0, 1],
                        [1, -1],  [1, 0],  [1, 1]
                    ];
                    
                    let adjacentToWater = false;
                    for (const [dx, dy] of directions) {
                        const nx = x + dx;
                        const ny = y + dy;
                        const neighborCell = this.grid.getCell(nx, ny);
                        if (neighborCell && neighborCell.type === GAME_CONFIG.CELL_TYPES.WATER) {
                            adjacentToWater = true;
                            break;
                        }
                    }
                    
                    if (adjacentToWater) {
                        coastPoints.push({ x, y });
                    }
                }
            }
        }
        
        // Retourner un point côtier aléatoire, ou le château par défaut
        if (coastPoints.length > 0) {
            const randomIndex = Math.floor(Math.random() * coastPoints.length);
            return coastPoints[randomIndex];
        } else {
            return { x: 24, y: 18 }; // Centre approximatif par défaut
        }
    }
    
    // Fonction générique de détection de collision pour tous types d'unités
    checkUnitCollisions(currentUnit, newX, newY) {
        const collisionRadius = currentUnit.type === 'ship' ? 1.5 : 1.0; // Navires plus gros
        const unitTypes = currentUnit.type === 'ship' ? ['ship'] : ['land_unit']; // Même type seulement
        
        for (let i = 0; i < this.enemies.length; i++) {
            const otherEnemy = this.enemies[i];
            
            // Ignorer soi-même et les types différents
            if (otherEnemy === currentUnit || !unitTypes.includes(otherEnemy.type)) continue;
            
            const dx = newX - otherEnemy.x;
            const dy = newY - otherEnemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < collisionRadius) {
                return { 
                    collision: true, 
                    with: otherEnemy,
                    distance: distance,
                    obstacleX: otherEnemy.x,
                    obstacleY: otherEnemy.y
                };
            }
        }
        
        return { collision: false };
    }
    
    // Fonction wrapper pour la compatibilité
    checkShipCollisions(currentShip, newX, newY) {
        return this.checkUnitCollisions(currentShip, newX, newY);
    }
    
    // Fonction générique de calcul d'évitement pour tous types d'unités
    calculateAvoidanceMove(unit, originalNewX, originalNewY, collisionResult) {
        const speed = unit.speed;
        const deltaTime = 16.67; // Approximation pour 60 FPS
        
        // Déterminer la cible selon le type d'unité
        let targetDX, targetDY;
        if (unit.type === 'ship') {
            targetDX = unit.targetX - unit.x;
            targetDY = unit.targetY - unit.y;
        } else {
            // Pour les troupes terrestres, utiliser la cible la plus proche
            const nearestTarget = this.findNearestTargetForLandUnit(unit.x, unit.y);
            targetDX = nearestTarget.x - unit.x;
            targetDY = nearestTarget.y - unit.y;
        }
        
        const targetDistance = Math.sqrt(targetDX * targetDX + targetDY * targetDY);
        
        if (targetDistance < 0.1) return null; // Déjà à destination
        
        // Vecteur normalisé vers la cible
        const targetNormX = targetDX / targetDistance;
        const targetNormY = targetDY / targetDistance;
        
        // Vecteur vers l'obstacle
        const obstacleDX = collisionResult.obstacleX - unit.x;
        const obstacleDY = collisionResult.obstacleY - unit.y;
        
        // Calculer l'angle de contournement (entre 15° et 45° selon la proximité)
        const proximityFactor = Math.max(0.2, Math.min(1.0, collisionResult.distance / 2.0));
        const avoidanceAngle = (Math.PI / 6) + (Math.PI / 12) * (1 - proximityFactor); // 30° à 45°
        
        // Déterminer le sens de contournement (droite ou gauche)
        // Utiliser le produit croisé pour savoir de quel côté contourner
        const crossProduct = targetNormX * obstacleDY - targetNormY * obstacleDX;
        const turnDirection = crossProduct > 0 ? 1 : -1;
        
        // Calculer la nouvelle direction avec l'angle de contournement
        const cos = Math.cos(avoidanceAngle * turnDirection);
        const sin = Math.sin(avoidanceAngle * turnDirection);
        
        const newDirectionX = targetNormX * cos - targetNormY * sin;
        const newDirectionY = targetNormX * sin + targetNormY * cos;
        
        // Calculer la nouvelle position
        const moveDistance = speed * (deltaTime / 1000);
        const avoidanceX = unit.x + newDirectionX * moveDistance;
        const avoidanceY = unit.y + newDirectionY * moveDistance;
        
        // Vérifier que la nouvelle position est valide selon le type d'unité
        if (this.isValidTerrainForUnit(unit, avoidanceX, avoidanceY)) {
            const newCollisionResult = this.checkUnitCollisions(unit, avoidanceX, avoidanceY);
            if (!newCollisionResult.collision) {
                return { x: avoidanceX, y: avoidanceY };
            }
        }
        
        // Si le contournement principal échoue, essayer l'autre sens
        const altDirectionX = targetNormX * cos + targetNormY * sin;
        const altDirectionY = -targetNormX * sin + targetNormY * cos;
        
        const altAvoidanceX = unit.x + altDirectionX * moveDistance;
        const altAvoidanceY = unit.y + altDirectionY * moveDistance;
        
        if (this.isValidTerrainForUnit(unit, altAvoidanceX, altAvoidanceY)) {
            const altCollisionResult = this.checkUnitCollisions(unit, altAvoidanceX, altAvoidanceY);
            if (!altCollisionResult.collision) {
                return { x: altAvoidanceX, y: altAvoidanceY };
            }
        }
        
        // En dernier recours, rester sur place cette frame
        return null;
    }
    
    // Fonction pour vérifier si un terrain est valide pour un type d'unité
    isValidTerrainForUnit(unit, x, y) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        const targetCell = this.grid.getCell(gridX, gridY);
        
        if (!targetCell) return false;
        
        if (unit.type === 'ship') {
            // Les navires ne peuvent aller que sur l'eau
            return targetCell.type === GAME_CONFIG.CELL_TYPES.WATER;
        } else {
            // Les troupes terrestres peuvent aller sur terre, terre détruite, canons et château
            return targetCell.type === GAME_CONFIG.CELL_TYPES.LAND || 
                   targetCell.type === GAME_CONFIG.CELL_TYPES.DESTROYED ||
                   targetCell.type === GAME_CONFIG.CELL_TYPES.CANNON ||
                   targetCell.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE;
        }
    }
    
    findNearestLandPosition(shipX, shipY) {
        let nearestLand = null;
        let minDistance = Infinity;
        
        // Chercher dans un rayon de 8 cases autour du navire
        const searchRadius = 8;
        
        for (let y = Math.max(0, Math.floor(shipY - searchRadius)); 
             y < Math.min(GAME_CONFIG.GRID_HEIGHT, Math.ceil(shipY + searchRadius)); 
             y++) {
            for (let x = Math.max(0, Math.floor(shipX - searchRadius)); 
                 x < Math.min(GAME_CONFIG.GRID_WIDTH, Math.ceil(shipX + searchRadius)); 
                 x++) {
                
                const cell = this.grid.getCell(x, y);
                if (cell && cell.type === GAME_CONFIG.CELL_TYPES.LAND) {
                    const distance = Math.sqrt((x - shipX) ** 2 + (y - shipY) ** 2);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestLand = { x, y };
                    }
                }
            }
        }
        
        // Si aucune terre trouvée, utiliser la position cible du navire (qui devrait être sur terre)
        return nearestLand || { x: shipX, y: shipY };
    }
    
    findNearestTargetForLandUnit(unitX, unitY) {
        let nearestTarget = null;
        let minDistance = Infinity;
        
        // 1. Chercher les CANONS en priorité (plus stratégique)
        for (let y = 0; y < GAME_CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < GAME_CONFIG.GRID_WIDTH; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell && cell.type === GAME_CONFIG.CELL_TYPES.CANNON && cell.hp > 0) {
                    const distance = Math.sqrt((x - unitX) ** 2 + (y - unitY) ** 2);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestTarget = { x, y, type: 'cannon' };
                    }
                }
            }
        }
        
        // 2. Si pas de canons actifs, chercher le château
        if (!nearestTarget) {
            for (let y = 0; y < GAME_CONFIG.GRID_HEIGHT; y++) {
                for (let x = 0; x < GAME_CONFIG.GRID_WIDTH; x++) {
                    const cell = this.grid.getCell(x, y);
                    if (cell && cell.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE) {
                        const distance = Math.sqrt((x - unitX) ** 2 + (y - unitY) ** 2);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestTarget = { x, y, type: 'castle' };
                        }
                    }
                }
            }
        }
        
        // 3. Par défaut, aller vers le centre approximatif
        return nearestTarget || { x: 24, y: 18, type: 'default' };
    }
    
    createLandUnit(x, y, unitType) {
        const unitConfig = GAME_CONFIG.ENEMIES.LAND_UNIT_TYPES[unitType];
        if (!unitConfig) return null;
        
        return {
            x: x,
            y: y,
            type: 'land_unit',
            unitType: unitType,
            hp: unitConfig.hp,
            maxHP: unitConfig.hp,
            speed: unitConfig.speed,
            range: unitConfig.range,
            attackCooldown: 0, // Prêt à attaquer immédiatement
            attackInterval: unitConfig.attackCooldown,
            damage: unitConfig.damage,
            target: null // Canon ciblé
        };
    }
    
    landTroops(ship) {
        const shipConfig = GAME_CONFIG.ENEMIES.SHIP_TYPES[ship.shipType];
        if (!shipConfig || ship.hasLanded) return;
        
        console.log(`🏖️ ${shipConfig.name} ship landing troops!`);
        ship.hasLanded = true;
        
        // Débarquer toutes les troupes définies pour ce type de navire
        shipConfig.landingForce.forEach(force => {
            const unitConfig = GAME_CONFIG.ENEMIES.LAND_UNIT_TYPES[force.type];
            
            for (let i = 0; i < force.count; i++) {
                // Trouver une position sur terre près du navire
                const landingPosition = this.findNearestLandPosition(ship.x, ship.y);
                
                // Ajouter un petit décalage pour éviter que toutes les troupes se superposent
                let offsetX, offsetY, finalX, finalY;
                let attempts = 0;
                
                do {
                    offsetX = (Math.random() - 0.5) * 1.5;
                    offsetY = (Math.random() - 0.5) * 1.5;
                    finalX = landingPosition.x + offsetX;
                    finalY = landingPosition.y + offsetY;
                    attempts++;
                } while (!this.isValidTerrainForUnit(finalX, finalY, 'land_unit') && attempts < 10);
                
                // Si on n'a pas trouvé de position valide, utiliser la position de base
                if (attempts >= 10) {
                    finalX = landingPosition.x;
                    finalY = landingPosition.y;
                }
                
                const landUnit = this.createLandUnit(finalX, finalY, force.type);
                
                if (landUnit) {
                    this.enemies.push(landUnit);
                    console.log(`🪖 ${unitConfig.name} deployed at (${Math.round(landUnit.x)}, ${Math.round(landUnit.y)})`);
                }
            }
        });
    }
    
    generateTetrisPiece() {
        // Méthode legacy pour compatibilité, génère pour player1
        this.generateTetrisPieceForPlayer(1);
    }
    
    generateTetrisPieceForPlayer(playerId) {
        const pieces = GAME_CONFIG.TETRIS_PIECES.TYPES;
        const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
        
        const tetrisPiece = {
            ...randomPiece,
            x: Math.floor(GAME_CONFIG.GRID_WIDTH / 2),
            y: Math.floor(GAME_CONFIG.GRID_HEIGHT / 2),
            rotation: 0
        };
        
        if (playerId === 1) {
            this.tetrisPieces.player1 = tetrisPiece;
            this.currentTetrisPiece = tetrisPiece; // Pour compatibilité
        } else {
            this.tetrisPieces.player2 = tetrisPiece;
        }
        
        console.log(`🧩 Generated Tetris piece for Player ${playerId}:`, tetrisPiece.name);
    }
    
    // GESTION DES INPUTS
    handleMouseClick(event) {
        const gridPos = this.renderer.screenToGrid(event.clientX, event.clientY);
        const player1 = this.players[0];
        
        switch (this.currentState) {
            case GAME_CONFIG.GAME_STATES.PLACE_CANNONS:
                this.tryPlaceCannonForPlayer(gridPos.x, gridPos.y, player1);
                break;
            case GAME_CONFIG.GAME_STATES.REPAIR:
                this.tryPlaceTetrisPieceForPlayer(gridPos.x, gridPos.y, player1);
                break;
            case GAME_CONFIG.GAME_STATES.COMBAT:
                this.tryManualFireForPlayer(gridPos.x, gridPos.y, player1);
                break;
        }
    }
    
    handleMouseRightClick(event) {
        if (this.currentState === GAME_CONFIG.GAME_STATES.REPAIR && this.tetrisPieces.player1) {
            this.rotateTetrisPieceForPlayer(this.players[0]);
        }
    }
    
    handleMouseMove(event) {
        const gridPos = this.renderer.screenToGrid(event.clientX, event.clientY);
        this.cursors.mouse.x = gridPos.x;
        this.cursors.mouse.y = gridPos.y;
        this.lastActiveDevice = 'mouse';
        
        // Preview pour Joueur 1 (souris)
        const player1 = this.players[0];
        if (this.currentState === GAME_CONFIG.GAME_STATES.PLACE_CANNONS) {
            this.previews.mouse = {
                x: gridPos.x,
                y: gridPos.y,
                size: GAME_CONFIG.GAMEPLAY.CANNON_SIZE,
                valid: this.grid.canPlaceCannon(gridPos.x, gridPos.y, player1.id),
                cannonQuota: player1.cannonQuota,
                playerId: player1.id
            };
        } else if (this.currentState === GAME_CONFIG.GAME_STATES.REPAIR && this.tetrisPieces.player1) {
            this.previews.mouse = {
                x: gridPos.x,
                y: gridPos.y,
                piece: this.tetrisPieces.player1,
                valid: this.grid.canPlacePiece(this.tetrisPieces.player1, gridPos.x, gridPos.y),
                playerId: player1.id
            };
        } else {
            this.previews.mouse = null;
        }
    }
    
    handleKeyDown(event) {
        // Touches globales
        switch (event.code) {
            case GAME_CONFIG.CONTROLS.GLOBAL.PAUSE:
                this.togglePause();
                break;
            case GAME_CONFIG.CONTROLS.GLOBAL.FORCE_COMBAT:
                if (this.currentState === GAME_CONFIG.GAME_STATES.PLACE_CANNONS) {
                    this.transitionToState(GAME_CONFIG.GAME_STATES.COMBAT);
                }
                break;
            case GAME_CONFIG.CONTROLS.GLOBAL.DEBUG:
                this.toggleDebugMode();
                break;
        }
        
        // Contrôles Joueur 2 (clavier)
        const player2 = this.players[1];
        switch (event.code) {
            case 'ArrowUp':
                this.cursors.keyboard.y = Math.max(0, this.cursors.keyboard.y - 1);
                this.lastActiveDevice = 'keyboard';
                this.updateKeyboardPreview(player2);
                break;
            case 'ArrowDown':
                this.cursors.keyboard.y = Math.min(GAME_CONFIG.GRID_HEIGHT - 1, this.cursors.keyboard.y + 1);
                this.lastActiveDevice = 'keyboard';
                this.updateKeyboardPreview(player2);
                break;
            case 'ArrowLeft':
                this.cursors.keyboard.x = Math.max(0, this.cursors.keyboard.x - 1);
                this.lastActiveDevice = 'keyboard';
                this.updateKeyboardPreview(player2);
                break;
            case 'ArrowRight':
                this.cursors.keyboard.x = Math.min(GAME_CONFIG.GRID_WIDTH - 1, this.cursors.keyboard.x + 1);
                this.lastActiveDevice = 'keyboard';
                this.updateKeyboardPreview(player2);
                break;
            case 'Space':
                this.handleKeyboardAction(player2);
                break;
            case 'Enter':
                this.handleKeyboardRotate(player2);
                break;
        }
    }
    
    updateKeyboardPreview(player2) {
        const x = this.cursors.keyboard.x;
        const y = this.cursors.keyboard.y;
        
        if (this.currentState === GAME_CONFIG.GAME_STATES.PLACE_CANNONS) {
            this.previews.keyboard = {
                x: x,
                y: y,
                size: GAME_CONFIG.GAMEPLAY.CANNON_SIZE,
                valid: this.grid.canPlaceCannon(x, y, player2.id),
                cannonQuota: player2.cannonQuota,
                playerId: player2.id
            };
        } else if (this.currentState === GAME_CONFIG.GAME_STATES.REPAIR && this.tetrisPieces.player2) {
            this.previews.keyboard = {
                x: x,
                y: y,
                piece: this.tetrisPieces.player2,
                valid: this.grid.canPlacePiece(this.tetrisPieces.player2, x, y),
                playerId: player2.id
            };
        } else {
            this.previews.keyboard = null;
        }
    }
    
    handleKeyboardAction(player2) {
        const x = this.cursors.keyboard.x;
        const y = this.cursors.keyboard.y;
        
        switch (this.currentState) {
            case GAME_CONFIG.GAME_STATES.PLACE_CANNONS:
                this.tryPlaceCannonForPlayer(x, y, player2);
                break;
            case GAME_CONFIG.GAME_STATES.REPAIR:
                this.tryPlaceTetrisPieceForPlayer(x, y, player2);
                break;
            case GAME_CONFIG.GAME_STATES.COMBAT:
                this.tryManualFireForPlayer(x, y, player2);
                break;
        }
    }
    
    handleKeyboardRotate(player2) {
        if (this.currentState === GAME_CONFIG.GAME_STATES.REPAIR && this.tetrisPieces.player2) {
            this.rotateTetrisPieceForPlayer(player2);
        }
    }
    
    handleKeyUp(event) {
        // Gestion des touches relâchées si nécessaire
    }
    
    // ACTIONS DE JEU - Nouvelles méthodes pour multijoueur
    tryManualFireForPlayer(x, y, player) {
        console.log(`🎯 ${player.name} fire attempt at (${x}, ${y})`);
        
        // Trouver le canon le plus proche appartenant à ce joueur
        let closestCannon = null;
        let minDistance = Infinity;
        let availableCannons = 0;
        
        this.cannons.forEach(cannon => {
            if (cannon.ownerId === player.id && cannon.cooldown <= 0) {
                availableCannons++;
                const distance = Math.sqrt(
                    (cannon.gridX - x) ** 2 + (cannon.gridY - y) ** 2
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCannon = cannon;
                }
            }
        });
        
        if (closestCannon) {
            const target = { x, y };
            console.log(`🔥 ${player.name} firing cannon toward (${x}, ${y})`);
            this.fireCannon(closestCannon, target);
            closestCannon.cooldown = 2000;
        } else {
            console.log(`❌ ${player.name}: No cannon available to fire`);
        }
    }
    
    // Méthode legacy pour compatibilité
    tryManualFire(x, y) {
        this.tryManualFireForPlayer(x, y, this.players[0]);
    }
    
    tryPlaceCannonForPlayer(x, y, player) {
        if (player.cannonQuota <= 0) {
            console.log(`❌ ${player.name}: No more cannons available!`);
            return false;
        }
        
        if (this.grid.canPlaceCannon(x, y, player.id)) {
            const cannonData = {
                id: `cannon_${Date.now()}_p${player.id}`,
                ownerId: player.id,
                hp: 3,
                maxHP: 3,
                cooldown: 0,
                rotation: 0
            };
            
            if (this.grid.placeCannon(x, y, cannonData, player.id)) {
                this.cannons.push({
                    ...cannonData,
                    gridX: x,
                    gridY: y
                });
                
                player.cannonQuota--;
                console.log(`✅ ${player.name} placed cannon at (${x}, ${y}) - Remaining: ${player.cannonQuota}`);
                
                // Vérifier si tous les joueurs ont épuisé leur quota
                this.checkCannonPhaseCompletion();
                
                return true;
            }
        }
        
        console.log(`❌ ${player.name} cannot place cannon at (${x}, ${y})`);
        return false;
    }
    
    checkCannonPhaseCompletion() {
        // Vérifier si les 2 joueurs ont épuisé leur quota ou si temps écoulé
        const totalQuotaRemaining = this.players[0].cannonQuota + this.players[1].cannonQuota;
        
        if (totalQuotaRemaining <= 0) {
            console.log('🚀 All players finished placing cannons - Starting combat!');
            setTimeout(() => {
                this.transitionToState(GAME_CONFIG.GAME_STATES.COMBAT);
            }, 500);
        }
    }
    
    // Méthode legacy pour compatibilité
    tryPlaceCannon(x, y) {
        return this.tryPlaceCannonForPlayer(x, y, this.currentPlayer || this.players[0]);
    }
    
    tryPlaceTetrisPieceForPlayer(x, y, player) {
        const piece = player.id === 1 ? this.tetrisPieces.player1 : this.tetrisPieces.player2;
        
        if (!piece) return false;
        
        if (this.grid.canPlacePiece(piece, x, y)) {
            if (this.grid.placePiece(piece, x, y, player.id)) {
                console.log(`✅ ${player.name} placed Tetris piece at (${x}, ${y})`);
                
                // Supprimer la pièce placée
                if (player.id === 1) {
                    this.tetrisPieces.player1 = null;
                    this.currentTetrisPiece = null; // Pour compatibilité
                } else {
                    this.tetrisPieces.player2 = null;
                }
                
                // Recalculer les zones fermées pour ce joueur
                const goldenCells = this.grid.updateCannonZones(player.id);
                console.log(`🔍 ${player.name} zones updated:`, goldenCells, 'golden cells');
                
                // Générer nouvelle pièce après un délai
                setTimeout(() => this.generateTetrisPieceForPlayer(player.id), 100);
                return true;
            }
        }
        
        console.log(`❌ ${player.name} cannot place piece at (${x}, ${y})`);
        return false;
    }
    
    // Méthode legacy pour compatibilité
    tryPlaceTetrisPiece(x, y) {
        return this.tryPlaceTetrisPieceForPlayer(x, y, this.currentPlayer || this.players[0]);
    }
    
    rotateTetrisPieceForPlayer(player) {
        const piece = player.id === 1 ? this.tetrisPieces.player1 : this.tetrisPieces.player2;
        
        if (!piece) return;
        
        // Rotation 90° dans le sens horaire
        const pattern = piece.pattern;
        const rotated = pattern[0].map((_, index) => 
            pattern.map(row => row[index]).reverse()
        );
        
        piece.pattern = rotated;
        piece.rotation = (piece.rotation + 90) % 360;
        
        console.log(`🔄 ${player.name} rotated Tetris piece`);
        
        // Mettre à jour le preview après rotation
        if (player.id === 1) {
            this.updateMousePreview();
        } else {
            this.updateKeyboardPreview(player);
        }
    }
    
    updateMousePreview() {
        const player1 = this.players[0];
        const x = this.cursors.mouse.x;
        const y = this.cursors.mouse.y;
        
        if (this.currentState === GAME_CONFIG.GAME_STATES.PLACE_CANNONS) {
            this.previews.mouse = {
                x: x, y: y,
                size: GAME_CONFIG.GAMEPLAY.CANNON_SIZE,
                valid: this.grid.canPlaceCannon(x, y, player1.id),
                cannonQuota: player1.cannonQuota,
                playerId: player1.id
            };
        } else if (this.currentState === GAME_CONFIG.GAME_STATES.REPAIR && this.tetrisPieces.player1) {
            this.previews.mouse = {
                x: x, y: y,
                piece: this.tetrisPieces.player1,
                valid: this.grid.canPlacePiece(this.tetrisPieces.player1, x, y),
                playerId: player1.id
            };
        }
    }
    
    // Méthode legacy pour compatibilité
    rotateTetrisPiece() {
        this.rotateTetrisPieceForPlayer(this.players[0]);
    }
    
    // UTILITAIRES
    updateTimers(deltaTime) {
        // Ne traiter les timers que si une limite de temps est définie
        if (this.phaseTimeRemaining !== null && this.phaseTimeRemaining > 0) {
            this.phaseTimeRemaining -= deltaTime;
            
            // Vérifier si le timer de phase est écoulé
            if (this.phaseTimeRemaining <= 0) {
                this.handlePhaseTimeout();
            }
        }
    }
    
    handlePhaseTimeout() {
        // Gérer la fin du timer selon la phase actuelle
        switch (this.currentState) {
            case GAME_CONFIG.GAME_STATES.PLACE_CANNONS:
                // Passer à la phase de combat quand le timer expire
                this.transitionToState(GAME_CONFIG.GAME_STATES.COMBAT);
                break;
            case GAME_CONFIG.GAME_STATES.COMBAT:
                this.transitionToState(GAME_CONFIG.GAME_STATES.REPAIR);
                break;
            case GAME_CONFIG.GAME_STATES.REPAIR:
                this.checkRoundCompletion();
                break;
        }
    }
    
    checkGameConditions() {
        // Vérifier condition de défaite (aucun canon actif)
        if (this.currentState === GAME_CONFIG.GAME_STATES.REPAIR) {
            const activeCannons = this.cannons.filter(cannon => cannon.hp > 0);
            if (activeCannons.length === 0) {
                this.transitionToState(GAME_CONFIG.GAME_STATES.GAME_OVER);
            }
        }
        
        // Vérifier fin prématurée du combat (tous les ennemis éliminés)
        if (this.currentState === GAME_CONFIG.GAME_STATES.COMBAT) {
            const aliveEnemies = this.enemies.filter(enemy => enemy.hp > 0);
            if (aliveEnemies.length === 0) {
                console.log('🏆 All enemies eliminated! Combat phase ending early.');
                this.phaseTimeRemaining = 0;
                this.handlePhaseTimeout(); // Force la transition immédiate
            }
        }
    }
    
    checkCombatCompletion() {
        // Compter seulement les navires (pas les troupes terrestres)
        const shipsRemaining = this.enemies.filter(enemy => enemy.type === 'ship').length;
        
        if (shipsRemaining === 0) {
            console.log('🎯 All ships destroyed! Combat phase complete');
            console.log(`🪖 ${this.enemies.filter(enemy => enemy.type === 'land_unit').length} land units remain for next phase`);
            
            // Transition vers la phase de réparation
            this.transitionToState(GAME_CONFIG.GAME_STATES.REPAIR);
        }
    }
    
    checkRoundCompletion() {
        // Nouvelle condition de Game Over : vérifier si des canons ou castle-core sont en zones dorées
        const hasDefensesInGoldenZones = this.checkDefensesInGoldenZones();
        
        if (hasDefensesInGoldenZones) {
            // Continuer le round
            this.transitionToState(GAME_CONFIG.GAME_STATES.ROUND_END);
        } else {
            // Game Over si aucune défense en zone dorée
            console.log('💀 GAME OVER: No cannons or castle-core in golden zones!');
            this.transitionToState(GAME_CONFIG.GAME_STATES.GAME_OVER);
        }
    }
    
    checkDefensesInGoldenZones() {
        // Parcourir toute la grille pour chercher canons et castle-cores en zones dorées
        for (let y = 0; y < GAME_CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < GAME_CONFIG.GRID_WIDTH; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell && cell.cannonZone) {
                    // Cette cellule est une zone dorée, vérifier s'il y a une défense
                    if (cell.type === GAME_CONFIG.CELL_TYPES.CANNON && cell.hp > 0) {
                        console.log(`✅ Active cannon found in golden zone at (${x}, ${y})`);
                        return true;
                    }
                    if (cell.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE) {
                        console.log(`🏰 Castle-core found in golden zone at (${x}, ${y})`);
                        return true;
                    }
                }
            }
        }
        
        console.log('❌ No defenses found in golden zones');
        return false;
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? '⏸️ Game paused' : '▶️ Game resumed');
        
        // Afficher/masquer la modale de pause
        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');
        
        if (modal && modalTitle && modalMessage && modalButtons) {
            if (this.isPaused) {
                modalTitle.textContent = '⏸️ PAUSE';
                modalMessage.textContent = 'Jeu en pause - Que voulez-vous faire ?';
                
                modalButtons.innerHTML = `
                    <button id="resume-btn">▶️ Reprendre</button>
                    <button id="restart-btn">🔄 Recommencer</button>
                    <button id="pause-return-menu-btn">🏠 Retour Menu</button>
                `;
                
                // Ajouter les event listeners
                document.getElementById('resume-btn')?.addEventListener('click', () => {
                    this.togglePause();
                });
                
                document.getElementById('restart-btn')?.addEventListener('click', () => {
                    if (confirm('Êtes-vous sûr de vouloir recommencer la partie ?')) {
                        location.reload();
                    }
                });
                
                document.getElementById('pause-return-menu-btn')?.addEventListener('click', () => {
                    if (confirm('Êtes-vous sûr de vouloir retourner au menu ? La partie sera perdue.')) {
                        this.returnToMainMenu();
                    }
                });
                
                modal.classList.remove('hidden', 'phase-announcement'); // Retirer la classe phase
            } else {
                modal.classList.add('hidden');
                modal.classList.remove('phase-announcement');
                modalButtons.innerHTML = ''; // Nettoyer les boutons
            }
        }
    }
    
    returnToMainMenu() {
        // Arrêter le jeu
        this.isGameRunning = false;
        this.isPaused = false;
        
        // Masquer la modal
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Envoyer un signal à l'app principale pour retourner au menu
        if (window.rampartApp && window.rampartApp.showMainMenu) {
            window.rampartApp.showMainMenu();
        } else {
            // Fallback : recharger la page
            location.reload();
        }
        
        console.log('🏠 Returning to main menu...');
    }
    
    toggleDebugMode() {
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    updateUI() {
        // Afficher l'UI multiplayer et masquer solo
        const player1Stats = document.getElementById('player1-stats');
        const player2Stats = document.getElementById('player2-stats');
        const legacyStats = document.getElementById('legacy-stats');
        
        if (player1Stats) player1Stats.style.display = 'block';
        if (player2Stats) player2Stats.style.display = 'block';
        if (legacyStats) legacyStats.style.display = 'none';
        
        // Update des éléments UI
        const elements = {
            'current-round': this.currentRound,
            'player1-cannons': this.players[0] ? this.players[0].cannonQuota : 0,
            'player1-score': this.players[0] ? this.players[0].score : 0,
            'player2-cannons': this.players[1] ? this.players[1].cannonQuota : 0,
            'player2-score': this.players[1] ? this.players[1].score : 0,
            'debug-state': this.currentState,
            'phase-title': this.getPhaseTitle(),
            'phase-description': this.getPhaseDescription()
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
        
        // Timer display
        const timerElement = document.getElementById('phase-timer');
        if (timerElement && this.phaseTimeRemaining > 0) {
            const seconds = Math.ceil(this.phaseTimeRemaining / 1000);
            timerElement.textContent = `${seconds}s`;
        }
    }
    
    getPhaseTitle() {
        const titles = {
            [GAME_CONFIG.GAME_STATES.MENU]: 'RAMPART',
            [GAME_CONFIG.GAME_STATES.PLACE_CANNONS]: 'PLACEMENT DES CANONS',
            [GAME_CONFIG.GAME_STATES.COMBAT]: 'COMBAT !',
            [GAME_CONFIG.GAME_STATES.REPAIR]: 'RÉPARATIONS',
            [GAME_CONFIG.GAME_STATES.ROUND_END]: 'FIN DU ROUND',
            [GAME_CONFIG.GAME_STATES.GAME_OVER]: 'GAME OVER'
        };
        return titles[this.currentState] || 'RAMPART';
    }
    
    getPhaseDescription() {
        const descriptions = {
            [GAME_CONFIG.GAME_STATES.MENU]: 'Prêt à défendre votre château ?',
            [GAME_CONFIG.GAME_STATES.PLACE_CANNONS]: 'Placez vos canons dans les zones dorées',
            [GAME_CONFIG.GAME_STATES.COMBAT]: 'Défendez votre château !',
            [GAME_CONFIG.GAME_STATES.REPAIR]: 'Réparez vos murs avec les pièces',
            [GAME_CONFIG.GAME_STATES.ROUND_END]: 'Round terminé !',
            [GAME_CONFIG.GAME_STATES.GAME_OVER]: 'Votre château est tombé...'
        };
        return descriptions[this.currentState] || '';
    }
    
    showPhaseModal(title, description) {
        // Modal temporaire d'annonce de phase sans fond sombre
        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');
        
        if (modal && modalTitle && modalMessage && modalButtons) {
            // Vider les boutons pour les annonces de phase
            modalButtons.innerHTML = '';
            
            modalTitle.textContent = title;
            modalMessage.textContent = description;
            
            // Ajouter la classe pour les annonces de phase (sans fond sombre)
            modal.classList.add('phase-announcement');
            modal.classList.remove('hidden');
            
            // Fermeture automatique après 2 secondes
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('phase-announcement');
            }, GAME_CONFIG.TIMERS.PHASE_MODAL);
        }
    }
    
    showGameOverModal() {
        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');
        
        if (modal && modalTitle && modalMessage && modalButtons) {
            modalTitle.textContent = 'GAME OVER';
            modalMessage.innerHTML = `
                <p>Score final: ${this.gameStats.score}</p>
                <p>Rounds complétés: ${this.gameStats.roundsCompleted}</p>
                <p>Bateaux détruits: ${this.gameStats.shipsDestroyed}</p>
                <p>Précision: ${Math.round((this.gameStats.shotsHit / Math.max(1, this.gameStats.shotsFired)) * 100)}%</p>
            `;
            
            modalButtons.innerHTML = `
                <button onclick="location.reload()">🔄 Rejouer</button>
                <button id="return-to-menu-btn">🏠 Retour Menu</button>
            `;
            
            // Ajouter l'event listener pour le bouton Retour Menu
            const returnToMenuBtn = document.getElementById('return-to-menu-btn');
            if (returnToMenuBtn) {
                returnToMenuBtn.addEventListener('click', () => {
                    this.returnToMainMenu();
                });
            }
            
            // S'assurer que Game Over a le fond sombre normal
            modal.classList.remove('hidden', 'phase-announcement');
        }
    }
}
