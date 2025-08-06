import { Projectile } from './Projectile.js';
import { CELL_TYPES } from './Grid.js';

export class CombatSystem {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.grid = gameManager.grid;
        this.renderer = gameManager.renderer;
        
        // Liste des projectiles actifs
        this.projectiles = [];
        
        // Configuration du combat
        this.config = {
            cannonRange: 12, // Portée des canons en cases
            cannonCooldown: 2000, // Temps entre tirs (ms)
            wallDestruction: true, // Les murs peuvent être détruits
            friendlyFire: true, // Tir ami activé
            explosionRadius: 1.5, // Rayon d'explosion en cases
            maxProjectiles: 50 // Limite de projectiles simultanés
        };
        
        // État des canons (cooldowns)
        this.cannonCooldowns = new Map();
        
        // Interface de visée
        this.aimingMode = false;
        this.selectedCannon = null;
        this.crosshairPos = { x: 0, y: 0 };
        
        console.log('⚔️ CombatSystem initialisé');
    }

    /**
     * Activer le mode de visée pour un canon
     */
    startAiming(cannonX, cannonY, playerId) {
        const cannon = this.findCannonAt(cannonX, cannonY, playerId);
        if (!cannon) {
            console.log(`❌ Aucun canon trouvé à (${cannonX}, ${cannonY})`);
            return false;
        }

        if (this.isCannonOnCooldown(cannon)) {
            console.log(`⏰ Canon en rechargement`);
            return false;
        }

        this.aimingMode = true;
        this.selectedCannon = cannon;
        console.log(`🎯 Mode visée activé pour canon à (${cannonX}, ${cannonY})`);
        return true;
    }

    /**
     * Arrêter le mode de visée
     */
    stopAiming() {
        this.aimingMode = false;
        this.selectedCannon = null;
        console.log('🎯 Mode visée désactivé');
    }

    /**
     * Mettre à jour la position du curseur de visée
     */
    updateCrosshair(gridX, gridY) {
        if (!this.aimingMode || !this.selectedCannon) return;
        
        this.crosshairPos.x = gridX;
        this.crosshairPos.y = gridY;
    }

    /**
     * Tirer avec le canon sélectionné vers la position du curseur
     */
    fire() {
        if (!this.aimingMode || !this.selectedCannon) return false;

        const cannon = this.selectedCannon;
        const targetX = this.crosshairPos.x;
        const targetY = this.crosshairPos.y;

        // Vérifier la portée
        const distance = this.getDistance(cannon.x + 1, cannon.y + 1, targetX, targetY);
        if (distance > this.config.cannonRange) {
            console.log(`❌ Cible hors de portée (${distance.toFixed(1)} > ${this.config.cannonRange})`);
            return false;
        }

        // Créer le projectile
        const projectile = new Projectile(
            cannon.x + 1, cannon.y + 1, // Centre du canon 2x2
            targetX, targetY,
            {
                speed: 15,
                damage: 2,
                type: 'cannonball',
                color: '#ff6b35'
            }
        );

        // Configurer l'impact
        projectile.onImpact = (x, y) => this.handleProjectileImpact(projectile, x, y);

        this.projectiles.push(projectile);
        
        // Mettre le canon en cooldown
        this.setCannonCooldown(cannon);
        
        // Animation de tir
        cannon.firing = true;
        setTimeout(() => { cannon.firing = false; }, 200);
        
        // Arrêter la visée après le tir
        this.stopAiming();
        
        console.log(`💥 Tir depuis (${cannon.x}, ${cannon.y}) vers (${targetX}, ${targetY})`);
        return true;
    }

    /**
     * Gérer l'impact d'un projectile
     */
    handleProjectileImpact(projectile, x, y) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        
        // Effet d'explosion
        this.createExplosion(gridX, gridY, projectile.damage);
        
        // Dégâts dans le rayon d'explosion
        this.applyExplosionDamage(gridX, gridY, this.config.explosionRadius, projectile.damage);
        
        // Effet visuel
        if (this.renderer) {
            this.renderer.addExplosion(gridX, gridY);
        }
    }

    /**
     * Appliquer les dégâts d'explosion dans un rayon
     */
    applyExplosionDamage(centerX, centerY, radius, damage) {
        const startX = Math.floor(centerX - radius);
        const endX = Math.ceil(centerX + radius);
        const startY = Math.floor(centerY - radius);
        const endY = Math.ceil(centerY + radius);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (!this.grid.isValidPosition(x, y)) continue;

                const distance = this.getDistance(centerX, centerY, x, y);
                if (distance > radius) continue;

                // Calculer les dégâts selon la distance (plus faible en périphérie)
                const damageRatio = 1 - (distance / radius);
                const actualDamage = Math.ceil(damage * damageRatio);

                this.damageCellAt(x, y, actualDamage);
            }
        }
    }

    /**
     * Endommager une cellule spécifique
     */
    damageCellAt(x, y, damage) {
        const cell = this.grid.getCell(x, y);
        if (!cell) return;

        // Vérifier si la cellule peut être endommagée
        if (!cell.isDestructible()) return;

        console.log(`💥 Dégâts ${damage} à (${x}, ${y}) - Type: ${cell.type}`);

        // Appliquer les dégâts
        const destroyed = cell.takeDamage(damage);
        
        if (destroyed) {
            console.log(`💥 ${cell.type} détruit à (${x}, ${y})`);
            
            // Traitement spéciaux selon le type
            switch (cell.type) {
                case CELL_TYPES.CANNON:
                    this.onCannonDestroyed(x, y);
                    break;
                case CELL_TYPES.CASTLE_CORE:
                    this.onCastleCoreDestroyed(x, y);
                    break;
                case CELL_TYPES.WALL:
                    this.onWallDestroyed(x, y);
                    break;
            }
        }
    }

    /**
     * Événement : canon détruit
     */
    onCannonDestroyed(x, y) {
        // Trouver le joueur qui possédait ce canon
        const players = this.gameManager.players;
        for (let player of players) {
            for (let i = player.cannons.length - 1; i >= 0; i--) {
                const cannon = player.cannons[i];
                if (x >= cannon.x && x < cannon.x + 2 && 
                    y >= cannon.y && y < cannon.y + 2) {
                    
                    player.cannons.splice(i, 1);
                    console.log(`🎯 Canon du joueur ${player.id} détruit`);
                    break;
                }
            }
        }
    }

    /**
     * Événement : cœur de château détruit
     */
    onCastleCoreDestroyed(x, y) {
        // Trouver le joueur propriétaire
        const players = this.gameManager.players;
        for (let player of players) {
            if (player.castle.core && 
                player.castle.core.x === x && 
                player.castle.core.y === y) {
                
                console.log(`👑 Château du joueur ${player.id} détruit !`);
                player.castle.destroyed = true;
                
                // Logique de défaite du joueur
                this.onPlayerDefeated(player);
                break;
            }
        }
    }

    /**
     * Événement : mur détruit
     */
    onWallDestroyed(x, y) {
        // Vérifier si cela brise la fermeture du château
        // (sera implémenté plus tard avec la détection de château)
        console.log(`🧱 Mur détruit à (${x}, ${y})`);
    }

    /**
     * Événement : joueur défait
     */
    onPlayerDefeated(player) {
        player.isDefeated = true;
        console.log(`💀 Joueur ${player.id} éliminé !`);
        
        // Vérifier la condition de victoire
        this.checkVictoryCondition();
    }

    /**
     * Vérifier les conditions de victoire
     */
    checkVictoryCondition() {
        const alivePlayers = this.gameManager.players.filter(p => !p.isDefeated);
        
        if (alivePlayers.length <= 1) {
            const winner = alivePlayers[0];
            console.log(`🏆 Victoire du joueur ${winner ? winner.id : 'aucun'} !`);
            this.gameManager.onGameEnd(winner);
        }
    }

    /**
     * Créer un effet d'explosion visuel
     */
    createExplosion(x, y, intensity = 1) {
        // Animation d'explosion (sera utilisée par le renderer)
        const explosion = {
            x: x,
            y: y,
            intensity: intensity,
            startTime: Date.now(),
            duration: 800
        };
        
        console.log(`💥 Explosion créée à (${x}, ${y}) intensité ${intensity}`);
        return explosion;
    }

    /**
     * Mettre à jour tous les projectiles
     */
    update(deltaTime) {
        // Mettre à jour les projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            projectile.update(deltaTime);
            
            // Supprimer les projectiles inactifs
            if (!projectile.active) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Nettoyer les cooldowns expirés
        this.updateCannonCooldowns();
    }

    /**
     * Rendre tous les éléments du combat
     */
    render(ctx, renderer) {
        // Rendre les projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(ctx, renderer);
        });
        
        // Rendre l'interface de visée
        if (this.aimingMode && this.selectedCannon) {
            this.renderAimingInterface(ctx, renderer);
        }
    }

    /**
     * Rendre l'interface de visée
     */
    renderAimingInterface(ctx, renderer) {
        const cannon = this.selectedCannon;
        const cannonScreenPos = renderer.gridToScreen(cannon.x + 1, cannon.y + 1);
        const crosshairScreenPos = renderer.gridToScreen(this.crosshairPos.x, this.crosshairPos.y);
        
        // Ligne de visée
        const distance = this.getDistance(cannon.x + 1, cannon.y + 1, this.crosshairPos.x, this.crosshairPos.y);
        const inRange = distance <= this.config.cannonRange;
        
        ctx.strokeStyle = inRange ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cannonScreenPos.x, cannonScreenPos.y);
        ctx.lineTo(crosshairScreenPos.x, crosshairScreenPos.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Curseur de visée
        ctx.strokeStyle = inRange ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(crosshairScreenPos.x, crosshairScreenPos.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        
        // Croix de visée
        ctx.beginPath();
        ctx.moveTo(crosshairScreenPos.x - 8, crosshairScreenPos.y);
        ctx.lineTo(crosshairScreenPos.x + 8, crosshairScreenPos.y);
        ctx.moveTo(crosshairScreenPos.x, crosshairScreenPos.y - 8);
        ctx.lineTo(crosshairScreenPos.x, crosshairScreenPos.y + 8);
        ctx.stroke();
        
        // Informations de portée
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(`Distance: ${distance.toFixed(1)}/${this.config.cannonRange}`, 
                    crosshairScreenPos.x + 15, crosshairScreenPos.y - 15);
    }

    // Méthodes utilitaires
    
    getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    findCannonAt(x, y, playerId) {
        const players = this.gameManager.players;
        for (let player of players) {
            if (playerId && player.id !== playerId) continue;
            
            for (let cannon of player.cannons) {
                if (x >= cannon.x && x < cannon.x + 2 && 
                    y >= cannon.y && y < cannon.y + 2) {
                    return cannon;
                }
            }
        }
        return null;
    }

    isCannonOnCooldown(cannon) {
        const key = `${cannon.x}-${cannon.y}`;
        const cooldownEnd = this.cannonCooldowns.get(key);
        return cooldownEnd && Date.now() < cooldownEnd;
    }

    setCannonCooldown(cannon) {
        const key = `${cannon.x}-${cannon.y}`;
        this.cannonCooldowns.set(key, Date.now() + this.config.cannonCooldown);
    }

    updateCannonCooldowns() {
        const now = Date.now();
        for (let [key, cooldownEnd] of this.cannonCooldowns.entries()) {
            if (now >= cooldownEnd) {
                this.cannonCooldowns.delete(key);
            }
        }
    }

    // Interface publique pour GameManager

    handleCannonClick(gridX, gridY, playerId) {
        if (this.aimingMode) {
            // En mode visée, cliquer tire
            this.updateCrosshair(gridX, gridY);
            return this.fire();
        } else {
            // Pas en mode visée, sélectionner le canon
            return this.startAiming(gridX, gridY, playerId);
        }
    }

    handleRightClick() {
        if (this.aimingMode) {
            this.stopAiming();
            return true;
        }
        return false;
    }

    handleMouseMove(gridX, gridY) {
        if (this.aimingMode) {
            this.updateCrosshair(gridX, gridY);
        }
    }

    // Nettoyage
    destroy() {
        this.projectiles.length = 0;
        this.cannonCooldowns.clear();
        this.stopAiming();
        console.log('⚔️ CombatSystem détruit');
    }
}