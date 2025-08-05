// Test de l'algorithme corrigé
console.log('🔧 Test algorithme corrigé');

if (window.game?.gameManager) {
    const grid = window.game.gameManager.grid;
    
    console.log('🔍 Test findClosedCastles...');
    const closedCastles = grid.findClosedCastles();
    console.log(`🏰 Châteaux fermés trouvés: ${closedCastles.length}`);
    
    if (closedCastles.length > 0) {
        closedCastles.forEach((castle, index) => {
            console.log(`🏰 Château ${index + 1}:`);
            console.log(`  Taille zone: ${castle.size} cellules`);
            console.log(`  Cores trouvés: ${castle.cores.length}`);
            castle.cores.forEach((core, coreIndex) => {
                console.log(`    Core ${coreIndex + 1}: (${core.x}, ${core.y})`);
            });
            console.log(`  Premiers 5 emplacements:`, castle.area.slice(0, 5));
        });
        
        console.log('🎯 Test de mise en surbrillance...');
        const castle = closedCastles[0];
        
        // Simuler highlightConstructibleArea
        let cannonZoneCount = 0;
        castle.area.forEach(({x, y}) => {
            const cell = grid.getCell(x, y);
            if (cell && cell.type === 'land') {
                cell.cannonZone = true;
                cannonZoneCount++;
            }
        });
        
        console.log(`✨ ${cannonZoneCount} cellules marquées comme zone constructible`);
        console.log('🎮 Relancez le rendu pour voir la couleur dorée !');
        
        // Force un rendu
        if (window.game.gameManager.render) {
            window.game.gameManager.render();
        }
        
    } else {
        console.log('❌ Toujours aucun château détecté');
    }
} else {
    console.error('❌ Game non disponible');
}