export class Projectile {
    constructor(startX, startY, targetX, targetY, config = {}) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        
        // Configuration du projectile
        this.speed = config.speed || 8; // Cases par seconde
        this.damage = config.damage || 1;
        this.size = config.size || 4; // Pixels de rayon
        this.color = config.color || '#ff6b35';
        this.type = config.type || 'cannonball'; // cannonball, arrow, etc.
        
        // État
        this.active = true;
        this.hasHit = false;
        this.timeAlive = 0;
        this.maxLifetime = config.maxLifetime || 5000; // 5 secondes max
        
        // Calcul de la trajectoire
        this.calculateTrajectory();
        
        console.log(`💥 Projectile créé: (${startX}, ${startY}) → (${targetX}, ${targetY})`);
    }

    calculateTrajectory() {
        // Distance totale
        const dx = this.targetX - this.startX;
        const dy = this.targetY - this.startY;
        this.totalDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Vecteur de direction normalisé
        if (this.totalDistance > 0) {
            this.directionX = dx / this.totalDistance;
            this.directionY = dy / this.totalDistance;
        } else {
            this.directionX = 0;
            this.directionY = 0;
        }
        
        // Temps de vol estimé
        this.flightTime = this.totalDistance / this.speed;
        
        console.log(`🎯 Trajectoire: distance=${this.totalDistance.toFixed(1)}, temps=${this.flightTime.toFixed(1)}s`);
    }

    update(deltaTime) {
        if (!this.active) return;
        
        this.timeAlive += deltaTime;
        
        // Vérifier la durée de vie maximale
        if (this.timeAlive > this.maxLifetime) {
            this.destroy('timeout');
            return;
        }
        
        // Déplacement selon la vitesse
        const movement = (this.speed * deltaTime) / 1000; // Convertir en secondes
        this.x += this.directionX * movement;
        this.y += this.directionY * movement;
        
        // Vérifier si le projectile a atteint sa cible
        const distanceToTarget = Math.sqrt(
            (this.x - this.targetX) ** 2 + 
            (this.y - this.targetY) ** 2
        );
        
        if (distanceToTarget < 0.5) { // Tolérance d'arrivée
            this.onReachTarget();
        }
    }

    onReachTarget() {
        if (this.hasHit) return;
        
        this.hasHit = true;
        console.log(`💥 Projectile atteint sa cible à (${this.targetX}, ${this.targetY})`);
        
        // Déclencher l'impact
        this.onImpact(this.targetX, this.targetY);
    }

    onImpact(x, y) {
        // Cette méthode sera surchargée par le système de combat
        // pour gérer les dégâts et effets
        console.log(`💥 Impact à (${x.toFixed(1)}, ${y.toFixed(1)}) - Dégâts: ${this.damage}`);
        
        this.destroy('impact');
    }

    destroy(reason = 'unknown') {
        this.active = false;
        console.log(`💨 Projectile détruit (${reason})`);
    }

    // Méthodes pour le rendu
    getScreenPosition(renderer) {
        return {
            x: renderer.gridOffsetX + this.x * renderer.cellSize,
            y: renderer.gridOffsetY + this.y * renderer.cellSize
        };
    }

    render(ctx, renderer) {
        if (!this.active) return;
        
        const screenPos = this.getScreenPosition(renderer);
        
        // Dessiner le projectile selon son type
        switch (this.type) {
            case 'cannonball':
                this.renderCannonball(ctx, screenPos.x, screenPos.y);
                break;
            case 'arrow':
                this.renderArrow(ctx, screenPos.x, screenPos.y);
                break;
            default:
                this.renderDefault(ctx, screenPos.x, screenPos.y);
        }
        
        // Effet de traînée
        this.renderTrail(ctx, renderer);
    }

    renderCannonball(ctx, screenX, screenY) {
        // Boulet de canon circulaire
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Ombre/relief
        ctx.fillStyle = this.adjustBrightness(this.color, -0.3);
        ctx.beginPath();
        ctx.arc(screenX + 1, screenY + 1, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }

    renderArrow(ctx, screenX, screenY) {
        // Flèche pointée vers la direction
        const angle = Math.atan2(this.directionY, this.directionX);
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(angle);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-6, -1, 12, 2); // Corps de la flèche
        
        // Pointe
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(4, -3);
        ctx.lineTo(4, 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    renderDefault(ctx, screenX, screenY) {
        // Projectile par défaut (cercle simple)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    renderTrail(ctx, renderer) {
        // Traînée simple (ligne depuis la position précédente)
        const currentPos = this.getScreenPosition(renderer);
        const trailLength = 10;
        
        const trailStartX = currentPos.x - this.directionX * trailLength;
        const trailStartY = currentPos.y - this.directionY * trailLength;
        
        ctx.strokeStyle = this.adjustAlpha(this.color, 0.3);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trailStartX, trailStartY);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
    }

    // Utilitaires de couleur
    adjustBrightness(color, amount) {
        // Version simplifiée - en vrai on devrait parser hex
        return color; // Pour l'instant
    }

    adjustAlpha(color, alpha) {
        // Convertir couleur en rgba avec alpha
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }

    // Méthodes de collision
    isCollidingWith(x, y, radius = 0.5) {
        const distance = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
        return distance <= radius;
    }

    getBounds() {
        const size = this.size / 32; // Convertir pixels en cases de grille
        return {
            left: this.x - size,
            right: this.x + size,
            top: this.y - size,
            bottom: this.y + size
        };
    }

    // Sérialisation pour debug/save
    serialize() {
        return {
            startX: this.startX,
            startY: this.startY,
            x: this.x,
            y: this.y,
            targetX: this.targetX,
            targetY: this.targetY,
            speed: this.speed,
            damage: this.damage,
            type: this.type,
            active: this.active,
            timeAlive: this.timeAlive
        };
    }
}