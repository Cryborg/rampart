import { RepairPhase } from './RepairPhase.js';
import { PlaceCannonPhase } from './PlaceCannonPhase.js';

// Factory pattern for phase creation
export class PhaseManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentPhase = null;
        this.phases = new Map();
        
        this.initializePhases();
    }

    initializePhases() {
        this.phases.set('REPAIR', new RepairPhase(this.gameManager));
        this.phases.set('PLACE_CANNONS', new PlaceCannonPhase(this.gameManager));
    }

    transitionTo(phaseName) {
        const newPhase = this.phases.get(phaseName);
        
        if (!newPhase) {
            console.error(`❌ Unknown phase: ${phaseName}`);
            return false;
        }

        console.log(`🔄 Phase transition: ${this.currentPhase?.constructor.name || 'None'} → ${newPhase.constructor.name}`);

        // Exit current phase
        if (this.currentPhase) {
            this.currentPhase.onExit();
        }

        // Enter new phase
        this.currentPhase = newPhase;
        this.currentPhase.onEnter();

        return true;
    }

    getCurrentPhase() {
        return this.currentPhase;
    }

    // Delegate methods to current phase
    handleMouseMove(gridPos) {
        this.currentPhase?.handleMouseMove(gridPos);
    }

    handleMouseClick(gridPos, button) {
        this.currentPhase?.handleMouseClick(gridPos, button);
    }

    handleKeyPress(key) {
        this.currentPhase?.handleKeyPress(key);
    }

    update(deltaTime) {
        this.currentPhase?.update(deltaTime);
    }

    render() {
        this.currentPhase?.render();
    }

    renderUI() {
        this.currentPhase?.renderUI();
    }
}