# Rampart - Documentation du projet

## Vue d'ensemble
Recréation du jeu d'arcade classique Rampart (Atari 1990) en JavaScript ES6 moderne. Combine stratégie, construction et action temps réel.

## Architecture du projet

### Structure des fichiers
```
/rampart/
├── index.html              # Interface principale
├── styles/main.css         # Styles CSS complets
├── js/
│   ├── main.js             # Point d'entrée, initialisation
│   ├── game/
│   │   ├── GameManager.js  # Gestionnaire principal du jeu
│   │   ├── GameState.js    # États et transitions de jeu
│   │   ├── Grid.js         # Système de grille 24x24 + flood-fill
│   │   ├── Player.js       # Gestion des joueurs et statistiques
│   │   └── TetrisPieces.js # Système de pièces Tetris pour réparation
│   └── ui/
│       ├── Renderer.js     # Rendu Canvas optimisé
│       ├── InputHandler.js # Gestion entrées souris/clavier
│       └── UIManager.js    # Interface utilisateur et menus
```

### Classes principales

#### GameManager
- Point central de coordination
- Gère la game loop et les mises à jour
- Coordonne tous les sous-systèmes
- Sauvegarde/chargement de partie

#### GameState
- Machine à états pour les phases de jeu
- Transitions automatiques avec timers
- États: MENU → SELECT_TERRITORY → PLACE_CANNONS → COMBAT → REPAIR → ROUND_END
- Système d'événements pour les callbacks

#### Grid (48x36)
- Types de cellules: water, land, wall, castle-core, cannon, destroyed
- **IMPORTANT** : Algorithme flood-fill pour détection des châteaux fermés DOIT vérifier les 8 voisins (orthogonaux + diagonales) - Franck y tient !
- Validation de placement des pièces et canons 2x2
- Propriétés par type (walkable, buildable, destructible)
- Zones constructibles (cannonZone) marquées en doré
- **DESTRUCTION** : Chaque cellule doit être détruite individuellement, PAS par pièce entière

#### TetrisPieces
- Pièces spécialisées Rampart (plus petites que Tetris classique)
- Générateur avec équilibrage et anti-répétition
- Système de rotation et validation de placement
- Support pour difficulté progressive

#### Renderer
- Rendu Canvas 2D optimisé
- Pixel art avec anti-aliasing désactivé
- Système d'animations (explosions, vagues)
- Responsive design avec redimensionnement automatique

## Mécaniques de jeu implémentées

### Système de grille
- Grille 48x36 avec terrain généré procéduralement
- 6 types de cellules avec propriétés distinctes
- Détection de zones fermées via flood-fill amélioré
- Validation de placement en temps réel
- Zones constructibles automatiquement créées pour châteaux fermés

### Phases de jeu
1. **Placement canons** - Formule: floor(40% × (cases_dorées_libres / 4))
2. **Combat** (5s) - Phase simulée pour test
3. **Réparation** (15s) - Placement pièces Tetris
4. **Retour au placement canons** - Cycle continu

**Système de comptage des canons par phase :**
- Chaque phase PLACE_CANNONS calcule le nombre de canons autorisés
- Compteur par phase qui se décrémente à chaque placement
- Transition automatique quand quota atteint
- Formule basée sur les cases dorées disponibles

### Système de contrôles
- **Player 1 (Souris) :** 
  - Placement/suppression de canons (clic gauche/droit)
  - Tir en combat (clic gauche sur cible)
  - Déplacement et placement de pièces
- **Player 2 (Flèches) :** 
  - Déplacement curseur (flèches directionnelles)
  - Placement canons/tir (Espace)  
  - Rotation pièces (Entrée)
- **Player 3 (WASD) :**
  - Déplacement curseur (WASD)
  - Placement canons/tir (Q)
  - Rotation pièces (E)
- **Touches globales :**
  - `Entrée` : Forcer passage au combat (phase PLACE_CANNONS)
  - `Échap` : Pause/reprendre le jeu
- **Aperçus visuels :** 
  - Prévisualisation canons 2x2 (vert=possible, rouge=impossible)
  - Curseur spécialisé P2 (cyan + croix jaune)
- **Interface responsive :** Adaptation automatique taille écran

## État d'avancement

### ✅ Implémenté (Phase 1 MVP - FONCTIONNEL)
- **✅ Architecture modulaire complète** - GameManager, Grid, Renderer, InputHandler
- **✅ Interface responsive** - Canvas adaptatif, coordonnées CSS→Canvas corrigées
- **✅ Système de grille 48x36** - Flood-fill robuste, détection châteaux fermés
- **✅ Rendu Canvas optimisé** - Pixel art, grilles régulières, coordonnées précises
- **✅ Machine à états** - PLACE_CANNONS → COMBAT → REPAIR (cycle fonctionnel)
- **✅ Système de pièces Tetris** - Générateur, rotation, validation placement
- **✅ Gameplay canons complet** - Placement 2x2, compteur par phase, formule Rampart
- **✅ Contrôles fonctionnels** - Souris, clavier (Entrée, Espace, Échap)
- **✅ Interface debug** - Panneau temps réel avec statistiques détaillées
- **✅ Mode multijoueur local complet** - 2-3 joueurs simultanés avec territoires séparés
- **✅ Système de contrôles multijoueur** - P1: Souris, P2: Flèches, P3: WASD
- **✅ Combat multijoueur fonctionnel** - Système unifié de tir pour tous les joueurs

