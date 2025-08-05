export const TETRIS_SHAPES = {
    I: {
        name: 'I',
        shapes: [
            [[1, 1, 1, 1]],
            [[1], [1], [1], [1]]
        ],
        color: '#00f0f0'
    },
    
    O: {
        name: 'O',
        shapes: [
            [[1, 1], [1, 1]]
        ],
        color: '#f0f000'
    },
    
    T: {
        name: 'T',
        shapes: [
            [[0, 1, 0], [1, 1, 1]],
            [[1, 0], [1, 1], [1, 0]],
            [[1, 1, 1], [0, 1, 0]],
            [[0, 1], [1, 1], [0, 1]]
        ],
        color: '#a000f0'
    },
    
    S: {
        name: 'S',
        shapes: [
            [[0, 1, 1], [1, 1, 0]],
            [[1, 0], [1, 1], [0, 1]]
        ],
        color: '#00f000'
    },
    
    Z: {
        name: 'Z',
        shapes: [
            [[1, 1, 0], [0, 1, 1]],
            [[0, 1], [1, 1], [1, 0]]
        ],
        color: '#f00000'
    },
    
    J: {
        name: 'J',
        shapes: [
            [[1, 0, 0], [1, 1, 1]],
            [[1, 1], [1, 0], [1, 0]],
            [[1, 1, 1], [0, 0, 1]],
            [[0, 1], [0, 1], [1, 1]]
        ],
        color: '#0000f0'
    },
    
    L: {
        name: 'L',
        shapes: [
            [[0, 0, 1], [1, 1, 1]],
            [[1, 0], [1, 0], [1, 1]],
            [[1, 1, 1], [1, 0, 0]],
            [[1, 1], [0, 1], [0, 1]]
        ],
        color: '#f0a000'
    }
};

// Smaller, more manageable pieces for Rampart gameplay
export const RAMPART_PIECES = {
    SINGLE: {
        name: 'Single',
        shapes: [[[1]]],
        color: '#888888'
    },
    
    DOT_2: {
        name: 'Dot2',
        shapes: [
            [[1, 1]],
            [[1], [1]]
        ],
        color: '#ff6b35'
    },
    
    DOT_3: {
        name: 'Dot3',
        shapes: [
            [[1, 1, 1]],
            [[1], [1], [1]]
        ],
        color: '#004e89'
    },
    
    L_SMALL: {
        name: 'LSmall',
        shapes: [
            [[1, 0], [1, 1]],
            [[1, 1], [1, 0]],
            [[1, 1], [0, 1]],
            [[0, 1], [1, 1]]
        ],
        color: '#2ecc71'
    },
    
    T_SMALL: {
        name: 'TSmall',
        shapes: [
            [[0, 1, 0], [1, 1, 1]],
            [[1, 0], [1, 1], [1, 0]],
            [[1, 1, 1], [0, 1, 0]],
            [[0, 1], [1, 1], [0, 1]]
        ],
        color: '#9b59b6'
    },
    
    SQUARE_SMALL: {
        name: 'SquareSmall',
        shapes: [[[1, 1], [1, 1]]],
        color: '#f39c12'
    },
    
    Z_SMALL: {
        name: 'ZSmall',
        shapes: [
            [[1, 1, 0], [0, 1, 1]],
            [[0, 1], [1, 1], [1, 0]]
        ],
        color: '#e74c3c'
    }
};

export class TetrisPiece {
    constructor(type, shapeSet = RAMPART_PIECES) {
        if (!shapeSet[type]) {
            throw new Error(`Unknown piece type: ${type}`);
        }
        
        this.type = type;
        this.shapeData = shapeSet[type];
        this.currentRotation = 0;
        this.maxRotations = this.shapeData.shapes.length;
        this.color = this.shapeData.color;
        this.playerId = null;
    }

    get shape() {
        return this.shapeData.shapes[this.currentRotation];
    }

    get width() {
        return this.shape[0].length;
    }

    get height() {
        return this.shape.length;
    }

    rotate(clockwise = true) {
        if (clockwise) {
            this.currentRotation = (this.currentRotation + 1) % this.maxRotations;
        } else {
            this.currentRotation = (this.currentRotation - 1 + this.maxRotations) % this.maxRotations;
        }
    }

    setRotation(rotation) {
        if (rotation >= 0 && rotation < this.maxRotations) {
            this.currentRotation = rotation;
        }
    }

    clone() {
        const cloned = new TetrisPiece(this.type, this.getShapeSet());
        cloned.currentRotation = this.currentRotation;
        cloned.playerId = this.playerId;
        return cloned;
    }

    getShapeSet() {
        // Return the shape set this piece belongs to
        if (TETRIS_SHAPES[this.type]) return TETRIS_SHAPES;
        if (RAMPART_PIECES[this.type]) return RAMPART_PIECES;
        return RAMPART_PIECES; // Default
    }

    getBoundingBox() {
        const shape = this.shape;
        let minX = shape[0].length, maxX = -1;
        let minY = shape.length, maxY = -1;

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] === 1) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        return {
            minX, maxX, minY, maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }

    getFilledCells() {
        const cells = [];
        const shape = this.shape;

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] === 1) {
                    cells.push({ x, y });
                }
            }
        }

        return cells;
    }

    serialize() {
        return {
            type: this.type,
            currentRotation: this.currentRotation,
            playerId: this.playerId
        };
    }

    static deserialize(data, shapeSet = RAMPART_PIECES) {
        const piece = new TetrisPiece(data.type, shapeSet);
        piece.currentRotation = data.currentRotation || 0;
        piece.playerId = data.playerId;
        return piece;
    }
}

