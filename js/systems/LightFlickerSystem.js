class LightFlickerSystem {
    constructor(config) {
        this.config = config;
        this.lastFlickerTime = 0;
        this.nextFlickerDelay = this.getRandomDelay();
        this.isFlickering = false;
        this.flickerOverlay = document.getElementById('flicker-overlay');
        this.darknessOverlay = document.getElementById('darkness-overlay');
        this.baseExposure = 0.005;
    }
    
    getRandomDelay() {
        return this.config.flickerInterval.min + 
               Math.random() * (this.config.flickerInterval.max - this.config.flickerInterval.min);
    }
    
    update(currentRoomId, renderer, deltaTime) {
        if (!currentRoomId.includes('entrance')) {
            if (this.isFlickering) this.stop(renderer);
            return;
        }
        
        const now = performance.now();
        
        if (!this.isFlickering && now - this.lastFlickerTime > this.nextFlickerDelay) {
            this.start(renderer);
            this.lastFlickerTime = now;
            this.nextFlickerDelay = this.getRandomDelay();
        }
    }
    
    start(renderer) {
        this.isFlickering = true;
        const darkDuration = 50 + Math.random() * 100;
        
        renderer.toneMappingExposure = 0.001;
        this.darknessOverlay.style.opacity = '0.9';
        
        if (Math.random() < 0.2) {
            this.flickerOverlay.style.opacity = '0.2';
        }
        
        setTimeout(() => {
            renderer.toneMappingExposure = this.baseExposure;
            this.darknessOverlay.style.opacity = '0';
            this.flickerOverlay.style.opacity = '0';
            this.isFlickering = false;
        }, darkDuration);
    }
    
    stop(renderer) {
        this.isFlickering = false;
        renderer.toneMappingExposure = this.baseExposure;
        this.darknessOverlay.style.opacity = '0';
        this.flickerOverlay.style.opacity = '0';
    }
}

window.LightFlickerSystem = LightFlickerSystem;