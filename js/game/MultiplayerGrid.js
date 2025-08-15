import { GAME_CONFIG, UTILS } from '../config/GameConstants.js';

export class MultiplayerGrid {
    constructor(width = GAME_CONFIG.GRID_WIDTH, height = GAME_CONFIG.GRID_HEIGHT) {
        this.width = width;
        this.height = height;
        this.cells = this.initializeGrid();
    }
    
    initializeGrid() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push({
                    type: GAME_CONFIG.CELL_TYPES.WATER,
                    hp: 1,
                    cannonZone: false,
                    cannonZoneOwnerId: null,
                    ownerId: null,
                    entity: null // Pour stocker canons, ennemis, etc.
                });
            }
            grid.push(row);
        }
        return grid;
    }
    
    getCell(x, y) {
        if (!UTILS.isValidPosition(x, y)) return null;
        return this.cells[y][x];
    }
    
    setCell(x, y, cellData) {
        if (!UTILS.isValidPosition(x, y)) return false;
        Object.assign(this.cells[y][x], cellData);
        return true;
    }
    
    // MÉTHODE CRUCIALE : Flood-fill 8-directions avec détection de fermeture
    floodFillWithClosureCheck(startX, startY) {
        if (!UTILS.isValidPosition(startX, startY)) return { area: [], isClosed: false };
        
        const startCell = this.getCell(startX, startY);
        if (!this.canPassThrough(startCell.type)) return { area: [], isClosed: false };
        
        const visited = Array(this.height).fill().map(() => Array(this.width).fill(false));
        const stack = [[startX, startY]];
        const area = [];
        let isClosed = true;
        
        visited[startY][startX] = true;
        
        while (stack.length > 0 && area.length < GAME_CONFIG.GAMEPLAY.MAX_FLOOD_FILL) {
            const [x, y] = stack.pop();
            area.push({ x, y });
            
            // Vérifier les 8 directions (OBLIGATOIRE selon Franck)
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];
            
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                
                // Si on atteint le bord, la zone n'est PAS fermée
                if (!UTILS.isValidPosition(nx, ny)) {
                    isClosed = false;
                    continue;
                }
                
                if (visited[ny][nx]) continue;
                
                const neighborCell = this.getCell(nx, ny);
                
                // Continuer le flood-fill si traversable
                if (this.canPassThrough(neighborCell.type)) {
                    visited[ny][nx] = true;
                    stack.push([nx, ny]);
                }
            }
        }
        
        return { area, isClosed };
    }
    
    // Règles de traversabilité : pour les zones fermées, on ne traverse que la terre
    canPassThrough(cellType) {
        return cellType === GAME_CONFIG.CELL_TYPES.LAND || 
               cellType === GAME_CONFIG.CELL_TYPES.DESTROYED ||
               cellType === GAME_CONFIG.CELL_TYPES.CANNON ||
               cellType === GAME_CONFIG.CELL_TYPES.CASTLE_CORE;
        // L'eau et les murs bloquent le passage
    }
    
    // Trouver toutes les zones fermées constructibles
    findClosedAreas() {
        const visited = Array(this.height).fill().map(() => Array(this.width).fill(false));
        const closedAreas = [];
        let totalAreasChecked = 0;
        let openAreas = 0;
        let closedButNoCastle = 0;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!visited[y][x] && this.canPassThrough(this.getCell(x, y).type)) {
                    const { area, isClosed } = this.floodFillWithClosureCheck(x, y);
                    totalAreasChecked++;
                    
                    // Marquer toute la zone comme visitée
                    area.forEach(cell => {
                        if (UTILS.isValidPosition(cell.x, cell.y)) {
                            visited[cell.y][cell.x] = true;
                        }
                    });
                    
                    if (isClosed) {
                        closedAreas.push(area);
                        console.log(`✅ Zone fermée valide trouvée avec ${area.length} cases`);
                        if (this.containsCastleCore(area)) {
                            console.log(`  🏰 Cette zone contient le château`);
                        } else {
                            console.log(`  🆕 Nouvelle zone fermée créée par les murs`);
                        }
                    } else {
                        openAreas++;
                    }
                }
            }
        }
        
        console.log(`📊 Résumé: ${totalAreasChecked} zones vérifiées, ${closedAreas.length} zones fermées valides, ${openAreas} zones ouvertes`);
        return closedAreas;
    }
    
    // Vérifier si une zone contient un château d'un joueur spécifique
    containsCastleCore(area, playerId = null) {
        return area.some(cell => {
            const cellData = this.getCell(cell.x, cell.y);
            if (!cellData || cellData.type !== GAME_CONFIG.CELL_TYPES.CASTLE_CORE) return false;
            
            // Si playerId spécifié, vérifier l'ownership
            if (playerId !== null) {
                return cellData.ownerId === playerId;
            }
            
            return true; // N'importe quel château
        });
    }
    
    // Marquer les zones constructibles (zones dorées)
    updateCannonZones(playerId = 1) {
        // Reset des zones précédentes
        this.clearCannonZones(playerId);
        
        const closedAreas = this.findClosedAreas();
        console.log(`🔍 Zones fermées trouvées: ${closedAreas.length}`);
        let totalConstructibleCells = 0;
        
        closedAreas.forEach((area, index) => {
            // Vérifier si cette zone appartient au joueur (contient son château)
            const belongsToPlayer = area.some(cell => {
                const cellData = this.getCell(cell.x, cell.y);
                return cellData && cellData.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE && cellData.ownerId === playerId;
            });
            
            // Vérifier si c'est une zone neutre (pas de château, mais fermée par des murs du joueur)
            const isNeutralZone = !area.some(cell => {
                const cellData = this.getCell(cell.x, cell.y);
                return cellData && cellData.type === GAME_CONFIG.CELL_TYPES.CASTLE_CORE;
            });
            
            // Vérifier si le joueur a construit des murs dans cette zone
            const hasPlayerWalls = area.some(cell => {
                const cellData = this.getCell(cell.x, cell.y);
                return cellData && cellData.type === GAME_CONFIG.CELL_TYPES.WALL && cellData.ownerId === playerId;
            });
            
            if (belongsToPlayer) {
                console.log(`📦 Zone fermée ${index + 1} appartient au joueur ${playerId} (château): ${area.length} cases`);
                area.forEach(cell => {
                    const cellData = this.getCell(cell.x, cell.y);
                    if (cellData && this.canPassThrough(cellData.type)) {
                        cellData.cannonZone = true;
                        cellData.cannonZoneOwnerId = playerId;
                        totalConstructibleCells++;
                    }
                });
            } else if (isNeutralZone && hasPlayerWalls) {
                console.log(`📦 Zone fermée ${index + 1} capturable par joueur ${playerId} (murs): ${area.length} cases`);
                area.forEach(cell => {
                    const cellData = this.getCell(cell.x, cell.y);
                    if (cellData && this.canPassThrough(cellData.type)) {
                        cellData.cannonZone = true;
                        cellData.cannonZoneOwnerId = playerId;
                        totalConstructibleCells++;
                    }
                });
            } else {
                console.log(`📦 Zone fermée ${index + 1} n'appartient PAS au joueur ${playerId}`);
            }
        });
        
        return totalConstructibleCells;
    }
    
    clearCannonZones(playerId = null) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                if (playerId === null || cell.cannonZoneOwnerId === playerId) {
                    cell.cannonZone = false;
                    cell.cannonZoneOwnerId = null;
                }
            }
        }
    }
    
    // Compter les cases dorées actuelles
    countGoldenCells() {
        let count = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.getCell(x, y);
                if (cell && cell.cannonZone) {
                    count++;
                }
            }
        }
        return count;
    }
    
    // Calcul du quota de canons basé sur les cases dorées
    calculateCannonQuota(totalGoldenCells) {
        // Un canon occupe 4 cases (2x2)
        const cannonSize = GAME_CONFIG.GAMEPLAY.CANNON_SIZE * GAME_CONFIG.GAMEPLAY.CANNON_SIZE;
        const maxPossibleCannons = Math.floor(totalGoldenCells / cannonSize);
        const quota = Math.floor(maxPossibleCannons * GAME_CONFIG.GAMEPLAY.CANNON_RATIO);
        
        // Le minimum ne s'applique que si on a assez de place physique
        const minCannons = Math.min(GAME_CONFIG.GAMEPLAY.MIN_CANNONS, maxPossibleCannons);
        
        console.log(`📊 Cannon quota calculation: ${totalGoldenCells} golden cells → ${maxPossibleCannons} max possible → ${quota} quota (40%) → ${Math.max(quota, minCannons)} final`);
        
        return Math.max(quota, minCannons);
    }
    
    // Vérifier si on peut placer un canon 2×2
    canPlaceCannon(startX, startY, playerId = 1) {
        const size = GAME_CONFIG.GAMEPLAY.CANNON_SIZE;
        
        // Vérifier limites grille
        if (startX + size > this.width || startY + size > this.height) {
            return false;
        }
        
        // Vérifier chaque case du canon 2×2
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const cell = this.getCell(startX + dx, startY + dy);
                if (!cell || 
                    !cell.cannonZone || 
                    cell.cannonZoneOwnerId !== playerId ||
                    cell.entity !== null) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // Placer un canon 2×2
    placeCannon(startX, startY, cannonData, playerId = 1) {
        if (!this.canPlaceCannon(startX, startY, playerId)) {
            return false;
        }
        
        const size = GAME_CONFIG.GAMEPLAY.CANNON_SIZE;
        
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const cell = this.getCell(startX + dx, startY + dy);
                cell.type = GAME_CONFIG.CELL_TYPES.CANNON;
                cell.hp = GAME_CONFIG.GAMEPLAY.CANNON_HP;
                cell.entity = {
                    ...cannonData,
                    gridX: startX + dx,
                    gridY: startY + dy,
                    isMainCell: (dx === 0 && dy === 0) // Cellule principale
                };
                cell.ownerId = playerId;
            }
        }
        
        return true;
    }
    
    // Vérifier si on peut placer une pièce Tetris
    canPlacePiece(piece, startX, startY) {
        for (let dy = 0; dy < piece.pattern.length; dy++) {
            for (let dx = 0; dx < piece.pattern[dy].length; dx++) {
                if (piece.pattern[dy][dx] === 1) {
                    const x = startX + dx;
                    const y = startY + dy;
                    
                    if (!UTILS.isValidPosition(x, y)) return false;
                    
                    const cell = this.getCell(x, y);
                    if (cell.type !== GAME_CONFIG.CELL_TYPES.LAND && 
                        cell.type !== GAME_CONFIG.CELL_TYPES.DESTROYED) {
                        return false;
                    }
                    
                    if (cell.entity !== null) return false;
                }
            }
        }
        return true;
    }
    
    // Placer une pièce Tetris (transforme en murs)
    placePiece(piece, startX, startY, playerId = 1) {
        if (!this.canPlacePiece(piece, startX, startY)) return false;
        
        for (let dy = 0; dy < piece.pattern.length; dy++) {
            for (let dx = 0; dx < piece.pattern[dy].length; dx++) {
                if (piece.pattern[dy][dx] === 1) {
                    const cell = this.getCell(startX + dx, startY + dy);
                    cell.type = GAME_CONFIG.CELL_TYPES.WALL;
                    cell.ownerId = playerId;
                    cell.hp = 1;
                }
            }
        }
        
        // Recalculer les zones constructibles après placement
        this.updateCannonZones(playerId);
        
        return true;
    }
    
    // Infliger des dégâts à une cellule
    damageCell(x, y, damage = 1) {
        const cell = this.getCell(x, y);
        if (!cell) return false;
        
        cell.hp = Math.max(0, cell.hp - damage);
        
        if (cell.hp <= 0) {
            cell.type = GAME_CONFIG.CELL_TYPES.DESTROYED;
            cell.entity = null;
            cell.ownerId = null;
            return true; // Cellule détruite
        }
        
        return false; // Endommagée mais pas détruite
    }
    
    // Génération de terrain de base
    generateTerrain(mode = 'multiplayer2') {
        this.initializeGrid();
        
        switch (mode) {
            case 'solo':
                this.generateSoloTerrain();
                break;
            case 'multiplayer2':
                this.generateTwoPlayerTerrain();
                break;
            case 'duo':
                this.generateDuoTerrain();
                break;
            case 'trio':
                this.generateTrioTerrain();
                break;
        }
        
        if (mode !== 'multiplayer2') {
            this.placeInitialCastles(mode);
        }
    }
    
    // Terrain spécifique pour 2 joueurs face à face
    generateTwoPlayerTerrain() {
        console.log('👥 Generating 2-player competitive terrain');
        
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        
        // Créer deux îles séparées pour chaque joueur
        // Île du Joueur 1 (gauche) - réduite pour équilibrage
        for (let y = 6; y < this.height - 6; y++) {
            for (let x = 4; x < centerX - 2; x++) {
                const distFromP1Center = Math.sqrt((x - 15) ** 2 + (y - centerY) ** 2);
                if (distFromP1Center < 10) {
                    this.setCell(x, y, { 
                        type: GAME_CONFIG.CELL_TYPES.LAND,
                        hp: 1
                    });
                }
            }
        }
        
        // Île du Joueur 2 (droite) - réduite pour équilibrage
        for (let y = 6; y < this.height - 6; y++) {
            for (let x = centerX + 2; x < this.width - 4; x++) {
                const distFromP2Center = Math.sqrt((x - 33) ** 2 + (y - centerY) ** 2);
                if (distFromP2Center < 10) {
                    this.setCell(x, y, { 
                        type: GAME_CONFIG.CELL_TYPES.LAND,
                        hp: 1
                    });
                }
            }
        }
        
        // Château du Joueur 1 (gauche)
        const castle1X = 15 - Math.floor(GAME_CONFIG.GAMEPLAY.CASTLE_SIZE / 2);
        const castle1Y = centerY - Math.floor(GAME_CONFIG.GAMEPLAY.CASTLE_SIZE / 2);
        this.buildCastle(castle1X, castle1Y, 1);
        console.log('🏰 Player 1 castle at', castle1X, castle1Y);
        
        // Château du Joueur 2 (droite)
        const castle2X = 33 - Math.floor(GAME_CONFIG.GAMEPLAY.CASTLE_SIZE / 2);
        const castle2Y = centerY - Math.floor(GAME_CONFIG.GAMEPLAY.CASTLE_SIZE / 2);
        this.buildCastle(castle2X, castle2Y, 2);
        console.log('🏰 Player 2 castle at', castle2X, castle2Y);
        
        // Zone d'eau centrale pour séparer les territoires
        for (let y = 0; y < this.height; y++) {
            for (let x = centerX - 2; x <= centerX + 2; x++) {
                if (x >= 0 && x < this.width) {
                    this.setCell(x, y, { 
                        type: GAME_CONFIG.CELL_TYPES.WATER,
                        hp: 1
                    });
                }
            }
        }
    }
    
    generateSoloTerrain() {
        // Rivière verticale à 65% de la largeur
        const riverX = Math.floor(this.width * 0.65);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x < riverX) {
                    // Côte avec variations sinusoïdales
                    const coastVariation = Math.sin(y * 0.3) * GAME_CONFIG.TERRAIN_GENERATION.COAST_VARIANCE;
                    const coastline = riverX - 8 + coastVariation;
                    
                    this.setCell(x, y, { 
                        type: x < coastline ? GAME_CONFIG.CELL_TYPES.LAND : GAME_CONFIG.CELL_TYPES.WATER 
                    });
                } else {
                    this.setCell(x, y, { type: GAME_CONFIG.CELL_TYPES.WATER });
                }
            }
        }
    }
    
    placeInitialCastles(mode) {
        const castleSize = GAME_CONFIG.GAMEPLAY.CASTLE_SIZE;
        
        if (mode === 'solo') {
            // Château au centre-gauche
            const centerX = Math.floor(this.width * 0.25);
            const centerY = Math.floor(this.height * 0.5);
            
            this.buildCastle(centerX - Math.floor(castleSize/2), 
                           centerY - Math.floor(castleSize/2), 1);
        }
    }
    
    buildCastle(startX, startY, playerId) {
        const size = GAME_CONFIG.GAMEPLAY.CASTLE_SIZE;
        const center = Math.floor(size / 2);
        
        // Créer le carré de murs
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                
                if (UTILS.isValidPosition(x, y)) {
                    // Core au centre
                    if (dx === center && dy === center) {
                        this.setCell(x, y, { 
                            type: GAME_CONFIG.CELL_TYPES.CASTLE_CORE,
                            ownerId: playerId,
                            hp: 999 // Indestructible
                        });
                    }
                    // Murs sur le périmètre
                    else if (dx === 0 || dx === size-1 || dy === 0 || dy === size-1) {
                        this.setCell(x, y, { 
                            type: GAME_CONFIG.CELL_TYPES.WALL,
                            ownerId: playerId,
                            hp: 1
                        });
                    }
                    // Intérieur en terre
                    else {
                        this.setCell(x, y, { 
                            type: GAME_CONFIG.CELL_TYPES.LAND,
                            ownerId: playerId
                        });
                    }
                }
            }
        }
    }
    
    // Sérialisation pour sauvegarde
    serialize() {
        return {
            width: this.width,
            height: this.height,
            cells: this.cells.map(row => row.map(cell => ({...cell})))
        };
    }
    
    // Désérialisation
    deserialize(data) {
        this.width = data.width;
        this.height = data.height;
        this.cells = data.cells;
    }
}