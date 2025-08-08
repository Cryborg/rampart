// ===================================================
// SERVICE DE PATHFINDING
// ===================================================
// Centralise tous les algorithmes de pathfinding

import { CELL_TYPES } from '../game/Grid.js';
import { GAME_CONFIG } from '../config/GameConstants.js';
import { getDistance } from '../utils/GameUtils.js';

/**
 * Service de pathfinding pour toutes les unités du jeu
 */
export class PathfindingService {
    
    /**
     * Pathfinding A* pour navigation maritime (bateaux)
     */
    static findWaterPath(startX, startY, endX, endY, grid) {
        const config = GAME_CONFIG.PATHFINDING;
        const visited = new Set();
        
        // Priority queue basique pour A*
        const queue = [{ 
            x: Math.floor(startX), 
            y: Math.floor(startY), 
            path: [], 
            cost: 0,
            heuristic: getDistance(Math.floor(startX), Math.floor(startY), endX, endY)
        }];
        
        let steps = 0;
        
        while (queue.length > 0 && steps < config.MAX_STEPS) {
            steps++;
            
            // Trier par coût total (A*)
            queue.sort((a, b) => (a.cost + a.heuristic) - (b.cost + b.heuristic));
            const current = queue.shift();
            
            const key = `${current.x},${current.y}`;
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Arrivé à destination
            const distance = getDistance(current.x, current.y, endX, endY);
            if (distance <= config.PATH_TOLERANCE) {
                return current.path;
            }
            
            // Explorer les voisins (priorité aux directions principales)
            const neighbors = this.getWaterNeighbors(current);
            
            for (let neighbor of neighbors) {
                if (!this.canNavigateWater(neighbor.x, neighbor.y, grid)) continue;
                
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (visited.has(neighborKey)) continue;
                
                const newCost = current.cost + 1;
                const heuristic = getDistance(neighbor.x, neighbor.y, endX, endY);
                
                queue.push({
                    x: neighbor.x,
                    y: neighbor.y,
                    path: [...current.path, { x: neighbor.x, y: neighbor.y }],
                    cost: newCost,
                    heuristic: heuristic
                });
            }
        }
        
        // Aucun chemin trouvé
        return [];
    }
    
    /**
     * Pathfinding simple pour navigation terrestre (unités terrestres)
     */
    static findLandPath(startX, startY, endX, endY, grid) {
        const config = GAME_CONFIG.PATHFINDING;
        const visited = new Set();
        const queue = [{ x: Math.floor(startX), y: Math.floor(startY), path: [] }];
        
        let steps = 0;
        
        while (queue.length > 0 && steps < config.MAX_STEPS_LAND) {
            steps++;
            const current = queue.shift();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Arrivé à destination
            const distance = getDistance(current.x, current.y, endX, endY);
            if (distance <= config.PATH_TOLERANCE) {
                return current.path;
            }
            
            // Explorer les voisins
            const neighbors = this.getLandNeighbors(current);
            
            for (let neighbor of neighbors) {
                if (!this.canNavigateLand(neighbor.x, neighbor.y, grid)) continue;
                
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (visited.has(neighborKey)) continue;
                
                queue.push({
                    x: neighbor.x,
                    y: neighbor.y,
                    path: [...current.path, { x: neighbor.x, y: neighbor.y }]
                });
            }
        }
        
        // Chemin de secours : direction directe
        return [{ x: endX, y: endY }];
    }
    
    /**
     * Obtient les voisins pour navigation maritime
     */
    static getWaterNeighbors(current) {
        return [
            { x: current.x - 1, y: current.y },     // Vers l'ouest (priorité)
            { x: current.x, y: current.y + 1 },     // Sud
            { x: current.x, y: current.y - 1 },     // Nord
            { x: current.x + 1, y: current.y },     // Est
            { x: current.x - 1, y: current.y - 1 }, // Nord-ouest
            { x: current.x - 1, y: current.y + 1 }, // Sud-ouest
            { x: current.x + 1, y: current.y - 1 }, // Nord-est
            { x: current.x + 1, y: current.y + 1 }  // Sud-est
        ];
    }
    
    /**
     * Obtient les voisins pour navigation terrestre
     */
    static getLandNeighbors(current) {
        return [
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
    }
    
    /**
     * Vérifie si une position est navigable pour les bateaux
     */
    static canNavigateWater(x, y, grid) {
        if (!grid.isValidPosition(x, y)) return false;
        
        const cell = grid.getCell(x, y);
        if (!cell) return false;
        
        // Les bateaux ne naviguent que sur l'eau
        return cell.type === CELL_TYPES.WATER;
    }
    
    /**
     * Vérifie si une position est navigable pour les unités terrestres
     */
    static canNavigateLand(x, y, grid) {
        if (!grid.isValidPosition(x, y)) return false;
        
        const cell = grid.getCell(x, y);
        if (!cell) return false;
        
        // Les unités terrestres se déplacent sur terre et zones détruites
        return cell.type === CELL_TYPES.LAND || cell.type === CELL_TYPES.DESTROYED;
    }
    
    /**
     * Calcule un chemin de fuite vers le bord de la carte le plus proche
     */
    static calculateFleeRoute(currentX, currentY, grid) {
        const borders = [
            { x: 0, y: currentY }, // Gauche
            { x: grid.width - 1, y: currentY }, // Droite
            { x: currentX, y: 0 }, // Haut
            { x: currentX, y: grid.height - 1 } // Bas
        ];
        
        let closestBorder = borders[0];
        let closestDistance = getDistance(currentX, currentY, closestBorder.x, closestBorder.y);
        
        for (let border of borders) {
            const distance = getDistance(currentX, currentY, border.x, border.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestBorder = border;
            }
        }
        
        return this.findWaterPath(currentX, currentY, closestBorder.x, closestBorder.y, grid);
    }
    
    /**
     * Optimise un chemin en supprimant les points redondants
     */
    static optimizePath(path) {
        if (path.length <= 2) return path;
        
        const optimized = [path[0]];
        
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const current = path[i];
            const next = path[i + 1];
            
            // Si les trois points ne sont pas alignés, garder le point courant
            if (!this.arePointsAligned(prev, current, next)) {
                optimized.push(current);
            }
        }
        
        optimized.push(path[path.length - 1]);
        return optimized;
    }
    
    /**
     * Vérifie si trois points sont alignés (tolérance)
     */
    static arePointsAligned(p1, p2, p3, tolerance = 0.1) {
        // Calcul de l'aire du triangle formé par les 3 points
        const area = Math.abs(
            (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
        );
        return area < tolerance;
    }
    
    /**
     * Lisse un chemin en ajoutant des points intermédiaires courbes
     */
    static smoothPath(path, segments = 3) {
        if (path.length <= 1) return path;
        
        const smoothed = [];
        
        for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];
            
            smoothed.push(current);
            
            // Ajouter des points intermédiaires
            for (let j = 1; j < segments; j++) {
                const t = j / segments;
                const interpolated = {
                    x: current.x + (next.x - current.x) * t,
                    y: current.y + (next.y - current.y) * t
                };
                smoothed.push(interpolated);
            }
        }
        
        smoothed.push(path[path.length - 1]);
        return smoothed;
    }
}