### 🚧 En cours (Phase 2 - PROCHAINES ÉTAPES)
- **Système de combat** - IA bateaux ennemis, tir automatique des canons
- **Destruction/réparation** - Canons détruits en combat, murs endommagés
- **Progression difficulté** - Plus de bateaux, patterns d'attaque
- **Interface finale** - Retirer panneau debug, polir l'UI

### 📋 À implémenter (Phase 3)
- Assets graphiques (sprites 32x32)
- Système audio complet
- Animations et effets visuels avancés
- Interface d'édition des contrôles
- Balancing multijoueur (vitesse, timers)

## Configuration et utilisation

### Lancement
```bash
# Servir le projet avec un serveur local
python -m http.server 8000
# ou
npx serve .
```

### Structure CSS
- Variables CSS pour théming uniforme
- Design responsive mobile/desktop
- Overlays modaux pour menus
- Animations CSS pour feedback visuel

### Sauvegarde
- localStorage pour configuration contrôles
- Sérialisation complète de l'état de jeu
- Highscores persistants

## Points techniques importants

### Performance
- Rendu optimisé avec dirty regions
- EventListeners centralisés
- Gestion mémoire des animations
- RequestAnimationFrame pour game loop

### Algorithmique
- Flood-fill récursif avec limite de taille
- Détection de fermeture de château robuste
- Générateur de pièces avec historique anti-répétition
- Calcul d'emplacements optimaux pour pièces

### Règles importantes de gameplay
- **L'eau ne bloque PAS le passage** - Une zone touchant de l'eau peut être ouverte
- Les zones fermées nécessitent des murs se touchant par les côtés (pas juste les coins)
- Seuls les murs, castle-cores et canons bloquent le passage pour la détection de fermeture

### Extensibilité
- Architecture modulaire SOLID
- Système d'événements découplé
- Configuration par objets JSON
- Support multi-joueurs intégré dès la base

## Commandes de développement

### Tests
```javascript
// Console browser pour debug
window.game.gameManager.gameState.transition('REPAIR');
window.game.gameManager.players[0].addScore(1000);
```

### Debug
- **Panneau debug temps réel** - Cases cannonZone, compteurs, calculs
- **Logs détaillés** - Emojis pour identification des événements
- **État accessible** - `window.game.gameManager` pour tests console
- **Coordonnées précises** - Fix des décalages CSS→Canvas

## Prochaines étapes prioritaires

1. **✅ Gameplay de base fonctionnel** - Cycle PLACE_CANNONS → COMBAT → REPAIR
2. **🎯 Implémentation IA bateaux** - Pathfinding depuis les bords vers le château
3. **🎯 Système de combat réel** - Tir automatique, collision, destruction
4. **🎯 Système de dégâts** - Canons détruits, murs endommagés, réparations
5. **🎯 Interface finale** - Retirer debug, ajouter scores, UI soignée

**État actuel :** MVP multijoueur entièrement fonctionnel avec système de combat unifié. Tous les joueurs (P1-P3) peuvent placer des canons, se déplacer et tirer avec leurs contrôles dédiés.

## Détails techniques multijoueur

### Activation du mode multijoueur
- **Interface :** Bouton "👥 Multijoueur" dans le menu principal
- **Méthodes :** `startMultiGame()` → `initializeMultiPlayersFromConfig()`
- **Territoires :** Assignation automatique de zones 12x12 pour chaque joueur
- **Mode par défaut :** Solo (`initializePlayers()` = 1 joueur souris uniquement)

### Gestion des contrôles multijoueur
- **Distribution clavier :** `distributeKeyboardInput()` route les touches vers le bon joueur
- **Méthodes communes :** Tous les joueurs utilisent les mêmes méthodes (`handlePlayerMovement`, `handlePlayerAction`)
- **Système unifié :** Combat via `combatSystem.handleCannonClick()` pour tous les types de contrôles
- **Curseurs visuels :** Rendu spécialisé par joueur (`renderPlayerCursor()`)

### Problèmes résolus récemment
1. **Curseur P2 invisible** → Curseur original trop discret, remplacé par version cyan + croix jaune
2. **P2 ne bouge pas en COMBAT** → Ajout du cas COMBAT dans `handlePlayerMovement()`
3. **P2 ne peut pas tirer** → Ajout du cas COMBAT dans `handlePlayerAction()` + utilisation du système unifié
4. **Code dupliqué pour le tir** → Suppression de `handlePlayerFire()`, utilisation de `combatSystem.handleCannonClick()` pour tous

### Architecture extensible
- **Player 3 ready :** Système déjà préparé pour un 3ème joueur (WASD + QE)
- **Contrôles modulaires :** Schémas de contrôles définis dans `Player.getControlScheme()`
- **Rendu adaptatif :** Curseurs et interfaces s'adaptent automatiquement au nombre de joueurs

## Notes de compatibilité
- ES6+ requis (modules, classes, arrow functions)
- Canvas 2D supporté tous navigateurs modernes
- LocalStorage pour persistance
- Responsive design mobile/desktop