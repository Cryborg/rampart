// Base class for game phases (Strategy pattern)
export class BasePhase {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.grid = gameManager.grid;
        this.renderer = gameManager.renderer;
        this.ctx = gameManager.ctx;
    }

    // Abstract methods to be implemented by subclasses
    onEnter() {
        throw new Error('onEnter() must be implemented by subclass');
    }

    onExit() {
        throw new Error('onExit() must be implemented by subclass');
    }

    handleMouseMove(gridPos) {
        // Default implementation - can be overridden
    }

    handleMouseClick(gridPos, button) {
        // Default implementation - can be overridden
    }

    handleKeyPress(key) {
        // Default implementation - can be overridden
    }

    update(deltaTime) {
        // Default implementation - can be overridden
    }

    render() {
        // Default implementation - can be overridden
    }

    renderUI() {
        // Default implementation - can be overridden
    }
}