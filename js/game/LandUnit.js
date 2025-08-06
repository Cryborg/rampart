import { CELL_TYPES } from './Grid.js';

/**
 * Classe de base pour les unités terrestres (infanterie, tanks)
 */
export class LandUnit {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        
        // Configuration de l'unité
        this.type = config.type || 'infantry';
        this.health = config.health || 2;
        this.maxHealth = this.health;
        this.speed = config.speed || 1; // Cases par seconde
        this.size = config.size || 0.5; // Taille en cases
        this.damage = config.damage || 1;
        
        // État
        this.active = true;
        this.target = null; // Cible actuelle (château)
        this.path = []; // Chemin de navigation
        this.pathIndex = 0;
        this.isMoving = false;
        
        // IA
        this.aiState = 'seeking'; // seeking, attacking, blocking
        this.searchRadius = 20; // Rayon de recherche de cibles
        this.lastTargetSearch = 0;
        this.targetSearchInterval = 3000; // Rechercher cible toutes les 3s
        
        // Visuel
        this.color = this.getUnitColor();
        
        console.log(`🏃 Unité terrestre ${this.type} créée à (${x}, ${y})`);
    }

    getUnitColor() {
        switch (this.type) {
            case 'tank': return '#2d4a22'; // Vert foncé
            case 'infantry': 
            default: return '#8B4513'; // Marron pour infanterie
        }
    }

    update(deltaTime, gameManager) {
        if (!this.active) return;
        
        // Stocker la référence au gameManager
        this.gameManager = gameManager;
        
        // Mettre à jour l'IA
        this.updateAI(deltaTime, gameManager);
        
        // Mouvement
        if (this.path.length > 0) {
            this.updateMovement(deltaTime);
        }
    }

    updateAI(deltaTime, gameManager) {
        switch (this.aiState) {
            case 'seeking':
                this.seekTarget(gameManager);
                break;
            case 'attacking':
                this.attackBehavior(gameManager);
                break;
            case 'blocking':
                this.blockingBehavior(gameManager);
                break;
        }
    }

    seekTarget(gameManager) {
        const now = Date.now();
        if (now - this.lastTargetSearch < this.targetSearchInterval) return;
        
        this.lastTargetSearch = now;
        
        // Chercher le château ennemi le plus proche
        let closestCastle = null;
        let closestDistance = Infinity;
        
        for (let player of gameManager.players) {
            if (player.isDefeated || !player.castle.core) continue;
            
            const distance = this.getDistance(this.x, this.y, player.castle.core.x, player.castle.core.y);
            if (distance < closestDistance && distance <= this.searchRadius) {
                closestDistance = distance;
                closestCastle = player.castle.core;
            }
        }
        
        if (closestCastle) {
            this.target = closestCastle;
            this.calculatePathTo(closestCastle.x, closestCastle.y, gameManager.grid);
            this.aiState = 'attacking';
            console.log(`🎯 Unité terrestre trouve cible à (${closestCastle.x}, ${closestCastle.y})`);
        } else {
            // Se diriger vers le centre de la carte
            const centerX = Math.floor(gameManager.grid.width * 0.4);
            const centerY = Math.floor(gameManager.grid.height * 0.5);
            this.calculatePathTo(centerX, centerY, gameManager.grid);
        }
    }

    attackBehavior(gameManager) {
        if (!this.target) {
            this.aiState = 'seeking';
            return;
        }
        
        const distance = this.getDistance(this.x, this.y, this.target.x, this.target.y);
        
        if (distance <= 2) {
            // Proche du château, bloquer la reconstruction
            this.aiState = 'blocking';
            this.path = []; // Arrêter de bouger
            this.isMoving = false;
        } else if (distance > this.searchRadius) {
            // Cible trop loin, chercher une nouvelle cible
            this.target = null;
            this.aiState = 'seeking';
        } else if (this.path.length === 0) {
            // Recalculer le chemin vers la cible
            this.calculatePathTo(this.target.x, this.target.y, gameManager.grid);
        }
        
        // Vérifier si la cible est détruite
        const cell = gameManager.grid.getCell(this.target.x, this.target.y);
        if (!cell || cell.type !== 'castle-core') {
            this.target = null;
            this.aiState = 'seeking';
        }
    }

    blockingBehavior(gameManager) {
        // Rester sur place et gêner la reconstruction
        // Les unités en mode blocking empêchent le placement de pièces Tetris
        
        // Si la santé baisse trop, reprendre l'attaque
        if (this.health <= this.maxHealth * 0.3) {
            this.aiState = 'seeking';
        }
        
        // Bouger légèrement pour éviter d'être statique
        if (Math.random() < 0.01) { // 1% de chance par frame
            const moveRadius = 1;
            const newX = this.x + (Math.random() - 0.5) * moveRadius * 2;
            const newY = this.y + (Math.random() - 0.5) * moveRadius * 2;
            
            if (this.canMoveTo(newX, newY, gameManager.grid)) {
                this.calculatePathTo(newX, newY, gameManager.grid);
            }
        }
    }

    calculatePathTo(targetX, targetY, grid) {
        // Pathfinding simple pour unités terrestres
        this.path = this.findLandPath(this.x, this.y, targetX, targetY, grid);
        this.pathIndex = 0;
        this.isMoving = this.path.length > 0;
        
        if (this.path.length > 0) {
            console.log(`🗺️ Chemin terrestre calculé vers (${targetX}, ${targetY}) - ${this.path.length} étapes`);
        }
    }

    findLandPath(startX, startY, endX, endY, grid) {
        // Algorithme de pathfinding simple pour navigation terrestre
        const path = [];
        const visited = new Set();
        const queue = [{ x: Math.floor(startX), y: Math.floor(startY), path: [] }];
        
        const maxSteps = 100;
        let steps = 0;
        
        while (queue.length > 0 && steps < maxSteps) {
            steps++;
            const current = queue.shift();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Arrivé à destination
            const distance = this.getDistance(current.x, current.y, endX, endY);
            if (distance <= 1.5) {
                return current.path;
            }
            
            // Explorer les voisins
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 },
                // Diagonales pour mouvement plus fluide
                { x: current.x + 1, y: current.y + 1 },
                { x: current.x - 1, y: current.y - 1 },
                { x: current.x + 1, y: current.y - 1 },
                { x: current.x - 1, y: current.y + 1 }
            ];
            
            for (let neighbor of neighbors) {
                if (!this.canMoveTo(neighbor.x, neighbor.y, grid)) continue;
                
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (visited.has(neighborKey)) continue;
                
                queue.push({
                    x: neighbor.x,
                    y: neighbor.y,
                    path: [...current.path, { x: neighbor.x, y: neighbor.y }]
                });
            }
        }
        
        // Aucun chemin trouvé, se diriger directement vers la cible
        return [{ x: endX, y: endY }];
    }

    canMoveTo(x, y, grid) {
        if (!grid.isValidPosition(x, y)) return false;
        
        const cell = grid.getCell(x, y);
        if (!cell) return false;
        
        // Les unités terrestres peuvent se déplacer sur la terre et les zones détruites
        return cell.type === 'land' || cell.type === 'destroyed';
    }

    updateMovement(deltaTime) {
        if (!this.isMoving || this.path.length === 0) return;
        
        const currentTarget = this.path[this.pathIndex];
        if (!currentTarget) return;
        
        // Calculer la direction vers le prochain point
        const dx = currentTarget.x - this.x;
        const dy = currentTarget.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 0.1) {
            // Point atteint, passer au suivant
            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                this.path = [];
                this.pathIndex = 0;
                this.isMoving = false;
                console.log('🏃 Unité terrestre arrivée à destination');
                return;
            }
            return;
        }
        
        // Déplacement vers le point avec évitement de collision
        const moveDistance = (this.speed * deltaTime) / 1000;
        let moveX = (dx / distance) * moveDistance;
        let moveY = (dy / distance) * moveDistance;
        
        // Évitement simple avec autres unités terrestres
        const avoidanceVector = this.calculateAvoidance();
        if (avoidanceVector) {
            moveX += avoidanceVector.x * 0.2;
            moveY += avoidanceVector.y * 0.2;
        }
        
        this.x += moveX;
        this.y += moveY;
    }

    calculateAvoidance() {
        // Récupérer les autres unités terrestres
        const waveManager = this.gameManager?.waveManager;
        if (!waveManager || !waveManager.landUnits) return null;
        
        let avoidX = 0;
        let avoidY = 0;
        let nearbyUnits = 0;
        
        const avoidanceRadius = this.size * 2;
        
        for (let otherUnit of waveManager.landUnits) {
            if (otherUnit === this || !otherUnit.active) continue;
            
            const dx = this.x - otherUnit.x;
            const dy = this.y - otherUnit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < avoidanceRadius && distance > 0) {
                const strength = (avoidanceRadius - distance) / avoidanceRadius;
                avoidX += (dx / distance) * strength;
                avoidY += (dy / distance) * strength;
                nearbyUnits++;
            }
        }
        
        if (nearbyUnits > 0) {
            const length = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
            if (length > 0) {
                return {
                    x: (avoidX / length) * this.speed * 0.001,
                    y: (avoidY / length) * this.speed * 0.001
                };
            }
        }
        
        return null;
    }

    takeDamage(damage) {
        this.health -= damage;
        console.log(`🏃 Unité terrestre endommagée: ${this.health}/${this.maxHealth} HP`);
        
        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        
        return false;
    }

    destroy() {
        this.active = false;
        console.log(`💀 Unité terrestre ${this.type} détruite à (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    }

    render(ctx, renderer) {
        if (!this.active) return;
        
        const screenPos = renderer.gridToScreen(this.x, this.y);
        const cellSize = renderer.cellSize;
        const unitSize = cellSize * this.size;
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        
        // Corps de l'unité
        ctx.fillStyle = this.color;
        if (this.type === 'tank') {
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
        
        // Barre de vie
        this.renderHealthBar(ctx, screenPos.x, screenPos.y - unitSize/2 - 8, unitSize);
    }

    renderHealthBar(ctx, x, y, width) {
        const healthRatio = this.health / this.maxHealth;
        const barWidth = width * 0.8;
        const barHeight = 3;
        
        // Fond de la barre de vie
        ctx.fillStyle = '#666666';
        ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
        
        // Barre de vie
        const healthColor = healthRatio > 0.6 ? '#00ff00' : (healthRatio > 0.3 ? '#ffff00' : '#ff0000');
        ctx.fillStyle = healthColor;
        ctx.fillRect(x - barWidth / 2, y, barWidth * healthRatio, barHeight);
        
        // Bordure
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
    }

    getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // Vérification si l'unité bloque un placement de pièce
    blocksPlacement(pieceX, pieceY, pieceWidth, pieceHeight) {
        // Vérifier si l'unité est dans la zone de la pièce à placer
        const unitRadius = this.size / 2;
        
        // Vérifier si le centre de l'unité est dans la zone de placement
        return (this.x >= pieceX - unitRadius && 
                this.x <= pieceX + pieceWidth + unitRadius &&
                this.y >= pieceY - unitRadius && 
                this.y <= pieceY + pieceHeight + unitRadius);
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            health: this.health,
            maxHealth: this.maxHealth,
            aiState: this.aiState,
            active: this.active,
            target: this.target ? { x: this.target.x, y: this.target.y } : null
        };
    }
}

// Factory pour créer différents types d'unités terrestres
export class LandUnitFactory {
    static createInfantry(x, y) {
        return new LandUnit(x, y, {
            type: 'infantry',
            health: 2,
            speed: 1.2,
            size: 0.5,
            damage: 1
        });
    }

    static createTank(x, y) {
        return new LandUnit(x, y, {
            type: 'tank',
            health: 5,
            speed: 0.8,
            size: 0.8,
            damage: 2
        });
    }
}