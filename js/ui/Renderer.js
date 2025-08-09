import { CELL_TYPES, CELL_PROPERTIES } from '../game/Grid.js';
import { GAME_CONFIG } from '../config/GameConstants.js';
import { adjustBrightness, rgbToHex, hexToRgb } from '../utils/GameUtils.js';
import { CoordinateService } from '../services/CoordinateService.js';

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
        
        // Utiliser la hauteur disponible avec un minimum raisonnable
        const availableWidth = containerRect.width - 40;
        const availableHeight = containerRect.height - 40;
        
        // Tailles minimales pour que le jeu reste jouable
        const minWidth = 600;
        const minHeight = 450;
        
        // S'adapter à la hauteur d'écran en priorité, avec un minimum
        let canvasHeight = Math.max(minHeight, Math.min(availableHeight, 900));
        
        // Calculer la largeur proportionnellement au ratio 48:36 de la grille
        const gridRatio = GAME_CONFIG.GRID_WIDTH / GAME_CONFIG.GRID_HEIGHT; // 48/36 = 1.33
        let canvasWidth = canvasHeight * gridRatio;
        
        // S'assurer que la largeur ne dépasse pas l'espace disponible
        if (canvasWidth > availableWidth) {
            canvasWidth = Math.max(minWidth, availableWidth);
            // Recalculer la hauteur si nécessaire
            const adjustedHeight = canvasWidth / gridRatio;
            if (adjustedHeight < availableHeight) {
                canvasHeight = adjustedHeight;
            }
        }
        
        this.canvas.width = Math.floor(canvasWidth);
        this.canvas.height = Math.floor(canvasHeight);
        
        // Calcul cellSize pour grille avec constantes - forcer entier pour grilles régulières
        const cellSizeX = this.canvas.width / GAME_CONFIG.GRID_WIDTH;
        const cellSizeY = this.canvas.height / GAME_CONFIG.GRID_HEIGHT; 
        this.cellSize = Math.floor(Math.min(cellSizeX, cellSizeY)); // Forcer entier
        
        // Centrer la grille dans le canvas
        const gridWidth = GAME_CONFIG.GRID_WIDTH * this.cellSize;
        const gridHeight = GAME_CONFIG.GRID_HEIGHT * this.cellSize;
        this.gridOffsetX = (this.canvas.width - gridWidth) / 2;
        this.gridOffsetY = (this.canvas.height - gridHeight) / 2;
        
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
        
        // Render grid lines (fines et utiles)
        this.renderGridLines(grid);
        
        // Update animations
        this.updateAnimations();
    }

    renderCell(cell) {
        if (!cell) return;

        // Calcul précis sans arrondi prématuré
        const screenX = this.gridOffsetX + cell.x * this.cellSize;
        const screenY = this.gridOffsetY + cell.y * this.cellSize;
        const size = this.cellSize;
        
        // Get base color
        let color = this.getCellColor(cell);
        
        // Apply player color tint for owned cells
        if (cell.playerId) {
            color = this.tintColor(color, this.getPlayerColor(cell.playerId));
        }
        
        this.ctx.fillStyle = color;
        // Arrondir seulement au moment du rendu
        this.ctx.fillRect(Math.round(screenX), Math.round(screenY), Math.round(size), Math.round(size));
        
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
            color = adjustBrightness(color, wave);
        }
        */
        
        // Damaged cells are darker
        if (cell.health < 1 && cell.isDestructible()) {
            color = adjustBrightness(color, -0.3);
        }
        
        return color;
    }

    renderCellDetails(cell, screenX, screenY) {
        // Les méthodes de rendu des détails utiliseront les valeurs précises
        switch (cell.type) {
            case CELL_TYPES.CASTLE_CORE:
                this.renderCastleCore(screenX, screenY);
                break;
            case CELL_TYPES.CANNON:
                this.renderCannon(screenX, screenY, cell.health, cell.maxHealth);
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
        this.ctx.fillRect(Math.round(centerX - 4), Math.round(centerY - 6), 8, 12);
        this.ctx.fillRect(Math.round(centerX - 8), Math.round(centerY - 4), 4, 8);
        this.ctx.fillRect(Math.round(centerX + 4), Math.round(centerY - 4), 4, 8);
    }

    renderCannon(x, y, health = 3, maxHealth = 3) {
        const size = this.cellSize;
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        // Draw cannon
        this.ctx.fillStyle = '#2c1810';
        this.ctx.fillRect(Math.round(centerX - 6), Math.round(centerY - 6), 12, 12);
        
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(Math.round(centerX - 2), Math.round(centerY - 8), 4, 6);
        
        // Afficher la barre de HP si le canon est endommagé
        if (health < maxHealth) {
            const barWidth = size * 0.6;
            const barHeight = 3;
            const barX = x + (size - barWidth) / 2;
            const barY = y + size + 2;
            
            // Fond rouge
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(Math.round(barX), Math.round(barY), barWidth, barHeight);
            
            // Barre verte représentant les HP restants
            const healthRatio = health / maxHealth;
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(Math.round(barX), Math.round(barY), barWidth * healthRatio, barHeight);
            
            // Bordure blanche
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(Math.round(barX), Math.round(barY), barWidth, barHeight);
            
            // Afficher HP textuellement
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${health}/${maxHealth}`, x + size/2, barY + barHeight + 12);
            this.ctx.textAlign = 'left'; // Reset
        }
    }

    renderWall(x, y, health) {
        const size = this.cellSize;
        
        // Add brick pattern
        this.ctx.strokeStyle = '#4a4a4a';
        this.ctx.lineWidth = 1;
        
        // Horizontal lines
        this.ctx.beginPath();
        this.ctx.moveTo(Math.round(x), Math.round(y + size / 3));
        this.ctx.lineTo(Math.round(x + size), Math.round(y + size / 3));
        this.ctx.moveTo(Math.round(x), Math.round(y + 2 * size / 3));
        this.ctx.lineTo(Math.round(x + size), Math.round(y + 2 * size / 3));
        this.ctx.stroke();
        
        // Vertical lines (offset for brick pattern)
        this.ctx.beginPath();
        this.ctx.moveTo(Math.round(x + size / 2), Math.round(y));
        this.ctx.lineTo(Math.round(x + size / 2), Math.round(y + size / 3));
        this.ctx.moveTo(Math.round(x + size / 4), Math.round(y + size / 3));
        this.ctx.lineTo(Math.round(x + size / 4), Math.round(y + 2 * size / 3));
        this.ctx.moveTo(Math.round(x + 3 * size / 4), Math.round(y + size / 3));
        this.ctx.lineTo(Math.round(x + 3 * size / 4), Math.round(y + 2 * size / 3));
        this.ctx.moveTo(Math.round(x + size / 2), Math.round(y + 2 * size / 3));
        this.ctx.lineTo(Math.round(x + size / 2), Math.round(y + size));
        this.ctx.stroke();
        
        // Show damage with cracks
        if (health < 1) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.round(x + 2), Math.round(y + 2));
            this.ctx.lineTo(Math.round(x + size - 2), Math.round(y + size - 2));
            this.ctx.stroke();
        }
    }

    renderDestroyed(x, y) {
        const size = this.cellSize;
        
        // Fond de base sombre pour les ruines
        this.ctx.fillStyle = '#3a3a3a';
        this.ctx.fillRect(x, y, size, size);
        
        // Bordure déchiquetée
        this.ctx.strokeStyle = '#2a2a2a';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 2]);
        this.ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
        this.ctx.setLineDash([]);
        
        // Débris visibles - plus gros et plus nombreux
        this.ctx.fillStyle = '#777777';
        for (let i = 0; i < 8; i++) {
            const debrisX = x + (Math.sin(i * 0.8) + 1) * size * 0.3 + size * 0.1;
            const debrisY = y + (Math.cos(i * 0.8) + 1) * size * 0.3 + size * 0.1;
            const debrisSize = 2 + Math.floor(i % 3);
            this.ctx.fillRect(Math.round(debrisX), Math.round(debrisY), debrisSize, debrisSize);
        }
        
        // Fissures diagonales pour effet dramatique
        this.ctx.strokeStyle = '#555555';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.2, y + size * 0.1);
        this.ctx.lineTo(x + size * 0.8, y + size * 0.9);
        this.ctx.moveTo(x + size * 0.1, y + size * 0.7);
        this.ctx.lineTo(x + size * 0.6, y + size * 0.2);
        this.ctx.stroke();
        
        // Marque rouge de destruction au centre
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x + size/2, y + size/2, size * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
    }

    renderGridLines(grid) {
        this.ctx.strokeStyle = this.colors.gridLines;
        this.ctx.lineWidth = 0.5;
        this.ctx.globalAlpha = 0.3;
        
        // Vertical lines
        for (let x = 0; x <= grid.width; x++) {
            // Calcul précis
            const screenX = this.gridOffsetX + x * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.round(screenX), Math.round(this.gridOffsetY));
            this.ctx.lineTo(Math.round(screenX), Math.round(this.gridOffsetY + grid.height * this.cellSize));
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= grid.height; y++) {
            // Calcul précis
            const screenY = this.gridOffsetY + y * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.round(this.gridOffsetX), Math.round(screenY));
            this.ctx.lineTo(Math.round(this.gridOffsetX + grid.width * this.cellSize), Math.round(screenY));
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

    renderPiecePreview(piece, x, y, color, alpha = 1.0) {
        if (!piece || !piece.shape) return;
        
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        
        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (piece.shape[py][px] === 1) {
                    // Calculs précis sans arrondi prématuré
                    const screenX = this.gridOffsetX + (x + px) * this.cellSize;
                    const screenY = this.gridOffsetY + (y + py) * this.cellSize;
                    const size = this.cellSize;
                    
                    // Arrondir seulement au moment du rendu
                    this.ctx.fillRect(Math.round(screenX), Math.round(screenY), Math.round(size - 1), Math.round(size - 1));
                    
                    // Add border (plus discret)
                    this.ctx.strokeStyle = adjustBrightness(color, 0.5); // Plus clair
                    this.ctx.lineWidth = 1; // Plus fin
                    this.ctx.strokeRect(Math.round(screenX), Math.round(screenY), Math.round(size - 1), Math.round(size - 1));
                }
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    renderHoverIndicator(gridPos) {
        const screenX = this.gridOffsetX + gridPos.x * this.cellSize;
        const screenY = this.gridOffsetY + gridPos.y * this.cellSize;
        const size = this.cellSize;
        
        this.ctx.strokeStyle = this.colors.hover;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(Math.round(screenX), Math.round(screenY), Math.round(size), Math.round(size));
    }

    renderCannonPreview(gridPos, canPlaceCallback, remainingCannons = 0) {
        // Vérifier si on peut placer un canon à cette position
        const canPlace = canPlaceCallback(gridPos.x, gridPos.y);
        
        // Couleur de l'aperçu : vert si possible, rouge si impossible
        const previewColor = canPlace ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        
        // Dessiner l'aperçu 2x2 avec les bons offsets
        this.ctx.fillStyle = previewColor;
        
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                // Calculs précis sans arrondi prématuré
                const screenX = this.gridOffsetX + (gridPos.x + dx) * this.cellSize;
                const screenY = this.gridOffsetY + (gridPos.y + dy) * this.cellSize;
                const size = this.cellSize;
                
                // Arrondir seulement au moment du rendu
                this.ctx.fillRect(Math.round(screenX), Math.round(screenY), Math.round(size - 1), Math.round(size - 1));
            }
        }
        
        // Bordure pour mieux voir l'aperçu
        this.ctx.strokeStyle = canPlace ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = 1;
        // Calculs précis pour la bordure
        const topLeftX = this.gridOffsetX + gridPos.x * this.cellSize;
        const topLeftY = this.gridOffsetY + gridPos.y * this.cellSize;
        const borderSize = this.cellSize * 2;
        
        // Arrondir seulement au moment du rendu
        this.ctx.strokeRect(Math.round(topLeftX), Math.round(topLeftY), Math.round(borderSize - 1), Math.round(borderSize - 1));
        
        // Symbole de canon au centre
        if (canPlace) {
            const centerX = topLeftX + this.cellSize;
            const centerY = topLeftY + this.cellSize;
            
            this.ctx.fillStyle = '#8b4513';
            this.ctx.fillRect(Math.round(centerX - 4), Math.round(centerY - 4), 8, 8);
            this.ctx.fillStyle = '#2c1810';
            this.ctx.fillRect(Math.round(centerX - 2), Math.round(centerY - 6), 4, 4);
        }
        
        // Afficher le nombre de canons restants - GROS et visible !
        if (remainingCannons > 0) {
            const centerX = topLeftX + this.cellSize;
            const centerY = topLeftY + this.cellSize;
            
            // Fond noir qui couvre presque toute la zone 2x2
            const bgSize = this.cellSize * 1.5;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            this.ctx.fillRect(
                Math.round(centerX - bgSize/2), 
                Math.round(centerY - bgSize/2), 
                Math.round(bgSize), 
                Math.round(bgSize)
            );
            
            // Texte du nombre - TRÈS GROS
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(remainingCannons.toString(), Math.round(centerX), Math.round(centerY));
            
            // Contour pour encore mieux voir
            this.ctx.strokeStyle = '#ffff00'; // Jaune pour bien contraster
            this.ctx.lineWidth = 1;
            this.ctx.strokeText(remainingCannons.toString(), Math.round(centerX), Math.round(centerY));
        }
    }

    setCursorVisibility(visible) {
        // Cacher/montrer le curseur de la souris
        this.canvas.style.cursor = visible ? 'crosshair' : 'none';
    }

    screenToGrid(canvasX, canvasY) {
        return CoordinateService.canvasToGrid(
            canvasX, canvasY, 
            this.gridOffsetX, this.gridOffsetY, 
            this.cellSize, 
            GAME_CONFIG.GRID_WIDTH, GAME_CONFIG.GRID_HEIGHT
        );
    }

    gridToScreen(gridX, gridY) {
        return CoordinateService.gridToCanvas(
            gridX, gridY, 
            this.gridOffsetX, this.gridOffsetY, 
            this.cellSize
        );
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
        const base = hexToRgb(baseColor);
        const tint = hexToRgb(tintColor);
        
        if (!base || !tint) return baseColor;
        
        const r = Math.round(base.r * (1 - strength) + tint.r * strength);
        const g = Math.round(base.g * (1 - strength) + tint.g * strength);
        const b = Math.round(base.b * (1 - strength) + tint.b * strength);
        
        return rgbToHex(r, g, b);
    }

    // Méthodes de couleur maintenant centralisées dans GameUtils

    getPlayerColor(playerId) {
        const colors = ['#ff6b35', '#004e89', '#2ecc71'];
        return colors[playerId - 1] || '#ffffff';
    }
}