# Rampart - Spécification Technique Complète

## Vue d'ensemble

Rampart est un jeu d'arcade stratégique en temps réel combinant construction, défense et action. Le joueur doit construire et défendre des châteaux contre des vagues d'ennemis en alternant entre phases de placement de canons, combat et réparation.

**Inspiration** : Basé sur l'arcade classique Rampart (1990) avec une esthétique modernisée tout en conservant l'essence pixel-art et les mécaniques de gameplay originales.

## Architecture Générale

Toutes les solutions techniques sont indicatives. Elles viennent d'une version avortée du jeu. Cette version aura pour but d'avoir un code propre.

### Technologies et Dépendances

**Approche** : Vanilla JavaScript + micro-libs spécialisées

**Dépendances recommandées** :
- `pathfinding` (~5kb) : Pathfinding A* pour les IA ennemies (bateaux vers châteaux)
- `keyboardjs` (~3kb) : Gestion simplifiée des 3 contrôleurs simultanés (souris + 2 claviers)
- `sat` (~2kb) : Détection de collision optimisée (si performances insuffisantes)

**Installation** :
```bash
npm init -y
npm install pathfinding keyboardjs sat
```

**Éviter** :
- React/Vue (overkill + conflits Canvas)
- Phaser.js (trop orienté sprites)
- Three.js (3D inutile)

### Exemple de structure des fichiers correcte
```
/rampart/
├── package.json                # Dépendances npm
├── index.html
├── styles/main.css
├── js/
│   ├── main.js                 # Point d'entrée
│   ├── config/
│   │   └── GameConstants.js    # Toutes les constantes
│   ├── game/
│   │   ├── GameManager.js      # Orchestrateur principal
│   │   ├── GameState.js        # Machine à états
│   │   ├── Grid.js             # Système de grille + flood-fill
│   │   ├── Player.js           # Gestion des joueurs
│   │   ├── CombatSystem.js     # Système de combat
│   │   ├── WaveManager.js      # Gestion des vagues d'ennemis (utilise pathfinding)
│   │   ├── EnemyShip.js        # Bateaux ennemis (IA pathfinding)
│   │   └── TetrisPieces.js     # Pièces de réparation
│   └── ui/
│       ├── Renderer.js         # Rendu Canvas
│       ├── InputHandler.js     # Gestion inputs (utilise keyboardjs)
│       └── UIManager.js        # Interface utilisateur
├── node_modules/               # Librairies npm
└── README.md                   # Cette documentation
```

## Design Visuel et Modernisation

### Esthétique Originale (Référence Images)

**Éléments visuels clés du jeu original** :
- **Côte organique** : Courbes naturelles avec dégradé sable/eau et effet de vagues
- **Château central** : Structure en pierre grise avec zone constructible bleue délimitée
- **Canons 2×2** : Sprites détaillés avec orientation claire et indicateurs de santé
- **Interface minimaliste** : Barres d'instructions en bas avec icônes explicatives
- **Bateaux ennemis** : Sprites avec voiles, animations de navigation
- **Pièces Tetris** : Formes variées avec rotation (L, barre, carré, T)

### Modernisation Proposée

**Améliorations visuelles** :
- **Parallax scrolling** : Effet de profondeur sur l'eau avec plusieurs couches
- **Système de particules** :
  - Vagues animées sur la côte
  - Explosions lors des impacts de canons
  - Fumée des canons après tir
  - Débris lors de destructions
- **Animations fluides** :
  - Transitions smooth entre phases de jeu
  - Rotation progressive des canons
  - Mouvement organique des bateaux ennemis
- **Interface responsive** :
  - Adaptation automatique aux écrans modernes
  - Tooltips informatifs
  - Feedback visuel des actions

**Palette de couleurs étendue** :
- Conservation de l'esprit original avec plus de nuances
- Dégradés subtils pour plus de profondeur
- Contraste amélioré pour l'accessibilité

## Mécaniques de Jeu Fondamentales

### 1. Système de Grille (48x36)

**Grille principale** : 48 cases de large × 36 cases de haut, chaque case fait 32×32 pixels, en damier discret.

**Types de cellules** :
- `WATER` : Eau, non-traversable pour la construction, traversable pour la détection de fermeture
- `LAND` : Terre, constructible, traversable
- `WALL` : Mur, non-traversable, destructible
- `CASTLE_CORE` : Cœur du château, non-destructible, traversable pour la détection
- `CANNON` : Canon 2×2, destructible, traversable pour la détection
- `DESTROYED` : Cellule détruite, constructible, traversable

