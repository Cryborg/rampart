// ===================================================
// SERVICE DE CALCULS GRID
// ===================================================
// Centralise tous les calculs liés à la grille et aux zones

import { CELL_TYPES } from '../game/Grid.js';
import { GAME_CONFIG } from '../config/GameConstants.js';
import { getDistance } from '../utils/GameUtils.js';

/**
 * Service pour tous les calculs liés à la grille
 */
export class GridCalculationService {
    
    /**
     * Calcule les zones constructibles (cannonZone) pour un château fermé
     */
    static calculateCannonZones(grid, closedAreas) {
        console.log(`🔍 Calcul des zones de canons pour ${closedAreas.length} zones fermées`);
        
        // Réinitialiser toutes les zones dorées
        this.clearCannonZones(grid);
        
        let totalCannonZones = 0;
        
        for (let area of closedAreas) {
            const cannonZones = this.findCannonZonesForArea(grid, area.cells);
            totalCannonZones += cannonZones;
        }
        
        console.log(`✅ ${totalCannonZones} cases marquées comme zones de canons (dorées)`);
        return totalCannonZones;
    }
    
    /**
     * Efface toutes les zones de canons existantes
     */
    static clearCannonZones(grid) {
        for (let x = 0; x < grid.width; x++) {
            for (let y = 0; y < grid.height; y++) {
                const cell = grid.getCell(x, y);
                if (cell) {
                    cell.isCannonZone = false;
                }
            }
        }
    }
    
    /**
     * Trouve les zones de canons pour une zone fermée spécifique
     */
    static findCannonZonesForArea(grid, areaCells) {
        const cannonZoneCandidates = new Set();
        
        // Pour chaque cellule de la zone fermée
        for (let cellKey of areaCells) {
            const [x, y] = cellKey.split(',').map(Number);
            
            // Vérifier les cases adjacentes (8 directions)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const adjX = x + dx;
                    const adjY = y + dy;
                    
                    if (this.isValidCannonZonePosition(grid, adjX, adjY, areaCells)) {
                        cannonZoneCandidates.add(`${adjX},${adjY}`);
                    }
                }
            }
        }
        
        // Marquer les candidates comme zones de canons
        let count = 0;
        for (let candidateKey of cannonZoneCandidates) {
            const [x, y] = candidateKey.split(',').map(Number);
            const cell = grid.getCell(x, y);
            if (cell) {
                cell.isCannonZone = true;
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Vérifie si une position peut être une zone de canon
     */
    static isValidCannonZonePosition(grid, x, y, areaCells) {
        if (!grid.isValidPosition(x, y)) return false;
        
        const cell = grid.getCell(x, y);
        if (!cell) return false;
        
        // Ne peut être zone de canon que sur la terre libre
        if (cell.type !== CELL_TYPES.LAND) return false;
        
        // Ne doit pas déjà faire partie de la zone fermée
        const cellKey = `${x},${y}`;
        if (areaCells.has(cellKey)) return false;
        
        return true;
    }
    
    /**
     * Calcule le nombre de canons autorisés basé sur les zones dorées
     */
    static calculateAllowedCannons(grid) {
        let goldenCellCount = 0;
        
        for (let x = 0; x < grid.width; x++) {
            for (let y = 0; y < grid.height; y++) {
                const cell = grid.getCell(x, y);
                if (cell && cell.isCannonZone) {
                    // Vérifier que la zone 2x2 est libre pour placement de canon
                    if (this.canPlaceCannonAt(grid, x, y)) {
                        goldenCellCount++;
                    }
                }
            }
        }
        
        const cannonConfig = GAME_CONFIG.CANNON;
        const calculatedCount = Math.floor(goldenCellCount * cannonConfig.PLACEMENT_RATIO);
        const finalCount = Math.max(cannonConfig.MIN_COUNT, 
                          Math.min(cannonConfig.MAX_COUNT, calculatedCount));
        
        console.log(`🔫 Cases dorées libres: ${goldenCellCount}, Canons calculés: ${calculatedCount}, Final: ${finalCount}`);
        
        return finalCount;
    }
    
    /**
     * Vérifie si un canon 2x2 peut être placé à une position
     */
    static canPlaceCannonAt(grid, x, y) {
        // Vérifier toutes les cellules 2x2
        for (let dx = 0; dx < GAME_CONFIG.CANNON.SIZE; dx++) {
            for (let dy = 0; dy < GAME_CONFIG.CANNON.SIZE; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (!grid.isValidPosition(checkX, checkY)) return false;
                
                const cell = grid.getCell(checkX, checkY);
                if (!cell || !cell.isCannonZone || cell.type !== CELL_TYPES.LAND) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Trouve la position de spawn la plus proche d'un point cible
     */
    static findNearestSpawnPoint(spawnPoints, targetX, targetY) {
        if (!spawnPoints.length) return null;
        
        let nearest = spawnPoints[0];
        let minDistance = getDistance(nearest.x, nearest.y, targetX, targetY);
        
        for (let i = 1; i < spawnPoints.length; i++) {
            const point = spawnPoints[i];
            const distance = getDistance(point.x, point.y, targetX, targetY);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = point;
            }
        }
        
        return nearest;
    }
    
    /**
     * Calcule le centre géométrique d'une zone
     */
    static calculateAreaCenter(areaCells) {
        if (!areaCells.size) return { x: 0, y: 0 };
        
        let sumX = 0, sumY = 0;
        
        for (let cellKey of areaCells) {
            const [x, y] = cellKey.split(',').map(Number);
            sumX += x;
            sumY += y;
        }
        
        return {
            x: Math.round(sumX / areaCells.size),
            y: Math.round(sumY / areaCells.size)
        };
    }
    
    /**
     * Vérifie si une zone est suffisamment grande pour être considérée comme château
     */
    static isValidCastleSize(areaCells, minSize = 25) {
        return areaCells.size >= minSize;
    }
    
    /**
     * Trouve tous les points de terre adjacents à l'eau (côtes)
     */
    static findCoastlinePoints(grid) {
        const coastPoints = [];
        
        for (let x = 0; x < grid.width; x++) {
            for (let y = 0; y < grid.height; y++) {
                const cell = grid.getCell(x, y);
                if (cell && cell.type === CELL_TYPES.LAND) {
                    // Vérifier si adjacent à l'eau
                    if (this.hasAdjacentWater(grid, x, y)) {
                        coastPoints.push({ x, y });
                    }
                }
            }
        }
        
        return coastPoints;
    }
    
    /**
     * Vérifie si une position terre a de l'eau adjacente
     */
    static hasAdjacentWater(grid, x, y) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],          [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];
        
        for (let [dx, dy] of directions) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            if (grid.isValidPosition(checkX, checkY)) {
                const cell = grid.getCell(checkX, checkY);
                if (cell && cell.type === CELL_TYPES.WATER) {
                    return true;
                }
            }
        }
        
        return false;
    }
}