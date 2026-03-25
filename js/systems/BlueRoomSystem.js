// ============================================
// BlueRoomSystem - 青の部屋（赤女7周後の新ルート）
// akaonnnaima8.png後に突入する全4部屋構成
// ============================================

class BlueRoomSystem {
    constructor() {
        this.isActive      = false;
        this.visitedRooms  = new Set();
        this.bathroomPhase = 0;   // 0=aoburo1 … 7=aoburo8（部屋を出ても保持）
        this.animationIntervals  = {};
        this.bathroomTimerInterval = null;
        this.horrorEffectTimeout  = null;
        this.textureLoader = new THREE.TextureLoader();

        // ① 居室：入室ごとにランダムに表示（人形の位置が変わる演出）
        this.bedroomImages = [
            'aoimaninnguou.png',
            'aoimaninnguou1.png',
            'aoimaninnguou2.png',
            'aoimaninnguou3.png',
            'aoimaninnguou4.png',
            'aoimaninnguou5.png'
        ];

        // ② 玄関：tema1〜6 を順番にループ（手招き演出）
        this.entranceImages = [
            'tema1.png','tema2.png','tema3.png',
            'tema4.png','tema5.png','tema6.png'
        ];

        // ③ 脱衣所：yugami1〜2 を交互に切替（歪み演出）
        this.changingImages = ['yugami1.png','yugami2.png'];
    }

    // ============================================
    // 開始（赤女シーケンス終了後に呼ぶ）
    // ============================================
    start() {
        this.isActive     = true;
        this.visitedRooms = new Set();
        this.bathroomPhase = 0;  // ★ 青の部屋モード開始時はリセット（初回のみ）
        this.stopAllAnimations();
        window.isBlueRoomBathroomTrapped = false;
        window.isBlueRoomBathroomViewLocked = false;
        window.isInputLocked = false;
        if (window.playBlueRoomBgm) window.playBlueRoomBgm();
        console.log('[BlueRoom] ===== 青の部屋システム開始 ===== visitedRooms cleared');
    }

    // ============================================
    // 部屋入室コールバック（performActualLoad から呼ぶ）
    // ============================================
    onRoomEnter(roomId) {
        if (!this.isActive) return;

        // 前の部屋のアニメーション・タイマーを全停止
        this.stopAllAnimations();

        // 訪問記録（bedroomは「戻ってきた」かどうか判定に使うので常に追加）
        // ★ bedroom以外の3部屋はここで記録（bedroomは終了判定のみ）
        if (roomId !== 'blue_bedroom') {
            this.visitedRooms.add(roomId);
        }
        console.log('[BlueRoom] 入室:', roomId, '| 訪問済み:', [...this.visitedRooms]);

        switch (roomId) {
            case 'blue_bedroom':  this.enterBedroom();  break;
            case 'blue_entrance': this.enterEntrance(); break;
            case 'blue_changing': this.enterChanging(); break;
            case 'blue_bathroom': this.enterBathroom(); break;
            default:
                console.warn('[BlueRoom] 未知の部屋:', roomId);
        }
    }

    // ============================================
    // ① 青の居室
    // ============================================
    enterBedroom() {
        // 脱衣所・玄関・浴室の全3部屋を訪問済みなら終了イベント
        const required = ['blue_entrance', 'blue_changing', 'blue_bathroom'];
        const allDone  = required.every(r => this.visitedRooms.has(r));

        console.log('[BlueRoom] 居室入室チェック | 訪問済み:', [...this.visitedRooms], '| 全制覇:', allDone);

        if (allDone) {
            console.log('[BlueRoom] ★★★ 全部屋制覇！影の女へ移行 ★★★');
            this.triggerEnding();
            return;
        }

        // ランダムに人形画像を選択（入室ごとに位置が変わる演出）
        const img = this.bedroomImages[Math.floor(Math.random() * this.bedroomImages.length)];
        console.log('[BlueRoom] 居室テクスチャ（ランダム）:', img);
        // 少し遅延させて sphere が確定してから画像を上書き
        setTimeout(() => { this.loadTexture(img); }, 80);
    }

