import { EnemyShip, ShipFactory } from './EnemyShip.js';
import { CELL_TYPES } from './Grid.js';

export class WaveManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.grid = gameManager.grid;
        
        // État des vagues
        this.currentWave = 0;
        this.enemyShips = [];
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
            1: { basic: 3, fast: 0, heavy: 0, artillery: 0 },
            2: { basic: 4, fast: 1, heavy: 0, artillery: 0 },
            3: { basic: 3, fast: 2, heavy: 1, artillery: 0 },
            4: { basic: 4, fast: 2, heavy: 1, artillery: 1 },
            5: { basic: 5, fast: 3, heavy: 2, artillery: 1 },
            // Vagues suivantes: augmentation progressive
            default: { basic: 6, fast: 4, heavy: 2, artillery: 2 }
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
        
        // En mode solo, spawner depuis la mer (côté droit)
        const rightWaterStart = Math.floor(this.grid.width * 0.7);
        
        // Points le long du bord droit
        for (let y = 1; y < this.grid.height - 1; y += 3) {
            for (let x = rightWaterStart; x < this.grid.width - 1; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell && cell.type === CELL_TYPES.WATER) {
                    spawnPoints.push({ x, y, side: 'right' });
                    break; // Un seul point par ligne
                }
            }
        }
        
        // Points depuis le bas (si il y a de l'eau)
        for (let x = rightWaterStart; x < this.grid.width - 1; x += 3) {
            const cell = this.grid.getCell(x, this.grid.height - 1);
            if (cell && cell.type === CELL_TYPES.WATER) {
                spawnPoints.push({ x, y: this.grid.height - 1, side: 'bottom' });
            }
        }
        
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
        
        // Créer la queue de spawn
        for (let shipType in pattern) {
            for (let i = 0; i < pattern[shipType]; i++) {
                this.spawnQueue.push(shipType);
            }
        }
        
        // Mélanger la queue pour plus de variété
        this.shuffleArray(this.spawnQueue);
        
        console.log(`📋 Queue de spawn: ${this.spawnQueue.length} ennemis programmés`);
    }

    update(deltaTime) {
        if (!this.waveActive) return;
        
        const now = Date.now();
        
        // Gérer les spawns
        this.updateSpawning(now);
        
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
        
        // Vérifier la fin de vague
        this.checkWaveEnd(now);
    }

    updateSpawning(now) {
        // Vérifier s'il faut spawner un nouvel ennemi
        if (this.spawnQueue.length > 0 && 
            this.enemyShips.length < this.waveConfig.maxEnemies &&
            now - this.waveConfig.lastSpawnTime >= this.waveConfig.spawnInterval) {
            
            this.spawnNextEnemy();
            this.waveConfig.lastSpawnTime = now;
        }
    }

    spawnNextEnemy() {
        if (this.spawnQueue.length === 0 || this.waveConfig.spawnPoints.length === 0) return;
        
        const shipType = this.spawnQueue.shift();
        const spawnPoint = this.getRandomSpawnPoint();
        
        if (!spawnPoint) {
            console.log('❌ Aucun point de spawn disponible');
            return;
        }
        
        // Créer le bateau selon son type
        let ship;
        switch (shipType) {
            case 'basic':
                ship = ShipFactory.createBasicShip(spawnPoint.x, spawnPoint.y);
                break;
            case 'fast':
                ship = ShipFactory.createFastShip(spawnPoint.x, spawnPoint.y);
                break;
            case 'heavy':
                ship = ShipFactory.createHeavyShip(spawnPoint.x, spawnPoint.y);
                break;
            case 'artillery':
                ship = ShipFactory.createArtilleryShip(spawnPoint.x, spawnPoint.y);
                break;
            default:
                ship = ShipFactory.createBasicShip(spawnPoint.x, spawnPoint.y);
        }
        
        this.enemyShips.push(ship);
        console.log(`🚢 ${shipType} spawné à (${spawnPoint.x}, ${spawnPoint.y})`);
    }

    getRandomSpawnPoint() {
        if (this.waveConfig.spawnPoints.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * this.waveConfig.spawnPoints.length);
        return this.waveConfig.spawnPoints[randomIndex];
    }

    hasShipFled(ship) {
        // Vérifier si le bateau a atteint le bord de la carte (fuite)
        const margin = 2;
        return (ship.x < -margin || ship.x > this.grid.width + margin ||
                ship.y < -margin || ship.y > this.grid.height + margin);
    }

    checkWaveEnd(now) {
        const waveTimeElapsed = now - this.waveStartTime;
        
        // Conditions de fin de vague
        const timeExpired = waveTimeElapsed >= this.waveDuration;
        const noMoreEnemies = this.enemyShips.length === 0 && this.spawnQueue.length === 0;
        
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
        this.spawnQueue = [];
        console.log('💀 Tous les ennemis éliminés');
    }

    // Rendu
    
    render(ctx, renderer) {
        // Rendre tous les bateaux ennemis
        this.enemyShips.forEach(ship => {
            ship.render(ctx, renderer);
        });
        
        // Interface de vague
        if (this.waveActive) {
            this.renderWaveUI(ctx, renderer);
        }
    }

    renderWaveUI(ctx, renderer) {
        const canvas = renderer.canvas;
        
        // Informations de vague en haut à droite
        const x = canvas.width - 200;
        const y = 20;
        
        // Fond
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 180, 80);
        
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 180, 80);
        
        // Texte
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`Vague ${this.currentWave}`, x + 10, y + 20);
        
        const remainingTime = Math.max(0, this.waveDuration - (Date.now() - this.waveStartTime));
        const timeSeconds = Math.ceil(remainingTime / 1000);
        ctx.fillText(`Temps: ${timeSeconds}s`, x + 10, y + 40);
        
        ctx.fillText(`Ennemis: ${this.enemyShips.length}`, x + 10, y + 60);
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