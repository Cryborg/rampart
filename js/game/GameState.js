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
        
        // Support multijoueur
        this.isMultiplayer = false;
        this.playerCount = 1;
        this.currentPlayerTurn = 0;
        this.playersFinishedTurn = new Set();
        this.isSequentialPhase = false;
        
        this.callbacks = {
            onStateChange: [],
            onPhaseTimeout: [],
            onRoundComplete: [],
            onPlayerTurnChange: []
        };
    }

    transition(newState) {
        if (this.isTransitioning || this.currentState === newState) {
            return false;
        }

        this.isTransitioning = true;
        this.previousState = this.currentState;
        this.currentState = newState;
        
        // Déterminer si la nouvelle phase est séquentielle
        this.isSequentialPhase = this.isMultiplayer && 
            (newState === GAME_STATES.PLACE_CANNONS || newState === GAME_STATES.REPAIR);
        
        // Réinitialiser les tours multijoueurs
        if (this.isSequentialPhase) {
            this.currentPlayerTurn = 0;
            this.playersFinishedTurn.clear();
            console.log(`👥 Phase séquentielle ${newState} commencée - Tour du joueur 1`);
        }
        
        this.phaseStartTime = Date.now();
        this.phaseTimeLeft = PHASE_DURATIONS[newState] || 0;
        
        console.log(`🔄 State transition: ${this.previousState} → ${this.currentState}`);
        
        this.notifyStateChange();
        
        setTimeout(() => {
            this.isTransitioning = false;
        }, 100);

        return true;
    }

    /**
     * Configurer le mode multijoueur
     */
    setMultiplayerMode(playerCount) {
        this.isMultiplayer = playerCount > 1;
        this.playerCount = playerCount;
        this.currentPlayerTurn = 0;
        this.playersFinishedTurn.clear();
        
        console.log(`👥 Mode multijoueur activé: ${playerCount} joueurs`);
    }

    /**
     * Passer au joueur suivant en phase séquentielle
     */
    nextPlayerTurn() {
        if (!this.isSequentialPhase) return false;
        
        const previousPlayer = this.currentPlayerTurn;
        this.currentPlayerTurn = (this.currentPlayerTurn + 1) % this.playerCount;
        
        console.log(`🔄 Tour séquentiel: Joueur ${previousPlayer + 1} → Joueur ${this.currentPlayerTurn + 1}`);
        
        // Notifier le changement de tour
        this.notifyPlayerTurnChange(this.currentPlayerTurn, previousPlayer);
        
        return true;
    }

    /**
     * Marquer le joueur actuel comme ayant fini son tour
     */
    finishCurrentPlayerTurn(playerId = null) {
        const playerToFinish = playerId !== null ? playerId : this.currentPlayerTurn;
        this.playersFinishedTurn.add(playerToFinish);
        
        console.log(`✅ Joueur ${playerToFinish + 1} a terminé son tour`);
        
        // Vérifier si tous les joueurs ont fini
        if (this.allPlayersFinished()) {
            console.log(`🏁 Tous les joueurs ont terminé la phase ${this.currentState}`);
            return this.handleAllPlayersFinished();
        } else if (this.isSequentialPhase) {
            // Passer au joueur suivant qui n'a pas encore fini
            this.nextAvailablePlayer();
        }
        
        return false;
    }

    /**
     * Passer au prochain joueur qui n'a pas encore fini son tour
     */
    nextAvailablePlayer() {
        let attempts = 0;
        const maxAttempts = this.playerCount;
        
        do {
            this.nextPlayerTurn();
            attempts++;
        } while (this.playersFinishedTurn.has(this.currentPlayerTurn) && attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
            // Tous les joueurs ont fini
            return this.handleAllPlayersFinished();
        }
        
        return true;
    }

    /**
     * Vérifier si tous les joueurs ont terminé leur tour
     */
    allPlayersFinished() {
        return this.playersFinishedTurn.size >= this.playerCount;
    }

    /**
     * Gérer la fin de phase quand tous les joueurs ont terminé
     */
    handleAllPlayersFinished() {
        console.log(`🎯 Phase ${this.currentState} terminée - tous les joueurs ont fini`);
        
        // Transition automatique vers la phase suivante
        switch (this.currentState) {
            case GAME_STATES.PLACE_CANNONS:
                return this.transition(GAME_STATES.COMBAT);
            case GAME_STATES.REPAIR:
                // Après réparation, on recommence le cycle
                return this.transition(GAME_STATES.PLACE_CANNONS);
            default:
                return false;
        }
    }

    /**
     * Obtenir le joueur actuel en phase séquentielle
     */
    getCurrentPlayer() {
        return this.isSequentialPhase ? this.currentPlayerTurn : 0;
    }

    /**
     * Vérifier si un joueur peut agir (selon la phase et le mode)
     */
    canPlayerAct(playerId) {
        if (!this.isMultiplayer) return true;
        
        if (this.isSequentialPhase) {
            return playerId === this.currentPlayerTurn && !this.playersFinishedTurn.has(playerId);
        }
        
        // En phases simultanées (combat), tous les joueurs peuvent agir
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
                // IMPORTANT: Valider les canons après le combat avant de passer en réparation
                if (this.gameManager.combatSystem) {
                    this.gameManager.combatSystem.validateCannonsAfterCombat();
                }
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

    notifyPlayerTurnChange(currentPlayer, previousPlayer) {
        this.callbacks.onPlayerTurnChange.forEach(callback => {
            callback(currentPlayer, previousPlayer);
        });
    }

    onPlayerTurnChange(callback) {
        this.callbacks.onPlayerTurnChange.push(callback);
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