// ===================================================
// RAMPART - CONSTANTES CENTRALISÉES
// ===================================================
// Toutes les constantes du jeu regroupées en un lieu
// pour faciliter la maintenance et éviter les valeurs magiques

export const GAME_CONFIG = {
    // ===============================
    // DIMENSIONS DU JEU
    // ===============================
    GRID_WIDTH: 48,
    GRID_HEIGHT: 36,
    CELL_SIZE: 32,
    
    // ===============================
    // RENDU VISUEL
    // ===============================
    GRID_LINES: true,
    SHOW_COORDINATES: false,
    DEBUG_MODE: false,
    
    // ===============================
    // COULEURS CENTRALISÉES
    // ===============================
    COLORS: {
        // Terrain
        GRID_LINES: '#2c3e50',
        WATER: '#004e89',
        LAND: '#27ae60',
        WALL: '#7f8c8d',
        CASTLE_CORE: '#8b4513',
        DESTROYED: '#34495e',
        CANNON: '#ff6b35',
        CANNON_ZONE: 'rgba(255, 215, 0, 0.3)',
        
        // Interface
        DEBUG_TEXT: '#ecf0f1',
        BACKGROUND: '#1a252f',
        PRIMARY: '#004e89',
        SUCCESS: '#2ecc71',
        WARNING: '#f7931e',
        DANGER: '#e74c3c',
        PHASE_BG: 'rgba(0, 78, 137, 0.9)',
        
        // Bateaux ennemis
        SHIP_BASIC: '#8B4513',
        SHIP_FAST: '#ff4444',
        SHIP_HEAVY: '#444444',
        SHIP_ARTILLERY: '#ff8800',
        
        // Unités terrestres
        INFANTRY: '#8B4513',
        TANK: '#2d4a22',
        
        // Projectiles
        PLAYER_PROJECTILE: '#ff6b35',
        ENEMY_PROJECTILE: '#ff4444'
    },
    
    // ===============================
    // TEMPORISATION DES PHASES
    // ===============================
    PHASE_DURATIONS: {
        PLACE_CANNONS: 30000, // 30 secondes
        COMBAT: 5000,         // 5 secondes
        REPAIR: 15000         // 15 secondes
    },
    
    // ===============================
    // TIMERS (compatibilité)
    // ===============================
    TIMERS: {
        REPAIR_PHASE: 15000   // 15 secondes
    },
    
    // ===============================
    // GAMEPLAY
    // ===============================
    GAMEPLAY: {
        CANNON_RATIO: 0.4,    // Ratio pour le calcul des canons
        MIN_CANNONS: 1        // Minimum de canons autorisés
    },
    
    // ===============================
    // SYSTÈME DE CANONS
    // ===============================
    CANNON: {
        SIZE: 2,              // Taille 2x2
        HEALTH: 3,            // Points de vie
        PLACEMENT_RATIO: 0.4, // 40% des zones dorées
        MIN_COUNT: 1,
        MAX_COUNT: 10,
        COOLDOWN: 2000,       // 2 secondes entre tirs
        RANGE: 8,             // Portée de tir
        FIRE_RATE: 1000       // Cadence de tir (1 coup/seconde)
    },
    
    // ===============================
    // TAILLES ET DIMENSIONS
    // ===============================
    SIZES: {
        CASTLE_SIZE: 7,       // Taille des châteaux (7x7)
        SAFETY_RADIUS: 3,     // Rayon de sécurité autour des châteaux
        MIN_DISTANCE_BETWEEN_CASTLES: 10, // Distance minimale entre châteaux
        PIECE_MAX_SIZE: 4     // Taille maximale des pièces Tetris
    },
    
    // ===============================
    // PIÈCES TETRIS
    // ===============================
    TETRIS: {
        PREVIEW_ALPHA: 0.7,
        SNAP_TO_GRID: true,
        SHOW_ROTATION_HINT: true,
        MIN_PIECES: 5,
        MAX_PIECES: 15
    },
    
    // ===============================
    // SYSTÈME DE COMBAT
    // ===============================
    COMBAT: {
        EXPLOSION_RADIUS: 0.1,
        WALL_DESTRUCTION: true,
        FRIENDLY_FIRE: true,
        MAX_PROJECTILES: 50,
        PROJECTILE_SPEED: 15,
        ENEMY_PROJECTILE_SPEED: 8,
        PROJECTILE_LIFETIME: 5000, // 5 secondes
        DAMAGE_REDUCTION_DISTANCE: 0.5
    },
    
    // ===============================
    // CONFIGURATION DES BATEAUX
    // ===============================
    SHIPS: {
        BASIC: {
            HEALTH: 5,
            SPEED: 0.72,
            DAMAGE: 1,
            FIRE_RATE: 7000,
            SIZE: 4,
            EXPERIENCE: 'FAIBLE',
            TROOP_COUNT: [2, 3], // Min, Max
            TANK_CHANCE: 0.1
        },
        FAST: {
            HEALTH: 5,
            SPEED: 1.44,
            DAMAGE: 1,
            FIRE_RATE: 6000,
            SIZE: 4,
            EXPERIENCE: 'FAIBLE',
            TROOP_COUNT: [1, 2],
            TANK_CHANCE: 0.05
        },
        HEAVY: {
            HEALTH: 10,
            SPEED: 0.36,
            DAMAGE: 2,
            FIRE_RATE: 8000,
            SIZE: 4,
            EXPERIENCE: 'MEDIUM',
            TROOP_COUNT: [3, 5],
            TANK_CHANCE: 0.25
        },
        ARTILLERY: {
            HEALTH: 15,
            SPEED: 0.54,
            DAMAGE: 3,
            FIRE_RATE: 7500,
            SIZE: 4,
            EXPERIENCE: 'ELEVÉ',
            TROOP_COUNT: [2, 3],
            TANK_CHANCE: 0.4
        }
    },
    
    // ===============================
    // EXPÉRIENCE DES NAVIRES
    // ===============================
    EXPERIENCE_LEVELS: {
        FAIBLE: {
            BASE_ACCURACY: 1.0,
            MAX_ACCURACY: 1.0,
            MAX_SHOTS: 5
        },
        MEDIUM: {
            BASE_ACCURACY: 0.10,
            MAX_ACCURACY: 1.0,
            MAX_SHOTS: 5
        },
        ELEVÉ: {
            BASE_ACCURACY: 0.20,
            MAX_ACCURACY: 1.0,
            MAX_SHOTS: 3
        }
    },
    
    // ===============================
    // CONFIGURATION DES VAGUES
    // ===============================
    WAVES: {
        DURATION: 30000,        // 30 secondes
        SPAWN_INTERVAL: 2000,   // 2 secondes entre spawns
        MAX_ENEMIES: 8,
        DIFFICULTY_SCALING: 1.2,
        SHORE_DISTANCE_THRESHOLD: 1.5,
        SEARCH_RADIUS: 50,
        TARGET_SEARCH_INTERVAL: 2000,
        LANDING_COOLDOWN: 5000
    },
    
    // ===============================
    // UNITÉS TERRESTRES
    // ===============================
    LAND_UNITS: {
        INFANTRY: {
            HEALTH: 2,
            MAX_HEALTH: 2,
            SPEED: 1.2,
            SIZE: 0.5,
            DAMAGE: 1,
            SEARCH_RADIUS: 20,
            TARGET_SEARCH_INTERVAL: 3000
        },
        TANK: {
            HEALTH: 5,
            MAX_HEALTH: 5,
            SPEED: 0.8,
            SIZE: 0.8,
            DAMAGE: 2,
            SEARCH_RADIUS: 20,
            TARGET_SEARCH_INTERVAL: 3000
        }
    },
    
    // ===============================
    // PATHFINDING
    // ===============================
    PATHFINDING: {
        MAX_STEPS: 500,
        MAX_STEPS_LAND: 100,
        AVOIDANCE_RADIUS_MULTIPLIER: 1.5,
        AVOIDANCE_STRENGTH: 0.3,
        AVOIDANCE_STRENGTH_LAND: 0.2,
        PATH_TOLERANCE: 1.5
    },
    
    // ===============================
    // CONFIGURATION UI
    // ===============================
    UI: {
        NOTIFICATION_DURATION: 3000,
        PHASE_TIMER_BAR_HEIGHT: 6,
        HEALTH_BAR_HEIGHT: 4,
        DEBUG_PANEL_WIDTH: 300,
        ANIMATION_DURATION: 300,
        PULSE_ANIMATION: 'pulse 1s infinite'
    },
    
    // ===============================
    // SCORING ET RÉCOMPENSES
    // ===============================
    SCORING: {
        SHIP_POINTS: {
            small: 100,
            medium: 300,
            large: 500
        },
        SURVIVING_CANNON_BONUS: 50,
        CLOSED_CASTLE_BONUS: 200,
        WAVE_BASE_SCORE: 100,
        PERFECT_WAVE_MULTIPLIER: 1.5,
        NO_SURVIVORS_MULTIPLIER: 1.2,
        SPEED_BONUS_MULTIPLIER: 1.3,
        SPEED_BONUS_THRESHOLD: 0.5 // 50% du temps de vague
    },
    
    // ===============================
    // SAUVEGARDE ET ÉTAT DU JEU
    // ===============================
    GAME_STATE: {
        DEFAULT_PLAYERS: 1,
        DEFAULT_DIFFICULTY: 1,
        DEFAULT_LIVES: 3,
        SAVE_KEY: 'rampart_save_game',
        CONTROLS_SAVE_KEY: 'rampart_controls'
    },
    
    // ===============================
    // DEBUG ET DÉVELOPPEMENT
    // ===============================
    DEBUG: {
        SHOW_GRID_INFO: true,
        SHOW_PERFORMANCE: false,
        LOG_EVENTS: true,
        SHOW_PATHS: false,
        SHOW_TARGETING: false,
        SHOW_COLLISION_BOXES: false
    }
};

