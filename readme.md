# 🏰 RAMPART - Cahier des charges complet

## 📖 Introduction

### Concept du jeu original
Rampart est un jeu d'arcade emblématique d'Atari (1990) qui combine de manière unique trois genres :
- **Stratégie** : Placement optimal des canons et gestion du territoire
- **Construction** : Réparation des fortifications avec des pièces type Tetris
- **Action** : Combat en temps réel contre les forces ennemies

### Vision pour notre version web
Recréer l'expérience authentique de Rampart avec :
- Gameplay fidèle au jeu original
- Contrôles adaptés au web (souris/clavier)
- Interface moderne mais respectueuse de l'esthétique arcade
- Possibilité d'extension multijoueur

---

## 🛠️ Spécifications techniques détaillées
📏 Grille / Plateau de jeu
Type : Grille en 2D, coordonnées (x, y)

Taille par défaut : 24 x 24 tuiles (modifiable)

Types de tuiles :

land : terrain (constructible)

water : mer (bateaux circulent)

castle-core : centre d’un château (point vital)

wall : mur d’un château (fermeture)

cannon : canon (placé dans château fermé)

destroyed : case détruite (mur ou bâtiment cassé)

Taille visuelle des tuiles : 32x32px (modifiable facilement via CSS/Canvas)

🏰 Château
Définition d’un château :

Structure fermée (aucune ouverture)

Entoure au moins un castle-core

Les murs doivent former une enveloppe sans trou (détection via flood fill ou algo de surface fermée)

Construction initiale :

Le joueur commence avec un château existant (pré-construit)

Composé d’un castle-core + murs (wall) + 2 à 3 emplacements de canons possibles

🔫 Canons
Taille : 2x2 tuiles

Conditions de placement :

Uniquement à l’intérieur d’un château fermé

Doit être entièrement posé sur des cases land vides (non mur, non autre canon)

Nombre limité par château (en fonction de la surface fermée)

Cible :

En mode solo : bateaux ennemis

En multi : murs ennemis

Tir :

Cadence : 1 tir par seconde (modifiable)

Portée : 6 à 10 tuiles (arc de cercle 180° ou complet selon config)

Dégâts : 1 explosion détruit une case wall, cannon ou castle-core

🧱 Blocs de réparation (Tetris-like)
Objectif : reformer un château fermé

Formes disponibles (aléatoires) :

Chaque bloc contient 3 à 5 tuiles (pas plus)

Exemples :

L

T

I

Carré

S / Z (comme dans Tetris)

Chaque bloc a une couleur unique (facultatif, visuel)

Chaque bloc peut être pivoté à 90° (rotation horaire uniquement)

Les pièces ne peuvent pas être posées :

en dehors du territoire

sur l’eau

sur un cannon, un castle-core, un autre wall ou destroyed

Durée de la phase : 10 à 15 secondes pour réparer

Nombre de blocs proposés par manche : 10 maximum

⚔️ Phase de combat (solo et multi)
Solo (IA)
Ennemis : Bateaux (flottes)

Flotte :

Déplace depuis la mer vers les côtes

Tire à intervalle régulier sur les murs

Peut débarquer des fantassins si brèche

Fantassins :

Ne détruisent rien

Sont décoratifs et indiquent une brèche dans la défense

