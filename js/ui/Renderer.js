import { CELL_TYPES, CELL_PROPERTIES } from '../game/Grid.js';

export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.cellSize = 32;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        
        this.colors = {
            background: '#0a0a0a',
            gridLines: '#333333',
            hover: '#ffff00',
            selected: '#ff6b35'
        };

        this.animations = {
            explosions: [],
            water: { frame: 0, speed: 200 }
        };
        
        this.lastAnimationTime = 0;
    }

    async init() {
        this.handleResize();
        this.setupPixelArt();
        console.log('🎨 Renderer initialized');
    }

    setupPixelArt() {
        // Disable anti-aliasing for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
    }

    handleResize() {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        const maxWidth = Math.min(containerRect.width - 40, 768);
        const maxHeight = Math.min(containerRect.height - 40, 768);
        
        const size = Math.min(maxWidth, maxHeight);
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Calcul exact du cellSize pour éviter les décalages
        this.cellSize = size / 24; // Ne pas arrondir ici
        this.gridOffsetX = 0; // Pas d'offset, la grille prend tout le canvas
        this.gridOffsetY = 0;
        
        this.setupPixelArt();
    }

    clear() {
        // Fond noir pour contraster avec l'eau cyan
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderGrid(grid) {
        // Render cells
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                this.renderCell(grid.getCell(x, y));
            }
        }
        
        // Render grid lines (optional)
        this.renderGridLines(grid);
        
        // Update animations
        this.updateAnimations();
    }

    renderCell(cell) {
        if (!cell) return;

        const screenX = Math.floor(this.gridOffsetX + cell.x * this.cellSize);
        const screenY = Math.floor(this.gridOffsetY + cell.y * this.cellSize);
        const size = Math.ceil(this.cellSize);
        
        // Get base color
        let color = this.getCellColor(cell);
        
        // Apply player color tint for owned cells
        if (cell.playerId) {
            color = this.tintColor(color, this.getPlayerColor(cell.playerId));
        }
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenX, screenY, size, size);
        
        // Special rendering for specific cell types
        this.renderCellDetails(cell, screenX, screenY);
    }

    getCellColor(cell) {
        const props = CELL_PROPERTIES[cell.type];
        if (!props) return '#666666';
        
        let color = props.color;
        
        // Zone constructible pour canons - surbrillance dorée
        if (cell.cannonZone) {
            color = '#ffd700'; // Or brillant pour marquer la zone
        }
        
        // Animation eau temporairement désactivée
        // TODO: Réactiver quand le bug sera corrigé
        /*
        if (cell && cell.type && cell.type === 'water') {
            const wave = Math.sin(Date.now() * 0.002 + cell.x * 0.3 + cell.y * 0.2) * 0.15;
            color = this.adjustBrightness(color, wave);
        }
        */
        
        // Damaged cells are darker
        if (cell.health < 1 && cell.isDestructible()) {
            color = this.adjustBrightness(color, -0.3);
        }
        
        return color;
    }

    renderCellDetails(cell, screenX, screenY) {
        switch (cell.type) {
            case CELL_TYPES.CASTLE_CORE:
                this.renderCastleCore(screenX, screenY);
                break;
            case CELL_TYPES.CANNON:
                this.renderCannon(screenX, screenY);
                break;
            case CELL_TYPES.WALL:
                this.renderWall(screenX, screenY, cell.health);
                break;
            case CELL_TYPES.DESTROYED:
                this.renderDestroyed(screenX, screenY);
                break;
        }
    }

    renderCastleCore(x, y) {
        const size = this.cellSize;
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        // Draw castle symbol
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(centerX - 4, centerY - 6, 8, 12);
        this.ctx.fillRect(centerX - 8, centerY - 4, 4, 8);
        this.ctx.fillRect(centerX + 4, centerY - 4, 4, 8);
    }

    renderCannon(x, y) {
        const size = this.cellSize;
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        // Draw cannon
        this.ctx.fillStyle = '#2c1810';
        this.ctx.fillRect(centerX - 6, centerY - 6, 12, 12);
        
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(centerX - 2, centerY - 8, 4, 6);
    }

    renderWall(x, y, health) {
        const size = this.cellSize;
        
        // Add brick pattern
        this.ctx.strokeStyle = '#4a4a4a';
        this.ctx.lineWidth = 1;
        
        // Horizontal lines
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size / 3);
        this.ctx.lineTo(x + size, y + size / 3);
        this.ctx.moveTo(x, y + 2 * size / 3);
        this.ctx.lineTo(x + size, y + 2 * size / 3);
        this.ctx.stroke();
        
        // Vertical lines (offset for brick pattern)
        this.ctx.beginPath();
        this.ctx.moveTo(x + size / 2, y);
        this.ctx.lineTo(x + size / 2, y + size / 3);
        this.ctx.moveTo(x + size / 4, y + size / 3);
        this.ctx.lineTo(x + size / 4, y + 2 * size / 3);
        this.ctx.moveTo(x + 3 * size / 4, y + size / 3);
        this.ctx.lineTo(x + 3 * size / 4, y + 2 * size / 3);
        this.ctx.moveTo(x + size / 2, y + 2 * size / 3);
        this.ctx.lineTo(x + size / 2, y + size);
        this.ctx.stroke();
        
        // Show damage with cracks
        if (health < 1) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x + 2, y + 2);
            this.ctx.lineTo(x + size - 2, y + size - 2);
            this.ctx.stroke();
        }
    }

    renderDestroyed(x, y) {
        const size = this.cellSize;
        
        // Draw debris
        this.ctx.fillStyle = '#666666';
        for (let i = 0; i < 5; i++) {
            const debrisX = x + Math.random() * size;
            const debrisY = y + Math.random() * size;
            this.ctx.fillRect(debrisX, debrisY, 2, 2);
        }
    }

    renderGridLines(grid) {
        this.ctx.strokeStyle = this.colors.gridLines;
        this.ctx.lineWidth = 0.5;
        this.ctx.globalAlpha = 0.3;
        
        // Vertical lines
        for (let x = 0; x <= grid.width; x++) {
            const screenX = this.gridOffsetX + x * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, this.gridOffsetY);
            this.ctx.lineTo(screenX, this.gridOffsetY + grid.height * this.cellSize);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= grid.height; y++) {
            const screenY = this.gridOffsetY + y * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(this.gridOffsetX, screenY);
            this.ctx.lineTo(this.gridOffsetX + grid.width * this.cellSize, screenY);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    renderPlayers(players) {
        players.forEach(player => {
            this.renderPlayer(player);
        });
    }

    renderPlayer(player) {
        // Render player's cannons with firing animation
        player.cannons.forEach(cannon => {
            this.renderCannonWithEffects(cannon);
        });
        
        // Render current piece preview
        if (player.currentPiece && player.piecePosition) {
            // Use piece color instead of player color for better visibility
            const pieceColor = player.currentPiece.color || player.color;
            this.renderPiecePreview(player.currentPiece, player.piecePosition.x, player.piecePosition.y, pieceColor);
        }
    }

    renderCannonWithEffects(cannon) {
        // Cannons are already rendered as part of the grid
        // This could add firing effects, muzzle flash, etc.
        
        if (cannon.firing) {
            this.addMuzzleFlash(cannon.x, cannon.y);
        }
    }

    renderPiecePreview(piece, x, y, color, alpha = 0.7) {
        if (!piece || !piece.shape) return;
        
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        
        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (piece.shape[py][px] === 1) {
                    const screenX = Math.floor(this.gridOffsetX + (x + px) * this.cellSize);
                    const screenY = Math.floor(this.gridOffsetY + (y + py) * this.cellSize);
                    const size = Math.ceil(this.cellSize);
                    
                    this.ctx.fillRect(screenX, screenY, size - 1, size - 1);
                    
                    // Add border
                    this.ctx.strokeStyle = this.adjustBrightness(color, 0.3);
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(screenX, screenY, size - 1, size - 1);
                }
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    renderHoverIndicator(gridPos) {
        const screenX = Math.floor(this.gridOffsetX + gridPos.x * this.cellSize);
        const screenY = Math.floor(this.gridOffsetY + gridPos.y * this.cellSize);
        const size = Math.ceil(this.cellSize);
        
        this.ctx.strokeStyle = this.colors.hover;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screenX, screenY, size, size);
    }

    screenToGrid(canvasX, canvasY) {
        // Conversion directe canvas → grille (sans rect.getBoundingClientRect ici)
        const gridX = Math.floor((canvasX - this.gridOffsetX) / this.cellSize);
        const gridY = Math.floor((canvasY - this.gridOffsetY) / this.cellSize);
        
        // Clamp to valid grid bounds
        const clampedX = Math.max(0, Math.min(23, gridX));
        const clampedY = Math.max(0, Math.min(23, gridY));
        
        return { x: clampedX, y: clampedY };
    }

    gridToScreen(gridX, gridY) {
        return {
            x: this.gridOffsetX + gridX * this.cellSize,
            y: this.gridOffsetY + gridY * this.cellSize
        };
    }

    // Animation system
    updateAnimations() {
        const now = Date.now();
        
        // Update explosions
        this.animations.explosions = this.animations.explosions.filter(explosion => {
            return this.renderExplosion(explosion, now);
        });
    }

    addExplosion(x, y) {
        this.animations.explosions.push({
            x: x,
            y: y,
            startTime: Date.now(),
            duration: 500
        });
    }

    addMuzzleFlash(x, y) {
        // Simple muzzle flash effect
        const screenPos = this.gridToScreen(x, y);
        this.ctx.fillStyle = '#ffff00';
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillRect(screenPos.x - 4, screenPos.y - 4, this.cellSize + 8, this.cellSize + 8);
        this.ctx.globalAlpha = 1.0;
    }

    renderExplosion(explosion, currentTime) {
        const elapsed = currentTime - explosion.startTime;
        const progress = elapsed / explosion.duration;
        
        if (progress >= 1) return false; // Remove explosion
        
        const screenPos = this.gridToScreen(explosion.x, explosion.y);
        const radius = progress * this.cellSize;
        const alpha = 1 - progress;
        
        this.ctx.globalAlpha = alpha;
        
        // Outer ring (yellow)
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x + this.cellSize/2, screenPos.y + this.cellSize/2, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner ring (red)
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x + this.cellSize/2, screenPos.y + this.cellSize/2, radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.globalAlpha = 1.0;
        return true; // Keep explosion
    }

    // Utility methods
    tintColor(baseColor, tintColor, strength = 0.3) {
        const base = this.hexToRgb(baseColor);
        const tint = this.hexToRgb(tintColor);
        
        if (!base || !tint) return baseColor;
        
        const r = Math.round(base.r * (1 - strength) + tint.r * strength);
        const g = Math.round(base.g * (1 - strength) + tint.g * strength);
        const b = Math.round(base.b * (1 - strength) + tint.b * strength);
        
        return this.rgbToHex(r, g, b);
    }

    adjustBrightness(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const r = Math.max(0, Math.min(255, rgb.r + amount * 255));
        const g = Math.max(0, Math.min(255, rgb.g + amount * 255));
        const b = Math.max(0, Math.min(255, rgb.b + amount * 255));
        
        return this.rgbToHex(r, g, b);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    getPlayerColor(playerId) {
        const colors = ['#ff6b35', '#004e89', '#2ecc71'];
        return colors[playerId - 1] || '#ffffff';
    }
}