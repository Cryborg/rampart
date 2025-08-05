// Test algorithme basé sur le centre géométrique
console.log('📐 Test centre géométrique');

if (window.game?.gameManager) {
    const grid = window.game.gameManager.grid;
    const castleCore = { x: 12, y: 12 };
    
    // Test manuel sur la Zone 3
    const enclosedAreas = grid.findEnclosedAreas();
    const zone3 = enclosedAreas[2]; // Notre zone de 19 cellules
    
    console.log(`🏛️ Zone 3: ${zone3.length} cellules`);
    
    // Calculer le centre
    const centerX = zone3.reduce((sum, cell) => sum + cell.x, 0) / zone3.length;
    const centerY = zone3.reduce((sum, cell) => sum + cell.y, 0) / zone3.length;
    
    console.log(`📍 Centre de la zone: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);
    console.log(`🏰 Castle-core: (${castleCore.x}, ${castleCore.y})`);
    
    // Distance
    const distance = Math.sqrt((centerX - castleCore.x) ** 2 + (centerY - castleCore.y) ** 2);
    console.log(`📏 Distance centre-core: ${distance.toFixed(2)}`);
    console.log(`✅ Dans rayon 6: ${distance <= 6}`);
    
    // Test de l'algorithme complet
    console.log('\n🔍 Test findClosedCastles avec nouvelle logique...');
    const closedCastles = grid.findClosedCastles();
    console.log(`🏰 Châteaux fermés trouvés: ${closedCastles.length}`);
    
    if (closedCastles.length > 0) {
        closedCastles.forEach((castle, index) => {
            console.log(`🏰 Château ${index + 1}:`);
            console.log(`  Taille zone: ${castle.size} cellules`);
            console.log(`  Cores: ${castle.cores.length}`);
            
            // Calculer le centre de ce château
            const castleCenterX = castle.area.reduce((sum, cell) => sum + cell.x, 0) / castle.area.length;
            const castleCenterY = castle.area.reduce((sum, cell) => sum + cell.y, 0) / castle.area.length;
            console.log(`  Centre: (${castleCenterX.toFixed(2)}, ${castleCenterY.toFixed(2)})`);
        });
        
        console.log('🎯 Application de la surbrillance...');
        const castle = closedCastles[0];
        
        // Marquer les cellules
        let cannonZoneCount = 0;
        castle.area.forEach(({x, y}) => {
            const cell = grid.getCell(x, y);
            if (cell && cell.type === 'land') {
                cell.cannonZone = true;
                cannonZoneCount++;
            }
        });
        
        console.log(`✨ ${cannonZoneCount} cellules marquées comme zone constructible`);
        
        // Force le rendu
        if (window.game.gameManager.render) {
            window.game.gameManager.render();
            console.log('🎮 Rendu forcé - couleur dorée visible !');
        }
        
        // Simuler aussi la transition automatique
        console.log('⏱️ Transition vers phase canons dans 1.5s...');
        
    } else {
        console.log('❌ Toujours aucun château détecté');
    }
} else {
    console.error('❌ Game non disponible');
}