// ============================================
// KurokoSystem - かくれんぼ（部屋入室で音声再生）
// ============================================

class KurokoHideAndSeek {
    constructor() {
        this.isActive = false;
        this.stage = 0;
        this.lastRoom = null;
        this.currentAudio = null;
        this.girlDisappeared = false;

        this.stages = [
            {
                stage: 0,
                roomKey: 'bedroom',
                girlImage: 'kuro1.png',
                emptyImage: 'kura1.png',
                audio: 'sounds/asobo.mp3',
                extraAudio: 'sounds/kuraiheya1.mp3', // ★ あそぼーと同時再生
                extraLoop: true,
                loop: true,
                advanceOn: 'leave'
            },
            {
                stage: 1,
                roomKey: 'changing',
                girlImage: 'kuro3.png',
                emptyImage: 'kura3.png',
                audio: 'sounds/mouiikai1.mp3',
                loop: true,
                advanceOn: 'leave'
            },
            {
                stage: 2,
                roomKey: 'entrance',
                girlImage: 'kuro2.png',
                emptyImage: 'kura2.png',
                audio: 'sounds/madadayo1.mp3',
                loop: true,
                advanceOn: 'leave'
            },
            {
                stage: 3,
                roomKey: 'bedroom',
                girlImage: 'kuro1.png',
                emptyImage: 'kura1.png',
                audio: 'sounds/mouiiyo.mp3',
                loop: false,
                advanceOn: 'audioEnd',
                disappearAfterPlay: true
            },
            {
                stage: 4,
                roomKey: 'bathroom',
                // お風呂場（暗闇ラスト）
                girlImage: 'kuro4.png',        // 最初に見せる
                midImage: 'kuro5.png',         // 1回目終了後
                finalImage: 'kuro6.png',       // 2回目の1秒後→ズーム
                emptyImage: 'kura4.png',
                audio: 'sounds/0mituketa2.mp3',       // 1回目
                audioSecond: 'sounds/mituketa2.mp3',  // 2回目
                loop: false,
                advanceOn: 'audioEnd',
                disappearAfterPlay: true,
                // ★ カメラ強制向き（入室直後）
                forceCameraTheta: -1.00,
                forceCameraPhi: 2.24
            },
            {
                stage: 5,
                roomKey: 'bedroom',
                girlImage: 'kage(1).png',
                emptyImage: 'kura1.png',
                audio: null,
                loop: false,
                isFinal: true
            }
        ];

        this.emptyImages = {
            bedroom:  'kura1.png',
            entrance: 'kura2.png',
            changing: 'kura3.png',
            bathroom: 'kura4.png'
        };
    }

    getRoomKey(roomId) {
        if (!roomId) return null;
        if (roomId.includes('bedroom'))  return 'bedroom';
        if (roomId.includes('entrance')) return 'entrance';
        if (roomId.includes('changing')) return 'changing';
        if (roomId.includes('bathroom')) return 'bathroom';
        return null;
    }

    start() {
        this.isActive = true;
        this.stage = 0;
        this.lastRoom = 'bedroom';
        this.girlDisappeared = false;
        this.stopAudio();
        console.log('[Kuroko] ===== かくれんぼ開始！ステージ0 =====');
        this.updateTexture('bedroom');
    }

    onRoomEnter(roomId) {
        if (!this.isActive) return;

        const roomKey = this.getRoomKey(roomId);
        const prevRoom = this.lastRoom;
        const stageData = this.stages[this.stage];

        console.log(`[Kuroko] 入室: ${prevRoom} → ${roomKey} | stage=${this.stage}`);

        // 前の部屋を離れた処理
        if (prevRoom && prevRoom !== roomKey) {
            this.stopAudio();

            // ステージ0〜2: 女がいる部屋を離れたら次ステージへ
            if (this.stage <= 2 && stageData && stageData.advanceOn === 'leave' && prevRoom === stageData.roomKey) {
                console.log(`[Kuroko] ステージ${this.stage} → ${this.stage + 1}へ`);
                this.stage++;
                this.girlDisappeared = false;
            }
        }

        // テクスチャ更新
        this.updateTexture(roomKey);

        // 現在の部屋で音声再生
        const current = this.stages[this.stage];
        if (current && current.roomKey === roomKey && !this.girlDisappeared) {
            // ★★★ stage4（お風呂場）専用：カメラ強制向き→みつけた演出 ★★★
            if (this.stage === 4 && current.forceCameraTheta !== undefined) {
                this.triggerBathroomFoundSequence(current);
            } else {
                this.playStageAudio(current);
            }
        }

        this.lastRoom = roomKey;
    }