    // ============================================
    // ② 青の玄関（tema1〜6 を順番ループ＝手招き）
    // ============================================
    enterEntrance() {
        let index = 0;
        // 少し遅延させて sphere が確定してから最初の画像を上書き
        setTimeout(() => { this.loadTexture(this.entranceImages[0]); }, 80);
        console.log('[BlueRoom] 玄関アニメーション開始 (tema1〜6 ループ)');

        this.animationIntervals['entrance'] = setInterval(() => {
            if (!window.currentRoom || window.currentRoom.id !== 'blue_entrance') {
                clearInterval(this.animationIntervals['entrance']);
                delete this.animationIntervals['entrance'];
                console.log('[BlueRoom] 玄関アニメーション自動停止');
                return;
            }
            index = (index + 1) % this.entranceImages.length;
            this.loadTexture(this.entranceImages[index]);
        }, 220);   // 約4.5fps → 手招きに見える速度
    }

    // ============================================
    // ③ 青の脱衣所（yugami1〜2 交互＝歪み演出）
    // ============================================
    enterChanging() {
        let index = 0;
        // 少し遅延させて sphere が確定してから最初の画像を上書き
        setTimeout(() => { this.loadTexture(this.changingImages[0]); }, 80);
        console.log('[BlueRoom] 脱衣所ゆがみアニメーション開始 (yugami1〜2)');

        this.animationIntervals['changing'] = setInterval(() => {
            if (!window.currentRoom || window.currentRoom.id !== 'blue_changing') {
                clearInterval(this.animationIntervals['changing']);
                delete this.animationIntervals['changing'];
                console.log('[BlueRoom] 脱衣所アニメーション自動停止');
                return;
            }
            index = (index + 1) % this.changingImages.length;
            this.loadTexture(this.changingImages[index]);
        }, 350);   // 低速で歪んでいる感を出す
    }

    // ============================================
    // ④ 青のお風呂場（10秒ごとに画像進行・状態保持）
    // ============================================
    enterBathroom() {
        const img = `aoburo${this.bathroomPhase + 1}.png`;
        // 少し遅延させて sphere が確定してから画像を上書き
        setTimeout(() => { this.loadTexture(img); }, 80);
        console.log('[BlueRoom] お風呂場入室 フェーズ:', this.bathroomPhase + 1, '→', img);

        // フェーズ2以降：浴室から移動できないトラップ発動
        if (this.bathroomPhase >= 1) {
            window.isBlueRoomBathroomTrapped = true;
            console.log('[BlueRoom] Bathroom trap enabled (phase>=2)');
        }

        // まだ最終画像（aoburo11）でなければタイマー起動
        if (this.bathroomPhase < 10) {
            this.startBathroomTimer();
        } else {
            console.log('[BlueRoom] お風呂場すでに最終状態（aoburo11.png）');
        }
    }

