class GazeSystem {
    constructor(config) {
        this.target = config.target;
        this.threshold = config.threshold;
        this.duration = config.duration;
        this.current = 0;
        this.isTriggered = false;
    }

    check(theta, phi, deltaTime, currentRoomId) {
        if (this.isTriggered || currentRoomId !== 'bedroom_open') return false;
        
        let normalizedTheta = theta;
        while (normalizedTheta > Math.PI) normalizedTheta -= 2 * Math.PI;
        while (normalizedTheta < -Math.PI) normalizedTheta += 2 * Math.PI;
        
        const dTheta = Math.abs(normalizedTheta - this.target.theta);
        const dPhi = Math.abs(phi - this.target.phi);
        const dist = Math.sqrt(dTheta*dTheta + dPhi*dPhi);
        
        if (dist < this.threshold) {
            this.current += deltaTime;
            if (this.current >= this.duration) {
                this.trigger();
                return true;
            }
        } else {
            this.current = Math.max(0, this.current - deltaTime * 0.5);
        }
        return false;
    }

    trigger() {
        this.isTriggered = true;
        // triggerCorruptionはmain.jsで定義される
        if (typeof triggerCorruption === 'function') {
            triggerCorruption();
        }
    }

    reset() {
        this.isTriggered = false;
        this.current = 0;
    }
}

window.GazeSystem = GazeSystem;