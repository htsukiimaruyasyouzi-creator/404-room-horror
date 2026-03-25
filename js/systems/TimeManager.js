class TimeManager {
    constructor(config) {
        this.config = config;
        this.startTime = Date.now();
        this.duration = config.duration || 600000;
        this.mode = 'normal';
        this.goreTime = "4:04";
        this.timerElement = null;
        this.interval = null;
        this.onEndCallback = null;
        this.goreInterval = null; // ★グログリッチ用インターバル
        this.darkInterval = null; // ★暗い部屋グリッチ用インターバル
        
        // 浸食用プロパティ
        this.corruptionStartTime = null;
        this.corruptionInitialRemaining = 0;
        this.corruptionPhase = 'draining';
        this.drainSpeed = 20;
    }

    start() {
        this.startTime = Date.now();
        this.mode = 'normal';
        this.corruptionStartTime = null;
        this.corruptionPhase = 'draining';
        // グロインターバルが残っていればクリア
        if (this.goreInterval) {
            clearInterval(this.goreInterval);
            this.goreInterval = null;
        }
        this.createDisplay();
        this.interval = setInterval(() => this.update(), 100);
        console.log('[TimeManager] Started 10:00 countdown');
    }

    createDisplay() {
        this.timerElement = document.createElement('div');
        this.timerElement.id = 'game-timer';
        
        this.timerElement.style.position = 'fixed';
        this.timerElement.style.top = '30px';
        this.timerElement.style.right = '20px';
        this.timerElement.style.fontFamily = '"Share Tech Mono", monospace';
        this.timerElement.style.fontSize = '36px';
        this.timerElement.style.fontWeight = '400';
        this.timerElement.style.color = 'rgba(255, 50, 50, 0.95)';
        this.timerElement.style.textShadow = '0 0 20px rgba(255,0,0,0.6)';
        this.timerElement.style.zIndex = '10000';
        this.timerElement.style.letterSpacing = '4px';
        this.timerElement.style.pointerEvents = 'none';
        this.timerElement.style.transition = 'transform 0.05s'; // グリッチ用
        
        document.body.appendChild(this.timerElement);
    }

    update() {
        if (this.mode === 'ended') return;
        if (this.mode === 'gore') return; // グロモードは別処理（グリッチ）

        const now = Date.now();
        const elapsed = now - this.startTime;
        const remaining = this.duration - elapsed;

        if (this.mode === 'corrupted') {
            // 浸食開始時刻を記録（初回のみ）
            if (!this.corruptionStartTime) {
                this.corruptionStartTime = now;
                this.corruptionInitialRemaining = Math.max(0, remaining);
                this.corruptionPhase = 'draining';
                console.log(`[TimeManager] Draining ${this.corruptionInitialRemaining}ms at ${this.drainSpeed}x speed...`);
            }
            
            const elapsedSinceCorruption = now - this.corruptionStartTime;
            
            if (this.corruptionPhase === 'draining') {
                // フェーズ1：残り時間を高速で0に減らす
                const drainedAmount = elapsedSinceCorruption * this.drainSpeed;
                const currentRemaining = Math.max(0, this.corruptionInitialRemaining - drainedAmount);
                
                const mins = Math.floor(currentRemaining / 60000);
                const secs = Math.floor((currentRemaining % 60000) / 1000);
                const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                
                this.updateDisplay(timeStr, 'corrupted-draining');
                
                if (currentRemaining <= 0) {
                    this.corruptionPhase = 'negative';
                    this.corruptionStartTime = now;
                    console.log('[TimeManager] Reached 00:00, now counting into negative...');
                }
                
            } else {
                // フェーズ2：0になった後、通常速度でマイナス方向へ
                const negativeSeconds = Math.floor(elapsedSinceCorruption / 1000);
                const mins = Math.floor(negativeSeconds / 60);
                const secs = negativeSeconds % 60;
                const timeStr = `-${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                
                this.updateDisplay(timeStr, 'corrupted-negative');
            }
            
        } else {
            // 通常時：通常のカウントダウン
            if (remaining <= 0) {
                this.triggerEnd();
            } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                this.updateDisplay(timeStr, 'normal', remaining);
            }
        }
    }

    updateDisplay(timeStr, mode, remainingMs) {
        if (!this.timerElement) return;
        this.timerElement.textContent = timeStr;

        switch(mode) {
            case 'normal':
                if (remainingMs < 60000) {
                    this.timerElement.style.color = '#ff0000';
                    this.timerElement.style.animation = 'timerBlink 0.5s infinite';
                    this.timerElement.style.textShadow = '0 0 20px rgba(255,0,0,0.8)';
                } else if (remainingMs < 300000) {
                    this.timerElement.style.color = '#ff6600';
                    this.timerElement.style.animation = 'none';
                    this.timerElement.style.textShadow = '0 0 10px rgba(255,102,0,0.5)';
                } else {
                    this.timerElement.style.color = 'rgba(240, 63, 63, 0.9)';
                    this.timerElement.style.animation = 'none';
                    this.timerElement.style.textShadow = '0 0 10px rgba(0,0,0,0.8)';
                }
                break;

            case 'corrupted-draining':
                // 高速減少中：狂った色と強いグリッチ
                this.timerElement.style.color = '#ff0000';
                this.timerElement.style.textShadow = '2px 0 #00ff00, -2px 0 #0000ff, 0 0 30px #ff0000';
                this.timerElement.style.animation = 'glitchText 0.03s infinite';
                if (Math.random() < 0.2) {
                    this.timerElement.textContent = this.corruptText(timeStr);
                }
                this.timerElement.style.transform = `skewX(${Math.random() * 10 - 5}deg)`;
                break;

            case 'corrupted-negative':
                // マイナスカウント中：通常の狂気モード（少し落ち着いたグリッチ）
                this.timerElement.style.color = '#ff0000';
                this.timerElement.style.textShadow = '2px 0 #00ff00, -2px 0 #0000ff';
                this.timerElement.style.animation = 'glitchText 0.1s infinite';
                this.timerElement.style.transform = 'none';
                if (Math.random() < 0.1) {
                    this.timerElement.textContent = this.corruptText(timeStr);
                }
                break;

            case 'gore':
                // グロモードはstartGoreGlitchで管理するためここでは何もしない
                break;
        }
    }

    // ★★★ グロモード：不気味なグリッチ表示 ★★★
    startGoreGlitch() {
        if (this.goreInterval) clearInterval(this.goreInterval);
        
        let glitchCount = 0;
        this.goreInterval = setInterval(() => {
            if (this.mode !== 'gore' || !this.timerElement) {
                clearInterval(this.goreInterval);
                this.goreInterval = null;
                return;
            }
            
            glitchCount++;
            
            // ランダムにグリッチ（40%の確率）
            if (Math.random() < 0.4) {
                const glitchedTime = this.generateGoreTime();
                this.timerElement.textContent = glitchedTime;
                
                // 位置ズレ（震え）
                const offsetX = (Math.random() - 0.5) * 4;
                const offsetY = (Math.random() - 0.5) * 4;
                this.timerElement.style.transform = `translate(${offsetX}px, ${offsetY}px) skewX(${(Math.random()-0.5)*10}deg)`;
                
                // 色の変化（血の色が変わる）
                const colors = ['#8b0000', '#ff0000', '#660000', '#cc0000', '#ff3333'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                this.timerElement.style.color = randomColor;
                this.timerElement.style.textShadow = `0 0 ${20 + Math.random()*30}px ${randomColor}, 2px 0 #000`;
                
            } else {
                // 通常の4:04（ただし微細な揺れあり）
                this.timerElement.textContent = '4:04';
                this.timerElement.style.transform = `translate(${(Math.random()-0.5)*2}px, ${(Math.random()-0.5)*2}px)`;
                this.timerElement.style.color = '#8b0000';
                this.timerElement.style.textShadow = '0 0 30px rgba(139,0,0,1), 0 0 60px rgba(139,0,0,0.5)';
            }
            
            // 偶に大きなグリッチ（文字化け）
            if (glitchCount % 20 === 0 && Math.random() < 0.5) {
                this.timerElement.textContent = 'ERR';
                setTimeout(() => {
                    if (this.mode === 'gore' && this.timerElement) this.timerElement.textContent = '4:04';
                }, 100);
            }
            
        }, 80); // 80msごとに更新（高速チラつき）
    }

    generateGoreTime() {
        const variations = [
            '4:04', '4:0A', 'A:04', '4:4', '44', '404', 
            '4:04', '4:04', '4:04', // 通常を多めに
            'E:RR', '4:0?', '??:04', '4:04'
        ];
        return variations[Math.floor(Math.random() * variations.length)];
    }

    corruptText(text) {
        const glitchChars = '▓■□▒░404エラー00:00';
        return text.split('').map(c => {
            if (c === ':' || c === '-') return c;
            return Math.random() < 0.4 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : c;
        }).join('');
    }

    setCorruptedMode() {
        if (this.mode === 'corrupted' || this.mode === 'gore') return;
        console.log('[TimeManager] TIME CORRUPTION - Draining remaining time at high speed...');
        this.mode = 'corrupted';
        this.corruptionStartTime = null;
        
        document.body.style.filter = 'hue-rotate(90deg) contrast(1.2) brightness(1.1)';
        setTimeout(() => {
            document.body.style.filter = '';
        }, 300);
    }

    setGoreMode() {
        if (this.mode === 'gore') return;
        console.log('[TimeManager] Entering Gore Room - Time corrupted and glitching');
        this.mode = 'gore';
        this.startGoreGlitch();
    }

    // ★★★ 暗い部屋モード（かくれんぼ中のタイマーグリッチ）★★★
    setDarkMode() {
        if (this.mode === 'dark') return;
        console.log('[TimeManager] Entering Dark Room - Timer going crazy');
        // goreグリッチが動いていれば止める
        if (this.goreInterval) {
            clearInterval(this.goreInterval);
            this.goreInterval = null;
        }
        this.mode = 'dark';
        this.startDarkGlitch();
    }

    startDarkGlitch() {
        if (this.darkInterval) clearInterval(this.darkInterval);

        const darkChars = ['?', '?', ' ', '　', ':', ':', '0', '0', '　', '　', '▓', '░'];
        let tick = 0;

        this.darkInterval = setInterval(() => {
            if (this.mode !== 'dark' || !this.timerElement) {
                clearInterval(this.darkInterval);
                this.darkInterval = null;
                return;
            }
            tick++;

            // 40%の確率でグリッチ
            if (Math.random() < 0.4) {
                // 数字をランダムな文字に置き換え
                const glitched = Array.from({length: 5}, (_, i) => {
                    if (i === 2) return ':'; // コロンは残す
                    return Math.random() < 0.5
                        ? darkChars[Math.floor(Math.random() * darkChars.length)]
                        : String(Math.floor(Math.random() * 10));
                }).join('');
                this.timerElement.textContent = glitched;
            } else if (Math.random() < 0.15) {
                // たまに完全に消える
                this.timerElement.textContent = '　　:　　';
            }

            // 色を暗く・不安定に
            const alpha = 0.3 + Math.random() * 0.5;
            this.timerElement.style.color = `rgba(180, 180, 200, ${alpha})`;
            this.timerElement.style.textShadow = Math.random() < 0.3
                ? `0 0 10px rgba(100,100,255,0.4), ${(Math.random()-0.5)*4}px 0 rgba(0,0,200,0.3)`
                : 'none';
            this.timerElement.style.transform = `translate(${(Math.random()-0.5)*3}px, ${(Math.random()-0.5)*2}px)`;
            this.timerElement.style.animation = 'none';

            // たまに一瞬だけ点滅
            if (tick % 30 === 0 && Math.random() < 0.4) {
                this.timerElement.style.opacity = '0';
                setTimeout(() => {
                    if (this.timerElement) this.timerElement.style.opacity = '1';
                }, 80 + Math.random() * 150);
            }

        }, 120);
    }

    setNormalMode() {
        // goreインターバル停止
        if (this.goreInterval) {
            clearInterval(this.goreInterval);
            this.goreInterval = null;
        }
        // darkインターバル停止
        if (this.darkInterval) {
            clearInterval(this.darkInterval);
            this.darkInterval = null;
        }
        if (this.mode === 'gore' || this.mode === 'dark') {
            this.mode = 'corrupted';
        }
        // タイマー表示をリセット
        if (this.timerElement) {
            this.timerElement.style.opacity = '1';
            this.timerElement.style.transform = 'none';
        }
    }

    triggerEnd() {
        this.mode = 'ended';
        if (this.goreInterval) {
            clearInterval(this.goreInterval);
            this.goreInterval = null;
        }
        if (this.darkInterval) {
            clearInterval(this.darkInterval);
            this.darkInterval = null;
        }
        clearInterval(this.interval);
        if (this.onEndCallback) {
            this.onEndCallback();
        }
    }

    reset() {
        if (this.goreInterval) {
            clearInterval(this.goreInterval);
            this.goreInterval = null;
        }
        if (this.darkInterval) {
            clearInterval(this.darkInterval);
            this.darkInterval = null;
        }
        clearInterval(this.interval);
        this.mode = 'normal';
        this.startTime = Date.now();
        this.corruptionStartTime = null;
        this.corruptionPhase = 'draining';
        if (this.timerElement) {
            this.timerElement.remove();
            this.timerElement = null;
        }
        this.start();
    }

    getTimeString() {
        return this.timerElement ? this.timerElement.textContent : '00:00';
    }
}

window.TimeManager = TimeManager;