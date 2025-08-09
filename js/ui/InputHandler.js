import { CoordinateService } from '../services/CoordinateService.js';

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
            onKeyPress: null,
            onKeyDown: null
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
            
            this.mousePos = this.getEventPosition(e);
            if (this.callbacks.onMouseMove) {
                // Passer les coordonnées canvas comme pour onMouseClick
                this.callbacks.onMouseMove(this.mousePos.x, this.mousePos.y, e);
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.isEnabled) return;
            
            e.preventDefault();
            this.mouseButtons.add(e.button);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (!this.isEnabled) return;
            
            e.preventDefault();
            this.mouseButtons.delete(e.button);
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.isEnabled) return;
            
            e.preventDefault();
            
            const pos = this.getEventPosition(e);
            
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
            
            const pos = this.getEventPosition(e);
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
        const pos = this.getEventPosition(e);
        
        this.mousePos = pos;
    }

    handleTouchMove(e) {
        if (!this.isEnabled) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        const pos = this.getEventPosition(e);
        
        this.mousePos = pos;
        
        if (this.callbacks.onMouseMove) {
            this.callbacks.onMouseMove(pos.x, pos.y, e);
        }
    }

    handleTouchEnd(e) {
        if (!this.isEnabled) return;
        
        e.preventDefault();
        
        if (this.callbacks.onMouseClick) {
            this.callbacks.onMouseClick(this.mousePos.x, this.mousePos.y, 0, e);
        }
    }

    getEventPosition(e) {
        return CoordinateService.eventToCanvas(e, this.canvas);
    }

    // Public API for setting callbacks
    set onMouseMove(callback) { this.callbacks.onMouseMove = callback; }
    set onMouseClick(callback) { this.callbacks.onMouseClick = callback; }
    set onKeyPress(callback) { this.callbacks.onKeyPress = callback; }
    set onKeyDown(callback) { this.callbacks.onKeyDown = callback; }

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


    // Cleanup
    destroy() {
        this.disable();
        
        // Remove all event listeners would require storing references
        // For now, just disable the handler
        console.log('🎮 InputHandler cleaned up');
    }
}