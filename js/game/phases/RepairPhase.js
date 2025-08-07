import { BasePhase } from './BasePhase.js';

export class RepairPhase extends BasePhase {
    constructor(gameManager) {
        super(gameManager);
        this.timeLeft = 30.0;
        this.startTime = null;
        this.timer = null;
    }

    onEnter() {
        console.log('🧱 Entering REPAIR phase');
        
        // Initialize repair phase
        this.timeLeft = 30.0;
        this.startTime = Date.now();
        this.generatePieceForCurrentPlayer();
        
        // Set timer
        this.timer = setTimeout(() => {
            console.log('⏰ Repair time elapsed!');
            this.gameManager.transitionToPhase('PLACE_CANNONS');
        }, 30000);
        
        console.log('⏰ Repair timer: 30 seconds');
    }

    onExit() {
        console.log('🧱 Exiting REPAIR phase');
        this.clearTimer();
    }

    generatePieceForCurrentPlayer() {
        const player = this.gameManager.getCurrentPlayer();
        player.currentPiece = this.gameManager.pieceGenerator.generatePiece(player.id);
        
        // Set initial position
        player.piecePosition = { 
            x: player.territory.startX + 5, 
            y: player.territory.startY + 5 
        };
        
        console.log(`🧱 Generated piece: ${player.currentPiece.type}`);
    }

    recalculateClosedCastles() {
        console.log('🔄 Recalcul des zones fermées après destructions...');
        
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

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
            this.timeLeft = undefined;
            this.startTime = null;
            console.log('⏰ Repair timer cleared');
        }
    }

    update(deltaTime) {
        // Update timer
        if (this.startTime) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            this.timeLeft = Math.max(0, 30 - elapsed);
        }
    }

    handleMouseMove(gridPos) {
        const player = this.gameManager.getCurrentPlayer();
        if (player.currentPiece) {
            // Update piece position
            player.piecePosition = { 
                x: gridPos.x, 
                y: gridPos.y
            };
            
            // Clamp to grid bounds
            const maxX = 24 - player.currentPiece.width;
            const maxY = 24 - player.currentPiece.height;
            player.piecePosition.x = Math.max(0, Math.min(maxX, player.piecePosition.x));
            player.piecePosition.y = Math.max(0, Math.min(maxY, player.piecePosition.y));
        }
    }

    handleMouseClick(gridPos, button) {
        if (button === 0) { // Left click - place piece
            this.placePiece(gridPos);
        } else if (button === 2) { // Right click - rotate
            this.rotatePiece();
        }
    }

    handleKeyPress(key) {
        switch (key) {
            case ' ':
            case 'r':
                this.rotatePiece();
                break;
        }
    }

    placePiece(gridPos) {
        const player = this.gameManager.getCurrentPlayer();
        
        if (!player.currentPiece) return;

        const pieceX = player.piecePosition.x;
        const pieceY = player.piecePosition.y;
        
        if (this.grid.canPlacePiece(player.currentPiece, pieceX, pieceY)) {
            // Place the piece
            this.grid.placePiece(player.currentPiece, pieceX, pieceY, player.id);
            player.stats.piecesPlaced++;
            
            // Check for castle closure
            this.gameManager.checkCastleClosure();
            
            // Generate next piece
            this.generatePieceForCurrentPlayer();
            
            console.log(`✅ Piece placed at: (${pieceX}, ${pieceY})`);
        } else {
            console.log(`❌ Cannot place piece at: (${pieceX}, ${pieceY})`);
        }
    }

    rotatePiece() {
        const player = this.gameManager.getCurrentPlayer();
        if (player.currentPiece) {
            player.currentPiece.rotate();
            console.log('🔄 Piece rotated');
        }
    }

    render() {
        // Render hover indicator
        const hoverPos = this.gameManager.currentHoverPos;
        if (hoverPos) {
            this.renderer.renderHoverIndicator(hoverPos);
        }
    }

    renderUI() {
        if (this.timeLeft === undefined) return;

        const canvas = this.gameManager.canvas;
        
        // Timer background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(canvas.width / 2 - 100, 10, 200, 60);
        
        // Timer border
        this.ctx.strokeStyle = '#ff6b35';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(canvas.width / 2 - 100, 10, 200, 60);
        
        // Timer text
        this.ctx.fillStyle = this.timeLeft <= 5 ? '#ff0000' : '#ffffff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${Math.ceil(this.timeLeft)}s`, canvas.width / 2, 45);
        
        // Label
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('RÉPARATION', canvas.width / 2, 62);
        
        // Reset text align
        this.ctx.textAlign = 'left';
    }
}