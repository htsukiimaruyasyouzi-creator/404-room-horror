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

    // ★★★ お風呂場「みつけた」演出シーケンス ★★★
    triggerBathroomFoundSequence(stageData) {
        console.log('[Kuroko] お風呂場 みつけた演出開始');

        // このシーケンス中は完全に入力ロック
        window.isInputLocked = true;
        if (window.camera) {
        window.camera.fov = 80;
        window.camera.updateProjectionMatrix();
     }

        // ① カメラを強制的に女の方向へ向ける
        this.forceCameraLook(stageData.forceCameraTheta, stageData.forceCameraPhi, 800, () => {

            // ① 最初にkuro4.pngを表示
            this.stopAudio();
            this.loadTexture(stageData.girlImage || 'kuro4.png');

            // ② 1回目「みつけた」音声（0mituketa2.mp3）
            const audio1 = new Audio(stageData.audio);
            audio1.volume = 0.9;
            console.log('[Kuroko] みつけた①再生');

            audio1.addEventListener('ended', () => {
                console.log('[Kuroko] みつけた①終了 → kuro5.png & みつけた②へ');

                // ③ kuro5.pngに切り替え
                this.loadTexture(stageData.midImage || 'kuro5.png');

                // ④ 2回目「みつけた」音声（mituketa2.mp3）
                const audio2 = new Audio(stageData.audioSecond || stageData.audioAttack || stageData.audio);
                audio2.volume = 1.0;
                audio2.play().catch(e => console.error('[Kuroko] audio2失敗', e));
                this.currentAudio = audio2;

                // ⑤ 音声②が始まってから約1秒後にkuro6.png＋ズームイン
                setTimeout(() => {
                    // kuro6.pngをパノラマに貼り替えてFOVズームイン
                    this.loadTexture(stageData.finalImage || stageData.attackImage || 'kuro6.png');
                    this.startZoomIn(75, 70, 400, () => {
                        // ズームイン完了 → 即座にFOVリセット＆image(4).pngに復帰
                        // （音声②はそのまま最後まで流し続ける）
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

                        // ★ ロックは維持したままloadRoomを呼ぶ
                        const bathroomIndex = window.ROOMS.findIndex(r => r.id === 'bathroom');
                        if (bathroomIndex !== -1 && typeof window.loadRoom === 'function') {
                            window.loadRoom(bathroomIndex);
                        }

                        // ★ image(4).pngのテクスチャが確実にロードされてからロック解除（600ms待機）
                        setTimeout(() => {
                            window.isInputLocked = false;
                            console.log('[Kuroko] 入力ロック解除（image(4).png表示確認後）');
                        }, 600);
                    });
                }, 1000);
            });

            audio1.play().catch(e => console.error('[Kuroko] audio1失敗', e));
            this.currentAudio = audio1;
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

        const audio = new Audio(stageData.audio);
        audio.volume = 0.85;
        audio.loop = stageData.loop || false;

        if (!stageData.loop) {
            audio.addEventListener('ended', () => {
                console.log(`[Kuroko] 音声終了: ステージ${this.stage}`);
                this.onAudioEnded(stageData);
            });
        }

        audio.play()
            .then(() => console.log(`[Kuroko] 再生: ${stageData.audio}`))
            .catch(e => console.error(`[Kuroko] 再生失敗: ${stageData.audio}`, e));

        this.currentAudio = audio;

        // ★★★ stage0（居室・あそぼー）のみ kuraiheya1.mp3 を同時再生 ★★★
        if (stageData.extraAudio) {
            const extra = new Audio(stageData.extraAudio);
            extra.volume = 0.7;
            extra.loop = stageData.extraLoop || false;
            extra.play().catch(e => console.error('[Kuroko] extraAudio失敗:', e));
            this.extraAudio = extra;
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
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        // ★ extraAudioも停止
        if (this.extraAudio) {
            this.extraAudio.pause();
            this.extraAudio.currentTime = 0;
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