    startBathroomTimer() {
        this.stopBathroomTimer();

        this.bathroomTimerInterval = setInterval(() => {
            // 部屋を離れていたら止める
            if (!window.currentRoom || window.currentRoom.id !== 'blue_bathroom') {
                this.stopBathroomTimer();
                return;
            }

            if (this.bathroomPhase < 10) {
                this.bathroomPhase++;
                const img = `aoburo${this.bathroomPhase + 1}.png`;
                console.log('[BlueRoom] お風呂場フェーズ進行 →', img, '(フェーズ', this.bathroomPhase + 1, ')');
                this.loadTexture(img);

                // フェーズ2（aoburo2）到達で浴室トラップを有効化
                if (this.bathroomPhase === 1) {
                    window.isBlueRoomBathroomTrapped = true;
                    console.log('[BlueRoom] Bathroom trap enabled (aoburo2)');
                }

                // フェーズ10（aoburo11）到達時は3秒後に脱衣所へ強制移動
                if (this.bathroomPhase === 10) {
                    this.stopBathroomTimer();
                    console.log('[BlueRoom] お風呂場 最終状態（aoburo11.png）到達：3秒後に脱衣所へ移動');
                    setTimeout(() => this.forceMoveToChanging(), 3000);
                    return;
                }

                // フェーズ9（aoburo10）で視点固定+演出（3秒後aoburo11）
                if (this.bathroomPhase === 9) {
                    this.stopBathroomTimer();
                    console.log('[BlueRoom] aoburo10演出開始（視点固定・揺れ）');
                    this.triggerAoburo10Sequence();
                    return;
                }
            }
        }, 5000);   // 5秒ごとに進行

        console.log('[BlueRoom] お風呂場タイマー開始（5秒ごとに進行）');
    }

    stopBathroomTimer() {
        if (this.bathroomTimerInterval) {
            clearInterval(this.bathroomTimerInterval);
            this.bathroomTimerInterval = null;
        }
    }

    stopAllAnimations() {
        Object.keys(this.animationIntervals).forEach(key => {
            clearInterval(this.animationIntervals[key]);
        });
        this.animationIntervals = {};
        this.stopBathroomTimer();
        this.clearBathroomHorrorEffect();
    }

    // aoburo10演出：視点固定、画面揺れ+ノイズ、3秒後にaoburo11表示
    triggerAoburo10Sequence() {
        // 画面入力ロック
        window.isInputLocked = true;
        window.isBlueRoomBathroomViewLocked = true;

        // 強制視点
        this.forceCameraDirection(2.57, 1.63);

        // 視界揺れ／ノイズ演出
        this.applyBathroomHorrorEffect();

        // aoburo11表示まで待機（3秒）
        setTimeout(() => {
            this.bathroomPhase = 10;
            this.loadTexture('aoburo11.png');
            console.log('[BlueRoom] aoburo11表示');
            // 更に3秒待機してから脱衣所へ強制移動
            setTimeout(() => {
                this.forceMoveToChanging();
            }, 3000);
        }, 3000);
    }

