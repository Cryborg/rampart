export const GAME_CONFIG = {
    GRID_WIDTH: 48,
    GRID_HEIGHT: 36,
    CELL_SIZE: 32,
    
    GAMEPLAY: {
        CANNON_RATIO: 0.5,          // 50% des canons possibles (augmenté pour multijoueur)
        MIN_CANNONS: 3,             // Minimum 3 canons par phase (augmenté)
        CANNON_SIZE: 2,             // Canons font 2×2 cases
        CANNON_HP: 30,              // 30 points de vie par canon
        CASTLE_SIZE: 7,             // Château initial 7×7
        MAX_FLOOD_FILL: 1000,       // Limite sécurité flood-fill
    },
    
    TIMERS: {
        COMBAT_PHASE: 45000,        // 45 secondes (augmenté pour PvP)
        REPAIR_PHASE: 20000,        // 20 secondes (augmenté)
        PLACE_CANNONS: null,        // Pas de limite fixe
        PHASE_MODAL: 2000,          // 2 secondes pour les annonces
        FRAME_RATE: 60,             // FPS cible
    },
    
    ENEMIES: {
        SHIP_SPEED: 1.3,            // Cases par seconde (+30%)
        LAND_UNIT_SPEED: 0.5,       // Plus lent
        SHIP_HP: 1,                 // Détruits en 1 tir
        LAND_UNIT_HP: 2,            // Plus résistants
        DISEMBARK_DISTANCE: 3,      // Distance côte pour débarquer
        SPAWN_RATE: 2000,           // Millisecondes entre spawns
        
        // Combat terrestre
        TANK_RANGE: 8,              // Portée limitée pour les tanks
        TANK_ATTACK_COOLDOWN: 12000, // 12 secondes
        TANK_DAMAGE: 5,             // 5 dégâts par tir
        INFANTRY_ATTACK_COOLDOWN: 4000, // 4 secondes
        INFANTRY_DAMAGE: 1,         // 1 dégât par attaque
        INFANTRY_RANGE: 1.5,        // Corps à corps
        
        // Types de troupes terrestres
        LAND_UNIT_TYPES: {
            INFANTRY: {
                name: 'Infantry',
                hp: 2,
                speed: 0.4,             // Lente
                color: '#a16207',       // Brun
                symbol: '👤',
                range: 1.5,             // Corps à corps
                attackCooldown: 4000,   // 4 secondes entre attaques
                damage: 1               // 1 dégât par attaque
            },
            TANK: {
                name: 'Tank', 
                hp: 5,
                speed: 0.3,             // Très lente mais résistante
                color: '#374151',       // Gris foncé
                symbol: '🟫',
                range: 8,               // Portée de tir
                attackCooldown: 12000,  // 12 secondes entre attaques
                damage: 5               // 5 dégâts par tir
            }
        },
        
        // Types de navires avec leur système de précision
        SHIP_TYPES: {
            NOVICE: {
                name: 'Novice',
                hp: 3,                  // 3 points de vie
                speed: 1.3,             // 130% vitesse de base (+30%)
                baseAccuracy: 10,       // 10% de base
                accuracyIncrement: 10,  // +10% par tir
                maxAccuracy: 60,        // Max 60%
                cooldown: 8000,         // 8 secondes
                color: '#8b5cf6',       // Violet clair
                landingForce: [         // Débarque 1 infanterie
                    { type: 'INFANTRY', count: 1 }
                ]
            },
            VETERAN: {
                name: 'Veteran',
                hp: 6,                  // 6 points de vie
                speed: 0.975,           // 97.5% vitesse de base (+30% de 75%)
                baseAccuracy: 20,       // 20% de base
                accuracyIncrement: 20,  // +20% par tir  
                maxAccuracy: 80,        // Max 80%
                cooldown: 7000,         // 7 secondes
                color: '#f59e0b',       // Orange
                landingForce: [         // Débarque 3 infanteries
                    { type: 'INFANTRY', count: 3 }
                ]
            },
            EXPERT: {
                name: 'Expert',
                hp: 10,                 // 10 points de vie
                speed: 0.65,            // 65% vitesse de base (+30% de 50%)
                baseAccuracy: 40,       // 40% de base
                accuracyIncrement: 20,  // +20% par tir
                maxAccuracy: 100,       // Max 100%
                cooldown: 6000,         // 6 secondes
                color: '#dc2626',       // Rouge
                landingForce: [         // Débarque 1 infanterie + 1 tank
                    { type: 'INFANTRY', count: 1 },
                    { type: 'TANK', count: 1 }
                ]
            }
        }
    },
    
    COLORS: {
        // Couleurs de base (inspirées du jeu original)
        WATER: '#3b82f6',           // Bleu océan
        WATER_LIGHT: '#60a5fa',     // Vagues plus claires
        WATER_FOAM: '#e0f2fe',      // Écume des vagues
        LAND: '#22c55e',            // Vert prairie
        LAND_DARK: '#16a34a',       // Ombre des reliefs
        SAND: '#fbbf24',            // Sable côtier
        WALL: '#6b7280',            // Pierre des murs
        CASTLE_CORE: '#dc2626',     // Rouge château
        CANNON: '#7c2d12',          // Brun canons
        DESTROYED: '#374151',       // Gris débris
        
        // Zones spéciales
        CANNON_ZONE: '#3b82f6',     // Bleu zone constructible (comme original)
        CANNON_ZONE_HIGHLIGHT: '#60a5fa', // Surbrillance survol
        
        // Interface et effets
        UI_BACKGROUND: '#1f2937',   // Fond interface
        UI_TEXT: '#f9fafb',        // Texte interface
        EXPLOSION: '#f59e0b',       // Explosions
        PROJECTILE: '#fbbf24',      // Projectiles
        
        // Modernisation - Dégradés
        WATER_GRADIENT: ['#1e40af', '#3b82f6', '#60a5fa'],
        LAND_GRADIENT: ['#15803d', '#22c55e', '#4ade80'],
    },
    
    CELL_TYPES: {
        WATER: 'water',
        LAND: 'land',
        WALL: 'wall',
        CASTLE_CORE: 'castle_core',
        CANNON: 'cannon',
        DESTROYED: 'destroyed',
    },
    
    GAME_STATES: {
        MENU: 'menu',
        SELECT_TERRITORY: 'select_territory',
        PLACE_CANNONS: 'place_cannons',
        COMBAT: 'combat',
        REPAIR: 'repair',
        ROUND_END: 'round_end',
        GAME_OVER: 'game_over',
    },
    
    CONTROLS: {
        // Joueur 1 - Souris
        PLAYER1: {
            TYPE: 'mouse',
            ACTIONS: {
                PRIMARY: 'click_left',
                SECONDARY: 'click_right',
                ROTATE: 'wheel',
            }
        },
        // Joueur 2 - Flèches
        PLAYER2: {
            TYPE: 'keyboard',
            ACTIONS: {
                UP: 'ArrowUp',
                DOWN: 'ArrowDown',
                LEFT: 'ArrowLeft',
                RIGHT: 'ArrowRight',
                PRIMARY: 'Space',
                SECONDARY: 'Enter',
                ROTATE: 'ShiftRight',
            }
        },
        // Joueur 3 - WASD
        PLAYER3: {
            TYPE: 'keyboard',
            ACTIONS: {
                UP: 'KeyW',
                DOWN: 'KeyS',
                LEFT: 'KeyA',
                RIGHT: 'KeyD',
                PRIMARY: 'KeyQ',
                SECONDARY: 'KeyE',
                ROTATE: 'KeyR',
            }
        },
        // Touches globales
        GLOBAL: {
            PAUSE: 'Escape',
            FORCE_COMBAT: 'Enter',
            DEBUG: 'F12',
        }
    },
    
    TERRAIN_GENERATION: {
        COASTLINE_SMOOTHNESS: 0.1,  // Facteur lissage côte
        RIVER_WIDTH: 8,             // Largeur rivières
        COAST_VARIANCE: 4,          // Variation côte
        ISLAND_CHANCE: 0.1,         // Probabilité îlots
    },
    
    TETRIS_PIECES: {
        // Pièces spécialisées Rampart (plus petites)
        TYPES: [
            {
                name: 'LINE2',
                pattern: [[1, 1]],
                color: '#8b5cf6'
            },
            {
                name: 'LINE3',
                pattern: [[1, 1, 1]],
                color: '#8b5cf6'
            },
            {
                name: 'SQUARE',
                pattern: [
                    [1, 1],
                    [1, 1]
                ],
                color: '#8b5cf6'
            },
            {
                name: 'L_SHAPE',
                pattern: [
                    [1, 0],
                    [1, 0],
                    [1, 1]
                ],
                color: '#8b5cf6'
            },
            {
                name: 'T_SHAPE',
                pattern: [
                    [1, 1, 1],
                    [0, 1, 0]
                ],
                color: '#8b5cf6'
            }
        ]
    }
};

