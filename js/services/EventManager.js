// ===================================================
// GESTIONNAIRE D'ÉVÉNEMENTS
// ===================================================
// Système centralisé pour la gestion des événements UI

/**
 * Gestionnaire d'événements centralisé avec support delegation et cleanup
 */
export class EventManager {
    constructor() {
        this.listeners = new Map();
        this.delegatedListeners = new Map();
        this.eventId = 0;
    }
    
    /**
     * Ajoute un event listener avec nettoyage automatique
     */
    on(element, eventType, handler, options = {}) {
        if (!element) {
            console.warn('Element null fourni à EventManager.on');
            return null;
        }
        
        const id = ++this.eventId;
        const wrappedHandler = (event) => {
            try {
                handler(event);
            } catch (error) {
                console.error('Erreur dans event handler:', error);
            }
        };
        
        element.addEventListener(eventType, wrappedHandler, options);
        
        this.listeners.set(id, {
            element,
            eventType,
            handler: wrappedHandler,
            options
        });
        
        return id;
    }
    
    /**
     * Retire un event listener par son ID
     */
    off(listenerId) {
        const listener = this.listeners.get(listenerId);
        if (listener) {
            listener.element.removeEventListener(
                listener.eventType, 
                listener.handler, 
                listener.options
            );
            this.listeners.delete(listenerId);
            return true;
        }
        return false;
    }
    
    /**
     * Event delegation - attache un listener au parent qui gère les enfants
     */
    delegate(parent, selector, eventType, handler, options = {}) {
        const id = ++this.eventId;
        
        const delegatedHandler = (event) => {
            const target = event.target.closest(selector);
            if (target && parent.contains(target)) {
                try {
                    handler(event, target);
                } catch (error) {
                    console.error('Erreur dans delegated handler:', error);
                }
            }
        };
        
        parent.addEventListener(eventType, delegatedHandler, options);
        
        this.delegatedListeners.set(id, {
            parent,
            selector,
            eventType,
            handler: delegatedHandler,
            options
        });
        
        return id;
    }
    
    /**
     * Retire un delegated listener
     */
    undelegate(listenerId) {
        const listener = this.delegatedListeners.get(listenerId);
        if (listener) {
            listener.parent.removeEventListener(
                listener.eventType,
                listener.handler,
                listener.options
            );
            this.delegatedListeners.delete(listenerId);
            return true;
        }
        return false;
    }
    
    /**
     * Attache plusieurs événements d'un coup avec un objet de configuration
     */
    onMultiple(element, eventMap) {
        const ids = [];
        
        for (const [eventType, handler] of Object.entries(eventMap)) {
            const id = this.on(element, eventType, handler);
            if (id) ids.push(id);
        }
        
        return ids;
    }
    
    /**
     * Crée un groupe d'event listeners pour les nettoyer facilement
     */
    createGroup() {
        const group = {
            listeners: [],
            
            add: (element, eventType, handler, options) => {
                const id = this.on(element, eventType, handler, options);
                if (id) group.listeners.push(id);
                return id;
            },
            
            addDelegate: (parent, selector, eventType, handler, options) => {
                const id = this.delegate(parent, selector, eventType, handler, options);
                if (id) group.listeners.push(id);
                return id;
            },
            
            clear: () => {
                group.listeners.forEach(id => {
                    this.off(id) || this.undelegate(id);
                });
                group.listeners = [];
            }
        };
        
        return group;
    }
    
    /**
     * Émet un événement customisé sur un élément
     */
    emit(element, eventName, detail = null) {
        if (!element) return false;
        
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });
        
        return element.dispatchEvent(event);
    }
    
    /**
     * Throttle - limite la fréquence d'exécution d'un handler
     */
    throttle(handler, delay) {
        let lastExecution = 0;
        
        return function(...args) {
            const now = Date.now();
            if (now - lastExecution >= delay) {
                lastExecution = now;
                return handler.apply(this, args);
            }
        };
    }
    
    /**
     * Debounce - retarde l'exécution jusqu'à ce qu'il n'y ait plus d'appels
     */
    debounce(handler, delay) {
        let timeoutId;
        
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler.apply(this, args), delay);
        };
    }
    
    /**
     * Once - exécute le handler une seule fois puis se retire automatiquement
     */
    once(element, eventType, handler, options = {}) {
        const id = this.on(element, eventType, (event) => {
            handler(event);
            this.off(id);
        }, options);
        
        return id;
    }
    
    /**
     * Nettoie tous les event listeners
     */
    cleanup() {
        // Nettoyer les listeners normaux
        this.listeners.forEach((listener, id) => {
            listener.element.removeEventListener(
                listener.eventType,
                listener.handler,
                listener.options
            );
        });
        
        // Nettoyer les delegated listeners
        this.delegatedListeners.forEach((listener, id) => {
            listener.parent.removeEventListener(
                listener.eventType,
                listener.handler,
                listener.options
            );
        });
        
        this.listeners.clear();
        this.delegatedListeners.clear();
        
        console.log('🧹 EventManager nettoyé');
    }
    
    /**
     * Statistiques pour debug
     */
    getStats() {
        return {
            listeners: this.listeners.size,
            delegated: this.delegatedListeners.size,
            total: this.listeners.size + this.delegatedListeners.size
        };
    }
}