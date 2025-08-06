import { Projectile } from './Projectile.js';
import { CELL_TYPES } from './Grid.js';

export class EnemyShip {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        
        // Configuration du bateau
        this.type = config.type || 'basic';
        this.health = config.health || 3;
        this.maxHealth = this.health;
        this.speed = config.speed || 2; // Cases par seconde
        this.range = config.range || 8; // Portée de tir
        this.damage = config.damage || 1;
        this.fireRate = config.fireRate || 3000; // Temps entre tirs (ms)
        this.size = config.size || 1; // Taille en cases (1x1, 2x2, etc.)
        
        // État
        this.active = true;
        this.target = null; // Cible actuelle
        this.path = []; // Chemin de navigation
        this.pathIndex = 0;
        this.lastFireTime = 0;
        this.isMoving = false;
        
        // IA
        this.aiState = 'seeking'; // seeking, attacking, fleeing, destroyed
        this.searchRadius = 15; // Rayon de recherche de cibles
        this.lastTargetSearch = 0;
        this.targetSearchInterval = 2000; // Rechercher cible toutes les 2s
        
        // Visuel
        this.angle = 0; // Orientation du bateau
        this.color = this.getShipColor();
        
        console.log(`🚢 Bateau ennemi ${this.type} créé à (${x}, ${y})`);
    }

    getShipColor() {
        switch (this.type) {
            case 'fast': return '#ff4444';
            case 'heavy': return '#444444';
            case 'artillery': return '#ff8800';
            default: return '#8B4513'; // Marron pour bateau basique
        }
    }

    update(deltaTime, gameManager) {
        if (!this.active) return;
        
        // Mettre à jour l'IA
        this.updateAI(deltaTime, gameManager);
        
        // Mouvement
        if (this.path.length > 0) {
            this.updateMovement(deltaTime);
        }
        
        // Combat
        if (this.target && this.canAttackTarget()) {
            this.updateCombat(deltaTime, gameManager);
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
            case 'fleeing':
                this.fleeBehavior(gameManager);
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
            console.log(`🎯 Bateau trouve cible à (${closestCastle.x}, ${closestCastle.y})`);
        } else {
            // Patrouiller aléatoirement
            this.patrol(gameManager.grid);
        }
    }

    attackBehavior(gameManager) {
        if (!this.target) {
            this.aiState = 'seeking';
            return;
        }
        
        const distance = this.getDistance(this.x, this.y, this.target.x, this.target.y);
        
        if (distance <= this.range) {
            // À portée de tir, arrêter de bouger et tirer
            this.path = [];
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
        if (!cell || cell.type !== CELL_TYPES.CASTLE_CORE) {
            this.target = null;
            this.aiState = 'seeking';
        }
    }

    fleeBehavior(gameManager) {
        // Fuir vers le bord de la carte le plus proche
        if (this.path.length === 0) {
            this.calculateFleeRoute(gameManager.grid);
        }
        
        // Si la santé remonte, reprendre l'attaque
        if (this.health > this.maxHealth * 0.3) {
            this.aiState = 'seeking';
        }
    }

    patrol(grid) {
        // Mouvement de patrouille aléatoire dans l'eau
        if (this.path.length === 0) {
            const patrolRadius = 5;
            const targetX = this.startX + (Math.random() - 0.5) * patrolRadius * 2;
            const targetY = this.startY + (Math.random() - 0.5) * patrolRadius * 2;
            
            this.calculatePathTo(targetX, targetY, grid);
        }
    }

    calculatePathTo(targetX, targetY, grid) {
        // Pathfinding simple (A* simplifié pour l'eau)
        this.path = this.findWaterPath(this.x, this.y, targetX, targetY, grid);
        this.pathIndex = 0;
        this.isMoving = this.path.length > 0;
        
        if (this.path.length > 0) {
            console.log(`🗺️ Chemin calculé vers (${targetX}, ${targetY}) - ${this.path.length} étapes`);
        }
    }

    findWaterPath(startX, startY, endX, endY, grid) {
        // Algorithme de pathfinding simple pour navigation maritime
        const path = [];
        const visited = new Set();
        const queue = [{ x: Math.floor(startX), y: Math.floor(startY), path: [] }];
        
        const maxSteps = 100; // Limite pour éviter les boucles infinies
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
                if (!this.canNavigateTo(neighbor.x, neighbor.y, grid)) continue;
                
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

    canNavigateTo(x, y, grid) {
        if (!grid.isValidPosition(x, y)) return false;
        
        const cell = grid.getCell(x, y);
        if (!cell) return false;
        
        // Les bateaux ne peuvent naviguer que sur l'eau
        return cell.type === CELL_TYPES.WATER;
    }

    calculateFleeRoute(grid) {
        // Fuir vers le bord de la carte le plus proche
        const borders = [
            { x: 0, y: this.y }, // Gauche
            { x: grid.width - 1, y: this.y }, // Droite
            { x: this.x, y: 0 }, // Haut
            { x: this.x, y: grid.height - 1 } // Bas
        ];
        
        let closestBorder = borders[0];
        let closestDistance = this.getDistance(this.x, this.y, closestBorder.x, closestBorder.y);
        
        for (let border of borders) {
            const distance = this.getDistance(this.x, this.y, border.x, border.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestBorder = border;
            }
        }
        
        this.calculatePathTo(closestBorder.x, closestBorder.y, grid);
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
                console.log('🚢 Bateau arrivé à destination');
            }
            return;
        }
        
        // Déplacement vers le point
        const moveDistance = (this.speed * deltaTime) / 1000;
        const moveX = (dx / distance) * moveDistance;
        const moveY = (dy / distance) * moveDistance;
        
        this.x += moveX;
        this.y += moveY;
        
        // Mettre à jour l'orientation
        this.angle = Math.atan2(dy, dx);
    }

    updateCombat(deltaTime, gameManager) {
        const now = Date.now();
        if (now - this.lastFireTime < this.fireRate) return;
        
        if (this.target && this.canAttackTarget()) {
            this.fireAt(this.target, gameManager.combatSystem);
            this.lastFireTime = now;
        }
    }

    canAttackTarget() {
        if (!this.target) return false;
        
        const distance = this.getDistance(this.x, this.y, this.target.x, this.target.y);
        return distance <= this.range;
    }

    fireAt(target, combatSystem) {
        console.log(`💥 Bateau tire sur (${target.x}, ${target.y})`);
        
        // Créer un projectile ennemi
        const projectile = new Projectile(
            this.x, this.y,
            target.x, target.y,
            {
                speed: 12,
                damage: this.damage,
                type: 'cannonball',
                color: '#ff4444', // Rouge pour les ennemis
                maxLifetime: 8000
            }
        );
        
        // Configurer l'impact pour les projectiles ennemis
        projectile.onImpact = (x, y) => {
            combatSystem.handleProjectileImpact(projectile, x, y);
        };
        
        // Ajouter aux projectiles du système de combat
        combatSystem.projectiles.push(projectile);
    }

    takeDamage(damage) {
        this.health -= damage;
        console.log(`🚢 Bateau endommagé: ${this.health}/${this.maxHealth} HP`);
        
        if (this.health <= 0) {
            this.destroy();
            return true; // Bateau détruit
        } else if (this.health <= this.maxHealth * 0.3) {
            // Bateau gravement endommagé, fuir
            this.aiState = 'fleeing';
        }
        
        return false; // Bateau endommagé mais pas détruit
    }

    destroy() {
        this.active = false;
        this.aiState = 'destroyed';
        console.log(`💀 Bateau ennemi détruit à (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    }

    render(ctx, renderer) {
        if (!this.active) return;
        
        const screenPos = renderer.gridToScreen(this.x, this.y);
        const cellSize = renderer.cellSize;
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(this.angle);
        
        // Corps du bateau
        ctx.fillStyle = this.color;
        ctx.fillRect(-cellSize * 0.4, -cellSize * 0.2, cellSize * 0.8, cellSize * 0.4);
        
        // Proue du bateau
        ctx.beginPath();
        ctx.moveTo(cellSize * 0.4, 0);
        ctx.lineTo(cellSize * 0.2, -cellSize * 0.15);
        ctx.lineTo(cellSize * 0.2, cellSize * 0.15);
        ctx.closePath();
        ctx.fill();
        
        // Mât
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -cellSize * 0.2);
        ctx.lineTo(0, -cellSize * 0.6);
        ctx.stroke();
        
        // Voile
        if (this.isMoving) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-cellSize * 0.15, -cellSize * 0.6, cellSize * 0.3, cellSize * 0.3);
        }
        
        ctx.restore();
        
        // Barre de vie
        this.renderHealthBar(ctx, screenPos.x, screenPos.y - cellSize * 0.7, cellSize);
        
        // Indicateur de cible (debug)
        if (this.target) {
            const targetScreenPos = renderer.gridToScreen(this.target.x, this.target.y);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(screenPos.x, screenPos.y);
            ctx.lineTo(targetScreenPos.x, targetScreenPos.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    renderHealthBar(ctx, x, y, width) {
        const healthRatio = this.health / this.maxHealth;
        const barWidth = width * 0.8;
        const barHeight = 4;
        
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

    // Sérialisation pour debug/save
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

// Factory pour créer différents types de bateaux
export class ShipFactory {
    static createBasicShip(x, y) {
        return new EnemyShip(x, y, {
            type: 'basic',
            health: 3,
            speed: 2,
            range: 8,
            damage: 1,
            fireRate: 3000
        });
    }

    static createFastShip(x, y) {
        return new EnemyShip(x, y, {
            type: 'fast',
            health: 2,
            speed: 4,
            range: 6,
            damage: 1,
            fireRate: 2000
        });
    }

    static createHeavyShip(x, y) {
        return new EnemyShip(x, y, {
            type: 'heavy',
            health: 6,
            speed: 1,
            range: 10,
            damage: 2,
            fireRate: 4000
        });
    }

    static createArtilleryShip(x, y) {
        return new EnemyShip(x, y, {
            type: 'artillery',
            health: 4,
            speed: 1.5,
            range: 15,
            damage: 3,
            fireRate: 5000
        });
    }
}