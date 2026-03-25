class PeripheralVisionSystem {
    constructor(config) {
        this.config = config;
        this.container = document.getElementById('peripheral-container');
        this.lastTriggerTime = 0;
        this.cooldown = 15000;
        this.isPeeking = false;
        this.debugMode = false;
    }
    
    update(theta, phi, currentRoomId) {
        if (this.debugMode || !currentRoomId.includes('entrance')) {
            this.hide();
            return;
        }
        
        const now = performance.now();
        
        let normalizedTheta = theta;
        while (normalizedTheta > Math.PI) normalizedTheta -= 2 * Math.PI;
        while (normalizedTheta < -Math.PI) normalizedTheta += 2 * Math.PI;
        
        const dTheta = Math.abs(normalizedTheta - this.config.suspiciousTheta);
        const dPhi = Math.abs(phi - this.config.suspiciousPhi);
        const dist = Math.sqrt(dTheta*dTheta + dPhi*dPhi);
        
        if (dist < this.config.peripheralThreshold) {
            if (this.isPeeking) this.hide();
            return;
        }
        
        if (this.isPeeking) return;
        if (now - this.lastTriggerTime < this.cooldown) return;
        
        if (Math.random() < this.config.peripheralChance) {
            this.trigger();
            this.lastTriggerTime = now;
        }
    }
    
    trigger(isTest = false) {
        this.isPeeking = true;
        const isLeft = Math.random() > 0.5;
        
        const figure = document.createElement('div');
        figure.className = `peeking-figure ${isLeft ? 'left' : 'right'}`;
        
        const img = document.createElement('img');
        img.src = 'aka(1).png'; // ★修正
        img.alt = '';
        
        figure.appendChild(img);
        this.container.appendChild(figure);
        this.currentFigure = figure;
        
        figure.offsetHeight;
        
        requestAnimationFrame(() => {
            figure.classList.add(isLeft ? 'peeking-left' : 'peeking-right');
        });
        
        if (!isTest && !this.debugMode) {
            const duration = 50 + Math.random() * 100;
            setTimeout(() => this.hide(), duration);
        }
    }
    
    testShow() {
        this.hide();
        setTimeout(() => {
            this.debugMode = true;
            this.trigger(true);
        }, 50);
    }
    
    testHide() {
        this.debugMode = false;
        this.hide();
    }
    
    hide() {
        if (this.currentFigure) {
            this.currentFigure.classList.add('hiding');
            setTimeout(() => {
                if (this.currentFigure) this.currentFigure.remove();
                this.currentFigure = null;
                this.isPeeking = false;
            }, 150);
        }
    }
    
    reset() {
        this.debugMode = false;
        this.container.innerHTML = '';
        this.currentFigure = null;
        this.isPeeking = false;
        this.lastTriggerTime = 0;
    }
}

window.PeripheralVisionSystem = PeripheralVisionSystem;