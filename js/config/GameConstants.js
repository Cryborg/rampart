// Configuration centralisée du jeu Rampart
export const GAME_CONFIG = {
    // Grille de jeu
    GRID: {
        WIDTH: 48,
        HEIGHT: 36,
        MAX_X: 47,  // WIDTH - 1
        MAX_Y: 35   // HEIGHT - 1
    },
    
    // Canvas et rendu
    CANVAS: {
        MAX_SIZE: 768,
        OFFSET_Y_ADJUSTMENT: 50
    },
    
    // Tailles et dimensions
    SIZES: {
        CASTLE_SIZE: 7,
        TERRITORY_SIZE: 12,
        SAFETY_RADIUS: 4,
        CANNON_SIZE: 2  // Canon 2x2
    },
    
    // Timers (en millisecondes)
    TIMERS: {
        REPAIR_PHASE: 15000,
        CANNON_PHASE: 10000
    },
    
    // Debug
    DEBUG: {
        ENABLED: false,
        LOG_MOUSE_MOVES: false
    }
};

// Utilitaires de calcul
export class CoordinateUtils {
    static getScreenCoords(renderer, gridX, gridY) {
        return {
            x: renderer.gridOffsetX + gridX * renderer.cellSize,
            y: renderer.gridOffsetY + gridY * renderer.cellSize,
            size: renderer.cellSize
        };
    }
    
    static clampToGrid(x, y) {
        return {
            x: Math.max(0, Math.min(GAME_CONFIG.GRID.MAX_X, x)),
            y: Math.max(0, Math.min(GAME_CONFIG.GRID.MAX_Y, y))
        };
    }
}