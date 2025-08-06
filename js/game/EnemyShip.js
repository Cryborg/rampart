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
        this.hasLanded = false; // A déjà débarqué des troupes
        this.lastLandingTime = 0;
        
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
        
        // Stocker la référence au gameManager pour l'évitement
        this.gameManager = gameManager;
        
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
            // Naviguer vers le rivage le plus proche du château, pas directement au château
            const shoreTarget = this.findNearestShorePoint(closestCastle.x, closestCastle.y, gameManager.grid);
            // Vérifier que le point de rivage est bien dans l'eau
            const shoreCell = gameManager.grid.getCell(shoreTarget.x, shoreTarget.y);
            if (shoreCell && shoreCell.type === 'water') {
                this.calculatePathTo(shoreTarget.x, shoreTarget.y, gameManager.grid);
                this.aiState = 'attacking';
                console.log(`🎯 Bateau navigue vers le rivage (${shoreTarget.x}, ${shoreTarget.y}) pour atteindre château (${closestCastle.x}, ${closestCastle.y})`);
            } else {
                console.log(`⚠️ Point de rivage invalide (${shoreTarget.x}, ${shoreTarget.y}), patrouille`);
                this.patrolTowardsShore(gameManager.grid);
            }
        } else {
            // Patrouiller vers la côte
            this.patrolTowardsShore(gameManager.grid);
        }
    }

    attackBehavior(gameManager) {
        if (!this.target) {
            this.aiState = 'seeking';
            return;
        }
        
        // Vérifier si on est proche du rivage pour débarquer
        const shoreDistance = this.getDistanceToShore(gameManager.grid);
        if (shoreDistance <= 1.5 && !this.hasLanded) {
            this.attemptLanding(gameManager);
            return;
        }
        
        const distance = this.getDistance(this.x, this.y, this.target.x, this.target.y);
        
        if (distance <= this.range && this.hasLanded) {
            // À portée de tir et a déjà débarqué, arrêter de bouger et tirer
            this.path = [];
            this.isMoving = false;
        } else if (distance > this.searchRadius) {
            // Cible trop loin, chercher une nouvelle cible
            this.target = null;
            this.aiState = 'seeking';
        } else if (this.path.length === 0 && !this.hasLanded) {
            // Recalculer le chemin vers la cible (rivage) uniquement si pas encore débarqué
            const shoreTarget = this.findNearestShorePoint(this.target.x, this.target.y, gameManager.grid);
            const shoreCell = gameManager.grid.getCell(shoreTarget.x, shoreTarget.y);
            if (shoreCell && shoreCell.type === 'water') {
                this.calculatePathTo(shoreTarget.x, shoreTarget.y, gameManager.grid);
            }
        }
        
        // Vérifier si la cible est détruite
        const cell = gameManager.grid.getCell(this.target.x, this.target.y);
        if (!cell || cell.type !== 'castle-core') {
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

    patrolTowardsShore(grid) {
        // Se diriger vers la côte gauche pour chercher un point de débarquement
        if (this.path.length === 0) {
            const shoreX = Math.floor(grid.width * 0.6) + Math.floor(Math.random() * 5) - 2;
            const targetY = this.y + (Math.random() - 0.5) * 8;
            this.calculatePathTo(shoreX, Math.max(1, Math.min(grid.height - 2, targetY)), grid);
        }
    }

    findNearestShorePoint(castleX, castleY, grid) {
        // Trouver le point de rivage le plus proche du château pour le débarquement
        let bestShorePoint = null;
        let bestDistance = Infinity;
        
        // Chercher le long de la côte (zone de transition terre/eau)
        const coastStartX = Math.floor(grid.width * 0.5);
        const coastEndX = Math.floor(grid.width * 0.7);
        
        for (let x = coastStartX; x < coastEndX; x++) {
            for (let y = 1; y < grid.height - 1; y++) {
                const currentCell = grid.getCell(x, y);
                const leftCell = grid.getCell(x - 1, y);
                
                // Point de rivage = eau avec terre à gauche
                if (currentCell && currentCell.type === 'water' && 
                    leftCell && leftCell.type === 'land') {
                    
                    const distanceToTarget = this.getDistance(x, y, castleX, castleY);
                    if (distanceToTarget < bestDistance) {
                        bestDistance = distanceToTarget;
                        bestShorePoint = { x, y };
                    }
                }
            }
        }
        
        // Si pas de point trouvé, chercher un point d'eau sûr près de la position actuelle
        if (!bestShorePoint) {
            // Chercher de l'eau près du bateau
            for (let radius = 1; radius <= 5; radius++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dy = -radius; dy <= radius; dy++) {
                        const checkX = Math.floor(this.x) + dx;
                        const checkY = Math.floor(this.y) + dy;
                        
                        if (grid.isValidPosition(checkX, checkY)) {
                            const cell = grid.getCell(checkX, checkY);
                            if (cell && cell.type === 'water') {
                                return { x: checkX, y: checkY };
                            }
                        }
                    }
                }
            }
            
            // En dernier recours, rester sur place
            return { x: this.x, y: this.y };
        }
        
        return bestShorePoint;
    }

    getDistanceToShore(grid) {
        // Calculer la distance au rivage le plus proche
        let minDistance = Infinity;
        
        // Chercher le long de la côte
        const coastStartX = Math.floor(grid.width * 0.5);
        const coastEndX = Math.floor(grid.width * 0.7);
        
        for (let x = coastStartX; x < coastEndX; x++) {
            for (let y = 1; y < grid.height - 1; y++) {
                const currentCell = grid.getCell(x, y);
                const leftCell = grid.getCell(x - 1, y);
                
                // Point de rivage = eau avec terre à gauche
                if (currentCell && currentCell.type === 'water' && 
                    leftCell && leftCell.type === 'land') {
                    
                    const distance = this.getDistance(this.x, this.y, x, y);
                    minDistance = Math.min(minDistance, distance);
                }
            }
        }
        
        return minDistance;
    }

    attemptLanding(gameManager) {
        const now = Date.now();
        
        // Cooldown entre débarquements (éviter le spam)
        if (now - this.lastLandingTime < 5000) return;
        
        // Trouver le point de débarquement le plus proche
        const landingPoint = this.findLandingPoint(gameManager.grid);
        if (!landingPoint) {
            console.log('🚢 Pas de point de débarquement trouvé');
            return;
        }
        
        // Créer les troupes selon le type de bateau
        this.deployTroops(landingPoint, gameManager);
        
        this.hasLanded = true;
        this.lastLandingTime = now;
        
        console.log(`🏃 Débarquement effectué à (${landingPoint.x}, ${landingPoint.y})`);
    }

    findLandingPoint(grid) {
        // Chercher un point de terre adjacent à notre position
        const searchRadius = 2;
        
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                const checkX = Math.floor(this.x + dx);
                const checkY = Math.floor(this.y + dy);
                
                if (grid.isValidPosition(checkX, checkY)) {
                    const cell = grid.getCell(checkX, checkY);
                    if (cell && (cell.type === 'land' || cell.type === 'destroyed')) {
                        return { x: checkX, y: checkY };
                    }
                }
            }
        }
        
        return null;
    }

    deployTroops(landingPoint, gameManager) {
        const waveManager = gameManager.waveManager;
        if (!waveManager) return;
        
        // Initialiser le tableau des unités terrestres si nécessaire
        if (!waveManager.landUnits) {
            waveManager.landUnits = [];
        }
        
        // Nombre de troupes selon le type de bateau
        let troopCount = 0;
        let tankChance = 0;
        
        switch (this.type) {
            case 'basic':
                troopCount = 2 + Math.floor(Math.random() * 2); // 2-3 troupes
                tankChance = 0.1; // 10% de chance de tank
                break;
            case 'fast':
                troopCount = 1 + Math.floor(Math.random() * 2); // 1-2 troupes
                tankChance = 0.05; // 5% de chance de tank
                break;
            case 'heavy':
                troopCount = 3 + Math.floor(Math.random() * 3); // 3-5 troupes
                tankChance = 0.25; // 25% de chance de tank
                break;
            case 'artillery':
                troopCount = 2 + Math.floor(Math.random() * 2); // 2-3 troupes
                tankChance = 0.4; // 40% de chance de tank
                break;
        }
        
        // Créer les troupes
        for (let i = 0; i < troopCount; i++) {
            // Position de débarquement avec légère variation
            const troopX = landingPoint.x + (Math.random() - 0.5) * 2;
            const troopY = landingPoint.y + (Math.random() - 0.5) * 2;
            
            let unit;
            if (Math.random() < tankChance) {
                // Créer un tank
                unit = this.createTank(troopX, troopY);
                console.log(`🚗 Tank débarqué à (${troopX.toFixed(1)}, ${troopY.toFixed(1)})`);
            } else {
                // Créer de l'infanterie
                unit = this.createInfantry(troopX, troopY);
                console.log(`🏃 Infanterie débarquée à (${troopX.toFixed(1)}, ${troopY.toFixed(1)})`);
            }
            
            waveManager.landUnits.push(unit);
        }
    }

    createInfantry(x, y) {
        // Import dynamique pour éviter les dépendances circulaires
        return new (class Infantry {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.type = 'infantry';
                this.health = 2;
                this.maxHealth = 2;
                this.speed = 1.2;
                this.size = 0.5;
                this.damage = 1;
                this.active = true;
                this.target = null;
                this.path = [];
                this.pathIndex = 0;
                this.isMoving = false;
                this.aiState = 'seeking';
                this.searchRadius = 20;
                this.lastTargetSearch = 0;
                this.targetSearchInterval = 3000;
                this.color = '#8B4513';
            }
            
            // Méthodes basiques pour le rendu et l'update - à compléter avec LandUnit
            update(deltaTime, gameManager) { /* TODO: implémenter */ }
            render(ctx, renderer) { /* TODO: implémenter */ }
            takeDamage(damage) { 
                this.health -= damage;
                if (this.health <= 0) {
                    this.active = false;
                    return true;
                }
                return false;
            }
            getDistance(x1, y1, x2, y2) {
                return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            }
        })(x, y);
    }

    createTank(x, y) {
        return new (class Tank {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.type = 'tank';
                this.health = 5;
                this.maxHealth = 5;
                this.speed = 0.8;
                this.size = 0.8;
                this.damage = 2;
                this.active = true;
                this.target = null;
                this.path = [];
                this.pathIndex = 0;
                this.isMoving = false;
                this.aiState = 'seeking';
                this.searchRadius = 20;
                this.lastTargetSearch = 0;
                this.targetSearchInterval = 3000;
                this.color = '#2d4a22';
            }
            
            // Méthodes basiques pour le rendu et l'update - à compléter avec LandUnit
            update(deltaTime, gameManager) { /* TODO: implémenter */ }
            render(ctx, renderer) { /* TODO: implémenter */ }
            takeDamage(damage) { 
                this.health -= damage;
                if (this.health <= 0) {
                    this.active = false;
                    return true;
                }
                return false;
            }
            getDistance(x1, y1, x2, y2) {
                return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            }
        })(x, y);
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
        
        // Aucun chemin trouvé, rester sur place plutôt que d'aller sur terre
        console.log(`⚠️ Aucun chemin naval trouvé vers (${endX}, ${endY})`);
        return [];
    }

    canNavigateTo(x, y, grid) {
        if (!grid.isValidPosition(x, y)) return false;
        
        const cell = grid.getCell(x, y);
        if (!cell) return false;
        
        // Les bateaux ne peuvent naviguer que sur l'eau (simple !)
        return cell.type === 'water';
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
                return;
            }
            return;
        }
        
        // Déplacement vers le point avec évitement de collision
        const moveDistance = (this.speed * deltaTime) / 1000;
        let moveX = (dx / distance) * moveDistance;
        let moveY = (dy / distance) * moveDistance;
        
        // Vérifier les collisions avec autres bateaux et ajuster la trajectoire
        const avoidanceVector = this.calculateAvoidance();
        if (avoidanceVector) {
            moveX += avoidanceVector.x * 0.3; // 30% de poids pour l'évitement
            moveY += avoidanceVector.y * 0.3;
        }
        
        this.x += moveX;
        this.y += moveY;
        
        // Les bateaux ne changent plus d'orientation
    }
    
    calculateAvoidance() {
        // Récupérer les autres bateaux depuis le gameManager
        const waveManager = this.gameManager?.waveManager;
        if (!waveManager || !waveManager.enemyShips) return null;
        
        let avoidX = 0;
        let avoidY = 0;
        let nearbyShips = 0;
        
        const avoidanceRadius = this.size * 1.5; // Distance minimale entre bateaux
        
        for (let otherShip of waveManager.enemyShips) {
            if (otherShip === this || !otherShip.active) continue;
            
            const dx = this.x - otherShip.x;
            const dy = this.y - otherShip.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < avoidanceRadius && distance > 0) {
                // Force de répulsion inversement proportionnelle à la distance
                const strength = (avoidanceRadius - distance) / avoidanceRadius;
                avoidX += (dx / distance) * strength;
                avoidY += (dy / distance) * strength;
                nearbyShips++;
            }
        }
        
        if (nearbyShips > 0) {
            // Normaliser le vecteur d'évitement
            const length = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
            if (length > 0) {
                return {
                    x: (avoidX / length) * this.speed * 0.001, // Conversion en unité de mouvement
                    y: (avoidY / length) * this.speed * 0.001
                };
            }
        }
        
        return null;
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
        const shipScale = 4; // Agrandir x4
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        // Ne plus utiliser l'angle de rotation - bateaux toujours orientés vers la gauche
        
        // Corps du bateau (4x plus grand) - orienté horizontalement vers la gauche
        ctx.fillStyle = this.color;
        ctx.fillRect(-cellSize * 0.4 * shipScale, -cellSize * 0.2 * shipScale, 
                     cellSize * 0.8 * shipScale, cellSize * 0.4 * shipScale);
        
        // Proue du bateau (4x plus grande) - pointant vers la gauche
        ctx.beginPath();
        ctx.moveTo(-cellSize * 0.4 * shipScale, 0);
        ctx.lineTo(-cellSize * 0.2 * shipScale, -cellSize * 0.15 * shipScale);
        ctx.lineTo(-cellSize * 0.2 * shipScale, cellSize * 0.15 * shipScale);
        ctx.closePath();
        ctx.fill();
        
        // Mât vertical (4x plus grand)
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2 * shipScale;
        ctx.beginPath();
        ctx.moveTo(0, -cellSize * 0.2 * shipScale);
        ctx.lineTo(0, -cellSize * 0.6 * shipScale);
        ctx.stroke();
        
        // Voile (4x plus grande) - toujours vers le haut
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-cellSize * 0.15 * shipScale, -cellSize * 0.6 * shipScale, 
                     cellSize * 0.3 * shipScale, cellSize * 0.3 * shipScale);
        
        ctx.restore();
        
        // Barre de vie (4x plus grande)
        this.renderHealthBar(ctx, screenPos.x, screenPos.y - cellSize * 0.7 * shipScale, cellSize * shipScale);
        
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
            health: 5, // Points de vie augmentés
            speed: 0.72, // +20% (0.6 * 1.2 = 0.72)
            range: 8,
            damage: 1,
            fireRate: 3000,
            size: 4 // Hitbox 4x plus grande
        });
    }

    static createFastShip(x, y) {
        return new EnemyShip(x, y, {
            type: 'fast',
            health: 5, // Points de vie augmentés
            speed: 1.44, // +20% (1.2 * 1.2 = 1.44)
            range: 6,
            damage: 1,
            fireRate: 2000,
            size: 4 // Hitbox 4x plus grande
        });
    }

    static createHeavyShip(x, y) {
        return new EnemyShip(x, y, {
            type: 'heavy',
            health: 7, // Plus résistant
            speed: 0.36, // +20% (0.3 * 1.2 = 0.36)
            range: 10,
            damage: 2,
            fireRate: 4000,
            size: 4 // Hitbox 4x plus grande
        });
    }

    static createArtilleryShip(x, y) {
        return new EnemyShip(x, y, {
            type: 'artillery',
            health: 6, // Plus résistant
            speed: 0.54, // +20% (0.45 * 1.2 = 0.54)
            range: 15,
            damage: 3,
            fireRate: 5000,
            size: 4 // Hitbox 4x plus grande
        });
    }
}