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
- **Souris :** Placement/suppression de canons (clic gauche/droit), déplacement pièces
- **Clavier :** 
  - `Espace` / `R` : Rotation des pièces (phase REPAIR)
  - `Entrée` : Forcer passage au combat (phase PLACE_CANNONS)
  - `Échap` : Pause/reprendre le jeu
- **Aperçus visuels :** Prévisualisation canons 2x2 (vert=possible, rouge=impossible)
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

### 🚧 En cours (Phase 2 - PROCHAINES ÉTAPES)
- **Système de combat** - IA bateaux ennemis, tir automatique des canons
- **Destruction/réparation** - Canons détruits en combat, murs endommagés
- **Progression difficulté** - Plus de bateaux, patterns d'attaque
- **Interface finale** - Retirer panneau debug, polir l'UI

### 📋 À implémenter (Phase 3)
- Assets graphiques (sprites 32x32)
- Système audio complet
- Animations et effets visuels
- Mode multijoueur local
- Interface d'édition des contrôles

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

**État actuel :** MVP entièrement fonctionnel avec système de canons complet. Prêt pour implémentation du combat réel.

## Notes de compatibilité
- ES6+ requis (modules, classes, arrow functions)
- Canvas 2D supporté tous navigateurs modernes
- LocalStorage pour persistance
- Responsive design mobile/desktop