export class PieceGenerator {
    constructor(useRampartPieces = true) {
        this.shapeSet = useRampartPieces ? RAMPART_PIECES : TETRIS_SHAPES;
        this.pieceTypes = Object.keys(this.shapeSet);
        this.history = [];
        this.maxHistory = 4; // Prevent same piece appearing too often
    }

    generatePiece(playerId = null) {
        let pieceType;
        let attempts = 0;
        const maxAttempts = 20;

        do {
            pieceType = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
            attempts++;
        } while (this.history.includes(pieceType) && attempts < maxAttempts);

        // Update history
        this.history.push(pieceType);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        const piece = new TetrisPiece(pieceType, this.shapeSet);
        piece.playerId = playerId;
        
        return piece;
    }

    generateBatch(count, playerId = null) {
        const pieces = [];
        for (let i = 0; i < count; i++) {
            pieces.push(this.generatePiece(playerId));
        }
        return pieces;
    }

    // Generate pieces with difficulty scaling
    generateForRound(round, playerId = null) {
        let pieceCount = Math.min(10, 5 + Math.floor(round / 2)); // 5-10 pieces
        
        // Early rounds get easier pieces
        if (round <= 3) {
            const easyPieces = ['SINGLE', 'DOT_2', 'DOT_3', 'SQUARE_SMALL'];
            const filteredTypes = this.pieceTypes.filter(type => easyPieces.includes(type));
            const oldTypes = this.pieceTypes;
            this.pieceTypes = filteredTypes;
            
            const pieces = this.generateBatch(pieceCount, playerId);
            this.pieceTypes = oldTypes; // Restore
            return pieces;
        }
        
        return this.generateBatch(pieceCount, playerId);
    }

    // Weighted generation for better gameplay balance
    generateWeighted(weights = null, playerId = null) {
        const defaultWeights = {
            'SINGLE': 0.1,      // Less common, too easy
            'DOT_2': 0.2,       // Common, useful
            'DOT_3': 0.15,      // Somewhat common
            'L_SMALL': 0.2,     // Common, versatile
            'T_SMALL': 0.15,    // Somewhat common
            'SQUARE_SMALL': 0.1, // Less common
            'Z_SMALL': 0.1      // Less common, harder to use
        };

        const actualWeights = weights || defaultWeights;
        const random = Math.random();
        let cumulativeWeight = 0;

        for (const [pieceType, weight] of Object.entries(actualWeights)) {
            cumulativeWeight += weight;
            if (random <= cumulativeWeight && this.shapeSet[pieceType]) {
                const piece = new TetrisPiece(pieceType, this.shapeSet);
                piece.playerId = playerId;
                return piece;
            }
        }

        // Fallback
        return this.generatePiece(playerId);
    }

    reset() {
        this.history = [];
    }

    // Debug helper
    getAllPieceTypes() {
        return this.pieceTypes.map(type => ({
            type,
            name: this.shapeSet[type].name,
            rotations: this.shapeSet[type].shapes.length,
            color: this.shapeSet[type].color
        }));
    }
}

// Utility functions for piece validation and placement
export class PieceUtils {
    static canPlacePiece(grid, piece, x, y) {
        const shape = piece.shape;
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px] === 1) {
                    const worldX = x + px;
                    const worldY = y + py;
                    
                    if (!grid.isValidPosition(worldX, worldY)) {
                        return false;
                    }
                    
                    const cell = grid.getCell(worldX, worldY);
                    if (!cell || !cell.isBuildable()) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    static getPlacementSuggestions(grid, piece, playerTerritory) {
        const suggestions = [];
        const { startX, startY, width, height } = playerTerritory;
        
        for (let y = startY; y < startY + height - piece.height + 1; y++) {
            for (let x = startX; x < startX + width - piece.width + 1; x++) {
                if (this.canPlacePiece(grid, piece, x, y)) {
                    const score = this.scorePlacement(grid, piece, x, y);
                    suggestions.push({ x, y, score });
                }
            }
        }
        
        return suggestions.sort((a, b) => b.score - a.score);
    }

    static scorePlacement(grid, piece, x, y) {
        let score = 0;
        const shape = piece.shape;
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px] === 1) {
                    const worldX = x + px;
                    const worldY = y + py;
                    
                    // Bonus for connecting to existing walls
                    const neighbors = grid.getNeighbors(worldX, worldY);
                    const wallNeighbors = neighbors.filter(cell => 
                        cell.type === 'wall' || cell.type === 'castle-core'
                    ).length;
                    
                    score += wallNeighbors * 10;
                    
                    // Bonus for being near castle core
                    const distanceToCore = this.getDistanceToNearestCore(grid, worldX, worldY);
                    if (distanceToCore <= 3) {
                        score += (4 - distanceToCore) * 5;
                    }
                }
            }
        }
        
        return score;
    }

    static getDistanceToNearestCore(grid, x, y) {
        const cores = grid.getCellsOfType('castle-core');
        if (cores.length === 0) return Infinity;
        
        let minDistance = Infinity;
        for (const core of cores) {
            const distance = Math.abs(x - core.x) + Math.abs(y - core.y);
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }
}