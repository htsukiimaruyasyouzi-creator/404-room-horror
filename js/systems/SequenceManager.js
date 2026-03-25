class SequenceManager {
    constructor(config) {
        this.route = config.route;
        this.targetRoom = config.targetRoom;
        this.currentStep = 0;
        this.isComplete = false;
        this.indicator = document.getElementById('sequence-indicator');
        this.countSpan = document.getElementById('seq-count');
    }
    
    validateMove(fromRoomId, toRoomId) {
        console.log(`[Sequence] Validating: from=${fromRoomId}, to=${toRoomId}, step=${this.currentStep}, expected=${this.route[this.currentStep]}, isComplete=${this.isComplete}`);
        
        // ★修正：isComplete後、次に「居室(bedroom)」へ移動したときに停電発動
        // （玄関でisCompleteになり、そこから居室に移動したタイミング）
        if (this.isComplete && toRoomId === 'bedroom') {
            this.isComplete = false;
            this.reset();
            console.log('[Sequence] Triggering special room:', this.targetRoom);
            return this.targetRoom;  // bedroom_dark へ飛ばす
        }

        if (fromRoomId.includes('_red') || fromRoomId.includes('_gore') || fromRoomId === 'bedroom_open' || fromRoomId.includes('_dark')) {
            console.log('[Sequence] Resetting due to special room departure:', fromRoomId);
            this.reset();
            return toRoomId;
        }
        
        const expectedRoom = this.route[this.currentStep];
        
        if (toRoomId === expectedRoom) {
            this.currentStep++;
            this.updateUI();
            console.log('[Sequence] Progressed to step:', this.currentStep);
            
            if (this.currentStep >= this.route.length) {
                this.complete();
            }
            return toRoomId;
        } else if (toRoomId !== fromRoomId) {
            console.log('[Sequence] Resetting: unexpected move. Got', toRoomId, 'expected', expectedRoom);
            this.reset();
            return toRoomId;
        }
        
        return toRoomId;
    }
    
    complete() {
        this.isComplete = true;
        this.showCompleteEffect();
        this.currentStep = 0;
        this.updateUI();
        console.log('[Sequence] Completed! 次の居室移動で停電発動');
    }
    
    reset() {
        this.currentStep = 0;
        this.isComplete = false;
        this.updateUI();
    }
    
    updateUI() {
        if (this.countSpan) {
            this.countSpan.textContent = this.isComplete ? '完' : this.currentStep;
        }
        if (this.indicator) {
            if (this.currentStep > 0 || this.isComplete) {
                this.indicator.classList.add('active');
                if (this.isComplete) {
                    this.indicator.innerHTML = '[ シーケンス：<span style="color: #ff0000; font-weight: bold;">次の居室で発動</span> ]';
                } else {
                    this.indicator.innerHTML = `[ シーケンス：<span id="seq-count">${this.currentStep}</span>/8 ]`;
                }
            } else {
                this.indicator.classList.remove('active');
                this.indicator.innerHTML = '[ シーケンス：<span id="seq-count">0</span>/8 ]';
            }
        }
    }
    
    showCompleteEffect() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle, rgba(255,0,0,0.4) 0%, rgba(0,0,0,0) 70%);
            opacity: 0; pointer-events: none; z-index: 9995;
            transition: opacity 0.2s;
        `;
        document.body.appendChild(flash);
        
        requestAnimationFrame(() => {
            flash.style.opacity = '1';
            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 200);
            }, 300);
        });
    }
}

// グローバル登録
window.SequenceManager = SequenceManager;