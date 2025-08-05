export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.isEnabled = true;
        
        this.keys = new Set();
        this.mousePos = { x: 0, y: 0 };
        this.mouseButtons = new Set();
        
        this.callbacks = {
            onMouseMove: null,
            onMouseClick: null,
            onMouseDown: null,
            onMouseUp: null,
            onKeyPress: null,
            onKeyDown: null,
            onKeyUp: null
        };
    }

    init() {
        this.setupMouseHandlers();
        this.setupKeyboardHandlers();
        this.setupContextMenu();
        console.log('🎮 InputHandler initialized');
    }

    setupMouseHandlers() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isEnabled) return;
            
            this.mousePos = this.getMousePosition(e);
            if (this.callbacks.onMouseMove) {
                // Passer les coordonnées canvas comme pour onMouseClick
                this.callbacks.onMouseMove(this.mousePos.x, this.mousePos.y, e);
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.isEnabled) return;
            
            e.preventDefault();
            this.mouseButtons.add(e.button);
            
            if (this.callbacks.onMouseDown) {
                // Utiliser les mêmes coordonnées que pour mousemove
                this.callbacks.onMouseDown(e.clientX, e.clientY, e.button, e);
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (!this.isEnabled) return;
            
            e.preventDefault();
            this.mouseButtons.delete(e.button);
            
            if (this.callbacks.onMouseUp) {
                this.callbacks.onMouseUp(this.mousePos.x, this.mousePos.y, e.button, e);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.isEnabled) return;
            
            e.preventDefault();
            
            const pos = this.getMousePosition(e);
            
            if (this.callbacks.onMouseClick) {
                this.callbacks.onMouseClick(pos.x, pos.y, e.button, e);
            }
        });

        // Touch support for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (!this.isEnabled) return;
            
            this.keys.add(e.code);
            
            if (this.callbacks.onKeyDown) {
                this.callbacks.onKeyDown(e.code, e);
            }
            
            // Handle special keys immediately
            this.handleSpecialKeys(e);
        });

        document.addEventListener('keyup', (e) => {
            if (!this.isEnabled) return;
            
            this.keys.delete(e.code);
            
            if (this.callbacks.onKeyUp) {
                this.callbacks.onKeyUp(e.code, e);
            }
        });

        document.addEventListener('keypress', (e) => {
            if (!this.isEnabled) return;
            
            if (this.callbacks.onKeyPress) {
                this.callbacks.onKeyPress(e.code || e.key, e);
            }
        });
    }

    setupContextMenu() {
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            if (!this.isEnabled) return;
            
            const pos = this.getMousePosition(e);
            if (this.callbacks.onMouseClick) {
                this.callbacks.onMouseClick(pos.x, pos.y, 2, e);
            }
        });
    }

    handleSpecialKeys(e) {
        // Prevent default for game-relevant keys
        const gameKeys = [
            'Space', 'Enter', 'Escape',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
            'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4',
            'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
            'NumpadEnter'
        ];

        if (gameKeys.includes(e.code)) {
            e.preventDefault();
        }
    }

    // Touch handlers for mobile support
    handleTouchStart(e) {
        if (!this.isEnabled) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        const pos = this.getTouchPosition(touch);
        
        this.mousePos = pos;
        
        if (this.callbacks.onMouseDown) {
            this.callbacks.onMouseDown(pos.x, pos.y, 0, e);
        }
    }

    handleTouchMove(e) {
        if (!this.isEnabled) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        const pos = this.getTouchPosition(touch);
        
        this.mousePos = pos;
        
        if (this.callbacks.onMouseMove) {
            this.callbacks.onMouseMove(pos.x, pos.y, e);
        }
    }

    handleTouchEnd(e) {
        if (!this.isEnabled) return;
        
        e.preventDefault();
        
        if (this.callbacks.onMouseUp) {
            this.callbacks.onMouseUp(this.mousePos.x, this.mousePos.y, 0, e);
        }
        
        if (this.callbacks.onMouseClick) {
            this.callbacks.onMouseClick(e.clientX, e.clientY, 0, e);
        }
    }

    getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Coordonnées dans l'espace CSS
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        // Scaling pour convertir CSS → Canvas
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: cssX * scaleX,
            y: cssY * scaleY
        };
    }

    getTouchPosition(touch) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Coordonnées dans l'espace CSS
        const cssX = touch.clientX - rect.left;
        const cssY = touch.clientY - rect.top;
        
        // Scaling pour convertir CSS → Canvas
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: cssX * scaleX,
            y: cssY * scaleY
        };
    }

    // Public API for setting callbacks
    set onMouseMove(callback) { this.callbacks.onMouseMove = callback; }
    set onMouseClick(callback) { this.callbacks.onMouseClick = callback; }
    set onMouseDown(callback) { this.callbacks.onMouseDown = callback; }
    set onMouseUp(callback) { this.callbacks.onMouseUp = callback; }
    set onKeyPress(callback) { this.callbacks.onKeyPress = callback; }
    set onKeyDown(callback) { this.callbacks.onKeyDown = callback; }
    set onKeyUp(callback) { this.callbacks.onKeyUp = callback; }

    // Utility methods
    isKeyPressed(keyCode) {
        return this.keys.has(keyCode);
    }

    isMouseButtonPressed(button) {
        return this.mouseButtons.has(button);
    }

    getCurrentMousePosition() {
        return { ...this.mousePos };
    }

    getPressedKeys() {
        return Array.from(this.keys);
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
        this.keys.clear();
        this.mouseButtons.clear();
    }

    // Multi-player input handling
    createPlayerInputHandler(player) {
        const scheme = player.getControlScheme();
        
        return {
            checkMoveInput: () => {
                if (scheme.move === 'mousemove') {
                    return null; // Mouse movement handled elsewhere
                }
                
                // Keyboard movement
                const moves = scheme.move;
                if (this.isKeyPressed(moves[0])) return { dx: 0, dy: -1 }; // Up
                if (this.isKeyPressed(moves[1])) return { dx: 0, dy: 1 };  // Down
                if (this.isKeyPressed(moves[2])) return { dx: -1, dy: 0 }; // Left
                if (this.isKeyPressed(moves[3])) return { dx: 1, dy: 0 };  // Right
                
                return null;
            },
            
            checkRotateInput: () => {
                return this.isKeyPressed(scheme.rotate);
            },
            
            checkValidateInput: () => {
                if (scheme.validate === 'click') {
                    return this.isMouseButtonPressed(0); // Left click
                }
                return this.isKeyPressed(scheme.validate);
            },
            
            checkCancelInput: () => {
                return this.isKeyPressed(scheme.cancel);
            }
        };
    }

    // Input validation for different game states
    isValidInput(gameState, inputType) {
        const validInputs = {
            'select_territory': ['click', 'validate'],
            'place_cannons': ['click', 'validate', 'move'],
            'combat': [], // No player input during combat
            'repair': ['click', 'validate', 'move', 'rotate', 'cancel']
        };
        
        return validInputs[gameState]?.includes(inputType) ?? false;
    }

    // Cleanup
    destroy() {
        this.disable();
        
        // Remove all event listeners would require storing references
        // For now, just disable the handler
        console.log('🎮 InputHandler cleaned up');
    }
}