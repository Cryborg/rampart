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

#### Grid (24x24)
- Types de cellules: water, land, wall, castle-core, cannon, destroyed
- Algorithme flood-fill pour détection des châteaux fermés
- Validation de placement des pièces
- Propriétés par type (walkable, buildable, destructible)

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
- Grille 24x24 avec terrain généré procéduralement
- 6 types de cellules avec propriétés distinctes
- Détection de zones fermées via flood-fill
- Validation de placement en temps réel

### Phases de jeu
1. **Sélection territoire** (10s) - Choix château de départ
2. **Placement canons** (15s) - Positionnement stratégique
3. **Combat** (30s) - Défense automatique
4. **Réparation** (15s) - Placement pièces Tetris
5. **Fin de round** (3s) - Calcul scores

### Système de contrôles
- Configuration multi-joueurs (1-3 joueurs)
- 4 schémas: Souris, Flèches, WASD, Pavé numérique
- Gestion simultanée des entrées multiples
- Sauvegarde des préférences en localStorage

## État d'avancement

### ✅ Implémenté (Phase 1 MVP)
- Architecture modulaire complète
- Interface HTML/CSS responsive
- Système de grille avec flood-fill
- Gestionnaire de rendu Canvas
- Machine à états de jeu
- Système de pièces Tetris
- Gestion des contrôles multi-joueurs
- Sauvegarde/chargement

### 🚧 En cours (Phase 2)
- Tests et débogage du gameplay de base
- IA des bateaux ennemis
- Système de combat et tir automatique
- Balancement et progression de difficulté

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
- Logs détaillés avec emojis pour identification
- État de jeu accessible via window.game
- Rendu de grille avec overlays debug

## Prochaines étapes prioritaires

1. **Tests gameplay complet** - Vérifier cycle de jeu bout en bout
2. **Implémentation IA bateaux** - Pathfinding et ciblage intelligent  
3. **Système de combat** - Tir automatique des canons
4. **Balancement gameplay** - Ajustement timers et difficultés
5. **Assets visuels** - Remplacement des couleurs par sprites

## Notes de compatibilité
- ES6+ requis (modules, classes, arrow functions)
- Canvas 2D supporté tous navigateurs modernes
- LocalStorage pour persistance
- Responsive design mobile/desktop