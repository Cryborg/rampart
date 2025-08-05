// Script de debug pour Rampart
// Copie-colle ça dans la console du navigateur (F12)

console.log('🔍 Debug Rampart');

// Vérifications de base
if (typeof window.game !== 'undefined') {
    const game = window.game;
    console.log('✅ window.game existe');
    
    if (game.gameManager) {
        const gm = game.gameManager;
        console.log('✅ GameManager existe');
        console.log('📊 État actuel:', gm.gameState.currentState);
        console.log('🎮 Joueurs:', gm.players.length);
        
        if (gm.players.length > 0) {
            const player = gm.players[0];
            console.log('👤 Joueur 1:', player.name, 'Score:', player.score);
            console.log('🧱 Pièce courante:', player.currentPiece?.type || 'aucune');
        }
        
        if (gm.grid) {
            console.log('🗺️ Grille:', gm.grid.width + 'x' + gm.grid.height);
            const landCells = gm.grid.getCellsOfType('land');
            console.log('🌱 Cellules de terre:', landCells.length);
        }
        
        if (gm.renderer) {
            console.log('🎨 Renderer:', 'cellSize=' + gm.renderer.cellSize);
            console.log('📐 Canvas:', gm.renderer.canvas.width + 'x' + gm.renderer.canvas.height);
        }
    }
} else {
    console.log('❌ window.game n\'existe pas encore');
    console.log('⏳ Attendre que le jeu soit chargé...');
}

// Fonctions utiles pour débugger
window.debugRampart = {
    // Forcer l'état repair
    goToRepair: () => {
        if (window.game?.gameManager) {
            window.game.gameManager.gameState.transition('REPAIR');
            window.game.gameManager.startRepairPhase();
            console.log('🧱 Forcé en mode REPAIR');
        }
    },
    
    // Ajouter une pièce au joueur
    givePiece: () => {
        if (window.game?.gameManager?.players[0]) {
            const player = window.game.gameManager.players[0];
            const piece = window.game.gameManager.pieceGenerator.generatePiece(1);
            player.currentPiece = piece;
            console.log('🎁 Pièce donnée:', piece.type);
        }
    },
    
    // Afficher la grille dans la console
    showGrid: () => {
        if (window.game?.gameManager?.grid) {
            const grid = window.game.gameManager.grid;
            console.table(grid.cells.map(row => 
                row.map(cell => cell.type.charAt(0).toUpperCase())
            ));
        }
    },
    
    // Forcer un render
    render: () => {
        if (window.game?.gameManager) {
            window.game.gameManager.render();
            console.log('🎨 Rendu forcé');
        }
    }
};

console.log('🛠️ Fonctions debug disponibles dans window.debugRampart');
console.log('📝 Essaie: debugRampart.goToRepair(), debugRampart.givePiece(), etc.');