    forceCameraDirection(thetaVal, phiVal) {
        theta = thetaVal;
        phi = phiVal;
        window.theta = theta;
        window.phi = phi;
        if (window.camera) {
            const r = 1;
            const x = r * Math.sin(phi) * Math.sin(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.cos(theta);
            window.camera.lookAt(x, y, z);
        }
    }

    applyBathroomHorrorEffect() {
        // ノイズオーバーレイ
        let overlay = document.getElementById('blue-bathroom-noise-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'blue-bathroom-noise-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                pointer-events: none;
                z-index: 100005;
                background: rgba(255, 255, 255, 0.05);
                mix-blend-mode: overlay;
                animation: bluebathroom-noise 0.08s infinite;
            `;
            document.body.appendChild(overlay);
        }

        if (!document.getElementById('bluebathroom-effect-style')) {
            const style = document.createElement('style');
            style.id = 'bluebathroom-effect-style';
            style.textContent = `
                @keyframes bluebathroom-shake {
                    0%   { transform: translate(0,0) scale(1); }
                    25%  { transform: translate(-8px, 6px) scale(1.02); }
                    50%  { transform: translate(6px, -8px) scale(1.03); }
                    75%  { transform: translate(-5px, 8px) scale(1.02); }
                    100% { transform: translate(0,0) scale(1); }
                }
                @keyframes bluebathroom-noise {
                    0%   { opacity: 0.04; }
                    50%  { opacity: 0.11; }
                    100% { opacity: 0.03; }
                }
                body.bluebathroom-shake {
                    animation: bluebathroom-shake 0.15s ease-in-out infinite;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.classList.add('bluebathroom-shake');

        this.horrorEffectTimeout = setTimeout(() => {
            this.clearBathroomHorrorEffect();
        }, 6000); // aoburo10ー11合計6秒
    }

    clearBathroomHorrorEffect() {
        const overlay = document.getElementById('blue-bathroom-noise-overlay');
        if (overlay) overlay.remove();
        document.body.classList.remove('bluebathroom-shake');
        if (this.horrorEffectTimeout) {
            clearTimeout(this.horrorEffectTimeout);
            this.horrorEffectTimeout = null;
        }
    }

    forceMoveToChanging() {
        this.stopBathroomTimer();
        this.clearBathroomHorrorEffect();

        window.isBlueRoomBathroomTrapped = true;
        window.isInputLocked = false;
        window.isBlueRoomBathroomViewLocked = false;

        const targetIndex = window.ROOMS.findIndex(r => r.id === 'blue_changing');
        if (targetIndex !== -1 && typeof window.loadRoom === 'function') {
            console.log('[BlueRoom] aoburo11終了後強制移動：blue_changing');
            window.loadRoom(targetIndex);
        } else {
            console.error('[BlueRoom] blue_changing が見つかりません');
        }
    }

    // ============================================
    // 全部屋制覇後の終了演出 → kage(1).png → bedroom_open
    // ============================================
    triggerEnding() {
        console.log('[BlueRoom] 影の女への移行開始...');
        this.isActive        = false;
        window.isBlueRoomMode = false;
        if (window.stopBlueRoomBgm) window.stopBlueRoomBgm();
        this.stopAllAnimations();

        // 暗転してから bedroom_open（kage(1).png）へ
        const darkness = document.getElementById('darkness-overlay');
        if (darkness) {
            darkness.style.transition = 'opacity 0.6s';
            darkness.style.opacity    = '1';
        }

        setTimeout(() => {
            const idx = window.ROOMS.findIndex(r => r.id === 'bedroom_open');
            if (idx !== -1) {
                window.loadRoom(idx);

                // bedroom_open 読み込み後に影BGMを鳴らして明転
                setTimeout(() => {
                    if (typeof window.playKageBgm === 'function') window.playKageBgm();
                    if (darkness) {
                        darkness.style.transition = 'opacity 1.2s';
                        darkness.style.opacity    = '0';
                    }
                }, 600);
            } else {
                console.error('[BlueRoom] bedroom_open が見つかりません');
                if (darkness) darkness.style.opacity = '0';
            }
        }, 800);
    }

    // ============================================
    // テクスチャ読み込み（sphere.material.map を更新）
    // ============================================
    loadTexture(path) {
        this.textureLoader.load(
            path,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                if (!window.sphere) {
                    console.warn('[BlueRoom] sphere が存在しないため texture のみキャッシュ');
                    return;
                }
                window.sphere.material.map = texture;
                window.sphere.material.needsUpdate = true;

                const loadingEl = document.getElementById('loading');
                if (loadingEl) loadingEl.style.display = 'none';

                console.log('[BlueRoom] ✓', path);
            },
            undefined,
            (err) => {
                console.error('[BlueRoom] ✗ 読込失敗:', path, err);
                const loadingEl = document.getElementById('loading');
                if (loadingEl) loadingEl.style.display = 'none';
            }
        );
    }

    // ============================================
    // リセット（Rキーなど）
    // ============================================
    reset() {
        this.stopAllAnimations();
        this.isActive        = false;
        this.visitedRooms    = new Set();
        this.bathroomPhase   = 0;
        window.isBlueRoomBathroomTrapped = false;
        window.isBlueRoomBathroomViewLocked = false;
        window.isInputLocked = false;
        if (window.stopBlueRoomBgm) window.stopBlueRoomBgm();
        console.log('[BlueRoom] リセット完了');
    }
}

// グローバル登録
window.BlueRoomSystem = new BlueRoomSystem();
