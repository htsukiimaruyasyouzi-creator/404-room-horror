class MitanaSystem {
    constructor(config) {
        this.config = config;
        this.gazeCount = 0;
        this.isGazing = false;
        this.hasGazed = false;
        this.isActive = false;
        this.timeRemaining = 20;
        this.currentStage = 0;
        this.isMaxStage = false;

        this.rightHand = document.getElementById('right-hand');
        this.leftHand = document.getElementById('left-hand');
        this.overlay = document.getElementById('mitana-overlay');
        this.flash = document.getElementById('mirror-flash');
        this.vignette = document.getElementById('blood-vignette');

        this.timer = null;
        this.countdown = null;
        this.textureLoader = new THREE.TextureLoader();
        this.isPreventingEscape = false;
        
        this.originalHotspotStates = [];
        
        // ★★★ 効果音パスを一元管理 ★★★
        this.sounds = {
            heartbeat: 'sounds/heartbeat.mp3',    // 心音
            creeping: 'sounds/creeping.mp3',      // 這い寄る音
            whoosh: 'sounds/whoosh.mp3',          // 風切り音
            grab: 'sounds/grab.mp3',              // 掴む音
            mitana: 'sounds/mitana.mp3',          // ★ミタナMAX時
            te: 'sounds/te.mp3'                   // ★手が出る時
        };
        this.mitanaAudio = null;
    }

    start() {
        this.fullReset();
        this.isActive = true;
        this.gazeCount = 0;
        this.currentStage = 0;
        this.isMaxStage = false;
        this.timeRemaining = 20;
        this.hasGazed = false;
        this.isPreventingEscape = false;

        if (this.overlay) this.overlay.style.display = 'block';
        if (this.vignette) this.vignette.style.opacity = '0.2';

        if (this.rightHand) {
            this.rightHand.style.display = 'none';
            this.leftHand.style.display = 'none';
            this.rightHand.classList.remove('cover-camera', 'hand-tremble', 'hand-release');
            this.leftHand.classList.remove('cover-camera', 'hand-tremble', 'hand-release');
        }

        this.startCountdown();
        console.log('[Mitana] Started fresh - Threshold:', this.config.threshold);
    }

    startCountdown() {
        if (this.countdown) clearInterval(this.countdown);
        this.countdown = setInterval(() => {
            this.timeRemaining--;
            if (this.timeRemaining <= 0) {
                this.end(false);
            }
        }, 1000);
    }

    update(theta, phi, deltaTime) {
        if (!this.isActive || this.isPreventingEscape) return;
        if (this.isMaxStage) return;

        let normalizedTheta = theta;
        while (normalizedTheta > Math.PI) normalizedTheta -= 2 * Math.PI;
        while (normalizedTheta < -Math.PI) normalizedTheta += 2 * Math.PI;

        const dTheta = Math.abs(normalizedTheta - this.config.mirrorTheta);
        const dPhi = Math.abs(phi - this.config.mirrorPhi);
        const dist = Math.sqrt(dTheta*dTheta + dPhi*dPhi);

        if (dist < this.config.threshold) {
            if (!this.isGazing) {
                this.isGazing = true;
                this.blockMovement(true);
                
                if (!this.hasGazed) {
                    this.advanceStage();
                    this.hasGazed = true;
                }
            }
        } else {
            if (this.isGazing) {
                this.blockMovement(false);
            }
            this.isGazing = false;
            this.hasGazed = false;
        }
    }

    blockMovement(block) {
        const hotspots = document.querySelectorAll('.hotspot-marker');
        
        if (block) {
            this.originalHotspotStates = [];
            hotspots.forEach((el, index) => {
                this.originalHotspotStates[index] = {
                    pointerEvents: el.style.pointerEvents,
                    opacity: el.style.opacity,
                    active: el.classList.contains('active')
                };
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.3';
                el.classList.remove('active');
            });
        } else {
            hotspots.forEach((el, index) => {
                if (this.originalHotspotStates[index]) {
                    el.style.pointerEvents = this.originalHotspotStates[index].pointerEvents || '';
                    el.style.opacity = this.originalHotspotStates[index].opacity || '';
                }
            });
            this.originalHotspotStates = [];
        }
    }

    advanceStage() {
        this.gazeCount++;

        if (this.gazeCount <= 3) {
            this.applyTexture(this.gazeCount, true);
            this.playHeartbeat(this.gazeCount);
            if (this.vignette) this.vignette.style.opacity = (0.2 + this.gazeCount * 0.25).toString();

            if (this.gazeCount === 3) {
                this.isMaxStage = true;
                this.blockMovement(false);
                // ★★★ ミタナMAX時：mitana.mp3を1回再生 ★★★
                this.playMitanaSound();
                console.log('[Mitana] ★★★ MAX STAGE REACHED (ミタナ...) ★★★');
                console.log('[Mitana] Escape prevention now ACTIVE for ALL directions');
            }
        }
    }

    applyTexture(stage, useFlash) {
        const texturePath = this.config.textures[stage];
        if (!texturePath || !window.sphere) return;

        if (useFlash && this.flash) {
            this.flash.style.opacity = '0.6';
        }

        this.textureLoader.load(texturePath, (texture) => {
            window.sphere.material.map = texture;
            window.sphere.material.needsUpdate = true;
            this.currentStage = stage;

            if (useFlash && this.flash) {
                setTimeout(() => {
                    this.flash.style.opacity = '0';
                }, 100);
            }

            console.log(`[Mitana] Texture updated to: ${this.config.stageNames[stage]}`);
        }, undefined, (error) => {
            console.error('Texture load failed:', error);
            if (useFlash && this.flash) this.flash.style.opacity = '0';
        });
    }

    preventEscape(targetRoomId) {
        console.log(`[Mitana] ★★★ PREVENT ESCAPE CALLED ★★★`);
        console.log(`[Mitana] Target: ${targetRoomId}, Current State:`, {
            isPreventingEscape: this.isPreventingEscape,
            isMaxStage: this.isMaxStage,
            isActive: this.isActive
        });

        if (this.isPreventingEscape) {
            console.log('[Mitana] Already preventing escape - returning');
            return;
        }
        
        this.isPreventingEscape = true;
        window.isInputLocked = true;

        console.log('[Mitana] Disabling hotspots...');
        document.querySelectorAll('.hotspot-marker').forEach(el => {
            el.classList.remove('active');
            el.style.pointerEvents = 'none';
        });

        if (!this.rightHand || !this.leftHand) {
            console.error('[Mitana] ERROR: Hand elements not found!', {
                rightHand: this.rightHand,
                leftHand: this.leftHand
            });
            return;
        }

        console.log('[Mitana] Starting hand animation sequence...');

        const darkness = document.getElementById('darkness-overlay');
        if (darkness) {
            darkness.style.transition = 'none';
            darkness.style.opacity = '0.9';
        }

        this.rightHand.style.display = 'block';
        this.leftHand.style.display = 'block';
        this.rightHand.style.opacity = '1';
        this.leftHand.style.opacity = '1';
        this.rightHand.style.transition = 'none';
        this.leftHand.style.transition = 'none';
        this.rightHand.classList.add('cover-camera');
        this.leftHand.classList.add('cover-camera');

        this.playWhooshSound();
        this.playTeSound();
        this.playGrabSound();
        if (navigator.vibrate) navigator.vibrate([300, 100, 400]);

        setTimeout(() => {
            if (darkness) {
                darkness.style.transition = 'opacity 0.05s';
                darkness.style.opacity = '0';
            }
        }, 50);

        setTimeout(() => {
            this.rightHand.classList.add('hand-tremble-intense');
            this.leftHand.classList.add('hand-tremble-intense');
            document.body.classList.add('screen-shake-intense');
            
            this.playCreepingSound();
            
            setTimeout(() => {
                this.rightHand.style.transition = 'all 0.2s ease-in';
                this.leftHand.style.transition = 'all 0.2s ease-in';
                this.rightHand.style.transform = 'scale(10) rotate(-30deg) translateY(40%)';
                this.leftHand.style.transform = 'scale(10) rotate(30deg) translateY(40%)';
                
                setTimeout(() => {
                    if (darkness) {
                        darkness.style.opacity = '1';
                    }
                }, 100);
                
                setTimeout(() => {
                    console.log('[Mitana] Transitioning to gore room');
                    this.fullReset();
                    document.body.classList.remove('screen-shake-intense');
                    window.isInputLocked = false;
                    window.isGoreMode = true;
                    // ★★★ isActive/isMaxStageを確実にfalseにして次の移動をブロックしない ★★★
                    this.isActive = false;
                    this.isMaxStage = false;
                    this.isPreventingEscape = false;
                    // ★★★ ミタナ→グロ居間直後は ti1→玄関 を da1 へ飛ばす準備 ★★★
                    window.goreEntryToDaSequence = true;
                    window.da5SequenceCompleted = false;

                    const goreBedroomIndex = window.ROOMS.findIndex(r => r.id === 'bedroom_gore');
                    if (goreBedroomIndex !== -1 && typeof window.loadRoom === 'function') {
                        window.loadRoom(goreBedroomIndex);
                    }
                }, 400);
            }, 400);
        }, 100);
    }

    // ★★★ ミタナMAX時の音声 ★★★
    playMitanaSound() {
        if (this.mitanaAudio) {
            this.mitanaAudio.pause();
            this.mitanaAudio.currentTime = 0;
        }
        this.mitanaAudio = new Audio(this.sounds.mitana);
        this.mitanaAudio.volume = 0.9;
        this.mitanaAudio.play().catch(e => {});
    }

    // ★★★ 手が出る時の音声 ★★★
    playTeSound() {
        const audio = new Audio(this.sounds.te);
        audio.volume = 0.9;
        audio.play().catch(e => {});
    }

    // ★★★ MP3に変更：心音 ★★★
    playHeartbeat(intensity) {
        const audio = new Audio(this.sounds.heartbeat);
        // intensityに応じて音量を調整（1:0.5, 2:0.7, 3:0.9）
        audio.volume = 0.3 + (intensity * 0.2);
        audio.play().catch(e => {});
        
        // 2回目の鼓動（遅延）
        setTimeout(() => {
            const audio2 = new Audio(this.sounds.heartbeat);
            audio2.volume = 0.3 + (intensity * 0.2);
            audio2.play().catch(e => {});
        }, 200 - (intensity * 30));
    }

    // ★★★ MP3に変更：這い寄る音 ★★★
    playCreepingSound() {
        const audio = new Audio(this.sounds.creeping);
        audio.volume = 0.4;
        audio.play().catch(e => {});
    }

    // ★★★ MP3に変更：風切り音 ★★★
    playWhooshSound() {
        const audio = new Audio(this.sounds.whoosh);
        audio.volume = 0.3;
        audio.play().catch(e => {});
    }

    // ★★★ MP3に変更：掴む音 ★★★
    playGrabSound() {
        const audio = new Audio(this.sounds.grab);
        audio.volume = 0.8;
        audio.play().catch(e => {});
        
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }

    end(toGore) {
        clearInterval(this.countdown);
        this.fullReset();

        if (toGore) {
            setTimeout(() => {
                const darkness = document.getElementById('darkness-overlay');
                if (darkness) darkness.style.opacity = '0';
            }, 100);
        }
    }

    resetTexture(callback) {
        if (window.sphere && this.currentStage > 0) {
            this.textureLoader.load(this.config.textures[0], (texture) => {
                window.sphere.material.map = texture;
                window.sphere.material.needsUpdate = true;
                if (callback) callback();
            }, undefined, () => {
                if (callback) callback();
            });
        } else {
            if (callback) callback();
        }
    }

    fullReset() {
        clearInterval(this.countdown);
        this.blockMovement(false);
        this.isActive = false;
        this.gazeCount = 0;
        this.currentStage = 0;
        this.isMaxStage = false;
        this.isGazing = false;
        this.hasGazed = false;
        this.timeRemaining = 20;
        this.isPreventingEscape = false;

        // ★ミタナ音声停止
        if (this.mitanaAudio) {
            this.mitanaAudio.pause();
            this.mitanaAudio.currentTime = 0;
            this.mitanaAudio = null;
        }

        if (this.overlay) this.overlay.style.display = 'none';
        if (this.vignette) this.vignette.style.opacity = '0';
        if (this.flash) this.flash.style.opacity = '0';

        if (this.rightHand) {
            this.rightHand.classList.remove('cover-camera', 'hand-tremble', 'hand-release');
            this.leftHand.classList.remove('cover-camera', 'hand-tremble', 'hand-release');
            this.rightHand.style.display = 'none';
            this.leftHand.style.display = 'none';
        }

        console.log('[Mitana] Full reset completed');
    }
}

window.MitanaSystem = MitanaSystem;