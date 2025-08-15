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
        
        // Etat du jeu pour graphismes améliorés
        this.gameState = null;
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
        // Stocker l'état et la grille pour les graphismes conditionnels
        this.gameState = gameState.currentState;
        this.currentGrid = gameState.grid;
        
        this.clearCanvas();
        this.updateAnimations();
        
        if (gameState.grid) {
            this.renderGrid(gameState.grid);
            this.renderCannonZones(gameState.grid);
            this.renderEntities(gameState);
            this.renderEffects();
            
            // Rendu des previews APRÈS tout le reste
            // Multijoueur : utiliser l'objet previews complet
            if (gameState.previews) {
                this.renderPreview(gameState.previews);
            } 
            // Legacy : utiliser previewPosition
            else if (gameState.previewPosition) {
                this.renderPreview(gameState.previewPosition);
            }
            
            // Toujours afficher le curseur du joueur 2 en multijoueur (clavier)
            if (gameState.cursors && gameState.cursors.keyboard) {
                this.renderKeyboardCursor(gameState.cursors.keyboard.x, gameState.cursors.keyboard.y);
            }
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
                color = this.getWallColor(x, y);
                break;
            case GAME_CONFIG.CELL_TYPES.CASTLE_CORE:
                color = this.getCastleCoreColor(x, y);
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
        // Graphismes améliorés pendant la phase de combat
        if (this.gameState === GAME_CONFIG.GAME_STATES.COMBAT) {
            return this.getEnhancedWaterColor(x, y);
        }
        
        // Eau statique avec légère variation pour éviter l'uniformité
        const variation = Math.sin(x * 0.1 + y * 0.08) * 15;
        
        // Alternance simple entre eau claire et eau foncée selon la position
        return variation > 0 ? GAME_CONFIG.COLORS.WATER_LIGHT : GAME_CONFIG.COLORS.WATER;
    }
    
    getEnhancedWaterColor(x, y) {
        // Détection des côtes - check si il y a de la terre à proximité
        const hasLandNearby = this.checkLandProximity(x, y, 2);
        
        if (hasLandNearby) {
            // Zone côtière - eau plus claire avec teinte sableuse
            const wavePattern = Math.sin(x * 0.2 + y * 0.15) * 30;
            const r = Math.floor(100 + wavePattern);
            const g = Math.floor(180 + wavePattern);
            const b = Math.floor(230 + wavePattern * 0.5);
            return `rgb(${Math.max(80, Math.min(255, r))}, ${Math.max(160, Math.min(255, g))}, ${Math.max(200, Math.min(255, b))})`;
        } else {
            // Eau profonde - dégradés de bleu réalistes
            const depth = Math.sin(x * 0.05 + y * 0.04) * 40;
            const r = Math.floor(30 + depth * 0.3);
            const g = Math.floor(90 + depth * 0.5);
            const b = Math.floor(160 + depth);
            return `rgb(${Math.max(20, Math.min(80, r))}, ${Math.max(60, Math.min(140, g))}, ${Math.max(120, Math.min(200, b))})`;
        }
    }
    
    checkLandProximity(x, y, radius) {
        // Vérifier s'il y a de la terre dans un rayon donné
        if (!this.currentGrid) return false;
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                const cell = this.currentGrid.getCell(checkX, checkY);
                if (cell && cell.type === GAME_CONFIG.CELL_TYPES.LAND) {
                    return true;
                }
            }
        }
        return false;
    }
    
    getLandColor(x, y) {
        // Graphismes améliorés pendant la phase de combat
        if (this.gameState === GAME_CONFIG.GAME_STATES.COMBAT) {
            return this.getEnhancedLandColor(x, y);
        }
        
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
    
    getEnhancedLandColor(x, y) {
        // Terrain réaliste avec plusieurs nuances d'herbe
        const grassPattern1 = Math.sin(x * 0.3 + y * 0.25) * 20;
        const grassPattern2 = Math.sin(x * 0.1 + y * 0.08) * 15;
        const grassPattern3 = Math.sin(x * 0.05 + y * 0.12) * 10;
        
        // Mélange de différentes nuances de vert
        const baseR = 45 + grassPattern1 + grassPattern3;
        const baseG = 160 + grassPattern2 + grassPattern1;
        const baseB = 70 + grassPattern3;
        
        // Ajouter quelques zones plus sombres pour le réalisme
        const darkSpots = Math.sin(x * 0.4 + y * 0.3) > 0.7 ? -25 : 0;
        
        const r = Math.floor(baseR + darkSpots);
        const g = Math.floor(baseG + darkSpots);
        const b = Math.floor(baseB + darkSpots);
        
        return `rgb(${Math.max(30, Math.min(255, r))}, ${Math.max(120, Math.min(255, g))}, ${Math.max(50, Math.min(255, b))})`;
    }
    
    getWallColor(x, y) {
        // Graphismes améliorés pendant la phase de combat
        if (this.gameState === GAME_CONFIG.GAME_STATES.COMBAT) {
            return this.getEnhancedWallColor(x, y);
        }
        
        // Couleur standard des murs
        return GAME_CONFIG.COLORS.WALL;
    }
    
    getEnhancedWallColor(x, y) {
        // Texture de pierre réaliste
        const stonePattern1 = Math.sin(x * 0.4 + y * 0.3) * 25;
        const stonePattern2 = Math.sin(x * 0.2 + y * 0.15) * 15;
        const stonePattern3 = Math.sin(x * 0.6 + y * 0.5) * 10;
        
        // Couleur de base gris pierre
        const baseR = 120 + stonePattern1 + stonePattern3;
        const baseG = 120 + stonePattern2 + stonePattern1 * 0.5;
        const baseB = 115 + stonePattern3 + stonePattern2 * 0.3;
        
        // Ajouter des nuances plus sombres pour les joints
        const darkJoints = (Math.sin(x * 0.8) > 0.8 || Math.sin(y * 0.8) > 0.8) ? -30 : 0;
        
        const r = Math.floor(baseR + darkJoints);
        const g = Math.floor(baseG + darkJoints);
        const b = Math.floor(baseB + darkJoints);
        
        return `rgb(${Math.max(80, Math.min(180, r))}, ${Math.max(80, Math.min(180, g))}, ${Math.max(80, Math.min(170, b))})`;
    }
    
    getCastleCoreColor(x, y) {
        // Graphismes améliorés pendant la phase de combat
        if (this.gameState === GAME_CONFIG.GAME_STATES.COMBAT) {
            return this.getEnhancedCastleCoreColor(x, y);
        }
        
        // Couleur standard du château
        return GAME_CONFIG.COLORS.CASTLE_CORE;
    }
    
    getEnhancedCastleCoreColor(x, y) {
        // Château en pierre plus sombre et majestueuse
        const stonePattern = Math.sin(x * 0.3 + y * 0.2) * 20;
        const aged = Math.sin(x * 0.1 + y * 0.15) * 15;
        
        const baseR = 90 + stonePattern;
        const baseG = 85 + aged;
        const baseB = 80 + stonePattern * 0.5;
        
        const r = Math.floor(baseR);
        const g = Math.floor(baseG);
        const b = Math.floor(baseB);
        
        return `rgb(${Math.max(60, Math.min(130, r))}, ${Math.max(60, Math.min(120, g))}, ${Math.max(60, Math.min(110, b))})`;
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
    
    // Prévisualisation de placement avec couleur joueur
    renderPlacementPreview(x, y, size, valid, cannonQuota = null, playerColor = null) {
        const pixelX = x * GAME_CONFIG.CELL_SIZE;
        const pixelY = y * GAME_CONFIG.CELL_SIZE;
        const cellSize = GAME_CONFIG.CELL_SIZE;
        const totalSize = cellSize * size;
        
        // Couleur selon validité et joueur
        let fillColor, strokeColor;
        if (playerColor) {
            if (valid) {
                // Couleur du joueur avec transparence
                const rgb = this.hexToRgb(playerColor);
                fillColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
                strokeColor = playerColor;
            } else {
                fillColor = 'rgba(239, 68, 68, 0.5)';
                strokeColor = '#ef4444';
            }
        } else {
            // Couleurs par défaut
            fillColor = valid ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
            strokeColor = valid ? '#22c55e' : '#ef4444';
        }
        
        // Rectangle de preview
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(pixelX, pixelY, totalSize, totalSize);
        
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(pixelX, pixelY, totalSize, totalSize);
        
        // Afficher le nombre de canons restants
        if (cannonQuota !== null) {
            this.ctx.save();
            
            const textX = pixelX + totalSize / 2;
            const textY = pixelY + totalSize / 2;
            
            // Fond avec couleur du joueur
            this.ctx.fillStyle = playerColor || 'rgba(0, 0, 0, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(textX, textY, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Texte du nombre de canons
            this.ctx.font = 'bold 20px monospace';
            this.ctx.fillStyle = '#ffffff';
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
    
    // Preview pièce Tetris avec couleur joueur
    renderTetrisPiecePreview(x, y, piece, valid, playerColor = null) {
        if (!piece || !piece.pattern) return;
        
        const cellSize = GAME_CONFIG.CELL_SIZE;
        const alpha = valid ? 0.7 : 0.4;
        
        let fillColor, strokeColor;
        if (playerColor && valid) {
            const rgb = this.hexToRgb(playerColor);
            fillColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            strokeColor = playerColor;
        } else {
            fillColor = valid ? 'rgba(139, 92, 246, ' + alpha + ')' : 'rgba(239, 68, 68, ' + alpha + ')';
            strokeColor = valid ? '#8b5cf6' : '#ef4444';
        }
        
        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = strokeColor;
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
    
    // Curseur pour le joueur clavier
    renderKeyboardCursor(x, y) {
        const pixelX = x * GAME_CONFIG.CELL_SIZE;
        const pixelY = y * GAME_CONFIG.CELL_SIZE;
        const cellSize = GAME_CONFIG.CELL_SIZE;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([8, 4]);
        this.ctx.strokeRect(pixelX - 2, pixelY - 2, cellSize + 4, cellSize + 4);
        this.ctx.setLineDash([]);
        this.ctx.restore();
    }
    
    // Utilitaire pour convertir hex en RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // Méthode de preview intégrée (legacy + multijoueur)
    renderPreview(gameStatePreviews) {
        // Si c'est du multijoueur avec l'objet previews complet
        if (gameStatePreviews && gameStatePreviews.mouse !== undefined) {
            if (gameStatePreviews.mouse) {
                this.renderSinglePreview(gameStatePreviews.mouse, '#3b82f6'); // Bleu pour joueur 1
            }
            if (gameStatePreviews.keyboard) {
                this.renderSinglePreview(gameStatePreviews.keyboard, '#ef4444'); // Rouge pour joueur 2
            }
        } 
        // Legacy - un seul preview (solo ou fallback)
        else if (gameStatePreviews) {
            this.renderSinglePreview(gameStatePreviews);
        }
    }
    
    renderSinglePreview(preview, playerColor = null) {
        if (!preview) return;
        
        if (preview.size) {
            // Preview canon avec couleur du joueur
            this.renderPlacementPreview(
                preview.x, 
                preview.y, 
                preview.size, 
                preview.valid,
                preview.cannonQuota,
                playerColor
            );
        } else if (preview.piece) {
            // Preview pièce Tetris avec couleur du joueur
            this.renderTetrisPiecePreview(
                preview.x,
                preview.y,
                preview.piece,
                preview.valid,
                playerColor
            );
        }
        
        // Curseur pour le joueur clavier
        if (playerColor === '#ef4444') {
            this.renderKeyboardCursor(preview.x, preview.y);
        }
    }
}