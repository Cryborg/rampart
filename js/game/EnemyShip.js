import { Projectile } from './Projectile.js';
import { CELL_TYPES } from './Grid.js';
import { GAME_CONFIG } from '../config/GameConstants.js';
import { getDistance, Logger } from '../utils/GameUtils.js';
import { PathfindingService } from '../services/PathfindingService.js';
import { LandUnitFactory } from './LandUnit.js';

// Utilisation des niveaux d'expérience depuis les constantes
export const EXPERIENCE_LEVELS = GAME_CONFIG.EXPERIENCE_LEVELS;

export class EnemyShip {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        
        // Configuration du bateau
        this.type = config.type || 'basic';
        this.health = config.health || 5; // Valeur par défaut cohérente avec basic ship
        this.maxHealth = this.health;
        this.speed = config.speed || 2; // Cases par seconde
        this.damage = config.damage || 1;
        this.fireRate = config.fireRate || 7000; // Temps entre tirs (7s de base)
        this.size = config.size || 1; // Taille en cases (1x1, 2x2, etc.)
        
        // Niveau d'expérience du navire
        this.experienceLevel = config.experienceLevel || EXPERIENCE_LEVELS.MEDIUM;
        
        // État
        this.active = true;
        this.target = null; // Cible actuelle
        this.path = []; // Chemin de navigation
        this.pathIndex = 0;
        this.lastFireTime = 0;
        this.nextFireTime = 0; // Timestamp du prochain tir autorisé
        this.isMoving = false;
        this.hasLanded = false; // A déjà débarqué des troupes
        this.lastLandingTime = 0;
        
        // Système de précision progressive
        this.shotsFired = 0; // Nombre de tirs effectués sur la cible actuelle
        
        // IA
        this.aiState = 'seeking'; // seeking, attacking, fleeing, destroyed
        this.searchRadius = 50; // Rayon de recherche de cibles (augmenté pour être sûr)
        this.lastTargetSearch = 0;
        this.targetSearchInterval = 2000; // Rechercher cible toutes les 2s
        
        // Visuel
        this.angle = 0; // Orientation du bateau
        this.color = this.getShipColor();
        
