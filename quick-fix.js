// Fix rapide pour les coordonnées de souris
console.log('🔧 Fix rapide des coordonnées souris');

if (window.game?.gameManager) {
    const gm = window.game.gameManager;
    const canvas = gm.canvas;
    
    // Remplacer complètement le gestionnaire de souris
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Debug pour voir si on récupère les bonnes coordonnées
        console.log(`Raw mouse: clientX=${e.clientX}, clientY=${e.clientY}`);
        console.log(`Canvas rect: left=${rect.left}, top=${rect.top}`);
        console.log(`Calculated: x=${x}, y=${y}`);
        
        // Convertir en coordonnées de grille
        const gridPos = gm.renderer.screenToGrid(x, y);
        console.log(`Grid position: (${gridPos.x}, ${gridPos.y})`);
        
        // Mettre à jour la position de la pièce
        if (gm.gameState.currentState === 'REPAIR') {
            const player = gm.players[0];
            if (player.currentPiece) {
                player.piecePosition = { x: gridPos.x, y: gridPos.y };
                console.log(`✅ Piece updated to: (${player.piecePosition.x}, ${player.piecePosition.y})`);
            }
        }
    });
    
    console.log('🎯 Fix appliqué - test ta souris maintenant!');
} else {
    console.error('❌ Game non disponible');
}