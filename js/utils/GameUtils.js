// ===================================================
// RAMPART - UTILITAIRES CENTRALISÉS
// ===================================================
// Toutes les fonctions utilitaires partagées du jeu

/**
 * Calcule la distance euclidienne entre deux points
 */
export function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}


/**
 * Clamp une valeur entre min et max
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Interpolation linéaire
 */
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Mélange un tableau (Fisher-Yates shuffle)
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Génère un nombre aléatoire entre min et max (inclus)
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Génère un nombre aléatoire flottant entre min et max
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Vérifie si un point est dans un rectangle
 */
export function isPointInRect(x, y, rectX, rectY, rectWidth, rectHeight) {
    return x >= rectX && x <= rectX + rectWidth && 
           y >= rectY && y <= rectY + rectHeight;
}

/**
 * Vérifie si deux rectangles se chevauchent
 */
export function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Convertit un angle en radians
 */
export function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Convertit un angle en degrés
 */
export function toDegrees(radians) {
    return radians * (180 / Math.PI);
}


/**
 * Ajuste la luminosité d'une couleur hexadécimale
 */
export function adjustBrightness(color, amount) {
    if (!color.startsWith('#')) return color;
    
    const hex = color.slice(1);
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Convertit une couleur hex en rgba avec alpha
 */
export function hexToRgba(color, alpha = 1) {
    if (!color.startsWith('#')) return color;
    
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Convertit une couleur hex en objet RGB
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Convertit des valeurs RGB en couleur hex
 */
export function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Formatage du temps en mm:ss
 */
export function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formatage des nombres avec séparateurs de milliers
 */
export function formatNumber(number) {
    return number.toLocaleString();
}

/**
 * Debounce d'une fonction
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle d'une fonction
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Classe pour mesurer les performances
 */
export class PerformanceTimer {
    constructor() {
        this.timers = new Map();
    }
    
    start(name) {
        this.timers.set(name, performance.now());
    }
    
    end(name) {
        const startTime = this.timers.get(name);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.timers.delete(name);
            return duration;
        }
        return 0;
    }
    
    measure(name, fn) {
        this.start(name);
        const result = fn();
        const duration = this.end(name);
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
        return result;
    }
}

/**
 * Logger centralisé avec niveaux
 */
export class Logger {
    static LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };
    
    static currentLevel = Logger.LEVELS.INFO;
    
    static setLevel(level) {
        this.currentLevel = level;
    }
    
    static error(emoji, message, ...args) {
        if (this.currentLevel >= this.LEVELS.ERROR) {
            console.error(`${emoji} [ERROR] ${message}`, ...args);
        }
    }
    
    static warn(emoji, message, ...args) {
        if (this.currentLevel >= this.LEVELS.WARN) {
            console.warn(`${emoji} [WARN] ${message}`, ...args);
        }
    }
    
    static info(emoji, message, ...args) {
        if (this.currentLevel >= this.LEVELS.INFO) {
            console.log(`${emoji} ${message}`, ...args);
        }
    }
    
    static debug(emoji, message, ...args) {
        if (this.currentLevel >= this.LEVELS.DEBUG) {
            console.debug(`${emoji} [DEBUG] ${message}`, ...args);
        }
    }
}

/**
 * Gestionnaire d'événements simple
 */
export class EventEmitter {
    constructor() {
        this.events = new Map();
    }
    
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this.events.has(event)) return;
        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }
    
    emit(event, ...args) {
        if (!this.events.has(event)) return;
        const callbacks = this.events.get(event);
        callbacks.forEach(callback => callback(...args));
    }
    
    clear() {
        this.events.clear();
    }
}

/**
 * Pool d'objets réutilisables pour optimiser la mémoire
 */
export class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.used = new Set();
        
        // Pré-remplir le pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    get() {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            obj = this.createFn();
        }
        this.used.add(obj);
        return obj;
    }
    
    release(obj) {
        if (this.used.has(obj)) {
            this.used.delete(obj);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
    
    releaseAll() {
        this.used.forEach(obj => {
            this.resetFn(obj);
            this.pool.push(obj);
        });
        this.used.clear();
    }
    
    getStats() {
        return {
            poolSize: this.pool.length,
            usedCount: this.used.size,
            totalCreated: this.pool.length + this.used.size
        };
    }
}