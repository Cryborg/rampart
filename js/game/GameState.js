export const GAME_STATES = {
    MENU: 'menu',
    SELECT_TERRITORY: 'select_territory',
    PLACE_CANNONS: 'place_cannons',
    COMBAT: 'combat',
    REPAIR: 'repair',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over'
};

export const PHASE_DURATIONS = {
    [GAME_STATES.SELECT_TERRITORY]: 10000, // 10 seconds
    [GAME_STATES.PLACE_CANNONS]: 15000,    // 15 seconds
    [GAME_STATES.COMBAT]: 30000,           // 30 seconds
    [GAME_STATES.REPAIR]: 15000,           // 15 seconds
    [GAME_STATES.ROUND_END]: 3000          // 3 seconds
};

export class GameState {
    constructor() {
        this.currentState = GAME_STATES.MENU;
        this.previousState = null;
        this.round = 1;
        this.phaseStartTime = 0;
        this.phaseTimeLeft = 0;
        this.isTransitioning = false;
        
        this.callbacks = {
            onStateChange: [],
            onPhaseTimeout: [],
            onRoundComplete: []
        };
    }

    transition(newState) {
        if (this.isTransitioning || this.currentState === newState) {
            return false;
        }

        this.isTransitioning = true;
        this.previousState = this.currentState;
        this.currentState = newState;
        
        this.phaseStartTime = Date.now();
        this.phaseTimeLeft = PHASE_DURATIONS[newState] || 0;
        
        console.log(`🔄 State transition: ${this.previousState} → ${this.currentState}`);
        
        this.notifyStateChange();
        
        setTimeout(() => {
            this.isTransitioning = false;
        }, 100);

        return true;
    }

    update(deltaTime) {
        if (this.phaseTimeLeft > 0) {
            this.phaseTimeLeft -= deltaTime;
            
            if (this.phaseTimeLeft <= 0) {
                this.handlePhaseTimeout();
            }
        }
    }

    handlePhaseTimeout() {
        console.log(`⏰ Phase timeout: ${this.currentState}`);
        
        this.notifyPhaseTimeout();
        
        switch (this.currentState) {
            case GAME_STATES.SELECT_TERRITORY:
                this.transition(GAME_STATES.PLACE_CANNONS);
                break;
            case GAME_STATES.PLACE_CANNONS:
                this.transition(GAME_STATES.COMBAT);
                break;
            case GAME_STATES.COMBAT:
                this.transition(GAME_STATES.REPAIR);
                break;
            case GAME_STATES.REPAIR:
                this.checkRepairResult();
                break;
            case GAME_STATES.ROUND_END:
                this.startNextRound();
                break;
        }
    }

    checkRepairResult() {
        console.log('🔍 Checking repair result...');
        this.transition(GAME_STATES.ROUND_END);
    }

    startNextRound() {
        this.round++;
        console.log(`🆕 Starting round ${this.round}`);
        
        if (this.round > 10) { // Max rounds
            this.transition(GAME_STATES.GAME_OVER);
        } else {
            this.transition(GAME_STATES.PLACE_CANNONS);
        }
        
        this.notifyRoundComplete();
    }

    getPhaseProgress() {
        const totalDuration = PHASE_DURATIONS[this.currentState] || 1;
        const elapsed = totalDuration - this.phaseTimeLeft;
        return Math.max(0, Math.min(1, elapsed / totalDuration));
    }

    getTimeLeftSeconds() {
        return Math.ceil(this.phaseTimeLeft / 1000);
    }

    isInGameplayState() {
        return [
            GAME_STATES.SELECT_TERRITORY,
            GAME_STATES.PLACE_CANNONS,
            GAME_STATES.COMBAT,
            GAME_STATES.REPAIR
        ].includes(this.currentState);
    }

    canPlacePieces() {
        return this.currentState === GAME_STATES.REPAIR;
    }

    canPlaceCannons() {
        return this.currentState === GAME_STATES.PLACE_CANNONS;
    }

    isInCombat() {
        return this.currentState === GAME_STATES.COMBAT;
    }

    // Event system
    onStateChange(callback) {
        this.callbacks.onStateChange.push(callback);
    }

    onPhaseTimeout(callback) {
        this.callbacks.onPhaseTimeout.push(callback);
    }

    onRoundComplete(callback) {
        this.callbacks.onRoundComplete.push(callback);
    }

    notifyStateChange() {
        this.callbacks.onStateChange.forEach(callback => {
            callback(this.currentState, this.previousState);
        });
    }

    notifyPhaseTimeout() {
        this.callbacks.onPhaseTimeout.forEach(callback => {
            callback(this.currentState);
        });
    }

    notifyRoundComplete() {
        this.callbacks.onRoundComplete.forEach(callback => {
            callback(this.round);
        });
    }

    // Serialization for save/load
    serialize() {
        return {
            currentState: this.currentState,
            round: this.round,
            phaseTimeLeft: this.phaseTimeLeft
        };
    }

    deserialize(data) {
        this.currentState = data.currentState || GAME_STATES.MENU;
        this.round = data.round || 1;
        this.phaseTimeLeft = data.phaseTimeLeft || 0;
        this.phaseStartTime = Date.now();
    }

    reset() {
        this.currentState = GAME_STATES.MENU;
        this.previousState = null;
        this.round = 1;
        this.phaseStartTime = 0;
        this.phaseTimeLeft = 0;
        this.isTransitioning = false;
    }
}