// ===============================
// PATTERNS DE VAGUES
// ===============================
export const WAVE_PATTERNS = {
    // NIVEAU 1: Seulement des FAIBLES (5 HP)
    1: { basic: 3, fast: 0, heavy: 0, artillery: 0 },
    2: { basic: 3, fast: 1, heavy: 0, artillery: 0 },
    3: { basic: 2, fast: 2, heavy: 0, artillery: 0 },
    4: { basic: 4, fast: 2, heavy: 0, artillery: 0 },
    
    // NIVEAU 2: Ajout des MOYENS (10 HP)
    5: { basic: 3, fast: 1, heavy: 1, artillery: 0 },
    6: { basic: 3, fast: 2, heavy: 1, artillery: 0 },
    7: { basic: 2, fast: 2, heavy: 2, artillery: 0 },
    8: { basic: 4, fast: 1, heavy: 2, artillery: 0 },
    
    // NIVEAU 3: Ajout des FORTS (15 HP)
    9: { basic: 2, fast: 1, heavy: 2, artillery: 1 },
    10: { basic: 3, fast: 2, heavy: 2, artillery: 1 },
    11: { basic: 2, fast: 1, heavy: 3, artillery: 1 },
    12: { basic: 4, fast: 2, heavy: 2, artillery: 2 },
    
    // Vagues suivantes: tous types mélangés
    default: { basic: 5, fast: 3, heavy: 3, artillery: 2 }
};