### Multijoueur local (1-3 joueurs)
**Mécaniques partagées :**
- Tous les joueurs agissent simultanément pendant chaque phase
- Territoire séparé pour chaque joueur (pas d'interférence pendant réparation)
- Combat : chaque joueur cible les autres automatiquement

**Phases spécifiques multijoueur :**
- **Placement canons** : Tour par tour (15 sec chacun) 
- **Réparation** : Simultané avec pièces différentes par joueur
- **Combat** : Simultané, canons de chaque joueur tirent sur les ennemis les plus proches

**Conditions de victoire :**
- **Élimination** : Dernier joueur avec château fermé
- **Points** : Meilleur score après 5 rounds (si plusieurs survivants)
- **Domination** : Contrôler 60%+ du territoire total

🏁 Conditions de victoire / défaite
Défaite :

Le joueur ne parvient pas à reconstruire un château fermé autour d’un castle-core

Victoire :

Solo : conquérir tous les territoires

Multi :

Dernier joueur survivant

Ou joueur avec le plus de points après N manches

🧠 IA minimale (si mode solo)
Placement de canons dans zones valides

Tir aléatoire avec légère priorité sur murs affaiblis

Déplacement des bateaux vers la côte la plus proche

Réparation rudimentaire (pas indispensable au début)

🖥️ Interface et système de contrôles

### Configuration multijoueur (1-3 joueurs)
- **Joueur 1** : Territoire rouge, château en haut à gauche
- **Joueur 2** : Territoire bleu, château en haut à droite  
- **Joueur 3** : Territoire vert, château en bas (optionnel)

### Système de contrôles modulaire

#### Option A : Contrôles souris (recommandé 1 joueur)
- **Sélection pièce** : Clic gauche
- **Rotation** : Clic droit ou molette
- **Placement** : Clic gauche + validation
- **Placement canon** : Drag & drop
- **Tir manuel** : Clic sur canon + cible (optionnel)

#### Option B : Contrôles clavier - Joueur 1
- **Déplacement pièce** : Flèches directionnelles
- **Rotation** : Barre espace
- **Validation** : Entrée
- **Annulation** : Échap
- **Placement canon** : Tab (sélection) + Flèches + Entrée

#### Option C : Contrôles clavier - Joueur 2  
- **Déplacement pièce** : WASD
- **Rotation** : Q
- **Validation** : E
- **Annulation** : Shift gauche
- **Placement canon** : Tab + WASD + E

#### Option D : Contrôles clavier - Joueur 3
- **Déplacement pièce** : Pavé numérique (8456)
- **Rotation** : Pavé numérique (7)
- **Validation** : Pavé numérique (Entrée)
- **Annulation** : Pavé numérique (0)
- **Placement canon** : Tab + Pavé + Entrée

### Interface de sélection des contrôles
```
┌─────────────────────────────────────┐
│        CONFIGURATION JOUEURS        │
├─────────────────────────────────────┤
│ Joueur 1: [Souris ▼] [Actif ✓]     │
│ Joueur 2: [Clavier WASD ▼] [Actif ✓]│  
│ Joueur 3: [Clavier Pavé ▼] [ ]     │
├─────────────────────────────────────┤
│ [Tester contrôles] [COMMENCER]      │
└─────────────────────────────────────┘
```

📊 Structure de données suggérée

### Grille de jeu
```js
const grid = [
    [{ type: 'water' }, { type: 'water' }, { type: 'land' }, ...],
    // ...
];
```

### Configuration des joueurs
```js
const players = [
    {
        id: 1,
        name: 'Joueur 1',
        color: '#FF0000',
        controlType: 'mouse', // 'mouse', 'keyboard_arrows', 'keyboard_wasd', 'keyboard_numpad'
        territory: { startX: 0, startY: 0, width: 12, height: 12 },
        castle: { core: {x: 6, y: 6}, walls: [...] },
        score: 0,
        lives: 3,
        active: true
    },
    // Joueur 2, 3...
];
```

### Gestionnaire de contrôles
```js
const controlSchemes = {
    mouse: {
        move: 'mousemove',
        rotate: 'contextmenu', 
        validate: 'click',
        cancel: 'keydown:Escape'
    },
    keyboard_arrows: {
        move: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
        rotate: 'Space',
        validate: 'Enter', 
        cancel: 'Escape'
    },
    keyboard_wasd: {
        move: ['KeyW', 'KeyS', 'KeyA', 'KeyD'],
        rotate: 'KeyQ',
        validate: 'KeyE',
        cancel: 'ShiftLeft'
    },
    keyboard_numpad: {
        move: ['Numpad8', 'Numpad2', 'Numpad4', 'Numpad6'],
        rotate: 'Numpad7', 
        validate: 'NumpadEnter',
        cancel: 'Numpad0'
    }
};
```

### Pièce Tetris
```js
const block = {
    shape: [
        [1, 0],
        [1, 0], 
        [1, 1]
    ],
    color: '#FF0000',
    playerId: 1, // Associée à un joueur
    rotation: 0  // 0, 90, 180, 270
};
```
🔄 États de jeu et mécaniques détaillées

### Cycle de jeu complet
```js
const GAME_STATE = {
    SELECT_TERRITORY: 'select_territory',
    PLACE_CANNONS: 'place_cannons', 
    COMBAT: 'combat',
    REPAIR: 'repair',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over'
};
```

### Phase 1 : Sélection du territoire (début de partie uniquement)
- **Durée** : 10 secondes
- **Objectif** : Choisir son château de départ parmi 3-4 propositions
- **Critères de choix** : Position stratégique, taille, proximité de la côte

### Phase 2 : Placement des canons  
- **Durée** : 15 secondes
- **Objectif** : Positionner ses canons dans les châteaux fermés
- **Contraintes** : Maximum 1 canon par tranche de 16 cases fermées
- **Stratégie** : Couvrir les angles d'attaque probables

### Phase 3 : Combat
- **Durée** : 30-45 secondes selon la difficulté
- **Mécaniques** :
  - Canons tirent automatiquement sur les cibles à portée
  - Bateaux se rapprochent et bombardent les murs
  - Dégâts aléatoires mais ciblés sur les points faibles
- **Objectif joueur** : Détruire un maximum de bateaux pour le score

### Phase 4 : Réparation
- **Durée** : 15 secondes + temps bonus selon performance au combat
- **Mécaniques** : 
  - Pièces Tetris tombent une par une
  - Rotation avec clic droit ou touche R
  - Validation de placement avec clic gauche
- **Objectif** : Refermer au moins un château autour d'un core

---

## 🏆 Système de scoring

### Points de base
- **Bateau détruit** : 100-500 points (selon taille)
- **Canon survivant** : 50 points par round
- **Château fermé** : 200 points + bonus surface
- **Bonus vitesse** : +25% si réparation rapide (< 10 secondes)

### Multiplicateurs
- **Série** : x1.5 si 3+ bateaux détruits d'affilée
- **Efficacité** : x2 si aucun dégât subi pendant un round
- **Perfectionniste** : x3 si aucune pièce gaspillée en réparation

### Système de vies/continues
- **3 vies** au départ
- **Perte de vie** : Impossible de fermer un château
- **Vie bonus** : Tous les 10 000 points
- **Game Over** : Plus de vies et échec de réparation
---

## 🏗️ Architecture technique

### Structure des modules
```
/rampart/
├── index.html              # Point d'entrée
├── styles/
│   ├── main.css            # Styles principaux
│   ├── game.css            # Interface de jeu
│   └── animations.css      # Animations et effets
├── js/
│   ├── main.js             # Point d'entrée JS
│   ├── game/
│   │   ├── GameState.js    # Gestionnaire d'états
│   │   ├── Grid.js         # Gestion de la grille
│   │   ├── Castle.js       # Logique des châteaux
│   │   ├── Cannon.js       # Gestion des canons
│   │   ├── Ship.js         # Ennemis et IA
│   │   └── Tetris.js       # Pièces de réparation
│   ├── utils/
│   │   ├── CollisionDetection.js
│   │   ├── PathFinding.js  # Pour les bateaux
│   │   └── FloodFill.js    # Détection château fermé
│   └── ui/
│       ├── Renderer.js     # Rendu Canvas/WebGL
│       ├── InputHandler.js # Gestion souris/clavier
│       └── HUD.js          # Interface utilisateur
├── assets/
│   ├── sprites/            # Textures et sprites
│   ├── sounds/             # Effets sonores
│   └── fonts/              # Polices arcade
└── data/
    ├── levels.json         # Configuration niveaux
    └── ships.json          # Types de bateaux
```

### Technologies recommandées
- **Rendu** : Canvas 2D (simplicité) ou WebGL (performance)
- **Audio** : Web Audio API + fallback HTML5 Audio
- **Stockage** : localStorage pour highscores
- **Bundling** : Webpack ou Parcel (optionnel)

### Classes principales

#### GameState.js
```js
class GameState {
    constructor() {
        this.currentState = 'SELECT_TERRITORY';
        this.round = 1;
        this.score = 0;
        this.lives = 3;
    }
    
    transition(newState) { /* Gestion des transitions */ }
    update(deltaTime) { /* Logique frame-by-frame */ }
}
```

#### Grid.js  
```js
class Grid {
    constructor(width = 24, height = 24) {
        this.cells = this.initializeGrid(width, height);
    }
    
    isValidPlacement(piece, x, y) { /* Validation placement */ }
    floodFill(startX, startY) { /* Détection zones fermées */ }
}
```

#### Castle.js
```js
class Castle {
    constructor(corePosition, walls = []) {
        this.core = corePosition;
        this.walls = walls;
        this.cannons = [];
    }
    
    isClosed() { /* Algo détection fermeture */ }
    getValidCannonSpots() { /* Emplacements possibles */ }
}
```

---

## 🎨 Spécifications graphiques et audio

### Style visuel
- **Esthétique** : Pixel art 32x32, style arcade années 90
- **Palette** : 16 couleurs maximum pour authenticité
- **Animations** : Simples mais fluides (explosions, vagues)

### Assets requis
#### Sprites (32x32px)
- **Terrain** : Herbe, sable, rocher
- **Eau** : Animation 4 frames
- **Murs** : Pierre, brique (+ versions endommagées)
- **Canons** : 4 orientations, animation de tir
- **Bateaux** : 3 tailles différentes
- **Explosions** : Animation 6 frames

#### Sons
- **Effets** : Tir de canon, explosion, placement pièce
- **Ambiance** : Bruit de vagues, musique de fond
- **Interface** : Bips de validation/erreur

### Performance cible
- **60 FPS** constant sur navigateurs modernes
- **Responsive** : Adaptation mobile/desktop
- **Temps de chargement** : < 3 secondes

---

## 📦 Éléments aléatoires et balancement

### Générateur de pièces Tetris
- **Distribution** : Équilibrée entre formes utiles/difficiles
- **Ordre** : Pseudo-aléatoire avec seed pour reproductibilité
- **Difficulté** : Plus de pièces complexes aux niveaux élevés

### IA des bateaux
- **Comportement** : Déplacement vers points faibles détectés
- **Ciblage** : Priorité murs isolés > angles > murs épais
- **Escalade** : Plus de bateaux et plus résistants par niveau

### Système de difficulté progressive
- **Niveau 1-3** : Apprentissage, bateaux lents, temps généreux
- **Niveau 4-7** : Rythme standard, introduction bateaux moyens  
- **Niveau 8+** : Difficile, gros bateaux, temps réduits

---

## 🗺️ Roadmap de développement

### Phase 1 : MVP - Cœur du jeu (2-3 semaines)
**Priorité 1 - Fondations**
- [ ] Structure HTML/CSS de base + Canvas
- [ ] Système de grille et rendu basique
- [ ] Gestion des états de jeu (transitions)
- [ ] Détection de fermeture de château (flood fill)

**Priorité 2 - Mécaniques de base**
- [ ] Placement et rotation des pièces Tetris
- [ ] Placement des canons avec validation
- [ ] Système de tir automatique
- [ ] Déplacement basique des bateaux

**Livrable** : Jeu fonctionnel en mode solo avec 1 niveau

### Phase 2 : Gameplay complet + Multijoueur (3 semaines)
**Gameplay solo**
- [ ] IA des bateaux (pathfinding + ciblage)
- [ ] Système de scoring complet
- [ ] Progression de difficulté (5 niveaux)
- [ ] Interface utilisateur (HUD, menus)
- [ ] Gestion des vies et game over

**Multijoueur local**
- [ ] Écran de configuration des joueurs et contrôles
- [ ] Gestionnaire de contrôles multiples (souris + claviers)
- [ ] Territoires séparés et gestion simultanée
- [ ] Système de combat entre joueurs
- [ ] Interface multijoueur (scores, vies par joueur)

**Livrable** : Jeu complet solo + multijoueur 1-3 joueurs

### Phase 3 : Polish et finitions (1-2 semaines)
- [ ] Assets graphiques (sprites 32x32)
- [ ] Système audio (effets + musique)
- [ ] Animations et particules
- [ ] Optimisations performance
- [ ] Sauvegarde highscores

**Livrable** : Jeu arcade prêt pour publication

### Phase 4 : Extensions (optionnel)
- [ ] Mode multijoueur local
- [ ] Éditeur de niveaux
- [ ] Modes de jeu alternatifs
- [ ] Intégration mobile/tactile

---

## 🔧 Conseils d'implémentation

### Points critiques à ne pas sous-estimer
1. **Algorithme de fermeture** : Le flood fill doit être robuste et performant
2. **Pathfinding des bateaux** : A* simplifié ou Dijkstra selon complexité terrain
3. **Gestion des collisions** : Détection précise pour placement pièces
4. **Contrôles multiples simultanés** : Éviter les conflits entre joueurs
5. **Performance** : Optimiser le rendu avec dirty rectangles ou offscreen canvas

### Défis spécifiques multijoueur
- **Conflit de touches** : Gérer plusieurs EventListeners simultanés
- **Focus clavier** : Empêcher qu'un joueur "vole" le focus des autres  
- **Synchronisation** : Actions simultanées sans lag visuel
- **Interface adaptative** : Affichage splitscreen lisible

### Pièges à éviter
- **Sur-ingénierie** : Commencer simple, complexifier progressivement
- **Scope creep** : Rester concentré sur le MVP d'abord  
- **Performance prématurée** : Profiler avant d'optimiser
- **UI complexe** : L'arcade privilégie la simplicité

### Ressources utiles
- **Algorithmes** : Flood fill, A*, détection de formes fermées
- **Game loops** : requestAnimationFrame + delta time
- **Canvas optimization** : Techniques de rendu efficace
- **Audio Web** : Gestion des formats + fallbacks navigateurs

---

## 🎯 Critères de succès

### Technique
- ✅ 60 FPS constant sur desktop moderne
- ✅ Temps de réponse < 16ms pour les interactions
- ✅ Détection de fermeture 100% fiable
- ✅ IA prévisible mais challengeante

### Gameplay  
- ✅ Courbe d'apprentissage progressive
- ✅ Rejouabilité élevée (scores, stratégies)
- ✅ Frustration positive (difficultés surmontables)
- ✅ Sessions de 5-15 minutes

### User Experience
- ✅ Contrôles intuitifs et réactifs
- ✅ Feedback visuel/audio immédiat  
- ✅ Interface claire sans encombrement
- ✅ Compatibilité multi-navigateurs

---

*Ce cahier des charges constitue la base complète pour développer une version authentique et moderne de Rampart. Bon code, Franck ! 🚀*