**CRUCIAL** : Pour la détection de fermeture, seuls les MURS bloquent le passage. Les canons et castle-cores sont des objets DANS la zone fermée, pas des murs.

**Confirmé par les screenshots** :
- **Zone bleue constructible** : Clairement délimitée par les murs dans `place_cannons.png`
- **Bateaux ennemis multiples** : 3-4 bateaux simultanés approchant par la mer
- **Interface instructive** : "PLACE CANNONS - POSITION INSIDE FORT WALLS" explicite
- **Pièces Tetris variées** : Formes L et barre visibles dans `repair.png`
- **Château avec core** : Structure centrale avec zone protégée visible

### 2. Algorithme de Détection des Zones Fermées

**Le plus important du projet** - Implémentation flood-fill avec détection de fermeture :

```javascript
// Méthode cruciale dans Grid.js
floodFillWithClosureCheck(startX, startY, visited) {
    const stack = [[startX, startY]];
    const area = [];
    let isClosed = true;
    
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        area.push({ x, y });

        // Vérifier les 8 directions (OBLIGATOIRE - Franck y tient !)
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            // Si on atteint le bord, la zone n'est PAS fermée
            if (!this.isValidPosition(nx, ny)) {
                isClosed = false;
                continue;
            }

            // Continuer le flood-fill si traversable
            if (!visited[ny][nx] && this.canPassThrough(neighborCell.type)) {
                visited[ny][nx] = true;
                stack.push([nx, ny]);
            }
        }
    }
    
    return { area, isClosed };
}

// Règles de traversabilité
canPassThrough(cellType) {
    return cellType === 'land' || 
           cellType === 'destroyed' ||
           cellType === 'cannon' ||
           cellType === 'castle-core';
    // Les MURS et l'EAU bloquent le passage
}
```

### 3. Machine à États des Phases

**États du jeu** :
- `MENU` : Menu principal
- `SELECT_TERRITORY` : Sélection territoire (multijoueur)
- `PLACE_CANNONS` : Placement des canons (durée variable)
- `COMBAT` : Phase de combat (15 secondes)
- `REPAIR` : Phase de réparation (15 secondes)
- `ROUND_END` : Fin de round
- `GAME_OVER` : Fin de partie

**Transitions automatiques** :
- `PLACE_CANNONS` → `COMBAT` : Quand tous les quotas de canons sont épuisés OU timer écoulé OU Entrée pressée
- `COMBAT` → `REPAIR` : Après 15 secondes (OU quand tous les ennemis sont détruits en solo)
- `REPAIR` → `PLACE_CANNONS` : Après 15 secondes OU si aucun canon actif → `GAME_OVER`

### 4. Système de Canons

**Placement** :
- Canons font 2×2 cases
- Doivent être placés dans des zones fermées (marquées `cannonZone = true`)
- Formule de quota : `Math.floor(40% × (cases_dorées_totales / 4))`
- Minimum 1 canon par phase si zones dorées disponibles

**Zones Constructibles** :
1. Après placement de murs/réparation, chercher les zones fermées
2. Pour chaque zone fermée trouvée, vérifier si elle contient un `castle-core`
3. Marquer toutes les cases `LAND` de la zone fermée avec `cannonZone = true` et `cannonZoneOwnerId = playerId`
4. Recalculer le quota de canons basé sur le nombre total de cases dorées

**Comptage par phase** :
- Au début de chaque phase `PLACE_CANNONS`, calculer le quota maximum
- Décrémenter le compteur à chaque placement
- Empêcher le placement quand quota atteint

### 5. Système de Combat

