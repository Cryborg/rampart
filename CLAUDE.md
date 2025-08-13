# Rampart v2 - Guide de développement Claude

## État actuel du projet

### Version : Fonctionnelle avec toutes les mécaniques de base

### Fonctionnalités implémentées ✅

#### Système de grille et zones fermées
- **Grid.js** : Flood-fill 8-directions pour détection zones fermées ✅
- **Règle cruciale** : Seuls LAND, DESTROYED, CANNON et CASTLE_CORE sont traversables pour la détection
- **L'eau (WATER) et les murs (WALL) bloquent le passage** - ceci était documenté incorrectement dans le README initial
- Zones dorées (cannonZone) recalculées après chaque placement de pièce Tetris

#### Combat et tir
- **Canons joueur** : Tir manuel uniquement (pas d'auto-fire), portée illimitée ✅
  - Clic pendant phase COMBAT → canon le plus proche tire vers la position cliquée
  - Cooldown de 2 secondes entre les tirs
  - Fonction : `tryManualFire(x, y)` dans GameManager.js
- **Navires ennemis** : Portée illimitée, système de précision progressive ✅
  - 3 types : Novice (3 HP), Veteran (6 HP), Expert (10 HP)
  - Vitesses différenciées : 100%, 75%, 50%
  - Tirent sur les murs automatiquement
- **Combat sans limite de temps** : Se termine quand tous les NAVIRES sont détruits ✅
  - Les troupes terrestres survivent entre les phases

#### Système de débarquement
- **Navires débarquent des troupes** près de la côte (distance ≤ 3) ✅
- **Types de forces** :
  - Novice : 1 infanterie
  - Veteran : 3 infanteries
  - Expert : 1 infanterie + 1 tank
- **Troupes terrestres** attaquent les canons ✅
  - Infanterie : Corps à corps (portée 1.5), 1 dégât, cooldown 4s
  - Tank : Distance (portée 8), 5 dégâts, cooldown 12s

#### Système de HP et persistance
- **Canons : 30 HP** (défini dans GAME_CONFIG.GAMEPLAY.CANNON_HP) ✅
- **Dégâts persistent jusqu'au Game Over** - aucune guérison ✅
- **Murs : 1 HP** (régénérés uniquement par placement Tetris)

#### Calcul quota canons
- **Formule corrigée** : Math.max(quota, Math.min(MIN_CANNONS, maxPossibleCannons)) ✅
- **Respecte les contraintes physiques** : Impossible d'avoir plus de canons que ce que permettent les zones dorées
- Exemple : 5 cases dorées → 1 canon max (pas 2)

#### Condition de Game Over
- **Nouvelle règle** : Game Over si aucun canon actif OU castle-core dans les zones dorées après phase REPAIR ✅
- Fonction : `checkDefensesInGoldenZones()` dans GameManager.js

#### Interface
- **Modales de phase sans fond sombre** pour éviter le flash désagréable ✅
- Animation avec lueur bleue, pas de blocage des interactions
- Classe CSS : `.phase-announcement`

### Architecture des fichiers

```
/js/game/
├── GameManager.js     # Orchestrateur principal
├── Grid.js           # Système de grille + flood-fill
└── /js/config/
    └── GameConstants.js # Toutes les constantes
/js/ui/
├── Renderer.js        # Rendu Canvas
└── InputHandler.js    # Gestion inputs (dans GameManager)
```

### Points critiques à retenir

#### ❌ Erreurs à ne plus commettre
1. **Ne pas ajouter de tir automatique aux canons** - Le joueur veut contrôler manuellement
2. **Ne pas supposer que des fonctions existent** - Toujours vérifier avant d'appeler `updateCannon()` etc.
3. **Respecter les règles de traversabilité** - L'eau ne traverse PAS pour les zones fermées
4. **Ne pas forcer des minimums impossibles** - Le calcul de quota doit respecter l'espace disponible

#### ✅ Bonnes pratiques établies
1. **Logs détaillés** pour débugger (quota canons, zones fermées, etc.)
2. **Séparation claire** entre tir manuel (joueur) et automatique (ennemis)
3. **Persistance des dégâts** - Aucune guérison jusqu'au Game Over
4. **Validation physique** - Impossible de placer plus que ce que permettent les zones

#### 🔧 Fonctions clés
- `Grid.floodFillWithClosureCheck()` - Détection zones fermées
- `GameManager.tryManualFire()` - Tir manuel des canons
- `GameManager.checkCombatCompletion()` - Fin de combat automatique
- `GameManager.checkDefensesInGoldenZones()` - Condition Game Over
- `Grid.calculateCannonQuota()` - Calcul quota avec contraintes physiques

### Configuration des constantes importantes

```javascript
GAMEPLAY: {
    CANNON_HP: 30,                    // 30 points de vie par canon
    CANNON_RATIO: 0.4,               // 40% des cases dorées
    MIN_CANNONS: 2,                  // Minimum SI possible physiquement
}

ENEMIES: {
    DISEMBARK_DISTANCE: 3,           // Distance côte pour débarquer
    TANK_RANGE: 8,                   // Portée limitée pour tanks
    INFANTRY_RANGE: 1.5,             // Corps à corps
}
```

### Tests à effectuer après modifications

1. **Placement canons** : Vérifier quota cohérent avec zones dorées
2. **Zones fermées** : Tester avec configurations de murs complexes
3. **Tir manuel** : Cliquer partout sur la carte, vérifier portée illimitée
4. **Débarquement** : Vérifier que les 3 types de navires débarquent correctement
5. **Game Over** : Détruire tous canons/zones et vérifier condition
6. **Persistance HP** : Endommager canons et vérifier qu'ils ne guérissent pas

### État de développement

Le jeu est **fonctionnellement complet** avec tous les systèmes demandés par Franck. Les mécaniques sont équilibrées et le gameplay est stratégique avec escalade de difficulté naturelle.

**Prochaines améliorations possibles** (non demandées) :
- Effets visuels supplémentaires
- Système de score plus détaillé
- Animations de déplacement des troupes
- Balancement des stats d'ennemis

---

**Important** : Ce fichier doit être mis à jour à chaque modification significative pour maintenir la cohérence du développement.