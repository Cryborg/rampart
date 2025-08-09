import { CELL_TYPES } from './Grid.js';
import { GAME_CONFIG } from '../config/GameConstants.js';
import { getDistance } from '../utils/GameUtils.js';
import { EntityFactory } from '../services/EntityFactory.js';

export class CombatSystem {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.grid = gameManager.grid;
        this.renderer = gameManager.renderer;
        
        // Liste des projectiles actifs
        this.projectiles = [];
        
        // Configuration du combat
        const combatConfig = GAME_CONFIG.COMBAT;
        this.config = {
            cannonCooldown: GAME_CONFIG.CANNON.COOLDOWN,
            wallDestruction: combatConfig.WALL_DESTRUCTION,
            friendlyFire: combatConfig.FRIENDLY_FIRE,
            explosionRadius: combatConfig.EXPLOSION_RADIUS,
            maxProjectiles: combatConfig.MAX_PROJECTILES,
            cannonRange: GAME_CONFIG.CANNON.RANGE
        };
        
        // État des canons (cooldowns)
        this.cannonCooldowns = new Map();
        
        // Liste des canons du joueur pour gérer la rotation
        this.cannonFireIndex = 0;
        
        console.log('⚔️ CombatSystem initialisé');
    }

    /**
     * Tirer vers une position avec le prochain canon disponible
     */
    fireAtPosition(targetX, targetY, playerId) {
        const player = this.gameManager.players.find(p => p.id === playerId);
        if (!player || player.cannons.length === 0) {
            console.log('❌ Aucun canon disponible');
            return false;
        }

        console.log(`🎯 DEBUG: Tir demandé - ${player.cannons.length} canons disponibles, fireIndex=${this.cannonFireIndex}`);
        player.cannons.forEach((cannon, i) => {
            console.log(`  Canon ${i}: (${cannon.x},${cannon.y}) cooldown=${this.isCannonOnCooldown(cannon)} canFire=${cannon.canFire}`);
        });

        // Trouver le prochain canon qui peut tirer
        let attempts = 0;
        while (attempts < player.cannons.length) {
            const cannonIndex = this.cannonFireIndex % player.cannons.length;
            const cannon = player.cannons[cannonIndex];
            
            console.log(`🎯 DEBUG: Tentative ${attempts+1} - Testing canon ${cannonIndex}: (${cannon.x},${cannon.y})`);
            
            this.cannonFireIndex++;
            attempts++;
            
            if (!this.isCannonOnCooldown(cannon) && cannon.canFire !== false) {
                // Ce canon peut tirer !
                console.log(`✅ Canon ${cannonIndex} va tirer !`);
                this.fireFromCannon(cannon, targetX, targetY);
                return true;
            } else {
                const reason = this.isCannonOnCooldown(cannon) ? 'en cooldown' : 'hors zone fermée';
                console.log(`❌ Canon ${cannonIndex} ${reason}`);
            }
        }
        
        console.log('⏰ Tous les canons sont en rechargement');
        return false;
    }

    /**
     * Tirer depuis un canon spécifique
     */
    fireFromCannon(cannon, targetX, targetY) {
        // Créer le projectile depuis le centre du canon 2x2
        const projectile = EntityFactory.createCannonProjectile(
            cannon.x + 1, 
            cannon.y + 1,
            targetX, 
            targetY
        );

        // Configurer l'impact
        projectile.onImpact = (x, y) => this.handleProjectileImpact(projectile, x, y);

        this.projectiles.push(projectile);
        
        // Mettre le canon en cooldown
        this.setCannonCooldown(cannon);
        
        // Animation de tir
        cannon.firing = true;
        setTimeout(() => { cannon.firing = false; }, 200);
        
        console.log(`💥 Canon (${cannon.x}, ${cannon.y}) tire vers (${targetX}, ${targetY})`);
    }

    /**
     * Gérer l'impact d'un projectile
     */
    handleProjectileImpact(projectile, x, y) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        
        // Dégâts dans le rayon d'explosion
        this.applyExplosionDamage(gridX, gridY, this.config.explosionRadius, projectile.damage);
        
        // Effet visuel d'explosion
        if (this.renderer) {
            this.renderer.addExplosion(gridX, gridY);
        }
        
        // IMPORTANT: Désactiver le projectile pour qu'il s'arrête
        projectile.active = false;
    }

    /**
     * Appliquer les dégâts d'explosion dans un rayon
     */
    applyExplosionDamage(centerX, centerY, radius, damage) {
        const startX = Math.floor(centerX - radius);
        const endX = Math.ceil(centerX + radius);
        const startY = Math.floor(centerY - radius);
        const endY = Math.ceil(centerY + radius);

        // D'abord vérifier s'il y a un bateau touché au centre de l'explosion
        const shipHitAtCenter = this.damageEnemyShipsAt(centerX, centerY, damage);
        
        // Si un bateau est touché, on fait une explosion réduite, sinon explosion complète
        const explosionRadius = shipHitAtCenter ? radius * 0.5 : radius;

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (!this.grid.isValidPosition(x, y)) continue;

                const distance = getDistance(centerX, centerY, x, y);
                if (distance > explosionRadius) continue;

                // Calculer les dégâts selon la distance (plus faible en périphérie)
                const damageRatio = 1 - (distance / explosionRadius);
                const actualDamage = Math.ceil(damage * damageRatio);

                // Dégâts sur la grille
                this.damageCellAt(x, y, actualDamage);
                
                // Vérifier s'il y a des bateaux ennemis dans la zone d'explosion (sauf au centre déjà vérifié)
                if (distance > 0.5) {
                    this.damageEnemyShipsAt(x, y, actualDamage);
                }

                // Vérifier s'il y a des unités terrestres dans la zone d'explosion
                this.damageLandUnitsAt(x, y, actualDamage);
            }
        }
    }

    /**
     * Endommager les bateaux ennemis à une position donnée
     */
    damageEnemyShipsAt(x, y, damage) {
        // Obtenir la liste des bateaux ennemis depuis le WaveManager
        const waveManager = this.gameManager.waveManager;
        if (!waveManager || !waveManager.enemyShips) return false;

        let shipHit = false;
        for (let ship of waveManager.enemyShips) {
            if (!ship.active) continue;
            
            // Vérifier si le bateau est dans cette zone (avec sa taille)
            const shipRadius = ship.size / 2; // Rayon basé sur la taille
            const distance = getDistance(ship.x, ship.y, x, y);
            
            if (distance <= shipRadius) {
                console.log(`🎯 Bateau touché ! Distance: ${distance.toFixed(1)}, Radius: ${shipRadius}`);
                ship.takeDamage(damage);
                shipHit = true;
            }
        }
        return shipHit;
    }

    /**
     * Endommager les unités terrestres à une position donnée
     */
    damageLandUnitsAt(x, y, damage) {
        const waveManager = this.gameManager.waveManager;
        if (!waveManager || !waveManager.landUnits) return false;

        let unitHit = false;
        for (let unit of waveManager.landUnits) {
            if (!unit.active) continue;
            
            // Vérifier si l'unité est dans cette zone (avec sa taille)
            const unitRadius = unit.size / 2;
            const distance = getDistance(unit.x, unit.y, x, y);
            
            if (distance <= unitRadius) {
                console.log(`🎯 Unité terrestre touchée ! Type: ${unit.type}, Distance: ${distance.toFixed(1)}`);
                
                // Utiliser la méthode takeDamage si elle existe, sinon appliquer directement
                if (unit.takeDamage && typeof unit.takeDamage === 'function') {
                    unit.takeDamage(damage);
                } else {
                    unit.health -= damage;
                    if (unit.health <= 0) {
                        unit.destroy();
                    }
                }
                unitHit = true;
            }
        }
        return unitHit;
    }

    /**
     * Endommager une cellule spécifique
     */
    damageCellAt(x, y, damage) {
        const cell = this.grid.getCell(x, y);
        if (!cell) return;

        // Vérifier si la cellule peut être endommagée
        if (!cell.isDestructible()) return;

        const oldHealth = cell.health;
        console.log(`💥 Dégâts ${damage} à (${x}, ${y}) - Type: ${cell.type}, HP: ${oldHealth}/${cell.maxHealth}`);

        // Appliquer les dégâts
        cell.health = Math.max(0, cell.health - damage);
        const newHealth = cell.health;
        
        console.log(`🔧 ${cell.type} à (${x}, ${y}): ${oldHealth} → ${newHealth} HP`);
        
        // La cellule n'est "détruite" que si elle atteint 0 HP
        if (newHealth <= 0 && oldHealth > 0) {
            console.log(`💥 ${cell.type} détruit à (${x}, ${y}) (HP épuisés)`);
            
            // Traitement spéciaux selon le type
            switch (cell.type) {
                case CELL_TYPES.CANNON:
                    this.onCannonDestroyed(x, y);
                    break;
                case CELL_TYPES.CASTLE_CORE:
                    // Pour les core et murs, destruction immédiate comme avant
                    cell.type = CELL_TYPES.DESTROYED;
                    this.onCastleCoreDestroyed(x, y);
                    break;
                case CELL_TYPES.WALL:
                    // Pour les core et murs, destruction immédiate comme avant
                    cell.type = CELL_TYPES.DESTROYED;
                    this.onWallDestroyed(x, y);
                    break;
            }
        }
    }

    /**
     * Événement : canon détruit (uniquement quand tous ses HP sont épuisés)
     */
    onCannonDestroyed(x, y) {
        // Vérifier que toutes les cellules du canon 2x2 sont détruites
        const cannonCells = [];
        let cannonPlayerInfo = null;
        
        // Trouver le canon 2x2 qui contient cette cellule
        const players = this.gameManager.players;
        for (let player of players) {
            for (let cannon of player.cannons) {
                // Vérifier si cette cellule appartient à ce canon 2x2
                if (x >= cannon.x && x < cannon.x + 2 && 
                    y >= cannon.y && y < cannon.y + 2) {
                    
                    cannonPlayerInfo = { player, cannon };
                    
                    // Collecter toutes les cellules du canon
                    for (let dx = 0; dx < 2; dx++) {
                        for (let dy = 0; dy < 2; dy++) {
                            const cellX = cannon.x + dx;
                            const cellY = cannon.y + dy;
                            const cell = this.grid.getCell(cellX, cellY);
                            if (cell && cell.type === CELL_TYPES.CANNON) {
                                cannonCells.push({ cell, x: cellX, y: cellY });
                            }
                        }
                    }
                    break;
                }
            }
            if (cannonPlayerInfo) break;
        }
        
        // Vérifier si toutes les cellules du canon sont détruites (HP = 0)
        if (cannonPlayerInfo && cannonCells.length > 0) {
            const allCellsDestroyed = cannonCells.every(({cell}) => cell.health <= 0);
            
            if (allCellsDestroyed) {
                // MAINTENANT on peut supprimer le canon de la liste du joueur
                const playerCannons = cannonPlayerInfo.player.cannons;
                const cannonIndex = playerCannons.indexOf(cannonPlayerInfo.cannon);
                if (cannonIndex !== -1) {
                    playerCannons.splice(cannonIndex, 1);
                    console.log(`🎯 Canon du joueur ${cannonPlayerInfo.player.id} complètement détruit (toutes cellules à 0 HP)`);
                }
                
                // Détruire toutes les cellules du canon sur la grille
                cannonCells.forEach(({x: cellX, y: cellY}) => {
                    this.grid.setCellType(cellX, cellY, CELL_TYPES.DESTROYED);
                });
            } else {
                console.log(`🔧 Canon endommagé mais pas complètement détruit (${cannonCells.filter(({cell}) => cell.health > 0).length}/${cannonCells.length} cellules survivantes)`);
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
        console.log(`🧱 Mur détruit à (${x}, ${y})`);
        
        // IMPORTANT: Quand un mur est détruit, il faut reverifier les zones fermées
        // et désactiver les canons qui ne sont plus dans une zone fermée
        this.scheduleCannonValidation();
    }
    
    /**
     * Programme une validation des canons à la fin du combat
     */
    scheduleCannonValidation() {
        this.needsCannonValidation = true;
    }
    
    /**
     * Méthode appelée à la fin du combat pour valider les canons
     */
    validateCannonsAfterCombat() {
        if (this.needsCannonValidation) {
            // Recalculer les zones fermées
            this.gameManager.checkCastleClosure();
            // Valider quels canons peuvent encore tirer
            this.gameManager.validatePlayerCannons();
            this.needsCannonValidation = false;
            console.log('🔍 Validation des canons après combat terminée');
        }
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
     * Rendre des indicateurs sur les canons cliquables
     */
    renderCannonIndicators(ctx, renderer) {
        const players = this.gameManager.players;
        const currentPlayerId = this.gameManager.players[this.gameManager.currentPlayer].id;
        
        players.forEach(player => {
            if (player.id !== currentPlayerId) return; // Seulement les canons du joueur actuel
            
            player.cannons.forEach(cannon => {
                const isOnCooldown = this.isCannonOnCooldown(cannon);
                const screenPos = renderer.gridToScreen(cannon.x, cannon.y);
                const cellSize = renderer.cellSize;
                
                // Bordure autour du canon
                ctx.strokeStyle = isOnCooldown ? '#666666' : '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    screenPos.x, 
                    screenPos.y, 
                    cellSize * 2 - 1, // Canon 2x2
                    cellSize * 2 - 1
                );
                
                // Indicateur de cooldown
                if (isOnCooldown) {
                    const key = `${cannon.x}-${cannon.y}`;
                    const cooldownEnd = this.cannonCooldowns.get(key);
                    const remaining = Math.max(0, cooldownEnd - Date.now());
                    const percentage = remaining / this.config.cannonCooldown;
                    
                    // Barre de cooldown
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillRect(
                        screenPos.x,
                        screenPos.y + cellSize * 2 - 4,
                        (cellSize * 2 - 1) * (1 - percentage),
                        4
                    );
                }
                
                // Indicateur "CLICK ME" si pas en cooldown et pas en mode visée
                if (!isOnCooldown && !this.aimingMode) {
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('CLIC', screenPos.x + cellSize, screenPos.y - 5);
                }
            });
        });
        
        ctx.textAlign = 'left'; // Reset
    }

    /**
     * Rendre l'interface de visée
     */
    renderAimingInterface(ctx, renderer) {
        const cannon = this.selectedCannon;
        const cannonScreenPos = renderer.gridToScreen(cannon.x + 1, cannon.y + 1);
        const crosshairScreenPos = renderer.gridToScreen(this.crosshairPos.x, this.crosshairPos.y);
        
        // Ligne de visée
        const distance = getDistance(cannon.x + 1, cannon.y + 1, this.crosshairPos.x, this.crosshairPos.y);
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

    // Méthodes utilitaires maintenant dans GameUtils

    findCannonAt(x, y, playerId) {
        const players = this.gameManager.players;
        for (let player of players) {
            if (playerId && player.id !== playerId) continue;
            
            for (let cannon of player.cannons) {
                // Les canons sont stockés par leur coin supérieur gauche
                // Vérifier si le clic est dans la zone 2x2 du canon
                if (x >= cannon.x && x < cannon.x + 2 && 
                    y >= cannon.y && y < cannon.y + 2) {
                    console.log(`🎯 Canon trouvé: position (${cannon.x}, ${cannon.y}), clic à (${x}, ${y})`);
                    return cannon;
                }
            }
        }
        console.log(`❌ Aucun canon à (${x}, ${y}). Canons disponibles:`, 
            players.flatMap(p => p.cannons.map(c => `(${c.x},${c.y})`)).join(', '));
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
        // Tir direct : cliquer n'importe où tire avec le prochain canon disponible
        return this.fireAtPosition(gridX, gridY, playerId);
    }

    handleRightClick() {
        // Plus besoin du clic droit en mode tir direct
        return false;
    }

    handleMouseMove(gridX, gridY) {
        // Plus besoin de suivre la souris en mode tir direct
    }

    // Nettoyage
    destroy() {
        this.projectiles.length = 0;
        this.cannonCooldowns.clear();
        
        // Réinitialiser les états de visée
        this.aimingMode = false;
        this.selectedCannon = null;
        this.crosshairPos = null;
        
        console.log('⚔️ CombatSystem détruit');
    }
}