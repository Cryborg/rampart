import { GAME_CONFIG, UTILS } from '../config/GameConstants.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        
        this.setupCanvas();
        this.initParticles();
        
        // Cache pour optimisation
        this.imageCache = new Map();
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
    }
    
    setupCanvas() {
        // Configuration Canvas pour pixel art
        this.ctx.imageSmoothingEnabled = false;
        
        // Responsive canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        // Dans le nouveau layout, le canvas prend tout l'espace disponible
        const container = this.canvas.parentElement; // game-layout
        const gameUILeft = document.getElementById('game-ui-left');
        
        // Calculer l'espace disponible pour le canvas
        const uiWidth = gameUILeft ? gameUILeft.offsetWidth : 280;
        const availableWidth = window.innerWidth - uiWidth;
        const availableHeight = window.innerHeight;
        
        const gridPixelWidth = GAME_CONFIG.GRID_WIDTH * GAME_CONFIG.CELL_SIZE;
        const gridPixelHeight = GAME_CONFIG.GRID_HEIGHT * GAME_CONFIG.CELL_SIZE;
        
        // Calcul du scale pour ajustement
        const scaleX = availableWidth / gridPixelWidth;
        const scaleY = availableHeight / gridPixelHeight;
        this.scale = Math.min(scaleX, scaleY, 1.2); // Scale maximum 1.2x
        this.scale = Math.max(this.scale, 0.4); // Scale minimum 0.4x
        
        // Le canvas utilise tout l'espace disponible
        this.canvas.width = availableWidth;
        this.canvas.height = availableHeight;
        
        // Centrer la grille dans le canvas
        const scaledGridWidth = gridPixelWidth * this.scale;
        const scaledGridHeight = gridPixelHeight * this.scale;
        this.offsetX = (availableWidth - scaledGridWidth) / 2;
        this.offsetY = (availableHeight - scaledGridHeight) / 2;
        
        // Reset et redimensionnement du contexte
        this.ctx.resetTransform();
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.offsetX / this.scale, this.offsetY / this.scale);
        
        console.log(`📏 Canvas resized: ${this.canvas.width}x${this.canvas.height} (scale: ${this.scale.toFixed(2)}, offset: ${this.offsetX}, ${this.offsetY})`);
    }
    
    initParticles() {
        this.particles = [];
        this.waveAnimTime = 0;
    }
    
    // Méthode principale de rendu
    render(gameState) {
        this.clearCanvas();
        this.updateAnimations();
        
        if (gameState.grid) {
            this.renderGrid(gameState.grid);
            this.renderCannonZones(gameState.grid);
            this.renderEntities(gameState);
            this.renderEffects();
        }
        
        this.updateFPS();
    }
    
    clearCanvas() {
        // Reset transform temporairement pour clear complet
        this.ctx.save();
        this.ctx.resetTransform();
        this.ctx.fillStyle = GAME_CONFIG.COLORS.WATER;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
    
    renderGrid(grid) {
        if (!grid) {
            console.warn('❌ Grid is null in renderGrid');
            return;
        }
        
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const cell = grid.getCell(x, y);
                if (cell) {
                    this.renderCell(x, y, cell);
                }
            }
        }
    }
    
    renderCell(x, y, cell) {
        const pixelX = x * GAME_CONFIG.CELL_SIZE;
        const pixelY = y * GAME_CONFIG.CELL_SIZE;
        const size = GAME_CONFIG.CELL_SIZE;
        
        let color;
        
        switch (cell.type) {
            case GAME_CONFIG.CELL_TYPES.WATER:
                color = this.getWaterColor(x, y);
                break;
            case GAME_CONFIG.CELL_TYPES.LAND:
                color = this.getLandColor(x, y);
                break;
            case GAME_CONFIG.CELL_TYPES.WALL:
                color = GAME_CONFIG.COLORS.WALL;
                break;
            case GAME_CONFIG.CELL_TYPES.CASTLE_CORE:
                color = GAME_CONFIG.COLORS.CASTLE_CORE;
                break;
            case GAME_CONFIG.CELL_TYPES.CANNON:
                color = GAME_CONFIG.COLORS.CANNON;
                break;
            case GAME_CONFIG.CELL_TYPES.DESTROYED:
                color = GAME_CONFIG.COLORS.DESTROYED;
                break;
            default:
                color = '#ff00ff'; // Debug magenta
        }
        
        // Rendu de base
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, size, size);
        
        // Les effets spéciaux de l'eau sont maintenant intégrés dans getWaterColor()
        
        if (cell.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE) {
            this.renderCastleCore(pixelX, pixelY, size);
        }
        
        // HP visual pour canons et murs
        if ((cell.type === GAME_CONFIG.CELL_TYPES.CANNON || cell.type === GAME_CONFIG.CELL_TYPES.WALL) && cell.hp > 0) {
            this.renderHPIndicator(pixelX, pixelY, size, cell.hp, cell.type === GAME_CONFIG.CELL_TYPES.CANNON ? GAME_CONFIG.GAMEPLAY.CANNON_HP : 1);
        }
    }
    
    getWaterColor(x, y) {
        // Eau statique avec légère variation pour éviter l'uniformité
        const variation = Math.sin(x * 0.1 + y * 0.08) * 15;
        
        // Alternance simple entre eau claire et eau foncée selon la position
        return variation > 0 ? GAME_CONFIG.COLORS.WATER_LIGHT : GAME_CONFIG.COLORS.WATER;
    }
    
    getLandColor(x, y) {
        // Motif damier pour la terre avec variation subtile
        const isCheckerboard = (x + y) % 2 === 0;
        const grassVariation = Math.sin(x * 0.15 + y * 0.12) * 8; // Variation plus naturelle
        
        if (isCheckerboard) {
            // Cases claires - LAND #22c55e = rgb(34, 197, 94)
            const r = Math.floor(34 + grassVariation);
            const g = Math.floor(197 + grassVariation);
            const b = Math.floor(94 + grassVariation);
            return `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
        } else {
            // Cases sombres - LAND_DARK #16a34a = rgb(22, 163, 74)
            const r = Math.floor(22 + grassVariation);
            const g = Math.floor(163 + grassVariation);
            const b = Math.floor(74 + grassVariation);
            return `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
        }
    }
    
    
    renderCastleCore(x, y, size) {
        // Croix sur le château
        const padding = size * 0.3;
        const lineWidth = 2;
        
        this.ctx.fillStyle = GAME_CONFIG.COLORS.UI_TEXT;
        this.ctx.fillRect(x + padding, y + size/2 - lineWidth/2, size - 2*padding, lineWidth);
        this.ctx.fillRect(x + size/2 - lineWidth/2, y + padding, lineWidth, size - 2*padding);
    }
    
    renderHPIndicator(x, y, size, currentHP, maxHP) {
        if (currentHP >= maxHP) return;
        
        const barWidth = size * 0.8;
        const barHeight = 3;
        const barX = x + (size - barWidth) / 2;
        const barY = y - 8;
        
        // Fond rouge
        this.ctx.fillStyle = '#dc2626';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Barre verte selon HP
        const healthRatio = currentHP / maxHP;
        this.ctx.fillStyle = healthRatio > 0.5 ? '#22c55e' : '#f59e0b';
        this.ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    }
    
    renderCannonZones(grid) {
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const cell = grid.getCell(x, y);
                if (cell && cell.cannonZone) {
                    this.renderCannonZoneHighlight(x, y);
                }
            }
        }
    }
    
    renderCannonZoneHighlight(x, y) {
        const pixelX = x * GAME_CONFIG.CELL_SIZE;
        const pixelY = y * GAME_CONFIG.CELL_SIZE;
        const size = GAME_CONFIG.CELL_SIZE;
        
        // Surbrillance dorée clignotante
        const alpha = Math.sin(this.waveAnimTime * 3) * 0.2 + 0.3;
        this.ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        this.ctx.fillRect(pixelX, pixelY, size, size);
        
        // Bordure
        this.ctx.strokeStyle = GAME_CONFIG.COLORS.CANNON_ZONE;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(pixelX + 0.5, pixelY + 0.5, size - 1, size - 1);
    }
    
    renderEntities(gameState) {
        // Rendu des entités (canons, ennemis, projectiles)
        if (gameState.cannons) {
            gameState.cannons.forEach(cannon => this.renderCannon(cannon));
        }
        
        if (gameState.enemies) {
            gameState.enemies.forEach(enemy => this.renderEnemy(enemy));
        }
        
        if (gameState.projectiles) {
            gameState.projectiles.forEach(projectile => this.renderProjectile(projectile));
        }
    }
    
    renderCannon(cannon) {
        const pixel = UTILS.gridToCanvas(cannon.gridX, cannon.gridY);
        const size = GAME_CONFIG.CELL_SIZE * GAME_CONFIG.GAMEPLAY.CANNON_SIZE;
        const centerX = pixel.x + size/2;
        const centerY = pixel.y + size/2;
        
        // Base du canon (cercle métallique)
        this.ctx.save();
        
        // Ombre pour la profondeur
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX + 2, centerY + 2, size * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Base métallique
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.35);
        gradient.addColorStop(0, '#8b8680');
        gradient.addColorStop(0.7, '#5a5651');
        gradient.addColorStop(1, '#3e3b37');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, size * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Rotation pour le tube
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(cannon.rotation || -Math.PI/2); // Par défaut pointe vers le haut
        
        // Tube du canon
        const tubeGradient = this.ctx.createLinearGradient(-size/10, 0, size/10, 0);
        tubeGradient.addColorStop(0, '#3e3b37');
        tubeGradient.addColorStop(0.5, '#5a5651');
        tubeGradient.addColorStop(1, '#3e3b37');
        this.ctx.fillStyle = tubeGradient;
        this.ctx.fillRect(-size/10, -size * 0.45, size/5, size * 0.55);
        
        // Bout du canon (plus épais)
        this.ctx.fillStyle = '#2d2a26';
        this.ctx.fillRect(-size/8, -size * 0.45, size/4, size * 0.1);
        
        // Détail central (vis/mécanisme)
        this.ctx.fillStyle = '#1a1917';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderEnemy(enemy) {
        const pixel = UTILS.gridToCanvas(enemy.x, enemy.y);
        const size = GAME_CONFIG.CELL_SIZE * 0.8;
        const centerX = pixel.x + size/2;
        const centerY = pixel.y + size/2;
        
        if (enemy.type === 'ship') {
            // Obtenir la couleur selon le type de navire
            const shipConfig = GAME_CONFIG.ENEMIES.SHIP_TYPES[enemy.shipType];
            const shipColor = shipConfig ? shipConfig.color : '#92400e';
            
            // Bateau avec voile colorée selon le type
            this.ctx.fillStyle = '#92400e';
            this.ctx.fillRect(pixel.x, pixel.y + size*0.7, size, size*0.3);
            
            // Voile colorée selon l'expérience
            this.ctx.fillStyle = shipColor;
            this.ctx.fillRect(pixel.x + size*0.3, pixel.y, size*0.4, size*0.7);
        } else if (enemy.type === 'land_unit') {
            // Troupe au sol - différencier selon le type
            const unitConfig = GAME_CONFIG.ENEMIES.LAND_UNIT_TYPES[enemy.unitType];
            const unitColor = unitConfig ? unitConfig.color : '#7c2d12';
            
            if (enemy.unitType === 'TANK') {
                // Tank - plus grand et plus carré
                this.ctx.fillStyle = unitColor;
                this.ctx.fillRect(pixel.x + size*0.1, pixel.y + size*0.1, size*0.8, size*0.8);
                
                // Détail du canon du tank
                this.ctx.fillStyle = '#1f2937';
                this.ctx.fillRect(pixel.x + size*0.4, pixel.y + size*0.1, size*0.2, size*0.6);
            } else {
                // Infanterie - plus petit
                this.ctx.fillStyle = unitColor;
                this.ctx.fillRect(pixel.x + size*0.3, pixel.y + size*0.2, size*0.4, size*0.6);
            }
        }
        
        // HP indicator (toujours visible pour les navires pour montrer leur type)
        if (enemy.type === 'ship') {
            this.renderHPIndicator(pixel.x, pixel.y, size, enemy.hp, enemy.maxHP);
        } else if (enemy.hp < enemy.maxHP) {
            this.renderHPIndicator(pixel.x, pixel.y, size, enemy.hp, enemy.maxHP);
        }
    }
    
    renderProjectile(projectile) {
        const size = 4;
        const x = projectile.x - size/2;
        const y = projectile.y - size/2;
        
        this.ctx.fillStyle = GAME_CONFIG.COLORS.PROJECTILE;
        this.ctx.fillRect(x, y, size, size);
        
        // Trail effect
        this.ctx.fillStyle = `rgba(251, 191, 36, 0.3)`;
        this.ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
    }
    
    renderEffects() {
        // Rendu des particules d'effets
        this.particles.forEach((particle, index) => {
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
                return;
            }
            
            this.ctx.save();
            this.ctx.globalAlpha = particle.life / particle.maxLife;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            this.ctx.restore();
            
            // Update particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
        });
    }
    
    // Ajouter effet d'explosion
    addExplosion(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 6 + 2,
                color: Math.random() > 0.5 ? GAME_CONFIG.COLORS.EXPLOSION : '#ef4444',
                life: 30,
                maxLife: 30
            });
        }
    }
    
    updateAnimations() {
        this.waveAnimTime += 0.01; // Ralenti de 0.05 à 0.01
        
        // Nettoyage des particules mortes
        this.particles = this.particles.filter(p => p.life > 0);
    }
    
    updateFPS() {
        const now = performance.now();
        this.frameCount++;
        
        if (now - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = now;
            
            // Update debug display
            const debugFPS = document.getElementById('debug-fps');
            if (debugFPS) debugFPS.textContent = this.fps;
        }
    }
    
    // Conversion coordonnées Canvas vers Grille
    screenToGrid(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = (screenX - rect.left) / this.scale - (this.offsetX / this.scale);
        const canvasY = (screenY - rect.top) / this.scale - (this.offsetY / this.scale);
        
        return UTILS.canvasToGrid(canvasX, canvasY, 0, 0);
    }
    
    // Prévisualisation de placement
    renderPlacementPreview(x, y, size, valid, cannonQuota = null) {
        const pixelX = x * GAME_CONFIG.CELL_SIZE;
        const pixelY = y * GAME_CONFIG.CELL_SIZE;
        const cellSize = GAME_CONFIG.CELL_SIZE;
        const totalSize = cellSize * size;
        
        // Rectangle de preview
        this.ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        this.ctx.fillRect(pixelX, pixelY, totalSize, totalSize);
        
        this.ctx.strokeStyle = valid ? '#22c55e' : '#ef4444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pixelX, pixelY, totalSize, totalSize);
        
        // Afficher le nombre de canons restants
        if (cannonQuota !== null) {
            this.ctx.save();
            
            // Fond semi-transparent pour le texte
            const textX = pixelX + totalSize / 2;
            const textY = pixelY + totalSize / 2;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(textX, textY, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Texte du nombre de canons
            this.ctx.font = 'bold 20px monospace';
            this.ctx.fillStyle = valid ? '#22c55e' : '#ef4444';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(cannonQuota.toString(), textX, textY);
            
            this.ctx.restore();
        }
    }
    
    // Debug grid overlay
    renderDebugGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= GAME_CONFIG.GRID_WIDTH; x++) {
            const pixelX = x * GAME_CONFIG.CELL_SIZE;
            this.ctx.beginPath();
            this.ctx.moveTo(pixelX, 0);
            this.ctx.lineTo(pixelX, GAME_CONFIG.GRID_HEIGHT * GAME_CONFIG.CELL_SIZE);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= GAME_CONFIG.GRID_HEIGHT; y++) {
            const pixelY = y * GAME_CONFIG.CELL_SIZE;
            this.ctx.beginPath();
            this.ctx.moveTo(0, pixelY);
            this.ctx.lineTo(GAME_CONFIG.GRID_WIDTH * GAME_CONFIG.CELL_SIZE, pixelY);
            this.ctx.stroke();
        }
    }
    
    // Preview pièce Tetris
    renderTetrisPiecePreview(x, y, piece, valid) {
        if (!piece || !piece.pattern) return;
        
        const cellSize = GAME_CONFIG.CELL_SIZE;
        const alpha = valid ? 0.7 : 0.4;
        const color = valid ? 'rgba(139, 92, 246, ' + alpha + ')' : 'rgba(239, 68, 68, ' + alpha + ')';
        
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = valid ? '#8b5cf6' : '#ef4444';
        this.ctx.lineWidth = 2;
        
        // Rendu de chaque cellule de la pièce
        for (let dy = 0; dy < piece.pattern.length; dy++) {
            for (let dx = 0; dx < piece.pattern[dy].length; dx++) {
                if (piece.pattern[dy][dx] === 1) {
                    const pixelX = (x + dx) * cellSize;
                    const pixelY = (y + dy) * cellSize;
                    
                    // Remplissage
                    this.ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
                    
                    // Bordure
                    this.ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
                }
            }
        }
    }
}