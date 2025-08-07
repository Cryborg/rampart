export const CELL_TYPES = {
    WATER: 'water',
    LAND: 'land', 
    WALL: 'wall',
    CASTLE_CORE: 'castle-core',
    CANNON: 'cannon',
    DESTROYED: 'destroyed'
};

export const CELL_PROPERTIES = {
    [CELL_TYPES.WATER]: {
        walkable: false,
        buildable: false,
        destructible: false,
        color: '#0ea5e9'  // Bleu cyan très visible
    },
    [CELL_TYPES.LAND]: {
        walkable: true,
        buildable: true,
        destructible: false,
        color: '#65a30d'  // Vert plus vif
    },
    [CELL_TYPES.WALL]: {
        walkable: false,
        buildable: false,
        destructible: true,
        color: '#6b7280'
    },
    [CELL_TYPES.CASTLE_CORE]: {
        walkable: false,
        buildable: false,
        destructible: false, // Les cores ne peuvent pas être détruits par les projectiles
        color: '#dc2626'
    },
    [CELL_TYPES.CANNON]: {
        walkable: false,
        buildable: false,
        destructible: true,
        color: '#7c2d12'
    },
    [CELL_TYPES.DESTROYED]: {
        walkable: true,
        buildable: true,
        destructible: false,
        color: '#374151'
    }
};

export class Cell {
    constructor(x, y, type = CELL_TYPES.LAND) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.playerId = null; // Which player owns this cell
        this.health = this.getDefaultHealth(type); // For destructible cells
        this.maxHealth = this.health; // Pour régénération des canons
        this.lastModified = Date.now();
    }

    getDefaultHealth(type) {
        switch (type) {
            case CELL_TYPES.CANNON:
                return 3; // Les canons du joueur ont 3 HP
            case CELL_TYPES.WALL:
            case CELL_TYPES.CASTLE_CORE:
                return 1;
            default:
                return 1;
        }
    }

    getProperties() {
        return CELL_PROPERTIES[this.type] || CELL_PROPERTIES[CELL_TYPES.LAND];
    }

    isWalkable() {
        return this.getProperties().walkable;
    }

    isBuildable() {
        return this.getProperties().buildable;
    }

    isDestructible() {
        return this.getProperties().destructible;
    }

    takeDamage(amount = 1) {
        if (!this.isDestructible()) return false;

        this.health -= amount;
        if (this.health <= 0) {
            this.type = CELL_TYPES.DESTROYED;
            this.health = 0;
            this.lastModified = Date.now();
            return true; // Cell was destroyed
        }
        return false; // Cell damaged but not destroyed
    }

    repair() {
        if (this.type === CELL_TYPES.DESTROYED) {
            this.type = CELL_TYPES.LAND;
            this.health = 1;
            this.lastModified = Date.now();
        }
    }
}

export class Grid {
    constructor(width = 24, height = 24) {
        this.width = width;
        this.height = height;
        this.cells = [];
        this.cellSize = 32; // pixels
        
        this.initializeGrid();
    }

