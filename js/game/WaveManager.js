import { EnemyShip, ShipFactory } from './EnemyShip.js';
import { CELL_TYPES } from './Grid.js';

export class WaveManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.grid = gameManager.grid;
        
        // État des vagues
        this.currentWave = 0;
        this.enemyShips = [];
        this.landUnits = []; // Troupes terrestres débarquées
        this.waveActive = false;
        this.waveStartTime = 0;
        this.waveDuration = 30000; // 30 secondes par vague
        
        // Configuration des vagues
        this.waveConfig = {
            spawnInterval: 2000, // Temps entre spawns (ms)
            lastSpawnTime: 0,
            maxEnemies: 8, // Maximum d'ennemis simultanés
            spawnPoints: [], // Points de spawn (calculés dynamiquement)
            difficultyScaling: 1.2 // Multiplicateur de difficulté par vague
        };
        
        // Patterns de vagues
        this.wavePatterns = this.initializeWavePatterns();
        
        console.log('🌊 WaveManager initialisé');
    }

    initializeWavePatterns() {
        return {
            // NIVEAU 1: Seulement des FAIBLES (5 HP) - basic et fast
            1: { basic: 3, fast: 0, heavy: 0, artillery: 0 },
            2: { basic: 3, fast: 1, heavy: 0, artillery: 0 },
            3: { basic: 2, fast: 2, heavy: 0, artillery: 0 },
            4: { basic: 4, fast: 2, heavy: 0, artillery: 0 },
            
            // NIVEAU 2: Ajout des MOYENS (10 HP) - heavy ships
            5: { basic: 3, fast: 1, heavy: 1, artillery: 0 },
            6: { basic: 3, fast: 2, heavy: 1, artillery: 0 },
            7: { basic: 2, fast: 2, heavy: 2, artillery: 0 },
            8: { basic: 4, fast: 1, heavy: 2, artillery: 0 },
            
            // NIVEAU 3: Ajout des FORTS (15 HP) - artillery ships
            9: { basic: 2, fast: 1, heavy: 2, artillery: 1 },
            10: { basic: 3, fast: 2, heavy: 2, artillery: 1 },
            11: { basic: 2, fast: 1, heavy: 3, artillery: 1 },
            12: { basic: 4, fast: 2, heavy: 2, artillery: 2 },
            
            // Vagues suivantes: tous types mélangés avec augmentation progressive
            default: { basic: 5, fast: 3, heavy: 3, artillery: 2 }
        };
    }

    startWave(waveNumber = null) {
        if (this.waveActive) {
            console.log('⚠️ Une vague est déjà en cours');
            return false;
        }

        this.currentWave = waveNumber || (this.currentWave + 1);
        this.waveActive = true;
        this.waveStartTime = Date.now();
        this.waveConfig.lastSpawnTime = 0;
        
        // Calculer les points de spawn
        this.calculateSpawnPoints();
        
        // Obtenir le pattern de la vague
        const pattern = this.getWavePattern(this.currentWave);
        
        console.log(`🌊 Début de la vague ${this.currentWave}:`, pattern);
        
        // Planifier les spawns
        this.scheduleSpawns(pattern);
        
        return true;
    }

    calculateSpawnPoints() {
        this.waveConfig.spawnPoints = [];
        
        const gameMode = this.gameManager.gameMode || 'solo';
        
        switch (gameMode) {
            case 'solo':
                this.calculateSoloSpawnPoints();
                break;
            case '2players':
                this.calculate2PlayerSpawnPoints();
                break;
            case '3players':
                this.calculate3PlayerSpawnPoints();
                break;
        }
        
        console.log(`📍 ${this.waveConfig.spawnPoints.length} points de spawn calculés`);
    }

    calculateSoloSpawnPoints() {
        const spawnPoints = [];
        
        // Spawner depuis le bord droit de l'écran sur toute la hauteur
        const spawnX = this.grid.width - 1; // Tout à droite du canvas
        
        // Créer des points de spawn dispersés sur toute la hauteur (éviter les bordures)
        for (let y = 2; y < this.grid.height - 2; y += 2) { // Tous les 2 cases, éviter bordures
            spawnPoints.push({ 
                x: spawnX, 
                y: y, 
                side: 'right' 
            });
        }
        
        console.log(`📍 ${spawnPoints.length} points de spawn créés sur bord droit (x=${spawnX})`);
        this.waveConfig.spawnPoints = spawnPoints;
    }

    calculate2PlayerSpawnPoints() {
        const spawnPoints = [];
        
        // En mode 2 joueurs, spawner depuis les bords
        // Bord gauche
        for (let y = 1; y < this.grid.height - 1; y += 4) {
            const cell = this.grid.getCell(0, y);
            if (cell && cell.type === CELL_TYPES.WATER) {
                spawnPoints.push({ x: 0, y, side: 'left' });
            }
        }
        
        // Bord droit
        for (let y = 1; y < this.grid.height - 1; y += 4) {
            const cell = this.grid.getCell(this.grid.width - 1, y);
            if (cell && cell.type === CELL_TYPES.WATER) {
                spawnPoints.push({ x: this.grid.width - 1, y, side: 'right' });
            }
        }
        
        this.waveConfig.spawnPoints = spawnPoints;
    }

    calculate3PlayerSpawnPoints() {
        const spawnPoints = [];
        
        // En mode 3 joueurs, spawner depuis tous les bords
        const sides = [
            { positions: [], side: 'top' },
            { positions: [], side: 'bottom' },
            { positions: [], side: 'left' },
            { positions: [], side: 'right' }
        ];
        
        // Haut
        for (let x = 1; x < this.grid.width - 1; x += 4) {
            const cell = this.grid.getCell(x, 0);
            if (cell && cell.type === CELL_TYPES.WATER) {
                sides[0].positions.push({ x, y: 0, side: 'top' });
            }
        }
        
        // Bas
        for (let x = 1; x < this.grid.width - 1; x += 4) {
            const cell = this.grid.getCell(x, this.grid.height - 1);
            if (cell && cell.type === CELL_TYPES.WATER) {
                sides[1].positions.push({ x, y: this.grid.height - 1, side: 'bottom' });
            }
        }
        
        // Gauche
        for (let y = 1; y < this.grid.height - 1; y += 4) {
            const cell = this.grid.getCell(0, y);
            if (cell && cell.type === CELL_TYPES.WATER) {
                sides[2].positions.push({ x: 0, y, side: 'left' });
            }
        }
        
        // Droite
        for (let y = 1; y < this.grid.height - 1; y += 4) {
            const cell = this.grid.getCell(this.grid.width - 1, y);
            if (cell && cell.type === CELL_TYPES.WATER) {
                sides[3].positions.push({ x: this.grid.width - 1, y, side: 'right' });
            }
        }
        
        // Combiner tous les points
        sides.forEach(side => {
            spawnPoints.push(...side.positions);
        });
        
        this.waveConfig.spawnPoints = spawnPoints;
    }

    getWavePattern(waveNumber) {
        const basePattern = this.wavePatterns[waveNumber] || this.wavePatterns.default;
        const scaling = Math.pow(this.waveConfig.difficultyScaling, Math.max(0, waveNumber - 5));
        
        // Appliquer le scaling de difficulté
        const scaledPattern = {};
        for (let shipType in basePattern) {
            scaledPattern[shipType] = Math.floor(basePattern[shipType] * scaling);
        }
        
        return scaledPattern;
    }

    scheduleSpawns(pattern) {
        this.spawnQueue = [];
        
        // Créer la liste des bateaux à spawner
        const shipsToSpawn = [];
        for (let shipType in pattern) {
            for (let i = 0; i < pattern[shipType]; i++) {
                shipsToSpawn.push(shipType);
            }
        }
        
        // Mélanger pour plus de variété
        this.shuffleArray(shipsToSpawn);
        
        // Spawner tous les bateaux immédiatement au début de la vague
        this.spawnAllShipsImmediately(shipsToSpawn);
        
        console.log(`📋 ${shipsToSpawn.length} ennemis spawnés immédiatement`);
    }

    spawnAllShipsImmediately(shipsToSpawn) {
        const spawnPoints = [...this.waveConfig.spawnPoints]; // Copie des points disponibles
        
        console.log(`📍 Points de spawn disponibles: ${spawnPoints.length}`);
        spawnPoints.forEach((point, index) => {
            console.log(`   Point ${index}: (${point.x}, ${point.y})`);
        });
        
        for (let i = 0; i < shipsToSpawn.length; i++) {
            const shipType = shipsToSpawn[i];
            
            // Choisir un point de spawn (en rotation pour éviter l'accumulation)
            const spawnPointIndex = i % spawnPoints.length;
            const spawnPoint = spawnPoints[spawnPointIndex];
            
            if (spawnPoint) {
                // Position fixe basée sur l'index pour éviter les superpositions
                const spawnX = spawnPoint.x; // Toujours au bord droit
                const spawnY = spawnPoint.y + (i * 2.5); // Échelonnement vertical fixe
                
                // S'assurer que Y reste dans les limites
                const clampedY = Math.max(2, Math.min(this.grid.height - 3, spawnY));
                
                this.createShip(shipType, spawnX, clampedY);
                console.log(`🚢 ${shipType} #${i} spawn à (${spawnX.toFixed(1)}, ${clampedY.toFixed(1)}) depuis point ${spawnPointIndex} + offset ${i * 2.5}`);
            }
        }
    }

    createShip(shipType, x, y) {
        let ship;
        switch (shipType) {
            case 'basic':
                ship = ShipFactory.createBasicShip(x, y);
                break;
            case 'fast':
                ship = ShipFactory.createFastShip(x, y);
                break;
            case 'heavy':
                ship = ShipFactory.createHeavyShip(x, y);
                break;
            case 'artillery':
                ship = ShipFactory.createArtilleryShip(x, y);
                break;
            default:
                ship = ShipFactory.createBasicShip(x, y);
        }
        
        this.enemyShips.push(ship);
        console.log(`🚢 ${shipType} créé à (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }

    update(deltaTime) {
        if (!this.waveActive) return;
        
        const now = Date.now();
        
        // Plus besoin de gérer les spawns progressifs, ils sont tous créés au début
        
        // Mettre à jour tous les bateaux ennemis
        for (let i = this.enemyShips.length - 1; i >= 0; i--) {
            const ship = this.enemyShips[i];
            
            ship.update(deltaTime, this.gameManager);
            
            // Supprimer les bateaux détruits ou qui ont fui
            if (!ship.active || this.hasShipFled(ship)) {
                this.enemyShips.splice(i, 1);
                if (!ship.active) {
                    console.log('🚢 Bateau retiré (détruit)');
                } else {
                    console.log('🚢 Bateau retiré (fuite)');
                }
            }
        }
        
        // Mettre à jour toutes les unités terrestres
        for (let i = this.landUnits.length - 1; i >= 0; i--) {
            const unit = this.landUnits[i];
            
            if (unit.update && typeof unit.update === 'function') {
                unit.update(deltaTime, this.gameManager);
            }
            
            // Supprimer les unités détruites
            if (!unit.active) {
                this.landUnits.splice(i, 1);
                console.log('🏃 Unité terrestre retirée (détruite)');
            }
        }
        
        // Vérifier la fin de vague
        this.checkWaveEnd(now);
    }

    getRandomSpawnPoint() {
        if (this.waveConfig.spawnPoints.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * this.waveConfig.spawnPoints.length);
        return this.waveConfig.spawnPoints[randomIndex];
    }

    hasShipFled(ship) {
        // Vérifier si le bateau a atteint le bord de la carte (fuite)
        // Empêcher la sortie par le bas et les côtés
        const margin = 1;
        return (ship.x < -margin || ship.x > this.grid.width + margin ||
                ship.y > this.grid.height + margin || ship.y < -margin);
    }

    checkWaveEnd(now) {
        const waveTimeElapsed = now - this.waveStartTime;
        
        // Conditions de fin de vague
        const timeExpired = waveTimeElapsed >= this.waveDuration;
        const noMoreEnemies = this.enemyShips.length === 0; // Plus de spawnQueue
        
        if (timeExpired || noMoreEnemies) {
            this.endWave(timeExpired ? 'timeout' : 'cleared');
        }
    }

    endWave(reason) {
        this.waveActive = false;
        
        // Calculer les statistiques de la vague
        const survivingEnemies = this.enemyShips.length;
        const waveTime = (Date.now() - this.waveStartTime) / 1000;
        
        console.log(`🏁 Vague ${this.currentWave} terminée (${reason})`);
        console.log(`📊 Temps: ${waveTime.toFixed(1)}s, Ennemis restants: ${survivingEnemies}`);
        
        // Récompenses selon la performance
        this.giveWaveRewards(reason, survivingEnemies, waveTime);
        
        // Déclencher l'événement de fin de vague
        this.gameManager.onWaveEnd(this.currentWave, {
            reason,
            survivingEnemies,
            waveTime,
            nextWaveIn: 5000 // 5 secondes avant la prochaine vague
        });
    }

    giveWaveRewards(reason, survivingEnemies, waveTime) {
        const players = this.gameManager.players.filter(p => !p.isDefeated);
        
        let baseScore = 100 * this.currentWave;
        
        // Bonus selon les performances
        if (reason === 'cleared') {
            baseScore *= 1.5; // Bonus pour avoir éliminé tous les ennemis
        }
        
        if (survivingEnemies === 0) {
            baseScore *= 1.2; // Bonus pour vague parfaite
        }
        
        if (waveTime < this.waveDuration / 2) {
            baseScore *= 1.3; // Bonus de rapidité
        }
        
        // Distribuer les points
        players.forEach(player => {
            player.addScore(Math.floor(baseScore));
            console.log(`🏆 Joueur ${player.id}: +${Math.floor(baseScore)} points`);
        });
    }

    // Contrôles manuels pour debug/test
    
    forceNextWave() {
        if (this.waveActive) {
            this.endWave('forced');
        }
        setTimeout(() => {
            this.startWave();
        }, 1000);
    }

    clearAllEnemies() {
        this.enemyShips.forEach(ship => ship.destroy());
        this.enemyShips = [];
        
        this.landUnits.forEach(unit => unit.active = false);
        this.landUnits = [];
        
        this.spawnQueue = [];
        console.log('💀 Tous les ennemis éliminés');
    }

    // Rendu
    
    render(ctx, renderer) {
        // Rendre tous les bateaux ennemis
        this.enemyShips.forEach(ship => {
            ship.render(ctx, renderer);
        });
        
        // Rendre toutes les unités terrestres
        this.landUnits.forEach(unit => {
            if (unit.render && typeof unit.render === 'function') {
                unit.render(ctx, renderer);
            } else {
                // Rendu basique pour les unités sans méthode render complète
                this.renderBasicUnit(ctx, renderer, unit);
            }
        });
        
        // Interface de vague supprimée du canvas - maintenant dans l'UI à droite
    }

    renderBasicUnit(ctx, renderer, unit) {
        if (!unit.active) return;
        
        const screenPos = renderer.gridToScreen(unit.x, unit.y);
        const cellSize = renderer.cellSize;
        const unitSize = cellSize * unit.size;
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        
        // Corps de l'unité
        ctx.fillStyle = unit.color;
        if (unit.type === 'tank') {
            // Tank rectangulaire
            ctx.fillRect(-unitSize/2, -unitSize/2, unitSize, unitSize);
            // Canon du tank
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(-unitSize/4, -unitSize/8, unitSize/2, unitSize/4);
        } else {
            // Infanterie circulaire
            ctx.beginPath();
            ctx.arc(0, 0, unitSize/2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Barre de vie basique
        const healthRatio = unit.health / unit.maxHealth;
        const barWidth = unitSize * 0.8;
        const barHeight = 3;
        const barY = screenPos.y - unitSize/2 - 8;
        
        // Fond de la barre de vie
        ctx.fillStyle = '#666666';
        ctx.fillRect(screenPos.x - barWidth / 2, barY, barWidth, barHeight);
        
        // Barre de vie
        const healthColor = healthRatio > 0.6 ? '#00ff00' : (healthRatio > 0.3 ? '#ffff00' : '#ff0000');
        ctx.fillStyle = healthColor;
        ctx.fillRect(screenPos.x - barWidth / 2, barY, barWidth * healthRatio, barHeight);
    }

    renderWaveUI(ctx, renderer) {
        const canvas = renderer.canvas;
        
        // Informations de vague en haut à droite
        const x = canvas.width - 200;
        const y = 20;
        
        // Fond
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 180, 100);
        
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 180, 100);
        
        // Texte
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`Vague ${this.currentWave}`, x + 10, y + 20);
        
        const remainingTime = Math.max(0, this.waveDuration - (Date.now() - this.waveStartTime));
        const timeSeconds = Math.ceil(remainingTime / 1000);
        ctx.fillText(`Temps: ${timeSeconds}s`, x + 10, y + 40);
        
        ctx.fillText(`Bateaux: ${this.enemyShips.length}`, x + 10, y + 60);
        ctx.fillText(`Troupes: ${this.landUnits.length}`, x + 10, y + 80);
    }

    // Utilitaires
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // État et sérialisation
    
    getWaveStatus() {
        return {
            currentWave: this.currentWave,
            waveActive: this.waveActive,
            enemyCount: this.enemyShips.length,
            queueLength: this.spawnQueue ? this.spawnQueue.length : 0,
            timeRemaining: this.waveActive ? 
                Math.max(0, this.waveDuration - (Date.now() - this.waveStartTime)) : 0
        };
    }

    serialize() {
        return {
            currentWave: this.currentWave,
            waveActive: this.waveActive,
            enemyShips: this.enemyShips.map(ship => ship.serialize()),
            landUnits: this.landUnits.map(unit => ({
                x: unit.x,
                y: unit.y,
                type: unit.type,
                health: unit.health,
                active: unit.active
            })),
            spawnQueue: this.spawnQueue || []
        };
    }

    // Nettoyage
    
    destroy() {
        this.clearAllEnemies();
        this.waveActive = false;
        console.log('🌊 WaveManager détruit');
    }
}