// Utilitaires de conversion
export const UTILS = {
    // Conversion Canvas → Grille
    canvasToGrid(canvasX, canvasY, offsetX, offsetY) {
        const gridX = Math.floor((canvasX - offsetX) / GAME_CONFIG.CELL_SIZE);
        const gridY = Math.floor((canvasY - offsetY) / GAME_CONFIG.CELL_SIZE);
        return {
            x: Math.max(0, Math.min(gridX, GAME_CONFIG.GRID_WIDTH - 1)),
            y: Math.max(0, Math.min(gridY, GAME_CONFIG.GRID_HEIGHT - 1))
        };
    },
    
    // Conversion Grille → Canvas
    gridToCanvas(gridX, gridY, offsetX = 0, offsetY = 0) {
        return {
            x: gridX * GAME_CONFIG.CELL_SIZE + offsetX,
            y: gridY * GAME_CONFIG.CELL_SIZE + offsetY
        };
    },
    
    // Vérification limites grille
    isValidPosition(x, y) {
        return x >= 0 && x < GAME_CONFIG.GRID_WIDTH && 
               y >= 0 && y < GAME_CONFIG.GRID_HEIGHT;
    },
    
    // Calcul distance Manhattan
    manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    },
    
    // Calcul distance Euclidienne
    euclideanDistance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    }
};