    triggerBathroomFoundSequence(stageData) {
        console.log('[Kuroko] お風呂場 みつけた演出開始');

        window.isInputLocked = true;
        if (window.camera) {
            window.camera.fov = 80;
            window.camera.updateProjectionMatrix();
        }

        this.forceCameraLook(stageData.forceCameraTheta, stageData.forceCameraPhi, 800, () => {

            this.stopAudio();
            this.loadTexture(stageData.girlImage || 'kuro4.png');

            // ② 1回目「みつけた」音声（playAudioSafe経由：iOS対応）
            const _handle1 = window.playAudioSafe(stageData.audio, 0.9, false, () => {
                console.log('[Kuroko] みつけた①終了 → kuro5.png & みつけた②へ');

                this.loadTexture(stageData.midImage || 'kuro5.png');

                // ④ 2回目「みつけた」音声
                const _handle2 = window.playAudioSafe(
                    stageData.audioSecond || stageData.audioAttack || stageData.audio,
                    1.0, false
                );
                this.currentAudio = _handle2 && _handle2.audio ? _handle2.audio : _handle2;

                setTimeout(() => {
                    this.loadTexture(stageData.finalImage || stageData.attackImage || 'kuro6.png');
                    this.startZoomIn(75, 70, 400, () => {
                        if (window.camera) {
                            window.camera.fov = 120;
                            window.camera.updateProjectionMatrix();
                        }
                        this.loadTexture('image(4).png');
                        window.isShadowMode = false;
                        window.kuroko_endTriggered = true;
                        this.girlDisappeared = true;
                        this.reset();
                        console.log('[Kuroko] かくれんぼ終了！通常モードに戻りました');

                        const bathroomIndex = window.ROOMS.findIndex(r => r.id === 'bathroom');
                        if (bathroomIndex !== -1 && typeof window.loadRoom === 'function') {
                            window.loadRoom(bathroomIndex);
                        }

                        setTimeout(() => {
                            window.isInputLocked = false;
                            console.log('[Kuroko] 入力ロック解除');
                        }, 600);
                    });
                }, 1000);
            });
            this.currentAudio = _handle1 && _handle1.audio ? _handle1.audio : _handle1;
            console.log('[Kuroko] みつけた①再生');
        });
    }

