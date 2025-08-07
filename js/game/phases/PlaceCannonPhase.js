import { BasePhase } from './BasePhase.js';

export class PlaceCannonPhase extends BasePhase {
    constructor(gameManager) {
        super(gameManager);
        this.cannonPreviewPos = null;
    }

    onEnter() {
        console.log('🎯 Entering PLACE_CANNONS phase');
        
        // CRUCIAL: Recalculer les zones fermées après les destructions et réparations
        this.recalculateClosedCastles();
    }

    onExit() {
        console.log('🎯 Exiting PLACE_CANNONS phase');
    }

    recalculateClosedCastles() {
        console.log('🔄 Recalcul des zones fermées pour placement canons...');
        
        // 1. Vider toutes les anciennes zones de canons
        this.clearAllCannonZones();
        
        // 2. Recalculer les châteaux fermés
        const closedCastles = this.gameManager.grid.findClosedCastles();
        
        console.log(`🏰 ${closedCastles.length} château(x) fermé(s) trouvé(s) après recalcul`);
        
        // 3. Remarquer les nouvelles zones constructibles
        if (closedCastles.length > 0) {
            closedCastles.forEach((castle, index) => {
                console.log(`🏰 Château ${index + 1}: Zone de ${castle.area.length} cellules`);
                this.highlightConstructibleArea(castle.area);
            });
            
            console.log('🎯 Zones constructibles mises à jour !');
        } else {
            console.log('⚠️ Aucun château fermé - pas de zone constructible !');
        }
    }
    
    clearAllCannonZones() {
        let clearedCount = 0;
        for (let y = 0; y < this.gameManager.grid.height; y++) {
            for (let x = 0; x < this.gameManager.grid.width; x++) {
                const cell = this.gameManager.grid.getCell(x, y);
                if (cell && cell.cannonZone) {
                    delete cell.cannonZone;
                    clearedCount++;
                }
            }
        }
        console.log(`🧹 ${clearedCount} anciennes zones de canons effacées`);
    }
    
    highlightConstructibleArea(area) {
        let markedCount = 0;
        area.forEach(({x, y}) => {
            const cell = this.gameManager.grid.getCell(x, y);
            if (cell && cell.type === 'land') {
                cell.cannonZone = true;
                markedCount++;
            }
        });
        console.log(`✨ ${markedCount} cellules marquées comme zone constructible`);
    }

    handleMouseMove(gridPos) {
        this.cannonPreviewPos = gridPos;
    }

    handleMouseClick(gridPos, button) {
        if (button === 0) { // Left click - place cannon
            this.placeCannon(gridPos);
        } else if (button === 2) { // Right click - remove cannon
            this.removeCannon(gridPos);
        }
    }

    placeCannon(gridPos) {
        if (!this.canPlaceCannonAt(gridPos.x, gridPos.y)) {
            console.log(`❌ Invalid position for cannon at (${gridPos.x}, ${gridPos.y})`);
            return;
        }

        const player = this.gameManager.getCurrentPlayer();
        
        if (this.grid.placeCannon(gridPos.x, gridPos.y, player.id)) {
            // Add to player's cannon list
            player.cannons.push({
                x: gridPos.x,
                y: gridPos.y,
                firing: false
            });
            
            console.log(`🎯 Cannon placed at (${gridPos.x}, ${gridPos.y})`);
        } else {
            console.log(`❌ Cannot place cannon at (${gridPos.x}, ${gridPos.y})`);
        }
    }

    removeCannon(gridPos) {
        const player = this.gameManager.getCurrentPlayer();
        
        // Find cannon at this position
        for (let i = 0; i < player.cannons.length; i++) {
            const cannon = player.cannons[i];
            
            // Check if click is on this cannon (2x2)
            if (gridPos.x >= cannon.x && gridPos.x < cannon.x + 2 && 
                gridPos.y >= cannon.y && gridPos.y < cannon.y + 2) {
                
                // Remove from grid
                for (let dx = 0; dx < 2; dx++) {
                    for (let dy = 0; dy < 2; dy++) {
                        this.grid.setCellType(cannon.x + dx, cannon.y + dy, 'land');
                        // Restore cannon zone marking
                        const cell = this.grid.getCell(cannon.x + dx, cannon.y + dy);
                        if (cell) cell.cannonZone = true;
                    }
                }
                
                // Remove from player's list
                player.cannons.splice(i, 1);
                console.log(`🗑️ Cannon removed at (${cannon.x}, ${cannon.y})`);
                return;
            }
        }
        
        console.log(`❌ No cannon found at (${gridPos.x}, ${gridPos.y})`);
    }

    canPlaceCannonAt(x, y) {
        // Check if position is in constructible zone (golden)
        const topLeft = this.grid.getCell(x, y);
        if (!topLeft || !topLeft.cannonZone) {
            return false;
        }
        
        // Check all 4 cells are in constructible zone
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const cell = this.grid.getCell(x + dx, y + dy);
                if (!cell || !cell.cannonZone || cell.type !== 'land') {
                    return false;
                }
            }
        }
        
        return this.grid.canPlaceCannon(x, y, this.gameManager.getCurrentPlayer().id);
    }

    render() {
        // Render cannon preview
        if (this.cannonPreviewPos) {
            this.renderCannonPreview(this.cannonPreviewPos);
        }
    }

    renderCannonPreview(gridPos) {
        const canPlace = this.canPlaceCannonAt(gridPos.x, gridPos.y);
        const previewColor = canPlace ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        
        // Draw 2x2 preview
        this.ctx.fillStyle = previewColor;
        
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const screenPos = this.renderer.gridToScreen(gridPos.x + dx, gridPos.y + dy);
                this.ctx.fillRect(screenPos.x, screenPos.y, this.renderer.cellSize - 1, this.renderer.cellSize - 1);
            }
        }
        
        // Border
        this.ctx.strokeStyle = canPlace ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = 2;
        const topLeftScreen = this.renderer.gridToScreen(gridPos.x, gridPos.y);
        this.ctx.strokeRect(topLeftScreen.x, topLeftScreen.y, this.renderer.cellSize * 2 - 1, this.renderer.cellSize * 2 - 1);
        
        // Cannon symbol if can place
        if (canPlace) {
            const centerScreen = this.renderer.gridToScreen(gridPos.x + 0.5, gridPos.y + 0.5);
            this.ctx.fillStyle = '#8b4513';
            this.ctx.fillRect(centerScreen.x - 4, centerScreen.y - 4, 8, 8);
            this.ctx.fillStyle = '#2c1810';
            this.ctx.fillRect(centerScreen.x - 2, centerScreen.y - 6, 4, 4);
        }
    }

    renderUI() {
        const canvas = this.gameManager.canvas;
        
        // Phase indicator background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(canvas.width / 2 - 120, 10, 240, 50);
        
        // Border
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(canvas.width / 2 - 120, 10, 240, 50);
        
        // Title
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PLACEMENT CANONS', canvas.width / 2, 40);
        
        // Instructions
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Clic gauche: placer • Clic droit: supprimer', canvas.width / 2, 55);
        
        // Reset text align
        this.ctx.textAlign = 'left';
    }
}