**Ennemis - Bateaux** :
- Apparaissent depuis les bords de la grille (zones d'eau)
- **Confirmé screenshots** : 3-4 bateaux simultanés avec sprites voiles détaillées
- Pathfinding vers les châteaux les plus proches
- Tirent des projectiles destructeurs
- **CRUCIAL** : Font débarquer des troupes au sol avant d'être détruits
- Détruits par les tirs de canons

**Ennemis - Troupes au Sol** :
- Débarquent des bateaux quand ils atteignent la côte
- Se déplacent vers les châteaux à pied
- Plus lentes que les bateaux mais plus résistantes
- Attaquent directement les murs et canons au corps à corps
- Bloquent le placement de pièces Tetris (collision physique)

**Canons du joueur** :
- Tir automatique sur les ennemis (bateaux ET troupes)
- Ou tir manuel sur clic/touche action
- Projectiles avec trajectoire balistique
- Peuvent être détruits par les tirs ennemis
- **IMPORTANT** : Aucune limite de portée - peuvent tirer sur toute la carte

**Système de dégâts** :
- Chaque cellule a des HP (canons = 3 HP, murs = 1 HP)
- Destruction cellule par cellule, PAS par pièce entière
- Cellules détruites deviennent `DESTROYED` (re-constructibles)
- Troupes au sol infligent des dégâts continus aux structures adjacentes

### 6. Système de Réparation (Pièces Tetris)

**Pièces spécialisées Rampart** :
- **Confirmé screenshots** : Formes L violettes, barres, carrés visibles dans `repair.png`
- Plus petites que Tetris classique (2×2, 3×2, L-shapes, etc.)
- Génération avec anti-répétition
- Rotation possible (touches R, E, ou clic droit)
- Placement uniquement sur `LAND` ou `DESTROYED`

**Mécaniques** :
- Chaque joueur reçoit une pièce au début de `REPAIR`
- Placement transforme les cases en `WALL`
- Validation avec `canPlacePiece()` - vérifier limites grille et collisions
- Après chaque placement, recalculer les zones fermées

### 7. Génération de Terrain

**Mode Solo** :
- Rivière verticale à 65% de la largeur
- Côte naturelle avec criques (algorithme sinusoïdal)
- Joueur à gauche, mer à droite
- Château initial 7×7 au centre-gauche

**Mode 2 Joueurs** :
- Rivière horizontale centrale
- Territoires haut/bas séparés
- Châteaux dans chaque territoire

**Mode 3 Joueurs** :
- Rivières diagonales formant 3 territoires triangulaires
- Algorithme de Bresenham pour traçage

**Château initial** :
- Core au centre du territoire du joueur
- Murs formant un carré 7×7 autour du core
- Génère automatiquement une zone fermée constructible

## Multijoueur Local

### Configuration des Joueurs

**Contrôles** :
- **Joueur 1** : Souris (déplacement automatique, clic gauche/droit)
- **Joueur 2** : Flèches directionnelles + Espace + Entrée
- **Joueur 3** : WASD + Q + E

**Territoires** :
- Chaque joueur a une zone définie (startX, startY, width, height)
- Mouvements de curseur limités au territoire du joueur
- Châteaux placés automatiquement dans chaque territoire

**Gestion simultanée** :
- Tous les joueurs peuvent agir simultanément en `PLACE_CANNONS` et `REPAIR`
- Distribution des inputs par type de contrôle
- Transition automatique quand TOUS les quotas sont épuisés

## Interface Utilisateur

### Système de Modales

**Modales Auto-Fermantes (Annonces de Phase)** :
- Apparaissent à chaque transition de phase
- **"PLACEMENT DES CANONS"** : Affichée 2 secondes au début de `PLACE_CANNONS`
- **"COMBAT !"** : Affichée 2 secondes au début de `COMBAT`
- **"RÉPARATIONS"** : Affichée 2 secondes au début de `REPAIR`
- Style : Fond semi-transparent noir, texte blanc centré, grande police
- Fermeture automatique après timeout, pas d'interaction possible
- Animation d'apparition/disparition (fade in/out)

**Modale de Pause** :
- Déclenchée par la touche `Échap`
- Fond semi-transparent sombre
- Boutons : "Reprendre", "Redémarrer", "Retour au Menu"
- Le jeu est complètement pausé (timers, animations, inputs)
- Fermeture par `Échap` ou clic sur "Reprendre"

**Modale de Game Over** :
- Déclenchée quand aucun canon actif après phase `REPAIR`
- Affichage des statistiques finales :
  - Score final
  - Round atteint
  - Bateaux détruits
  - Précision des tirs (%)
  - Temps de survie
- Boutons : "Rejouer", "Retour au Menu"
- Calcul du multiplicateur de précision pour le score final

**Modale de Fin de Round** :
- Affichée brièvement entre les rounds
- Statistiques du round écoulé
- Transition automatique vers le round suivant
- Prévisualisation des ennemis du prochain round

### Canvas et Rendu

**Configuration Canvas** :
- Taille responsive (adapter à l'écran)
- Rendu 2D avec `imageSmoothingEnabled = false` (pixel art)
- Système de coordonnées : CSS → Canvas → Grille

**Éléments rendus** :
- Grille avec couleurs par type de cellule
- Zones dorées constructibles (surbrillance jaune)
- Canons 2×2 avec indicateur de santé
- Curseurs spécialisés par joueur (P2 = cyan + croix jaune)
- Prévisualisations de placement (vert = possible, rouge = impossible)
- Ennemis avec animations de mouvement
- Projectiles avec trajectoires

### Interface Debug (Temporaire)

**Panneau temps réel** :
- État actuel du jeu
- Temps restant par phase
- Nombre de canons par joueur
- Cases dorées par joueur
- Quotas de placement
- Statistiques de combat

## Gestion des Événements

### Distribution des Inputs

**Inputs Clavier** :
```javascript
distributeKeyboardInput(keyCode) {
    // 1. Vérifier touches globales (Échap = pause, Entrée = forcer combat)
    // 2. Trouver joueurs propriétaires de cette touche
    // 3. Router vers handlePlayerKeyboardInput() pour chaque joueur
}
```

**Inputs Souris** :
```javascript
handleMouseClick(canvasX, canvasY, button) {
    // 1. Convertir Canvas → Grille avec coordinateService
    // 2. Router selon l'état actuel (PLACE_CANNONS, COMBAT, REPAIR)
    // 3. Appeler la méthode appropriée (placeCannon, fire, placePiece)
}
```

### Conversion de Coordonnées

**Service crucial** :
```javascript
// Canvas → Grille
canvasToGrid(canvasX, canvasY, offsetX, offsetY, cellSize, gridWidth, gridHeight) {
    const gridX = Math.floor((canvasX - offsetX) / cellSize);
    const gridY = Math.floor((canvasY - offsetY) / cellSize);
    // Validation des limites
    return { x: clampedX, y: clampedY };
}

// Grille → Canvas (pour le rendu)
gridToCanvas(gridX, gridY, offsetX, offsetY, cellSize) {
    return {
        x: gridX * cellSize + offsetX,
        y: gridY * cellSize + offsetY
    };
}
```

## Configuration et Constantes

### GameConstants.js - Fichier Central

```javascript
export const GAME_CONFIG = {
    GRID_WIDTH: 48,
    GRID_HEIGHT: 36,
    CELL_SIZE: 32,
    
    GAMEPLAY: {
        CANNON_RATIO: 0.4,          // 40% des cases dorées
        MIN_CANNONS: 1,             // Minimum par phase
        // Pas de limite de portée - canons tirent sur toute la carte
    },
    
    TIMERS: {
        COMBAT_PHASE: 15000,        // 15 secondes
        REPAIR_PHASE: 15000,        // 15 secondes
        PLACE_CANNONS: null,        // Pas de limite fixe
        PHASE_MODAL: 2000,          // 2 secondes pour les annonces
    },
    
    ENEMIES: {
        SHIP_SPEED: 1.0,            // Cases par seconde
        LAND_UNIT_SPEED: 0.5,       // Plus lent
        SHIP_HP: 1,                 // Détruits en 1 tir
        LAND_UNIT_HP: 2,            // Plus résistants
        DISEMBARK_DISTANCE: 3,      // Distance côte pour débarquer
    },
    
    COLORS: {
        // Couleurs de base (inspirées du jeu original)
        WATER: '#1e40af',           // Bleu océan profond
        WATER_LIGHT: '#3b82f6',     // Vagues plus claires
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
    }
};
```

## Points Techniques Critiques

### 1. Flood-Fill Performance
- Utiliser un `Set` pour visited au lieu d'array 2D si performance requise
- Limiter la taille max des zones (1000 cases) pour éviter freeze
- Stack au lieu de récursion pour éviter stack overflow

### 2. Gestion Mémoire Canvas
- Utiliser `requestAnimationFrame` pour la game loop
- Implémenter dirty regions si performances insuffisantes
- Clear canvas avec `clearRect()` chaque frame

### 3. Détection de Collisions
- Système de bounding boxes pour projectiles
- Quadtree si trop d'entités (>100 projectiles simultanés)
- Optimization : checker collision seulement quand entités bougent

### 4. Synchronisation Multijoueur
- Pas de vrai multijoueur réseau - tout en local
- État partagé via GameManager central
- Validation des actions côté serveur (GameManager)

### 5. Sauvegarde et Persistance
```javascript
// Sérialisation état complet
saveGameState() {
    return {
        grid: this.grid.serialize(),
        players: this.players.map(p => p.serialize()),
        currentRound: this.currentRound,
        gameMode: this.gameMode,
        timestamp: Date.now()
    };
}
```

## Architecture Recommandée (Clean Code)

### Principes Fondamentaux

**KISS (Keep It Simple, Stupid)** :
- Une classe = une responsabilité claire
- Méthodes courtes et focalisées (max 20-30 lignes)
- Éviter la sur-ingénierie et les abstractions prématurées
- Code lisible par un développeur junior

**DRY (Don't Repeat Yourself)** :
- Constantes centralisées dans `GameConstants.js`
- Utilitaires partagés dans `UTILS`
- Méthodes communes réutilisables
- Éviter la duplication de logique métier

**SOLID** :
- **S** - Single Responsibility : Grid gère la grille, Renderer affiche, etc.
- **O** - Open/Closed : Extensions via modules, pas modifications core
- **L** - Liskov Substitution : Interfaces cohérentes entre modules
- **I** - Interface Segregation : APIs minimales et ciblées
- **D** - Dependency Inversion : GameManager orchestre sans couplage fort

### Principe de Responsabilité Unique

**GameManager** : Orchestration uniquement
- Initialisation des systèmes
- Coordination entre modules
- Game loop principal
- Transitions d'état
- **PAS** de logique métier spécialisée

**Grid** : Données et logique de grille
- Structure de données des cellules
- Algorithmes flood-fill
- Validation de placement
- Sérialisation
- **PAS** de rendu ou d'interface

**Player** : État et actions des joueurs
- Propriétés (score, vies, canons, territoire)
- Validation des actions
- Gestion des contrôles
- **PAS** de logique de jeu globale

**Renderer** : Affichage uniquement
- Rendu optimisé Canvas
- Gestion des animations
- Responsive design
- **AUCUNE** logique métier

### Pattern d'Événements

```javascript
// GameState émet des événements
gameState.onStateChange((newState, oldState) => {
    // Cleanup oldState
    // Initialize newState
});

// WaveManager notifie la fin
waveManager.onWaveEnd = (stats) => {
    // Transition COMBAT → REPAIR
};

// InputHandler route les événements
inputHandler.onCannonPlace = (x, y, playerId) => {
    // Déléguer à GameManager
};
```

## Ordre d'Implémentation Recommandé

### Phase 1 : Base Solide
1. **Grid.js** - Système de grille + flood-fill
2. **GameState.js** - Machine à états simple
3. **Renderer.js** - Affichage de base de la grille
4. **InputHandler.js** - Détection clics/touches
5. **GameManager.js** - Orchestrateur minimal

### Phase 2 : Gameplay Core  
6. **Player.js** - Gestion des joueurs
7. **Système de placement des canons** complet
8. **Zones fermées et constructibles** fonctionnelles
9. **TetrisPieces.js** - Système de réparation
10. **Transitions automatiques** entre phases

### Phase 3 : Combat
11. **CombatSystem.js** - Tir et projectiles
12. **EnemyShip.js** - Ennemis basiques
13. **WaveManager.js** - Gestion des vagues
14. **Système de dégâts** et destruction

### Phase 4 : Polish
15. **Multijoueur local** complet
16. **Interface utilisateur** soignée
17. **Animations et effets visuels**
18. **Optimisations performance**

## Règles d'Or

1. **Flood-fill 8-directions** : Non négociable selon Franck
2. **Eau ne bloque PAS** : Important pour la logique de fermeture
3. **Destruction cellule par cellule** : Pas par pièce entière
4. **Canons 2×2** : Toujours vérifier les 4 cases
5. **Zones dorées recalculées** : Après chaque placement/réparation
6. **Quotas par phase** : Calculer une fois, décrémenter à chaque placement
7. **État centralisé** : GameManager coordination, modules spécialisés
8. **Performance avant features** : Base solide avant ajouts
9. **Modales auto-fermantes** : Annonce claire de chaque phase
10. **Troupes au sol bloquantes** : Collision physique pour placement Tetris
11. **Combat à 15 secondes** : Durée fixe, pas négociable

## Pièges à Éviter

- **Over-engineering** : Garder simple au début
- **Couplage fort** : Modules indépendants avec interfaces claires  
- **Gestion d'état complexe** : État minimal, calculs dérivés
- **Optimisations prématurées** : Profiler avant optimiser
- **Refactoring mid-development** : Finir les features avant restructurer
- **Debug permanent** : Logs temporaires, les retirer ensuite

---

**Ce document contient TOUT ce qui est nécessaire pour refaire le projet Rampart de A à Z avec une base technique solide. Chaque algorithme important est décrit, chaque piège identifié, chaque détail technique documenté.**