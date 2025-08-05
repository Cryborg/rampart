// Test algorithme avec distance 2
console.log('🎯 Test distance 2');

if (window.game?.gameManager) {
    const grid = window.game.gameManager.grid;
    
    console.log('🔍 Test findClosedCastles avec distance 2...');
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
        });
        
        console.log('🎯 Application de la surbrillance...');
        const castle = closedCastles[0];
        
        // Appliquer highlightConstructibleArea
        let cannonZoneCount = 0;
        castle.area.forEach(({x, y}) => {
            const cell = grid.getCell(x, y);
            if (cell && cell.type === 'land') {
                cell.cannonZone = true;
                cannonZoneCount++;
            }
        });
        
        console.log(`✨ ${cannonZoneCount} cellules marquées comme zone constructible`);
        console.log('🎮 Forçage du rendu...');
        
        // Force le rendu
        if (window.game.gameManager.render) {
            window.game.gameManager.render();
            console.log('✅ Rendu forcé - tu devrais voir la couleur dorée !');
        }
        
    } else {
        console.log('❌ Toujours aucun château détecté');
        
        // Debug distance manuelle
        const enclosedAreas = grid.findEnclosedAreas();
        const zone3 = enclosedAreas[2];
        const castleCore = { x: 12, y: 12 };
        
        console.log('\n🔍 Test distance manuelle...');
        let foundInRange = false;
        
        zone3.forEach(({x, y}) => {
            const distance = Math.abs(x - castleCore.x) + Math.abs(y - castleCore.y); // Distance Manhattan
            if (distance <= 2) {
                console.log(`📍 Cellule (${x}, ${y}) à distance ${distance} du core`);
                foundInRange = true;
            }
        });
        
        console.log(`🎯 Cellules dans rayon 2: ${foundInRange}`);
    }
} else {
    console.error('❌ Game non disponible');
}