        console.log(`🚢 Bateau ennemi ${this.type} (${this.experienceLevel.name}) créé à (${x}, ${y})`);
    }

    getShipColor() {
        const colors = GAME_CONFIG.COLORS;
        switch (this.type) {
            case 'fast': return colors.SHIP_FAST;
            case 'heavy': return colors.SHIP_HEAVY;
            case 'artillery': return colors.SHIP_ARTILLERY;
            default: return colors.SHIP_BASIC;
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
        
        // Chercher le MUR le plus proche autour d'un château ennemi
        let closestWallTarget = null;
        let closestDistance = Infinity;
        
        for (let player of gameManager.players) {
            if (player.isDefeated || !player.castle?.core) {
                console.log(`🚢 Joueur ${player.id} n'a pas de château ou est défait`);
                continue;
            }
            
            // Chercher les murs autour du château de ce joueur
            const wallTarget = this.findNearestWallAroundCastle(player.castle.core, gameManager.grid);
            if (wallTarget) {
                const distance = getDistance(this.x, this.y, wallTarget.x, wallTarget.y);
                console.log(`🚢 Distance au mur cible près du château ${player.id}: ${distance.toFixed(1)} (max: ${this.searchRadius})`);
                if (distance < closestDistance && distance <= this.searchRadius) {
                    closestDistance = distance;
                    closestWallTarget = wallTarget;
                    console.log(`🎯 Nouveau mur cible: (${closestWallTarget.x}, ${closestWallTarget.y}) près du château ${player.id}`);
                }
            }
        }
        
        if (closestWallTarget) {
            this.setTarget(closestWallTarget);
            // Naviguer vers le rivage le plus proche du mur cible
            const shoreTarget = this.findNearestShorePoint(closestWallTarget.x, closestWallTarget.y, gameManager.grid);
            // Vérifier que le point de rivage est bien dans l'eau
            const shoreCell = gameManager.grid.getCell(shoreTarget.x, shoreTarget.y);
            if (shoreCell && shoreCell.type === 'water') {
                this.calculatePathTo(shoreTarget.x, shoreTarget.y, gameManager.grid);
                this.aiState = 'attacking';
                console.log(`🎯 Bateau navigue vers le rivage (${shoreTarget.x}, ${shoreTarget.y}) pour attaquer le mur (${closestWallTarget.x}, ${closestWallTarget.y})`);
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
        
        const distance = getDistance(this.x, this.y, this.target.x, this.target.y);
        
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
        
        // Vérifier si la cible (mur) est détruite
        const cell = gameManager.grid.getCell(this.target.x, this.target.y);
        if (!cell || cell.type !== 'wall') {
            // Le mur a été détruit, chercher un nouveau mur à attaquer
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

    findNearestWallAroundCastle(castleCore, grid) {
        // Chercher PLUSIEURS murs autour du château et en choisir un aléatoirement
        const searchRadius = 10;
        const wallCandidates = [];
        
        console.log(`🔍 Recherche de murs autour du château à (${castleCore.x}, ${castleCore.y})`);
        
        for (let x = Math.max(0, castleCore.x - searchRadius); 
             x < Math.min(grid.width, castleCore.x + searchRadius + 1); x++) {
            for (let y = Math.max(0, castleCore.y - searchRadius); 
                 y < Math.min(grid.height, castleCore.y + searchRadius + 1); y++) {
                
                const cell = grid.getCell(x, y);
                if (cell && cell.type === 'wall') {
                    const distance = getDistance(castleCore.x, castleCore.y, x, y);
                    wallCandidates.push({ x, y, distance });
                }
            }
        }
        
        if (wallCandidates.length === 0) {
            console.log(`⚠️ Aucun mur trouvé autour du château à (${castleCore.x}, ${castleCore.y})`);
            return null;
        }
        
        // Choisir complètement aléatoirement parmi TOUS les murs disponibles
        const chosenWall = wallCandidates[Math.floor(Math.random() * wallCandidates.length)];
        
        console.log(`🧱 Mur choisi à (${chosenWall.x}, ${chosenWall.y}) à distance ${chosenWall.distance.toFixed(1)} du château (${wallCandidates.length} candidats)`);
        
        return { x: chosenWall.x, y: chosenWall.y };
    }

    findNearestShorePoint(castleX, castleY, grid) {
        // Trouver le point de rivage le plus proche du château pour le débarquement
        let bestShorePoint = null;
        let bestDistance = Infinity;
        
        console.log(`🏖️ Recherche point de rivage proche du château (${castleX}, ${castleY})`);
        
        // Zone de débarquement TRÈS élargie pour plus de dispersion
        const zoneCenterY = castleY;
        const zoneRadius = 8; // ±8 cases au lieu de ±5
        const zoneMinY = Math.max(1, zoneCenterY - zoneRadius);
        const zoneMaxY = Math.min(grid.height - 2, zoneCenterY + zoneRadius);
        
        console.log(`🏖️ Zone de débarquement élargie: Y=${zoneMinY} à ${zoneMaxY} (rayon=${zoneRadius})`);
        
        // Chercher le long de la côte (zone de transition terre/eau) - élargie
        const coastStartX = Math.floor(grid.width * 0.4); 
        const coastEndX = Math.floor(grid.width * 0.8);
        
        // Collecter TOUS les points de rivage dans la zone élargie
        const candidateShorePoints = [];
        
        for (let x = coastStartX; x < coastEndX; x++) {
            for (let y = zoneMinY; y <= zoneMaxY; y++) {
                const currentCell = grid.getCell(x, y);
                const leftCell = grid.getCell(x - 1, y);
                
                // Point de rivage = eau avec terre à gauche
                if (currentCell && currentCell.type === 'water' && 
                    leftCell && leftCell.type === 'land') {
                    
                    candidateShorePoints.push({ x, y });
                }
            }
        }
        
        console.log(`🏖️ ${candidateShorePoints.length} points de rivage trouvés dans la zone élargie`);
        
        // Choisir un point ALÉATOIRE parmi les candidats au lieu du plus proche
        if (candidateShorePoints.length > 0) {
            const randomIndex = Math.floor(Math.random() * candidateShorePoints.length);
            bestShorePoint = candidateShorePoints[randomIndex];
            console.log(`🎯 Point choisi aléatoirement: (${bestShorePoint.x}, ${bestShorePoint.y}) - index ${randomIndex}/${candidateShorePoints.length-1}`);
        }
        
        
        
        // Si pas de point trouvé, naviguer vers la côte ouest (approximation simple)
        if (!bestShorePoint) {
            console.log(`⚠️ Aucun point de rivage trouvé, navigation vers côte ouest`);
            
            // Naviguer vers la zone côtière (où la terre rencontre la mer)
            // Chercher dans la zone entre terre et mer (zone de transition)
            const targetX = Math.floor(grid.width * 0.6); // 60% vers l'ouest
            const targetY = Math.floor(zoneCenterY); // Niveau Y centré sur la zone
            
            // Trouver le point d'eau le plus proche de cette zone cible
            for (let radius = 0; radius <= 10; radius++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dy = -radius; dy <= radius; dy++) {
                        const checkX = targetX + dx;
                        const checkY = targetY + dy;
                        
                        if (grid.isValidPosition(checkX, checkY)) {
                            const cell = grid.getCell(checkX, checkY);
                            if (cell && cell.type === 'water') {
                                console.log(`🎯 Point de navigation trouvé: (${checkX}, ${checkY})`);
                                return { x: checkX, y: checkY };
                            }
                        }
                    }
                }
            }
            
            // En dernier recours, rester sur place
            console.log(`❌ Aucun point de navigation trouvé, reste sur place`);
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
                    
                    const distance = getDistance(this.x, this.y, x, y);
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
        if (!landingPoint) return;
        
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
        console.log(`🪖 ${troopCount} unités terrestres débarquent !`);
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
        return LandUnitFactory.createInfantry(x, y);
    }

    createTank(x, y) {
        return LandUnitFactory.createTank(x, y);
    }

    calculatePathTo(targetX, targetY, grid) {
        // Pathfinding simple (A* simplifié pour l'eau)
        this.path = PathfindingService.findWaterPath(this.x, this.y, targetX, targetY, grid);
        this.pathIndex = 0;
        this.isMoving = this.path.length > 0;
        
        if (this.path.length > 0) {
            console.log(`🗺️ Chemin calculé vers (${targetX}, ${targetY}) - ${this.path.length} étapes, isMoving=${this.isMoving}`);
            console.log(`📍 Position actuelle: (${this.x.toFixed(1)}, ${this.y.toFixed(1)}), Première étape: (${this.path[0].x}, ${this.path[0].y})`);
        } else {
            console.log(`❌ Aucun chemin trouvé depuis (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) vers (${targetX}, ${targetY})`);
        }
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
        let closestDistance = getDistance(this.x, this.y, closestBorder.x, closestBorder.y);
        
        for (let border of borders) {
            const distance = getDistance(this.x, this.y, border.x, border.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestBorder = border;
            }
        }
        
        this.calculatePathTo(closestBorder.x, closestBorder.y, grid);
    }

    updateMovement(deltaTime) {
        if (!this.isMoving) {
            console.log(`🚢 Bateau (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) - PAS EN MOUVEMENT (isMoving=false)`);
            return;
        }
        
        if (this.path.length === 0) {
            console.log(`🚢 Bateau (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) - PAS DE CHEMIN`);
            return;
        }
        
        const currentTarget = this.path[this.pathIndex];
        if (!currentTarget) {
            console.log(`🚢 Bateau - PAS DE CIBLE COURANTE (pathIndex=${this.pathIndex}, pathLength=${this.path.length})`);
            return;
        }
        
        // Calculer la direction vers le prochain point
        const dx = currentTarget.x - this.x;
        const dy = currentTarget.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // console.log(`🚢 Mouvement: (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) → (${currentTarget.x}, ${currentTarget.y}) distance=${distance.toFixed(2)}`);
        
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
            console.log(`🚢 Point atteint, passage au suivant (${this.pathIndex}/${this.path.length})`);
            return;
        }
        
        // Déplacement vers le point avec évitement de collision
        const moveDistance = (this.speed * deltaTime) / 1000;
        let moveX = (dx / distance) * moveDistance;
        let moveY = (dy / distance) * moveDistance;
        
        // console.log(`🚢 Calcul mouvement: speed=${this.speed}, deltaTime=${deltaTime}, moveDistance=${moveDistance.toFixed(3)}, déplacement=(${moveX.toFixed(3)}, ${moveY.toFixed(3)})`);
        
        // Vérifier les collisions avec autres bateaux et ajuster la trajectoire
        const avoidanceVector = this.calculateAvoidance();
        if (avoidanceVector) {
            moveX += avoidanceVector.x * 0.3; // 30% de poids pour l'évitement
            moveY += avoidanceVector.y * 0.3;
            // console.log(`🚢 Évitement appliqué: nouveau déplacement=(${moveX.toFixed(3)}, ${moveY.toFixed(3)})`);
        }
        
        this.x += moveX;
        this.y += moveY;
        
        // console.log(`🚢 Nouvelle position: (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
        
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
        
        // Utiliser nextFireTime pour le délai aléatoire
        if (now < this.nextFireTime) return;
        
        if (this.target && this.canAttackTarget()) {
            this.fireAt(this.target, gameManager.combatSystem);
            this.lastFireTime = now;
        }
    }

    setTarget(newTarget) {
        // Si c'est une nouvelle cible, réinitialiser le compteur de précision
        if (this.target !== newTarget) {
            this.shotsFired = 0;
            console.log(`🎯 Nouvelle cible acquise: (${newTarget.x}, ${newTarget.y}) - Précision réinitialisée`);
        }
        this.target = newTarget;
    }

    canAttackTarget() {
        // Plus de limitation de portée - les navires tirent des projectiles physiques
        return this.target !== null;
    }

    fireAt(target, combatSystem) {
        // Calculer la précision basée sur le niveau d'expérience et le nombre de tirs
        const expLevel = this.experienceLevel;
        const progressRatio = Math.min(1.0, this.shotsFired / (expLevel.maxShots - 1));
        const currentAccuracy = expLevel.baseAccuracy + 
                               (expLevel.maxAccuracy - expLevel.baseAccuracy) * progressRatio;
        
        console.log(`🎯 ${this.type} (${expLevel.name}) tire (#${this.shotsFired + 1}/${expLevel.maxShots}) avec ${Math.round(currentAccuracy * 100)}% de précision`);
        
        // Test de réussite du tir
        const hitRoll = Math.random();
        const isHit = hitRoll <= currentAccuracy;
        
        let targetX = target.x;
        let targetY = target.y;
        
        // Si raté, dévier la trajectoire
        if (!isHit) {
            // Écart aléatoire de 1-3 cases
            const maxDeviation = 3;
            const deviationX = (Math.random() - 0.5) * 2 * maxDeviation;
            const deviationY = (Math.random() - 0.5) * 2 * maxDeviation;
            
            targetX += deviationX;
            targetY += deviationY;
            
            console.log(`💥 Tir raté ! Déviation vers (${targetX.toFixed(1)}, ${targetY.toFixed(1)})`);
        } else {
            console.log(`🎯 Tir réussi vers (${target.x}, ${target.y}) !`);
        }
        
        // Créer un projectile ennemi
        const projectile = new Projectile(
            this.x, this.y,
            targetX, targetY,
            {
                speed: GAME_CONFIG.COMBAT.ENEMY_PROJECTILE_SPEED,
                damage: this.damage,
                type: 'cannonball',
                color: GAME_CONFIG.COLORS.ENEMY_PROJECTILE,
                maxLifetime: GAME_CONFIG.COMBAT.PROJECTILE_LIFETIME
            }
        );
        
        // Configurer l'impact pour les projectiles ennemis
        projectile.onImpact = (x, y) => {
            combatSystem.handleProjectileImpact(projectile, x, y);
        };
        
        // Ajouter aux projectiles du système de combat
        combatSystem.projectiles.push(projectile);
        
        // Incrémenter le compteur de tirs sur cette cible
        this.shotsFired++;
        
        // Programmer le prochain tir avec timing aléatoire
        const variation = GAME_CONFIG.WAVES.LANDING_COOLDOWN * 0.4; // ± 40% de variation
        const nextFireDelay = this.fireRate + (Math.random() - 0.5) * variation;
        const now = Date.now();
        this.lastFireTime = now;
        this.nextFireTime = now + nextFireDelay;
        
        console.log(`⏰ Prochain tir dans ${Math.round(nextFireDelay / 1000)}s`);
    }

    takeDamage(damage) {
        this.health -= damage;
        console.log(`🚢 ${this.type} (${this.experienceLevel.name}) touché: ${this.health}/${this.maxHealth} HP`);
        
        if (this.health <= 0) {
            console.log(`💥 ${this.type} (${this.experienceLevel.name}) détruit !`);
            this.destroy();
            return true; // Bateau détruit
        } else if (this.health <= this.maxHealth * 0.3) {
            // Bateau gravement endommagé, fuir
            console.log(`🏃‍♂️ ${this.type} gravement endommagé - fuit le combat !`);
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
        
        // Indicateur du chemin réel (debug)
        if (this.path && this.path.length > 0) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            
            // Dessiner le chemin complet
            ctx.beginPath();
            ctx.moveTo(screenPos.x, screenPos.y);
            
            for (let i = 0; i < this.path.length; i++) {
                const pathPoint = this.path[i];
                const pathScreenPos = renderer.gridToScreen(pathPoint.x, pathPoint.y);
                ctx.lineTo(pathScreenPos.x, pathScreenPos.y);
            }
            
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Marquer la destination finale en vert
            if (this.path.length > 0) {
                const finalDestination = this.path[this.path.length - 1];
                const finalScreenPos = renderer.gridToScreen(finalDestination.x, finalDestination.y);
                
                ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.beginPath();
                ctx.arc(finalScreenPos.x, finalScreenPos.y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Indicateur du château cible (debug) - en rouge plus discret
        if (this.target) {
            const targetScreenPos = renderer.gridToScreen(this.target.x, this.target.y);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
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
        const config = GAME_CONFIG.SHIPS.BASIC;
        return new EnemyShip(x, y, {
            type: 'basic',
            health: config.HEALTH,
            speed: config.SPEED,
            damage: config.DAMAGE,
            fireRate: config.FIRE_RATE,
            size: config.SIZE,
            experienceLevel: EXPERIENCE_LEVELS[config.EXPERIENCE]
        });
    }

    static createFastShip(x, y) {
        const config = GAME_CONFIG.SHIPS.FAST;
        return new EnemyShip(x, y, {
            type: 'fast',
            health: config.HEALTH,
            speed: config.SPEED,
            damage: config.DAMAGE,
            fireRate: config.FIRE_RATE,
            size: config.SIZE,
            experienceLevel: EXPERIENCE_LEVELS[config.EXPERIENCE]
        });
    }

    static createHeavyShip(x, y) {
        const config = GAME_CONFIG.SHIPS.HEAVY;
        return new EnemyShip(x, y, {
            type: 'heavy',
            health: config.HEALTH,
            speed: config.SPEED,
            damage: config.DAMAGE,
            fireRate: config.FIRE_RATE,
            size: config.SIZE,
            experienceLevel: EXPERIENCE_LEVELS[config.EXPERIENCE]
        });
    }

    static createArtilleryShip(x, y) {
        const config = GAME_CONFIG.SHIPS.ARTILLERY;
        return new EnemyShip(x, y, {
            type: 'artillery',
            health: config.HEALTH,
            speed: config.SPEED,
            damage: config.DAMAGE,
            fireRate: config.FIRE_RATE,
            size: config.SIZE,
            experienceLevel: EXPERIENCE_LEVELS[config.EXPERIENCE]
        });
    }
}