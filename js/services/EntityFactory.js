// ===================================================
// FACTORY D'ENTITÉS
// ===================================================
// Factory centralisé pour créer toutes les entités du jeu

import { GAME_CONFIG } from '../config/GameConstants.js';
import { Projectile } from '../game/Projectile.js';
import { LandUnitFactory } from '../game/LandUnit.js';
import { ShipFactory } from '../game/EnemyShip.js';

/**
 * Factory centralisé pour tous les types d'entités du jeu
 */
export class EntityFactory {
    
    // ===================================================
    // PROJECTILES
    // ===================================================
    
    static createCannonProjectile(startX, startY, targetX, targetY) {
        const config = GAME_CONFIG.COMBAT.PROJECTILE_CONFIGS.CANNON;
        return new Projectile(startX, startY, targetX, targetY, {
            speed: config.SPEED,
            damage: config.DAMAGE,
            size: config.SIZE,
            color: config.COLOR,
            type: 'cannonball',
            maxLifetime: config.LIFETIME
        });
    }
    
    static createShipProjectile(startX, startY, targetX, targetY) {
        const config = GAME_CONFIG.COMBAT.PROJECTILE_CONFIGS.SHIP;
        return new Projectile(startX, startY, targetX, targetY, {
            speed: config.SPEED,
            damage: config.DAMAGE,
            size: config.SIZE,
            color: config.COLOR,
            type: 'cannonball',
            maxLifetime: config.LIFETIME
        });
    }
    
    static createArrowProjectile(startX, startY, targetX, targetY) {
        const config = GAME_CONFIG.COMBAT.PROJECTILE_CONFIGS.ARROW;
        return new Projectile(startX, startY, targetX, targetY, {
            speed: config.SPEED,
            damage: config.DAMAGE,
            size: config.SIZE,
            color: config.COLOR,
            type: 'arrow',
            maxLifetime: config.LIFETIME
        });
    }
    
    // ===================================================
    // EXPLOSIONS
    // ===================================================
    
    static createExplosion(x, y, intensity = 1, type = 'standard') {
        const now = Date.now();
        const config = GAME_CONFIG.EXPLOSIONS[type.toUpperCase()] || GAME_CONFIG.EXPLOSIONS.STANDARD;
        
        return {
            x,
            y,
            startTime: now,
            duration: config.DURATION,
            maxRadius: config.MAX_RADIUS * intensity,
            color: config.COLOR,
            type,
            intensity,
            // Phases de l'explosion
            phases: [
                { start: 0, end: 0.3, color: config.PHASE_COLORS.FLASH },
                { start: 0.3, end: 0.7, color: config.PHASE_COLORS.FIRE },
                { start: 0.7, end: 1.0, color: config.PHASE_COLORS.SMOKE }
            ]
        };
    }
    
    static createWaterSplash(x, y, intensity = 1) {
        return this.createExplosion(x, y, intensity, 'water');
    }
    
    static createStructureExplosion(x, y, intensity = 1) {
        return this.createExplosion(x, y, intensity, 'structure');
    }
    
    // ===================================================
    // UNITÉS TERRESTRES
    // ===================================================
    
    static createInfantry(x, y) {
        return LandUnitFactory.createInfantry(x, y);
    }
    
    static createTank(x, y) {
        return LandUnitFactory.createTank(x, y);
    }
    
    static createLandUnit(type, x, y) {
        switch (type) {
            case 'infantry': return this.createInfantry(x, y);
            case 'tank': return this.createTank(x, y);
            default:
                console.warn(`Type d'unité terrestre inconnu: ${type}`);
                return this.createInfantry(x, y);
        }
    }
    
    // ===================================================
    // NAVIRES
    // ===================================================
    
    static createBasicShip(x, y) {
        return ShipFactory.createBasicShip(x, y);
    }
    
    static createFastShip(x, y) {
        return ShipFactory.createFastShip(x, y);
    }
    
    static createHeavyShip(x, y) {
        return ShipFactory.createHeavyShip(x, y);
    }
    
    static createArtilleryShip(x, y) {
        return ShipFactory.createArtilleryShip(x, y);
    }
    
    static createShip(type, x, y) {
        switch (type) {
            case 'basic': return this.createBasicShip(x, y);
            case 'fast': return this.createFastShip(x, y);
            case 'heavy': return this.createHeavyShip(x, y);
            case 'artillery': return this.createArtilleryShip(x, y);
            default:
                console.warn(`Type de navire inconnu: ${type}`);
                return this.createBasicShip(x, y);
        }
    }
    
    // ===================================================
    // EFFETS VISUELS
    // ===================================================
    
    static createMuzzleFlash(x, y, direction = 0) {
        return {
            x,
            y,
            direction,
            startTime: Date.now(),
            duration: GAME_CONFIG.VISUAL_EFFECTS.MUZZLE_FLASH_DURATION,
            size: GAME_CONFIG.VISUAL_EFFECTS.MUZZLE_FLASH_SIZE,
            color: GAME_CONFIG.VISUAL_EFFECTS.MUZZLE_FLASH_COLOR
        };
    }
    
    static createImpactEffect(x, y, type = 'standard') {
        const config = GAME_CONFIG.VISUAL_EFFECTS.IMPACTS[type.toUpperCase()] || 
                      GAME_CONFIG.VISUAL_EFFECTS.IMPACTS.STANDARD;
                      
        return {
            x,
            y,
            startTime: Date.now(),
            duration: config.DURATION,
            particles: this.generateImpactParticles(x, y, config.PARTICLE_COUNT),
            color: config.COLOR
        };
    }
    
    static generateImpactParticles(centerX, centerY, count) {
        const particles = [];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 0.5 + Math.random() * 1.0;
            
            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0
            });
        }
        return particles;
    }
    
    // ===================================================
    // UTILITAIRES
    // ===================================================
    
    /**
     * Crée une entité basée sur un type et une configuration
     */
    static createEntity(type, subType, x, y, config = {}) {
        switch (type) {
            case 'projectile':
                switch (subType) {
                    case 'cannon': return this.createCannonProjectile(x, y, config.targetX, config.targetY);
                    case 'ship': return this.createShipProjectile(x, y, config.targetX, config.targetY);
                    case 'arrow': return this.createArrowProjectile(x, y, config.targetX, config.targetY);
                }
                break;
                
            case 'landunit':
                return this.createLandUnit(subType, x, y);
                
            case 'ship':
                return this.createShip(subType, x, y);
                
            case 'explosion':
                return this.createExplosion(x, y, config.intensity, subType);
                
            case 'effect':
                switch (subType) {
                    case 'muzzle': return this.createMuzzleFlash(x, y, config.direction);
                    case 'impact': return this.createImpactEffect(x, y, config.impactType);
                }
                break;
        }
        
        console.warn(`Type d'entité inconnu: ${type}/${subType}`);
        return null;
    }
}