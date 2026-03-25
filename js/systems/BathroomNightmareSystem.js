class BathroomNightmareSystem {
    constructor() {
        this.isActive = false;
        this.textureLoader = new THREE.TextureLoader();
        this.textures = {
            window: 'si1.png',
            door: 'si2.png',
            mirror: 'si3.png',
            base: 'ti4.png',
            si4: 'si4.png',
            si5: 'si5.png', 
            si6: 'si6.png',
            si7: 'si10.png'
        };
        
        // ★★★ 各音声に個別の音量を設定 ★★★
        this.sounds = {
            resist: { 
                path: 'sounds/resist.mp3', 
                volume: 0.3    // 抵抗音は小さめ
            },
            jumpscare: { 
                path: 'sounds/saigonoonnna.mp3', 
                volume: 1.0    // ジャンプスケアは最大
            },
            akanoonnna: { 
                path: 'sounds/akanoonnna.mp3',  // カメラ乗っ取り時（ループ）
                volume: 0.7
            },
            zigoku: { 
                path: 'sounds/zigoku.mp3',      // 地獄モード（ループ）
                volume: 0.8
            }
        };
        
        // ★★★ BGM管理用 ★★★
        this.currentBgm = null;
        this.bgmAudio = null;
        
        this.originalFov = 75;
        this.originalCameraPos = { x: 0, y: 0, z: 0 };
        this._wheelBlocker = null;
        this._resistBlocker = null;
        this._mouseBlocker = null;
        this.noiseCanvas = null;
        this.noiseCtx = null;
        this.noiseAnimationId = null;
        this.chaosIntervals = [];
        
        this.resistPower = 0;
        this.shakeIntensity = 0;
        
        this.currentTheta = 0;
        this.currentPhi = Math.PI / 2;
        
        this.positions = {
            window: { theta: 0.25, phi: 1.30 },
            door: { theta: -2.51, phi: 1.56 },
            mirror: { theta: 2.43, phi: 1.56 }
        };
        
        this.freedomInputHandler = null;
        this.hasStartedMoving = false;
        
        // プリロード
        this.jumpscareAudio = new Audio(this.sounds.jumpscare.path);
        this.jumpscareAudio.preload = 'auto';
        this.jumpscareAudio.load();
    }

    // ★★★ BGM再生（ループ）★★★
    playBgm(soundKey) {
        // 既存のBGMがあれば停止
        this.stopBgm();
        
        const sound = this.sounds[soundKey];
        if (!sound) {
            console.error('[Audio] BGM not found:', soundKey);
            return;
        }
        
        try {
            this.bgmAudio = new Audio(sound.path);
            this.bgmAudio.volume = sound.volume;
            this.bgmAudio.loop = true;  // ループ設定
            this.bgmAudio.preload = 'auto';
            
            this.bgmAudio.play().then(() => {
                this.currentBgm = soundKey;
                console.log('[Audio] BGM started:', soundKey, 'Volume:', sound.volume);
            }).catch(e => {
                console.error('[Audio] BGM play failed:', e);
            });
            
            // エラーハンドリング
            this.bgmAudio.onerror = (e) => {
                console.error('[Audio] BGM error:', soundKey, e);
            };
            
        } catch (e) {
            console.error('[Audio] BGM init error:', e);
        }
    }

    // ★★★ BGM停止 ★★★
    stopBgm() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
            console.log('[Audio] BGM stopped:', this.currentBgm);
            this.currentBgm = null;
        }
    }

    // ★★★ BGM切り替え（即座に）★★★
    switchBgm(soundKey) {
        console.log('[Audio] Switching BGM to:', soundKey);
        this.stopBgm();
        this.playBgm(soundKey);
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        
        console.log('[BathroomNightmare] 発動開始');
        
        window.isBathroomNightmareActive = true;
        window.isInputLocked = true;
        this.hasStartedMoving = false;
        
        this.resistPower = 0;
        this.shakeIntensity = 0;
        
        this.currentTheta = window.theta || 0;
        this.currentPhi = window.phi || Math.PI / 2;
        
        while (this.currentTheta > Math.PI) this.currentTheta -= 2 * Math.PI;
        while (this.currentTheta < -Math.PI) this.currentTheta += 2 * Math.PI;
        
        this.forceCameraPosition(this.currentTheta, this.currentPhi);
        
        this.hideHotspots();
        this.setupResistInput();
        this.lockFov();
        
        setTimeout(() => {
            this.runSequence();
        }, 100);
    }

    setupResistInput() {
        this._resistBlocker = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.resistPower = Math.min(1, this.resistPower + 0.15);
            this.shakeIntensity = Math.min(8, this.shakeIntensity + 1.5);
            
            const reverseForce = 0.08;
            this.currentTheta += (Math.random() - 0.5) * reverseForce * 2;
            this.currentPhi = Math.max(0.1, Math.min(Math.PI - 0.1, 
                this.currentPhi + (Math.random() - 0.5) * reverseForce));
            
            if (Math.random() > 0.8) {
                this.playResistSound();
            }
            
            return false;
        };
        
        document.addEventListener('mousemove', this._resistBlocker, { passive: false, capture: true });
        
        this._mouseBlocker = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        document.addEventListener('mousedown', this._mouseBlocker, { passive: false, capture: true });
        
        this._wheelBlocker = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        window.addEventListener('wheel', this._wheelBlocker, { passive: false, capture: true });
    }

    playResistSound() {
        try {
            const sound = this.sounds.resist;
            const audio = new Audio(sound.path);
            audio.volume = sound.volume;
            audio.play().catch(e => console.log('[Audio] 抵抗音再生失敗:', e));
        } catch (e) {
            console.error('[Audio] 抵抗音エラー:', e);
        }
    }

    lockFov() {
        if (window.camera) {
            this.originalFov = window.camera.fov;
            this.originalCameraPos = {
                x: window.camera.position.x,
                y: window.camera.position.y,
                z: window.camera.position.z
            };
            window.camera.fov = 85;
            window.camera.updateProjectionMatrix();
        }
        this._fovLocker = setInterval(() => {
            if (window.camera && window.camera.fov !== 85) {
                window.camera.fov = 85;
                window.camera.updateProjectionMatrix();
            }
        }, 100);
    }

    hideHotspots() {
        const container = document.getElementById('hotspots-container');
        if (container) container.style.display = 'none';
    }

    startNoise() {
        if (this.noiseCanvas) return;
        
        const canvas = document.createElement('canvas');
        canvas.id = 'movement-noise';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.35;
            mix-blend-mode: color-dodge;
        `;
        
        document.body.appendChild(canvas);
        this.noiseCanvas = canvas;
        this.noiseCtx = canvas.getContext('2d');
        
        const renderNoise = () => {
            if (!this.noiseCanvas) return;
            const w = this.noiseCanvas.width;
            const h = this.noiseCanvas.height;
            const ctx = this.noiseCtx;
            
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(0, 0, w, h);
            
            const lineCount = 2 + Math.floor(Math.random() * 4);
            for (let i = 0; i < lineCount; i++) {
                const y = Math.random() * h;
                const height = 1 + Math.random() * 2;
                const width = (0.1 + Math.random() * 0.4) * w;
                const x = Math.random() * (w - width);
                
                const r = Math.random() > 0.5 ? 200 + Math.floor(Math.random() * 55) : 0;
                const g = Math.random() > 0.7 ? 150 + Math.floor(Math.random() * 105) : 0;
                const b = Math.random() > 0.6 ? 150 + Math.floor(Math.random() * 105) : 0;
                
                ctx.fillStyle = `rgba(${r},${g},${b},${0.4 + Math.random() * 0.4})`;
                ctx.fillRect(x, y, width, height);
                
                if (Math.random() > 0.7) {
                    ctx.fillStyle = `rgba(${r},${g},${b},0.1)`;
                    ctx.fillRect(x, y - 2, width, height + 4);
                }
            }
            
            if (Math.random() > 0.75) {
                const blockW = 30 + Math.random() * 80;
                const blockH = 20 + Math.random() * 40;
                const x = Math.random() * (w - blockW);
                const y = Math.random() * (h - blockH);
                
                ctx.fillStyle = `rgba(${Math.random()*100},${Math.random()*200},${Math.random()*255},0.25)`;
                ctx.fillRect(x, y, blockW, blockH);
                
                ctx.fillStyle = `rgba(255,255,255,0.15)`;
                for(let j=0; j<2; j++) {
                    ctx.fillRect(x, y + Math.random()*blockH, blockW, 1);
                }
            }
            
            this.noiseAnimationId = requestAnimationFrame(renderNoise);
        };
        
        renderNoise();
    }

    stopNoise() {
        if (this.noiseAnimationId) {
            cancelAnimationFrame(this.noiseAnimationId);
            this.noiseAnimationId = null;
        }
        if (this.noiseCanvas) {
            this.noiseCanvas.remove();
            this.noiseCanvas = null;
            this.noiseCtx = null;
        }
    }

    forceCameraPosition(theta, phi) {
        if (!window.camera) return;
        
        const radius = 1;
        const x = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.cos(theta);
        
        window.camera.lookAt(x, y, z);
        window.camera.updateMatrixWorld(true);
        window.camera.updateProjectionMatrix();
        
        window.theta = theta;
        window.phi = phi;
    }

    async runSequence() {
        // ★★★ カメラ乗っ取り開始時：あかのおんなBGMをループ再生 ★★★
        this.playBgm('akanoonnna');
        
        const MOVE_DURATION = 6000;
        
        await this.moveTo(this.positions.window.theta, this.positions.window.phi, MOVE_DURATION);
        await this.wait(1500);
        await this.irregularFlicker(this.textures.window, this.textures.base, 2000);
        
        await this.moveTo(this.positions.door.theta, this.positions.door.phi, MOVE_DURATION);
        await this.wait(1500);
        await this.irregularFlicker(this.textures.door, this.textures.base, 2000);
        
        await this.moveTo(this.positions.mirror.theta, this.positions.mirror.phi, MOVE_DURATION);
        await this.wait(1500);
        await this.irregularFlicker(this.textures.mirror, this.textures.base, 2000);
        
        console.log('[BathroomNightmare] 停電開始');
        await this.flickerLights(3000);
        
        console.log('[BathroomNightmare] カオスフェーズ開始');
        await this.chaoticPhase();
    }

    async flickerLights(duration) {
        const startTime = performance.now();
        const darknessOverlay = document.getElementById('darkness-overlay');
        
        const flickerPattern = [
            { on: 100, off: 50 },
            { on: 80, off: 120 },
            { on: 50, off: 80 },
            { on: 150, off: 100 },
            { on: 60, off: 200 },
            { on: 100, off: 50 },
        ];
        
        let patternIndex = 0;
        
        const flickerLoop = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed >= duration) {
                if (darknessOverlay) darknessOverlay.style.opacity = '0';
                return;
            }
            
            const pattern = flickerPattern[patternIndex % flickerPattern.length];
            
            if (darknessOverlay) darknessOverlay.style.opacity = '0';
            
            setTimeout(() => {
                if (darknessOverlay) darknessOverlay.style.opacity = '0.95';
                
                setTimeout(() => {
                    patternIndex++;
                    flickerLoop();
                }, pattern.off);
            }, pattern.on);
        };
        
        if (darknessOverlay) darknessOverlay.style.opacity = '0.95';
        flickerLoop();
        
        await this.wait(duration);
        
        if (darknessOverlay) darknessOverlay.style.opacity = '0';
    }

    async chaoticPhase() {
        // ★★★ si4.pngに切り替わった瞬間：地獄BGMに即座に切り替え ★★★
        this.switchBgm('zigoku');
        
        const CHAOS_DURATION = 15000;
        
        const chaosTextures = [
            this.textures.si4,
            this.textures.si5, 
            this.textures.si6,
            this.textures.base
        ];
        
        const textureInterval = setInterval(() => {
            const randomTex = chaosTextures[Math.floor(Math.random() * chaosTextures.length)];
            this.loadTexture(randomTex);
        }, 50);
        this.chaosIntervals.push(textureInterval);
        
        const moveInterval = setInterval(() => {
            const randomTheta = this.currentTheta + (Math.random() - 0.5) * 2.0;
            const randomPhi = Math.max(0.2, Math.min(Math.PI - 0.2, 
                this.currentPhi + (Math.random() - 0.5) * 1.0));
            
            this.forceCameraPosition(randomTheta, randomPhi);
            
            this.currentTheta = randomTheta;
            this.currentPhi = randomPhi;
        }, 100);
        this.chaosIntervals.push(moveInterval);
        
        this.startNoise();
        if (this.noiseCanvas) {
            this.noiseCanvas.style.opacity = '0.6';
        }
        
        await this.wait(CHAOS_DURATION);
        
        this.chaosIntervals.forEach(interval => clearInterval(interval));
        this.chaosIntervals = [];
        
        console.log('[BathroomNightmare] カオス終了 - 自由視点フェーズへ');
        
        this.loadTexture(this.textures.base);
        
        this.stopNoise();
        
        if (this.noiseCanvas) {
            this.noiseCanvas.style.opacity = '0';
        }
        
        const darknessOverlay = document.getElementById('darkness-overlay');
        if (darknessOverlay) {
            darknessOverlay.style.opacity = '0';
        }
        
        if (window.renderer && window.renderer.domElement) {
            window.renderer.domElement.style.opacity = '1';
            window.renderer.domElement.style.transition = 'opacity 0.5s';
        }
        
        this.forceCameraPosition(this.currentTheta, this.currentPhi);
        
        if (this._resistBlocker) {
            document.removeEventListener('mousemove', this._resistBlocker, { capture: true });
            this._resistBlocker = null;
        }
        if (this._mouseBlocker) {
            document.removeEventListener('mousedown', this._mouseBlocker, { capture: true });
            this._mouseBlocker = null;
        }
        if (this._wheelBlocker) {
            window.removeEventListener('wheel', this._wheelBlocker, { capture: true });
            this._wheelBlocker = null;
        }
        
        if (this._fovLocker) {
            clearInterval(this._fovLocker);
            this._fovLocker = null;
        }
        
        if (window.camera) {
            window.camera.fov = this.originalFov;
            window.camera.updateProjectionMatrix();
        }
        
        window.isBathroomNightmareActive = false;
        window.isInputLocked = false;
        
        // ★★★ 自由移動モードになる直前にBGMを停止 ★★★
        this.stopBgm();
        
        console.log('[BathroomNightmare] 画面を動かしてください...（移動は不可）');
        
        await this.waitForInputAndThenJump();
    }

    async waitForInputAndThenJump() {
        return new Promise((resolve) => {
            let inputDetected = false;
            
            const detectInput = (e) => {
                if (inputDetected) return;
                inputDetected = true;
                
                console.log('[BathroomNightmare] 入力検知 - 8秒後にジャンプスケア');
                
                document.removeEventListener('mousemove', detectInput);
                document.removeEventListener('touchmove', detectInput);
                document.removeEventListener('wheel', detectInput);
                
                setTimeout(() => {
                    this.executeJumpscareSequence().then(resolve);
                }, 8000);
            };
            
            document.addEventListener('mousemove', detectInput, { passive: true });
            document.addEventListener('touchmove', detectInput, { passive: true });
            document.addEventListener('wheel', detectInput, { passive: true });
        });
    }

    async executeJumpscareSequence() {
        console.log('[BathroomNightmare] ジャンプスケア実行');
        
        window.isInputLocked = true;
        
        await this.showJumpscare();
        
        console.log('[BathroomNightmare] 全イベント終了 - 404.htmへ遷移');
        
        localStorage.setItem('returnFromHell', 'true');
        
        this.disableBeforeUnload();
        
        // 黒画面から404遷移までを短縮（約3秒）
        setTimeout(() => {
            window.location.replace('./404.htm');
        }, 3000);
    }

    disableBeforeUnload() {
        if (typeof isGameActive !== 'undefined') {
            isGameActive = false;
        }
        
        window.onbeforeunload = null;
        
        if (typeof beforeUnloadHandler !== 'undefined' && beforeUnloadHandler) {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
        }
        
        window.onbeforeunload = null;
        
        console.log('[BathroomNightmare] beforeunload解除完了');
    }

    async showJumpscare() {
        return new Promise((resolve) => {
            const finalOverlay = document.getElementById('final-jumpscare');
            const finalImage = document.getElementById('jumpscare-image');
            
            if (!finalOverlay || !finalImage) {
                console.error('[BathroomNightmare] DOM要素が見つかりません');
                resolve();
                return;
            }
            
            const updateSize = () => {
                finalOverlay.style.width = window.innerWidth + 'px';
                finalOverlay.style.height = window.innerHeight + 'px';
            };
            updateSize();
            
            const resizeHandler = () => updateSize();
            window.addEventListener('resize', resizeHandler);
            
            const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
            const fsHandler = () => {
                setTimeout(updateSize, 100);
                setTimeout(updateSize, 300);
            };
            fullscreenEvents.forEach(e => document.addEventListener(e, fsHandler));
            
            const imgSrc = this.textures.si7;
            const img = new Image();
            
            img.onload = () => {
                if (window.renderer && window.renderer.domElement) {
                    window.renderer.domElement.style.opacity = '0';
                }
                
                finalImage.src = imgSrc;
                finalImage.style.width = '100%';
                finalImage.style.height = '100%';
                finalImage.style.objectFit = 'contain';
                finalImage.style.objectPosition = 'center center';
                finalImage.style.opacity = '1';
                finalImage.style.transform = 'scale(1)';
                
                finalOverlay.style.display = 'block';
                finalOverlay.style.zIndex = '100000';
                finalOverlay.classList.add('active');
                
                // ここで音声再生（jumpscare音）
                this.playJumpscareSound();
                
                if (navigator.vibrate) {
                    navigator.vibrate([500, 100, 500, 100, 800]);
                }
                
                // 3秒後にフェードアウト開始
                setTimeout(() => {
                    finalImage.style.transition = 'opacity 0.5s';
                    finalImage.style.opacity = '0';
                }, 3000);
                
                // 6.5秒後に終了（音声が最後まで流れる）
                setTimeout(() => {
                    window.removeEventListener('resize', resizeHandler);
                    fullscreenEvents.forEach(e => document.removeEventListener(e, fsHandler));
                    
                    finalOverlay.classList.remove('active');
                    finalOverlay.style.display = 'none';
                    finalImage.style.opacity = '1';
                    finalImage.style.transform = 'scale(1.1)';
                    
                    resolve();
                }, 6500);
            };
            
            img.onerror = () => {
                console.error('[BathroomNightmare] 画像読み込み失敗:', imgSrc);
                finalOverlay.style.display = 'block';
                finalOverlay.style.zIndex = '100000';
                finalOverlay.style.background = '#8b0000';
                
                setTimeout(() => {
                    window.removeEventListener('resize', resizeHandler);
                    fullscreenEvents.forEach(e => document.removeEventListener(e, fsHandler));
                    finalOverlay.style.display = 'none';
                    finalOverlay.style.background = '#000';
                    resolve();
                }, 3000);
            };
            
            img.src = imgSrc;
            
            setTimeout(() => {
                if (!finalOverlay.classList.contains('active')) resolve();
            }, 5000);
        });
    }

    // ジャンプスケア音（個別音量設定対応版）
    playJumpscareSound() {
        try {
            const sound = this.sounds.jumpscare;
            const audio = new Audio(sound.path);
            audio.volume = sound.volume;  // 1.0が適用される
            
            console.log('[Audio] Playing jumpscare:', sound.path, 'Volume:', sound.volume);
            
            audio.play().catch(e => {
                console.error('[Audio] Play failed:', e);
            });
        } catch (e) {
            console.error('[Audio] Error:', e);
        }
    }

    async irregularFlicker(tex1, tex2, duration) {
        const startTime = performance.now();
        let useFirst = true;
        this.loadTexture(tex1);
        
        const flickerLoop = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed >= duration) {
                this.loadTexture(this.textures.base);
                return;
            }
            
            const nextInterval = 30 + Math.random() * 120;
            
            setTimeout(() => {
                useFirst = !useFirst;
                this.loadTexture(useFirst ? tex1 : tex2);
                flickerLoop();
            }, nextInterval);
        };
        
        flickerLoop();
        await this.wait(duration);
    }

    loadTexture(path) {
        if (!window.sphere || !window.sphere.material) return;
        this.textureLoader.load(path, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            window.sphere.material.map = texture;
            window.sphere.material.needsUpdate = true;
        });
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    moveTo(targetTheta, targetPhi, duration) {
        return new Promise(resolve => {
            this.startNoise();
            
            const startTheta = this.currentTheta;
            const startPhi = this.currentPhi;
            
            let normalizedTargetTheta = targetTheta;
            while (normalizedTargetTheta > Math.PI) normalizedTargetTheta -= 2 * Math.PI;
            while (normalizedTargetTheta < -Math.PI) normalizedTargetTheta += 2 * Math.PI;
            
            let diffTheta = normalizedTargetTheta - startTheta;
            while (diffTheta > Math.PI) diffTheta -= 2 * Math.PI;
            while (diffTheta < -Math.PI) diffTheta += 2 * Math.PI;
            
            const diffPhi = targetPhi - startPhi;
            
            const startTime = performance.now();
            
            const step = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const resistForce = this.resistPower * 0.4 * Math.sin(progress * Math.PI);
                
                const t = progress < 0.5 
                    ? 4 * Math.pow(progress, 3) 
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                let currentTheta = startTheta + diffTheta * t;
                let currentPhi = startPhi + diffPhi * t;
                
                if (this.resistPower > 0.05) {
                    currentTheta -= diffTheta * resistForce * 0.3;
                    currentPhi -= diffPhi * resistForce * 0.3;
                }
                
                if (this.shakeIntensity > 0.5) {
                    const shakeBase = this.shakeIntensity * 0.05;
                    const shakeX = (Math.random() - 0.5) * shakeBase;
                    const shakeY = (Math.random() - 0.5) * shakeBase;
                    const shakeZ = (Math.random() - 0.5) * shakeBase * 0.5;
                    
                    const r = 1;
                    const x = r * Math.sin(currentPhi) * Math.sin(currentTheta) + shakeX;
                    const y = r * Math.cos(currentPhi) + shakeY;
                    const z = r * Math.sin(currentPhi) * Math.cos(currentTheta) + shakeZ;
                    
                    if (window.camera) {
                        window.camera.lookAt(x, y, z);
                        
                        if (this.shakeIntensity > 1.0) {
                            window.camera.fov = 85 + (Math.random() - 0.5) * this.shakeIntensity * 2;
                            window.camera.updateProjectionMatrix();
                        }
                    }
                    
                    this.shakeIntensity *= 0.95;
                } else {
                    this.shakeIntensity = 0;
                    
                    const r = 1;
                    const x = r * Math.sin(currentPhi) * Math.sin(currentTheta);
                    const y = r * Math.cos(currentPhi);
                    const z = r * Math.sin(currentPhi) * Math.cos(currentTheta);
                    
                    if (window.camera) {
                        window.camera.lookAt(x, y, z);
                        if (window.camera.fov !== 85) {
                            window.camera.fov = 85;
                            window.camera.updateProjectionMatrix();
                        }
                    }
                }
                
                window.theta = currentTheta;
                window.phi = currentPhi;
                
                if (this.resistPower < 0.01) this.resistPower = 0;
                else this.resistPower *= 0.92;
                
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    this.currentTheta = normalizedTargetTheta;
                    this.currentPhi = targetPhi;
                    this.stopNoise();
                    resolve();
                }
            };
            
            step();
        });
    }

    showHotspots() {
        const container = document.getElementById('hotspots-container');
        if (container) container.style.display = 'block';
    }
}

window.BathroomNightmareSystem = BathroomNightmareSystem;