// ===================================================
// SERVICE DE COORDONNÉES
// ===================================================
// Centralise tous les calculs de conversion de coordonnées

/**
 * Service centralisé pour toutes les conversions de coordonnées
 */
export class CoordinateService {
    
    /**
     * Convertit des coordonnées d'événement (clientX/Y) vers les coordonnées Canvas
     */
    static eventToCanvas(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        
        // Support des événements touch et mouse
        const clientX = event.clientX || (event.touches && event.touches[0]?.clientX) || 0;
        const clientY = event.clientY || (event.touches && event.touches[0]?.clientY) || 0;
        
        // Coordonnées dans l'espace CSS
        const cssX = clientX - rect.left;
        const cssY = clientY - rect.top;
        
        // Scaling pour convertir CSS → Canvas
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: cssX * scaleX,
            y: cssY * scaleY
        };
    }
    
    /**
     * Convertit des coordonnées Canvas vers les coordonnées de grille
     */
    static canvasToGrid(canvasX, canvasY, gridOffsetX, gridOffsetY, cellSize, gridWidth, gridHeight) {
        // Conversion directe canvas → grille
        const rawGridX = Math.floor((canvasX - gridOffsetX) / cellSize);
        const rawGridY = Math.floor((canvasY - gridOffsetY) / cellSize);
        
        // Clamping intelligent dans les limites réelles de la grille
        return {
            x: Math.max(0, Math.min(gridWidth - 1, rawGridX)),
            y: Math.max(0, Math.min(gridHeight - 1, rawGridY))
        };
    }
    
    /**
     * Convertit des coordonnées de grille vers les coordonnées Canvas
     */
    static gridToCanvas(gridX, gridY, gridOffsetX, gridOffsetY, cellSize) {
        return {
            x: gridOffsetX + gridX * cellSize,
            y: gridOffsetY + gridY * cellSize
        };
    }
    
    /**
     * Convertit directement des coordonnées d'événement vers la grille (combinaison des deux précédentes)
     */
    static eventToGrid(event, canvas, gridOffsetX, gridOffsetY, cellSize, gridWidth, gridHeight) {
        const canvasPos = this.eventToCanvas(event, canvas);
        return this.canvasToGrid(canvasPos.x, canvasPos.y, gridOffsetX, gridOffsetY, cellSize, gridWidth, gridHeight);
    }
    
    /**
     * Calcule le centre d'une cellule de grille en coordonnées Canvas
     */
    static gridCellCenter(gridX, gridY, gridOffsetX, gridOffsetY, cellSize) {
        return {
            x: gridOffsetX + (gridX + 0.5) * cellSize,
            y: gridOffsetY + (gridY + 0.5) * cellSize
        };
    }
    
    /**
     * Vérifie si un point Canvas est dans les limites d'une zone rectangulaire
     */
    static isInBounds(canvasX, canvasY, x, y, width, height) {
        return canvasX >= x && canvasX <= x + width && canvasY >= y && canvasY <= y + height;
    }
    
    /**
     * Calcule les dimensions d'un rectangle en pixels Canvas pour une zone de grille
     */
    static gridRectToCanvas(startGridX, startGridY, width, height, gridOffsetX, gridOffsetY, cellSize) {
        const topLeft = this.gridToCanvas(startGridX, startGridY, gridOffsetX, gridOffsetY, cellSize);
        
        return {
            x: topLeft.x,
            y: topLeft.y,
            width: width * cellSize,
            height: height * cellSize
        };
    }
    
    /**
     * Interpole linéairement entre deux points
     */
    static lerp(start, end, t) {
        return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t
        };
    }
}