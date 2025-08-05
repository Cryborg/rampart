export class Player {
    constructor(id, name, color, controlType = 'mouse') {
        this.id = id;
        this.name = name;
        this.color = color;
        this.controlType = controlType;
        
        this.score = 0;
        this.lives = 3;
        this.active = true;
        
        this.territory = {
            startX: 0,
            startY: 0,
            width: 12,
            height: 12
        };
        
        this.castle = {
            core: { x: 6, y: 6 },
            walls: [],
            isClosed: false
        };
        
        this.cannons = [];
        this.currentPiece = null;
        this.piecePosition = { x: this.territory.startX + 5, y: this.territory.startY + 5 };
        
        this.stats = {
            shipsDestroyed: 0,
            cannonsPlaced: 0,
            castlesClosed: 0,
            piecesPlaced: 0,
            roundsSurvived: 0
        };
    }

    update(deltaTime) {
        // Les canons sont de simples objets {x, y, firing}, pas des classes
        // Pas besoin d'update pour l'instant
    }

    addScore(points, reason = '') {
        this.score += points;
        console.log(`💰 Player ${this.id} scored ${points} points${reason ? ` (${reason})` : ''}`);
    }

    loseLife() {
        this.lives--;
        console.log(`💀 Player ${this.id} lost a life (${this.lives} remaining)`);
        
        if (this.lives <= 0) {
            this.active = false;
            console.log(`☠️ Player ${this.id} eliminated`);
        }
        
        return this.lives > 0;
    }

    gainLife() {
        this.lives++;
        console.log(`❤️ Player ${this.id} gained a life (${this.lives} total)`);
    }

    placeCannon(x, y) {
        const cannon = {
            id: `cannon_${this.id}_${this.cannons.length}`,
            x: x,
            y: y,
            playerId: this.id,
            health: 1,
            lastFired: 0,
            fireRate: 1000, // 1 shot per second
            range: 8,
            damage: 1,
            targets: []
        };
        
        this.cannons.push(cannon);
        this.stats.cannonsPlaced++;
        
        return cannon;
    }

    removeCannon(cannonId) {
        const index = this.cannons.findIndex(c => c.id === cannonId);
        if (index !== -1) {
            this.cannons.splice(index, 1);
            return true;
        }
        return false;
    }

    setCastle(core, walls) {
        this.castle.core = core;
        this.castle.walls = walls;
        this.checkCastleClosure();
    }

    checkCastleClosure() {
        // This will be implemented with the flood fill algorithm
        // For now, just a placeholder
        this.castle.isClosed = this.castle.walls.length >= 8;
        
        if (this.castle.isClosed) {
            this.stats.castlesClosed++;
        }
        
        return this.castle.isClosed;
    }

    canPlaceCannons() {
        return this.castle.isClosed && this.active;
    }

    getMaxCannons() {
        // 1 cannon per 16 enclosed cells (as per specs)
        const enclosedArea = this.getEnclosedArea();
        return Math.floor(enclosedArea / 16);
    }

    getEnclosedArea() {
        // Placeholder - will be calculated using flood fill
        return this.castle.walls.length * 2; // Rough estimate
    }

    isInTerritory(x, y) {
        return x >= this.territory.startX && 
               x < this.territory.startX + this.territory.width &&
               y >= this.territory.startY && 
               y < this.territory.startY + this.territory.height;
    }

    setCurrentPiece(piece) {
        this.currentPiece = piece;
        this.piecePosition = { x: 0, y: 0 };
    }

    movePiece(dx, dy) {
        if (this.currentPiece) {
            this.piecePosition.x += dx;
            this.piecePosition.y += dy;
            
            // Keep piece within territory bounds
            this.piecePosition.x = Math.max(this.territory.startX, 
                Math.min(this.territory.startX + this.territory.width - 1, this.piecePosition.x));
            this.piecePosition.y = Math.max(this.territory.startY,
                Math.min(this.territory.startY + this.territory.height - 1, this.piecePosition.y));
        }
    }

    rotatePiece() {
        if (this.currentPiece && this.currentPiece.rotate) {
            this.currentPiece.rotate();
        }
    }

    placePiece() {
        if (this.currentPiece) {
            const placed = { 
                piece: this.currentPiece, 
                x: this.piecePosition.x, 
                y: this.piecePosition.y 
            };
            
            this.currentPiece = null;
            this.stats.piecesPlaced++;
            
            return placed;
        }
        return null;
    }

    // Scoring methods
    destroyShip(shipType) {
        const points = this.getShipPoints(shipType);
        this.addScore(points, `destroyed ${shipType}`);
        this.stats.shipsDestroyed++;
    }

    getShipPoints(shipType) {
        const shipPoints = {
            'small': 100,
            'medium': 300,
            'large': 500
        };
        return shipPoints[shipType] || 100;
    }

    completedRound() {
        this.stats.roundsSurvived++;
        
        // Bonus points for surviving cannons
        const survivingCannons = this.cannons.length;
        this.addScore(survivingCannons * 50, 'surviving cannons');
        
        // Bonus for closed castle
        if (this.castle.isClosed) {
            this.addScore(200, 'closed castle');
        }
    }

    getControlScheme() {
        const schemes = {
            mouse: {
                move: 'mousemove',
                rotate: 'contextmenu',
                validate: 'click',
                cancel: 'keydown:Escape'
            },
            keyboard_arrows: {
                move: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
                rotate: 'Space',
                validate: 'Enter',
                cancel: 'Escape'
            },
            keyboard_wasd: {
                move: ['KeyW', 'KeyS', 'KeyA', 'KeyD'],
                rotate: 'KeyQ',
                validate: 'KeyE',
                cancel: 'ShiftLeft'
            },
            keyboard_numpad: {
                move: ['Numpad8', 'Numpad2', 'Numpad4', 'Numpad6'],
                rotate: 'Numpad7',
                validate: 'NumpadEnter',
                cancel: 'Numpad0'
            }
        };
        
        return schemes[this.controlType] || schemes.mouse;
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            controlType: this.controlType,
            score: this.score,
            lives: this.lives,
            active: this.active,
            territory: this.territory,
            castle: this.castle,
            cannons: this.cannons,
            stats: this.stats
        };
    }

    deserialize(data) {
        Object.assign(this, data);
    }

    reset() {
        this.score = 0;
        this.lives = 3;
        this.active = true;
        this.cannons = [];
        this.currentPiece = null;
        this.castle.walls = [];
        this.castle.isClosed = false;
        
        this.stats = {
            shipsDestroyed: 0,
            cannonsPlaced: 0,
            castlesClosed: 0,
            piecesPlaced: 0,
            roundsSurvived: 0
        };
    }
}