// Désactiver temporairement l'animation d'eau
console.log('🛑 Désactivation animation eau');

if (window.game?.gameManager?.renderer) {
    // Override la fonction getCellColor pour supprimer l'animation
    const renderer = window.game.gameManager.renderer;
    const originalGetCellColor = renderer.getCellColor;
    
    renderer.getCellColor = function(cell) {
        const props = window.game.gameManager.grid.constructor.CELL_PROPERTIES?.[cell.type];
        if (!props) return '#666666';
        
        let color = props.color;
        
        // PAS d'animation - couleur fixe
        // if (cell.type === 'water') { ... } <- commenté
        
        // Damaged cells are darker
        if (cell.health < 1 && cell.isDestructible && cell.isDestructible()) {
            color = this.adjustBrightness(color, -0.3);
        }
        
        return color;
    };
    
    console.log('✅ Animation eau désactivée');
    
    // Force un rendu
    window.game.gameManager.render();
} else {
    console.error('❌ Renderer non disponible');
}