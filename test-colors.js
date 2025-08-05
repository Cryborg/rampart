// Test des couleurs dans la console
console.log('🎨 Test des couleurs actuelles:');
console.log('%c■ Eau (WATER)', 'color: #0ea5e9; font-size: 20px;');
console.log('%c■ Terre (LAND)', 'color: #65a30d; font-size: 20px;');
console.log('%c■ Mur (WALL)', 'color: #6b7280; font-size: 20px;');
console.log('%c■ Château (CORE)', 'color: #dc2626; font-size: 20px;');

if (window.game?.gameManager) {
    const grid = window.game.gameManager.grid;
    
    // Compter les types de cellules
    let counts = {
        water: 0,
        land: 0,
        wall: 0,
        'castle-core': 0
    };
    
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            const cell = grid.getCell(x, y);
            if (cell) {
                counts[cell.type] = (counts[cell.type] || 0) + 1;
            }
        }
    }
    
    console.log('📊 Répartition des cellules:');
    console.log(`💧 Eau: ${counts.water} cellules`);
    console.log(`🌱 Terre: ${counts.land} cellules`);
    console.log(`🧱 Murs: ${counts.wall} cellules`);
    console.log(`🏰 Château: ${counts['castle-core']} cellules`);
    
    // Force un rendu pour voir les changements
    window.game.gameManager.render();
    console.log('🔄 Rendu forcé avec nouvelles couleurs');
}