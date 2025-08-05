// Nettoyer et retester avec les nouveaux paramètres
console.log('🧹 Nettoyage et retest');

if (window.game?.gameManager) {
    const grid = window.game.gameManager.grid;
    
    // Nettoyer tous les marquages cannonZone
    console.log('🧹 Nettoyage des anciennes zones canons...');
    let cleanedCount = 0;
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            const cell = grid.getCell(x, y);
            if (cell && cell.cannonZone) {
                delete cell.cannonZone;
                cleanedCount++;
            }
        }
    }
    console.log(`✅ ${cleanedCount} cellules nettoyées`);
    
    // Force un rendu pour voir le nettoyage
    if (window.game.gameManager.render) {
        window.game.gameManager.render();
    }
    
    console.log('\n🔍 Test avec nouveaux paramètres (rayon 4, taille max 50)...');
    const closedCastles = grid.findClosedCastles();
    console.log(`🏰 Châteaux fermés trouvés: ${closedCastles.length}`);
    
    if (closedCastles.length > 0) {
        closedCastles.forEach((castle, index) => {
            console.log(`🏰 Château ${index + 1}:`);
            console.log(`  Taille zone: ${castle.size} cellules`);
            
            // Calculer le centre et la distance
            const centerX = castle.area.reduce((sum, cell) => sum + cell.x, 0) / castle.area.length;
            const centerY = castle.area.reduce((sum, cell) => sum + cell.y, 0) / castle.area.length;
            const distance = Math.sqrt((centerX - 12) ** 2 + (centerY - 12) ** 2);
            
            console.log(`  Centre: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);
            console.log(`  Distance du core: ${distance.toFixed(2)}`);
            console.log(`  Validé: rayon <= 4 ET taille <= 50 ? ${distance <= 4 && castle.size <= 50}`);
        });
        
        // Ne marquer que les châteaux valides
        const validCastles = closedCastles.filter(castle => {
            const centerX = castle.area.reduce((sum, cell) => sum + cell.x, 0) / castle.area.length;
            const centerY = castle.area.reduce((sum, cell) => sum + cell.y, 0) / castle.area.length;
            const distance = Math.sqrt((centerX - 12) ** 2 + (centerY - 12) ** 2);
            return distance <= 4 && castle.size <= 50;
        });
        
        console.log(`✅ Châteaux valides: ${validCastles.length}`);
        
        if (validCastles.length > 0) {
            console.log('🎯 Marquage de la zone constructible...');
            const castle = validCastles[0];
            
            let cannonZoneCount = 0;
            castle.area.forEach(({x, y}) => {
                const cell = grid.getCell(x, y);
                if (cell && cell.type === 'land') {
                    cell.cannonZone = true;
                    cannonZoneCount++;
                }
            });
            
            console.log(`✨ ${cannonZoneCount} cellules marquées`);
            
            // Force le rendu
            if (window.game.gameManager.render) {
                window.game.gameManager.render();
                console.log('🎮 Tu devrais voir SEULEMENT la zone du château colorée en or !');
            }
        }
        
    } else {
        console.log('❌ Aucun château détecté avec les nouveaux paramètres');
    }
} else {
    console.error('❌ Game non disponible');
}