    initializeGrid() {
        this.cells = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push(new Cell(x, y, CELL_TYPES.LAND));
            }
            this.cells.push(row);
        }
    }

    generateTerrain(mode = 'solo', playerConfigs = []) {
        console.log(`🗺️ Génération terrain mode: ${mode}`);
        
        // Nettoyer la grille
        this.clearGrid();
        
        switch (mode) {
            case 'solo':
                this.generateSoloTerrain();
                break;
            case '2players':
                this.generate2PlayerTerrain();
                break;
            case '3players':
                this.generate3PlayerTerrain();
                break;
            default:
                console.warn(`Mode ${mode} non supporté, utilisation du mode solo`);
                this.generateSoloTerrain();
        }
        
        console.log(`🗺️ Terrain généré pour ${mode}`);
    }

    clearGrid() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.setCellType(x, y, CELL_TYPES.LAND);
            }
        }
    }

    generateSoloTerrain() {
        const riverX = Math.floor(this.width * 0.65); // Rivière à 65% pour favoriser le joueur
        const riverWidth = 3; // Largeur de la rivière
        
        // Créer une côte naturelle avec des petites criques
        this.generateNaturalCoastline(riverX);
        
        // Créer la rivière verticale de séparation
        for (let x = riverX; x < riverX + riverWidth && x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.setCellType(x, y, CELL_TYPES.WATER);
            }
        }
        
        // Côté droit = mer pure (plus d'îlots aléatoires)
        for (let x = riverX + riverWidth; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.setCellType(x, y, CELL_TYPES.WATER);
            }
        }
        
        // Bordures eau UNIQUEMENT sur le côté droit (pas de piège haut/bas)
        for (let y = 0; y < this.height; y++) {
            this.setCellType(this.width - 1, y, CELL_TYPES.WATER);
        }
        
        // PAS de bordures eau haut/bas - que de la terre normale
        
        console.log(`🗺️ Terrain solo : Joueur gauche (${riverX} cases), Mer droite avec côte naturelle`);
    }

    generateNaturalCoastline(baseCoastX) {
        // Créer une ligne de côte naturelle avec des petites variations
        for (let y = 1; y < this.height - 1; y++) {
            // Variation sinusoïdale légère pour un aspect naturel
            const waveOffset = Math.sin(y * 0.3) * 2;
            const randomVariation = (Math.random() - 0.5) * 1.5;
            const coastX = Math.floor(baseCoastX + waveOffset + randomVariation);
            
            // S'assurer que la côte reste dans les limites
            const clampedCoastX = Math.max(Math.floor(this.width * 0.5), 
                                          Math.min(baseCoastX + 3, coastX));
            
            // Créer une petite crique occasionnellement
            if (Math.random() < 0.15) { // 15% de chance
                // Petite crique : creuser 1-2 cases vers la terre
                const criqueDepth = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < criqueDepth; i++) {
                    const criqueX = clampedCoastX - i;
                    if (criqueX > 0) {
                        this.setCellType(criqueX, y, CELL_TYPES.WATER);
                        // Étendre la crique sur 2-3 cases verticalement
                        if (y > 0) this.setCellType(criqueX, y - 1, CELL_TYPES.WATER);
                        if (y < this.height - 1) this.setCellType(criqueX, y + 1, CELL_TYPES.WATER);
                    }
                }
            }
        }
    }

    generate2PlayerTerrain() {
        const riverY = Math.floor(this.height / 2);
        const riverHeight = 2;
        
        // Rivière horizontale centrale
        for (let y = riverY - 1; y <= riverY + riverHeight; y++) {
            for (let x = 0; x < this.width; x++) {
                if (y >= 0 && y < this.height) {
                    this.setCellType(x, y, CELL_TYPES.WATER);
                }
            }
        }
        
        // Bordures eau
        this.addWaterBorders();
        
        console.log('🗺️ Terrain 2 joueurs : séparation horizontale');
    }

    generate3PlayerTerrain() {
        // Rivière diagonale 1 (haut-gauche vers centre-droit)
        this.createDiagonalRiver(0, 0, this.width - 1, Math.floor(this.height * 0.6));
        
        // Rivière diagonale 2 (bas-gauche vers centre-droit)  
        this.createDiagonalRiver(0, this.height - 1, this.width - 1, Math.floor(this.height * 0.4));
        
        // Rivière verticale droite
        const rightRiverX = Math.floor(this.width * 0.75);
        for (let y = Math.floor(this.height * 0.4); y <= Math.floor(this.height * 0.6); y++) {
            for (let x = rightRiverX; x < this.width; x++) {
                this.setCellType(x, y, CELL_TYPES.WATER);
            }
        }
        
        // Bordures eau
        this.addWaterBorders();
        
        console.log('🗺️ Terrain 3 joueurs : territoires triangulaires');
    }

    createDiagonalRiver(x1, y1, x2, y2) {
        // Algorithme de Bresenham pour tracer une ligne
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (true) {
            // Placer eau + cases adjacentes pour largeur rivière
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        this.setCellType(nx, ny, CELL_TYPES.WATER);
                    }
                }
            }
            
            if (x === x2 && y === y2) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    getOptimalCastlePositions(mode, playerCount = 1) {
        const positions = [];
        
        switch (mode) {
            case 'solo':
                // Centre-gauche pour le joueur
                positions.push({
                    playerId: 1,
                    x: Math.floor(this.width * 0.25),
                    y: Math.floor(this.height * 0.5)
                });
                break;
                
            case '2players':
                // Haut et bas
                positions.push({
                    playerId: 1,
                    x: Math.floor(this.width * 0.5),
                    y: Math.floor(this.height * 0.25)
                });
                positions.push({
                    playerId: 2,
                    x: Math.floor(this.width * 0.5),
                    y: Math.floor(this.height * 0.75)
                });
                break;
                
            case '3players':
                // Positions triangulaires
                positions.push({
                    playerId: 1,
                    x: Math.floor(this.width * 0.2),
                    y: Math.floor(this.height * 0.2)
                });
                positions.push({
                    playerId: 2,
                    x: Math.floor(this.width * 0.2),
                    y: Math.floor(this.height * 0.8)
                });
                positions.push({
                    playerId: 3,
                    x: Math.floor(this.width * 0.8),
                    y: Math.floor(this.height * 0.5)
                });
                break;
        }
        
        return positions;
    }

    generateTerrainLegacy() {
        this.addWaterBorders();
        this.addRandomWaterPools();
        this.addLandmasses();
    }

    addWaterBorders() {
        // Top and bottom borders
        for (let x = 0; x < this.width; x++) {
            this.setCellType(x, 0, CELL_TYPES.WATER);
            this.setCellType(x, this.height - 1, CELL_TYPES.WATER);
        }
        
        // Left and right borders  
        for (let y = 0; y < this.height; y++) {
            this.setCellType(0, y, CELL_TYPES.WATER);
            this.setCellType(this.width - 1, y, CELL_TYPES.WATER);
        }
    }

    addRandomWaterPools() {
        const poolCount = Math.floor(Math.random() * 3) + 2; // 2-4 pools
        
        for (let i = 0; i < poolCount; i++) {
            let centerX, centerY;
            let attempts = 0;
            
            // Essayer de trouver une position qui ne soit pas près du château
            do {
                centerX = Math.floor(Math.random() * (this.width - 6)) + 3;
                centerY = Math.floor(Math.random() * (this.height - 6)) + 3;
                attempts++;
            } while (this.isNearCastle(centerX, centerY) && attempts < 20);
            
            // Si on trouve une position valide, créer le pool
            if (!this.isNearCastle(centerX, centerY)) {
                const radius = Math.floor(Math.random() * 3) + 2; // 2-4 radius
                this.createWaterPool(centerX, centerY, radius);
            }
        }
    }

    isNearCastle(x, y) {
        // Zone de protection de 5x5 autour du centre de la grille (où sera le château)
        const castleX = Math.floor(this.width / 2);
        const castleY = Math.floor(this.height / 2);
        const protectionRadius = 4;
        
        const distance = Math.sqrt((x - castleX) ** 2 + (y - castleY) ** 2);
        return distance <= protectionRadius;
    }

    createWaterPool(centerX, centerY, radius) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (distance <= radius && this.isValidPosition(x, y)) {
                    // Ne pas créer d'eau près du château ou sur des structures existantes
                    const cell = this.getCell(x, y);
                    if (cell && cell.type === CELL_TYPES.LAND && !this.isNearCastle(x, y)) {
                        this.setCellType(x, y, CELL_TYPES.WATER);
                    }
                }
            }
        }
    }

    addLandmasses() {
        // Add some variety to the land
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.getCell(x, y).type === CELL_TYPES.LAND) {
                    // Small chance to make land more interesting
                    if (Math.random() < 0.1) {
                        // Keep as land but could add different terrain types later
                    }
                }
            }
        }
    }

    getCell(x, y) {
        if (!this.isValidPosition(x, y)) return null;
        return this.cells[y][x];
    }

    setCellType(x, y, type, playerId = null) {
        const cell = this.getCell(x, y);
        if (cell) {
            cell.type = type;
            cell.playerId = playerId;
            cell.lastModified = Date.now();
            
            // Reset health for new cell types with proper default values
            if (CELL_PROPERTIES[type]?.destructible) {
                cell.health = cell.getDefaultHealth(type);
                cell.maxHealth = cell.health;
            }
        }
    }

    // Régénérer les HP de tous les canons du joueur
    regenerateCannonHealth(playerId = null) {
        let regeneratedCount = 0;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.getCell(x, y);
                if (cell && cell.type === CELL_TYPES.CANNON) {
                    // Régénérer si c'est le bon joueur ou tous les joueurs (null)
                    if (playerId === null || cell.playerId === playerId) {
                        if (cell.health < cell.maxHealth) {
                            cell.health = cell.maxHealth;
                            regeneratedCount++;
                        }
                    }
                }
            }
        }
        
        if (regeneratedCount > 0) {
            console.log(`🔧 ${regeneratedCount} canons régénérés à pleine santé`);
        }
        
        return regeneratedCount;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    canPlacePiece(piece, startX, startY) {
        if (!piece || !piece.shape) return false;

        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (piece.shape[py][px] === 1) {
                    const worldX = startX + px;
                    const worldY = startY + py;
                    
                    if (!this.isValidPosition(worldX, worldY)) {
                        return false;
                    }
                    
                    const cell = this.getCell(worldX, worldY);
                    if (!cell || !cell.isBuildable()) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    placePiece(piece, startX, startY, playerId = null) {
        if (!this.canPlacePiece(piece, startX, startY)) {
            return false;
        }

        const placedCells = [];
        
        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (piece.shape[py][px] === 1) {
                    const worldX = startX + px;
                    const worldY = startY + py;
                    
                    this.setCellType(worldX, worldY, CELL_TYPES.WALL, playerId);
                    placedCells.push({ x: worldX, y: worldY });
                }
            }
        }
        
        return placedCells;
    }

    canPlaceCannon(x, y, playerId = null) {
        // Cannon is 2x2, check all 4 cells
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (!this.isValidPosition(checkX, checkY)) {
                    return false;
                }
                
                const cell = this.getCell(checkX, checkY);
                if (!cell || !cell.isBuildable()) {
                    return false;
                }
                
                // CRUCIAL: Doit être dans une zone fermée (cannonZone)
                if (!cell.cannonZone) {
                    console.log(`❌ Cannot place cannon at (${checkX}, ${checkY}) - not in closed castle`);
                    return false;
                }
            }
        }
        return true;
    }

    placeCannon(x, y, playerId = null) {
        if (!this.canPlaceCannon(x, y, playerId)) {
            return false;
        }

        // Place 2x2 cannon
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                this.setCellType(x + dx, y + dy, CELL_TYPES.CANNON, playerId);
                // Retirer la propriété cannonZone car la case est maintenant occupée
                const cell = this.getCell(x + dx, y + dy);
                if (cell) {
                    cell.cannonZone = false;
                }
            }
        }
        
        return true;
    }

    // Flood fill algorithm for detecting closed castles
    floodFill(startX, startY, targetType, fillType, maxSize = 1000) {
        if (!this.isValidPosition(startX, startY)) return [];

        const startCell = this.getCell(startX, startY);
        if (!startCell || !this.canPassThrough(startCell.type)) return [];

        const visited = new Set();
        const stack = [{ x: startX, y: startY }];
        const filledCells = [];

        while (stack.length > 0 && filledCells.length < maxSize) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const cell = this.getCell(x, y);
            if (!cell || !this.canPassThrough(cell.type)) continue;

            filledCells.push({ x, y });

            // Check 4-directional neighbors
            const neighbors = [
                { x: x + 1, y }, { x: x - 1, y },
                { x, y: y + 1 }, { x, y: y - 1 }
            ];

            neighbors.forEach(neighbor => {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (!visited.has(neighborKey) && this.isValidPosition(neighbor.x, neighbor.y)) {
                    stack.push(neighbor);
                }
            });
        }

        return filledCells;
    }

    // Flood-fill avec détection de fermeture intégrée
    floodFillWithClosureCheck(startX, startY, visited) {
        if (!this.isValidPosition(startX, startY) || visited[startY][startX]) {
            return { area: [], isClosed: false };
        }
        
        const startCell = this.getCell(startX, startY);
        if (!startCell || !this.canPassThrough(startCell.type)) {
            return { area: [], isClosed: false };
        }

        const stack = [[startX, startY]];
        const area = [];
        let isClosed = true;
        visited[startY][startX] = true;

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            area.push({ x, y });

            // Vérifier les 8 directions (y compris diagonales)
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;

                // Si on atteint le bord de la grille, la zone n'est pas fermée
                if (!this.isValidPosition(nx, ny)) {
                    isClosed = false;
                    continue;
                }

                // Si on n'a pas déjà visité cette cellule et qu'on peut la traverser
                if (!visited[ny][nx]) {
                    const neighborCell = this.getCell(nx, ny);
                    if (neighborCell && this.canPassThrough(neighborCell.type)) {
                        visited[ny][nx] = true;
                        stack.push([nx, ny]);
                    }
                }
            }
        }

        return { area, isClosed };
    }

    findEnclosedAreas() {
        const visited = Array(this.height).fill().map(() => Array(this.width).fill(false));
        const enclosedAreas = [];

        // Parcourir TOUTE la grille pour trouver les zones fermées
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.getCell(x, y);
                
                // Chercher des zones de terre non visitées
                if (!visited[y][x] && cell && this.canPassThrough(cell.type)) {
                    const result = this.floodFillWithClosureCheck(x, y, visited);
                    
                    if (result.isClosed && result.area.length > 0) {
                        enclosedAreas.push(result.area);
                    }
                }
            }
        }

        return enclosedAreas;
    }

    // Nouvelle fonction pour trouver les châteaux fermés avec leur core
    findClosedCastles() {
        const enclosedAreas = this.findEnclosedAreas();
        const castles = [];

        // Trouver tous les castle-cores de la grille une seule fois
        const allCores = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.getCell(x, y);
                if (cell && cell.type === CELL_TYPES.CASTLE_CORE) {
                    allCores.push({ x, y });
                }
            }
        }

        enclosedAreas.forEach(area => {
            // Toute zone fermée de taille raisonnable devrait être constructible
            if (area.length >= 4 && area.length <= 150) {
                // Chercher s'il y a un castle-core dans cette zone
                const coresInArea = area.filter(({x, y}) => {
                    const cell = this.getCell(x, y);
                    return cell && cell.type === CELL_TYPES.CASTLE_CORE;
                });

                // Si pas de core dans la zone, assigner le core le plus proche
                let assignedCores = coresInArea;
                if (assignedCores.length === 0 && allCores.length > 0) {
                    // Calculer le centre de la zone fermée
                    const centerX = area.reduce((sum, cell) => sum + cell.x, 0) / area.length;
                    const centerY = area.reduce((sum, cell) => sum + cell.y, 0) / area.length;
                    
                    // Trouver le core le plus proche
                    let closestCore = allCores[0];
                    let minDistance = Math.sqrt((centerX - closestCore.x) ** 2 + (centerY - closestCore.y) ** 2);
                    
                    allCores.forEach(core => {
                        const distance = Math.sqrt((centerX - core.x) ** 2 + (centerY - core.y) ** 2);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestCore = core;
                        }
                    });
                    
                    assignedCores = [closestCore];
                    console.log(`🏰 Zone fermée assignée au core le plus proche à distance ${minDistance.toFixed(1)}`);
                }

                castles.push({
                    area: area,
                    cores: assignedCores,
                    size: area.length
                });
            }
        });

        return castles;
    }

    // Types de cellules qu'on peut traverser
    canPassThrough(cellType) {
        const canPass = cellType === CELL_TYPES.LAND || 
                       cellType === CELL_TYPES.WATER || 
                       cellType === CELL_TYPES.DESTROYED ||
                       cellType === CELL_TYPES.CANNON ||
                       cellType === CELL_TYPES.CASTLE_CORE;
        // DEBUG temporaire
        if (cellType === CELL_TYPES.CANNON || cellType === CELL_TYPES.CASTLE_CORE) {
            console.log(`🎯 ${cellType} détecté comme TRAVERSABLE (nouvelle logique)`);
        }
        return canPass;
        // Seuls les MURS bloquent le passage
        // Les canons et châteaux sont des objets DANS la zone fermée, pas des murs
    }

    getCellsOfType(type, playerId = null) {
        const cells = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.getCell(x, y);
                if (cell && cell.type === type) {
                    if (playerId === null || cell.playerId === playerId) {
                        cells.push(cell);
                    }
                }
            }
        }
        return cells;
    }

    getNeighbors(x, y, includediagonal = false) {
        const neighbors = [];
        const directions = includediagonal 
            ? [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
            : [[-1,0],[1,0],[0,-1],[0,1]];

        directions.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (this.isValidPosition(nx, ny)) {
                neighbors.push(this.getCell(nx, ny));
            }
        });

        return neighbors;
    }

    serialize() {
        return {
            width: this.width,
            height: this.height,
            cells: this.cells.map(row => 
                row.map(cell => ({
                    x: cell.x,
                    y: cell.y,
                    type: cell.type,
                    playerId: cell.playerId,
                    health: cell.health
                }))
            )
        };
    }

    deserialize(data) {
        this.width = data.width;
        this.height = data.height;
        this.cells = data.cells.map(row =>
            row.map(cellData => {
                const cell = new Cell(cellData.x, cellData.y, cellData.type);
                cell.playerId = cellData.playerId;
                cell.health = cellData.health;
                return cell;
            })
        );
    }
}