    // カメラを指定方向に滑らかに向ける
    forceCameraLook(targetTheta, targetPhi, duration, callback) {
        const startTheta = window.theta || 0;
        const startPhi   = window.phi   || Math.PI / 2;
        const startTime  = performance.now();

        const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // easeInOut

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const e = ease(t);

            window.theta = startTheta + (targetTheta - startTheta) * e;
            window.phi   = startPhi   + (targetPhi   - startPhi)   * e;

            // Three.jsカメラに反映
            if (window.camera) {
                const r = 1;
                const x = r * Math.sin(window.phi) * Math.sin(window.theta);
                const y = r * Math.cos(window.phi);
                const z = r * Math.sin(window.phi) * Math.cos(window.theta);
                window.camera.lookAt(x, y, z);
            }

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        };
        requestAnimationFrame(animate);
    }

    playStageAudio(stageData) {
        if (!stageData.audio) return;
        this.stopAudio();

        const onEnded = stageData.loop ? null : () => {
            console.log(`[Kuroko] 音声終了: ステージ${this.stage}`);
            this.onAudioEnded(stageData);
        };

        const handle = window.playAudioSafe(stageData.audio, 0.85, stageData.loop || false, onEnded);
        this.currentAudio = handle && handle.audio ? handle.audio : handle;
        console.log(`[Kuroko] 再生: ${stageData.audio}`);

        // ★★★ stage0（居室・あそぼー）のみ kuraiheya1.mp3 を同時再生 ★★★
        if (stageData.extraAudio) {
            const extraHandle = window.playAudioSafe(stageData.extraAudio, 0.7, stageData.extraLoop || false);
            this.extraAudio = extraHandle && extraHandle.audio ? extraHandle.audio : extraHandle;
            console.log(`[Kuroko] extraAudio再生: ${stageData.extraAudio}`);
        }
    }

    onAudioEnded(stageData) {
        if (!stageData.disappearAfterPlay) return;
        // stage4はtriggerBathroomFoundSequenceで処理するのでここでは何もしない
        if (this.stage === 4) return;

        this.girlDisappeared = true;
        const roomKey = this.getRoomKey(window.currentRoom ? window.currentRoom.id : '');

        setTimeout(() => {
            this.loadTexture(stageData.emptyImage || this.emptyImages[roomKey] || 'kura1.png');
            setTimeout(() => {
                this.stage++;
                this.girlDisappeared = false;
                console.log(`[Kuroko] ステージ${this.stage}へ`);
            }, 600);
        }, 800);
    }

    // ★★★ FOVを縮めてズームイン演出（迫ってくる感じ）★★★
    startZoomIn(fromFov, toFov, duration, callback) {
        if (!window.camera) { if (callback) callback(); return; }
        const startTime = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3); // easeOutCubic（最後に一気に迫る）

        const animate = (now) => {
            const t = Math.min((now - startTime) / duration, 1);
            const e = ease(t);
            window.camera.fov = fromFov + (toFov - fromFov) * e;
            window.camera.updateProjectionMatrix();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        };
        requestAnimationFrame(animate);
    }

    // ★★★ kuro6.pngをフルスクリーンオーバーレイで表示（飛びかかり演出）★★★
    showAttackOverlay(imagePath, callback) {
        // 既存オーバーレイがあれば削除
        const existing = document.getElementById('kuroko-attack-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'kuroko-attack-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 100002;
            background: #000 url('${imagePath}') center center / cover no-repeat;
            opacity: 0;
            pointer-events: none;
        `;
        document.body.appendChild(overlay);

        // フェードイン（0.1秒で一気に表示）
        requestAnimationFrame(() => {
            overlay.style.transition = 'opacity 0.08s ease-in';
            overlay.style.opacity = '1';
        });

        // 画面シェイク
        document.body.style.animation = 'none';
        overlay.style.animation = 'kuroko-shake 0.4s ease';

        // シェイク用キーフレームが未定義なら追加
        if (!document.getElementById('kuroko-shake-style')) {
            const style = document.createElement('style');
            style.id = 'kuroko-shake-style';
            style.textContent = `
                @keyframes kuroko-shake {
                    0%,100% { transform: translate(0,0) scale(1); }
                    15%     { transform: translate(-8px, -6px) scale(1.02); }
                    30%     { transform: translate(8px, 4px) scale(1.03); }
                    45%     { transform: translate(-6px, 8px) scale(1.02); }
                    60%     { transform: translate(6px, -4px) scale(1.03); }
                    75%     { transform: translate(-4px, 6px) scale(1.02); }
                }
            `;
            document.head.appendChild(style);
        }

        console.log('[Kuroko] 飛びかかりオーバーレイ表示');

        // 0.6秒後にフェードアウト→消去してコールバック
        setTimeout(() => {
            overlay.style.transition = 'opacity 0.15s ease-out';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                if (callback) callback();
            }, 150);
        }, 600);
    }

    // 点滅演出してから指定テクスチャに復帰
    flickerAndRestore(finalTexture, callback) {
        if (!window.renderer) { if(callback) callback(); return; }

        const original = window.renderer.toneMappingExposure;
        const schedule = [
            [0,   0.0],
            [120, 1.0],
            [220, 0.0],
            [320, 0.8],
            [400, 0.0],
            [480, 0.6],
            [540, 0.0],
            [600, 1.0],
        ];

        schedule.forEach(([ms, mult]) => {
            setTimeout(() => {
                if (!window.renderer) return;
                window.renderer.toneMappingExposure = mult === 0 ? 0.0001 : original * mult;
            }, ms);
        });

        // 点滅終了後にテクスチャ復帰
        setTimeout(() => {
            this.loadTexture(finalTexture);
            if (callback) callback();
        }, 650);
    }

    updateTexture(roomKey) {
        if (!window.sphere || !roomKey) return;

        const stageData = this.stages[this.stage];
        let imagePath;

        if (stageData && stageData.roomKey === roomKey && !this.girlDisappeared) {
            imagePath = stageData.girlImage;
        } else {
            imagePath = this.emptyImages[roomKey] || 'kura1.png';
        }

        console.log(`[Kuroko] テクスチャ: ${imagePath} (stage=${this.stage}, room=${roomKey})`);
        this.loadTexture(imagePath);
    }

    loadTexture(path) {
        new THREE.TextureLoader().load(
            path,
            (texture) => {
                if (!window.sphere) return;
                texture.colorSpace = THREE.SRGBColorSpace;
                window.sphere.material.map = texture;
                window.sphere.material.needsUpdate = true;
                console.log(`[Kuroko] ✓ ${path}`);
            },
            undefined,
            (err) => console.error(`[Kuroko] ✗ ${path}`, err)
        );
    }

    stopAudio() {
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                if (typeof this.currentAudio.currentTime === 'number') {
                    this.currentAudio.currentTime = 0;
                }
            } catch(e) {}
            this.currentAudio = null;
        }
        if (this.extraAudio) {
            try {
                this.extraAudio.pause();
                if (typeof this.extraAudio.currentTime === 'number') {
                    this.extraAudio.currentTime = 0;
                }
            } catch(e) {}
            this.extraAudio = null;
        }
    }

    // animateループから呼ばれるが視線判定不要
    update(theta, phi) {}

    updateCurrentTexture() {
        if (window.currentRoom) {
            this.updateTexture(this.getRoomKey(window.currentRoom.id));
        }
    }

    reset() {
        this.stopAudio();
        this.isActive = false;
        this.stage = 0;
        this.lastRoom = null;
        this.girlDisappeared = false;
        console.log('[Kuroko] リセット完了');
    }
}

window.KurokoSystem = new KurokoHideAndSeek();