// Service responsible for castle detection and highlighting (Single Responsibility)
export class CastleDetectionService {
    constructor(grid) {
        this.grid = grid;
    }

    checkForClosedCastles() {
        const closedCastles = this.grid.findClosedCastles();
        
        if (closedCastles.length > 0) {
            console.log(`🏰 ${closedCastles.length} château(x) fermé(s) détecté(s) !`);
            
            // Highlight all closed castles
            closedCastles.forEach((castle, index) => {
                console.log(`🏰 Château ${index + 1}: Zone de ${castle.size} cellules`);
                this.highlightConstructibleArea(castle.area);
            });
            
            console.log('🎯 Zones constructibles colorées !');
            return true;
        }
        
        return false;
    }

    highlightConstructibleArea(area) {
        // Mark all land cells in the area as constructible
        let markedCount = 0;
        
        area.forEach(({x, y}) => {
            const cell = this.grid.getCell(x, y);
            if (cell && cell.type === 'land') {
                cell.cannonZone = true;
                markedCount++;
            }
        });
        
        console.log(`✨ ${markedCount} cellules marquées comme zone constructible`);
    }

    clearAllCannonZones() {
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell && cell.cannonZone) {
                    delete cell.cannonZone;
                }
            }
        }
    }
}