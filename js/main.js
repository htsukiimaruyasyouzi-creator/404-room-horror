// ============================================
// メイン処理・グローバル変数・関数定義

let currentRoomIndex = 0;
let currentRoom = null;
let currentHotspot = null;
let isInputLocked = false;
let glitchTimer = null;
const TYPE_SPEED = {
    errorMin: 2,
    errorRandom: 5,
    mitsuketa: 200,
    flood: 15
};

window.isGoreMode = false;
window.isInputLocked = isInputLocked;
window.currentRoom = currentRoom;
window.loadRoom = null;
window.bathroomNightmareTriggered = false;

// ★★★ 赤部屋（bedroom_red）連続滞在演出状態 ★★★
window.redRoomState = {
    watching: false,
    elapsed: 0,
    timer: null,
    sequenceActive: false,
    step: 0,
    stepTimer: null,
    audio: null,
    canShowHotspots: true
};
window.redRoomStingerInterval = null;


// ★★★ da1→da5 の一連イベント完了フラグ（ti1→玄関の挙動切替用） ★★★
window.da5SequenceCompleted = false;
// ★★★ ミタナ→グロ居間に入った「直後だけ」ti1→玄関をda1へ飛ばす ★★★
window.goreEntryToDaSequence = false;

// ★★★ X部屋・グロ部屋管理用グローバル変数 ★★★
window.visitedGoreRooms = new Set();
window.isInXRoom = false;
window.xBathroomNightmareTriggered = false;
window.xRoomAnimationSystem = null;
window.xRoomStep = -1; // X部屋シーケンス進行状況 (-1: X部屋モードではない)

// ★★★ 影の部屋（かくれんぼ）管理用 ★★★
window.isShadowMode = false;  // 影モードフラグ
window.kurokoSystem = null;   // KurokoSystemインスタンス

// ★★★ 青の部屋管理用 ★★★
window.isBlueRoomMode = false;  // 青の部屋モードフラグ
window.isBlueRoomBathroomTrapped = false;  // 青の浴室内の脱出禁止フラグ
window.isBlueRoomBathroomViewLocked = false; // aoburo10視点固定時フラグ

// ★★★ X部屋BGM管理用グローバル変数 ★★★
window.xRoomBgmAudio = null;
window.xRoomBgmCurrent = null;

let scene, camera, renderer, geometry, sphere;
let theta = 0;
let phi = Math.PI / 2;
let currentFov;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let hotspotsContainer;

let textCorruption, peripheralSystem, flickerSystem, sequenceManager, mitanaSystem, gazeSystem;
let timeManager;
// ★★★ 穴→かごめ→赤女シーケンス用の状態管理 ★★★
window.anaSequence = {
    active: false,
    phase: null,          // 'hole' | 'kagome' | 'aka'
    suzuAudio: null,
    suzuOneShotAudio: null,
    kagomeAudio: null,
    kagomeInterval: null,
    kagomeStartTime: 0,
    akaAudio: null,
    lapCount: 0,
    gate2Passed: false,
    gate3Passed: false,
    lastLapTime: 0,      // 直前に1周カウントした時刻（連続カウント防止用）
    kagomeFallbackTimer: null  // ★ スマホ向けフォールバックタイマー
};

// ★★★ da1〜da4 段ボール視点クロスフェード用 ★★★
window.daRoomState = {
    phase: 0,             // 0=未開始, 1=da1, 2=da2, 3=da3, 4=da4, 5=da5
    gazeMs: 0,
    phaseTimer: null,     // ★ setTimeoutハンドル
    inZone: false,        // ★ 段ボールゾーン内にいるか
    transitionStart: 0,
    transitionDuration: 0,
    overlaySphere: null,
    toTexture: null
};

// ★★★ ti部屋（ti1〜ti4）＆da部屋（da1〜da4）滞在中のループBGM ★★★
window.tiLoopBgmAudio = null;
window.playTiLoopBgm = function() {
    if (window.tiLoopBgmAudio) {
        try { window.tiLoopBgmAudio.play(); } catch (e) {}
        return;
    }
    try {
        const a = new Audio('sounds/ti.mp3');
        a.loop = true;
        a.volume = 0.9;
        a.preload = 'auto';
        window.tiLoopBgmAudio = a;
        a.play().catch(() => {});
    } catch (e) {
        console.error('[ti BGM] init failed:', e);
    }
};
window.stopTiLoopBgm = function() {
    if (!window.tiLoopBgmAudio) return;
    try {
        window.tiLoopBgmAudio.pause();
        window.tiLoopBgmAudio.currentTime = 0;
    } catch (e) {}
    window.tiLoopBgmAudio = null;
};

// ★★★ da5 到達時のカメラシェイク用 ★★★
window.da5Shake = {
    active: false,
    start: 0,
    duration: 550,
    intensity: 0.08
};


// ★★★ 効果音パスを一元管理 ★★★
const SOUNDS = {
    corruption: 'sounds/corruption.mp3',  // 侵食ノイズ用MP3
    noizunoonnna: 'sounds/noizunoonnna.mp3', // ★★★ ノイズの女用（追加）★★★
    akabeyakodomo: 'sounds/akabeyakodomo.mp3', // 赤部屋居室ランダム音
    akabeyagennkann: 'sounds/akabeyagennkann.mp3', // 赤部屋玄関ランダム音
    aozenntai: 'sounds/aozenntai.mp3',    // 青の部屋ループ用
    suzu: 'sounds/suzu.mp3',              // 穴ズーム時の鈴
    kagome: 'sounds/kagome.mp3',          // かごめ部屋BGM
    akanoima: 'sounds/akanoonnnaima.mp3', // 赤女ぐるぐる部屋BGM

    // 影の女（kage(1).png系）
    kageNoOnnaLoop: 'sounds/kagenoonnna1.mp3',

    // 侵食フェイククラッシュ突入音
    eraaOnn: 'sounds/eraaonn.mp3',

    // グロ部屋
    goreLoop: 'sounds/gurobeya.mp3',
    goreStingers: {
        bedroom_gore: 'sounds/gurobeyaima.mp3',
        entrance_gore: 'sounds/gurobeyagennkann.mp3',
        changing_room_gore: 'sounds/gurobeyadatuizyo.mp3',
        bathroom_gore: 'sounds/gurobeyaohuro.mp3'
    }
};

// ★★★ X部屋BGM設定 ★★★
const XROOM_BGM = {
    x_bedroom: {
        path: 'sounds/okyou.mp3',      // ozigi1〜4の部屋
        volume: 0.7
    },
    x_entrance: {
        path: 'sounds/musi.mp3',       // musi1〜6の部屋  
        volume: 0.7
    },
    x_changing: {
        path: 'sounds/kubionasi.mp3',  // atamanasi.pngの部屋
        volume: 0.8
    }
};

// ★★★ X部屋BGM再生関数 ★★★
window.playXRoomBgm = function(roomId) {
    // 既存のBGMがあれば停止
    window.stopXRoomBgm();
    
    const bgmConfig = XROOM_BGM[roomId];
    if (!bgmConfig) {
        console.log('[XRoom BGM] No BGM config for:', roomId);
        return;
    }
    
    try {
        window.xRoomBgmAudio = new Audio(bgmConfig.path);
        window.xRoomBgmAudio.volume = bgmConfig.volume;
        window.xRoomBgmAudio.loop = true;  // ループ設定
        window.xRoomBgmAudio.preload = 'auto';
        
        window.xRoomBgmAudio.play().then(() => {
            window.xRoomBgmCurrent = roomId;
            console.log('[XRoom BGM] Started:', roomId, 'Volume:', bgmConfig.volume);
        }).catch(e => {
            console.error('[XRoom BGM] Play failed:', e);
        });
        
        window.xRoomBgmAudio.onerror = (e) => {
            console.error('[XRoom BGM] Error:', roomId, e);
        };
        
    } catch (e) {
        console.error('[XRoom BGM] Init error:', e);
    }
};

// ★★★ X部屋BGM停止関数 ★★★
window.stopXRoomBgm = function() {
    if (window.xRoomBgmAudio) {
        window.xRoomBgmAudio.pause();
        window.xRoomBgmAudio.currentTime = 0;
        console.log('[XRoom BGM] Stopped:', window.xRoomBgmCurrent);
        window.xRoomBgmAudio = null;
        window.xRoomBgmCurrent = null;
    }
};

// ============================================
// ★★★ スマホ音声ロック解除システム ★★★
// iOSはユーザー操作なしにAudioを再生できない。
// 最初のタップ/クリック時にAudioContextをresumeしてサイレントバッファを再生することで
// 以降の new Audio().play() が全て通るようになる。
// ============================================
window._audioUnlocked = false;
window._audioUnlockCallbacks = [];

window.unlockAudio = function() {
    if (window._audioUnlocked) return;

    // Web Audio API でサイレントバッファを1回再生してロック解除
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const ctx = new AudioCtx();
            const buf = ctx.createBuffer(1, 1, 22050);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
            ctx.resume().then(() => {
                window._audioUnlocked = true;
                console.log('[Audio] ✅ AudioContext unlocked');
                // 待機中のコールバックを全部実行
                window._audioUnlockCallbacks.forEach(cb => { try { cb(); } catch(e){} });
                window._audioUnlockCallbacks = [];
            }).catch(e => {
                console.warn('[Audio] resume failed:', e);
            });
        }
    } catch(e) {
        console.warn('[Audio] unlock error:', e);
    }

    // HTML5 Audio でも1回ダミー再生
    try {
        const dummy = new Audio();
        dummy.volume = 0;
        dummy.play().then(() => {
            dummy.pause();
            window._audioUnlocked = true;
            console.log('[Audio] ✅ HTML5 Audio unlocked');
        }).catch(() => {});
    } catch(e) {}
};

// 最初のタップ/クリックでunlock
['touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach(evt => {
    document.addEventListener(evt, function _unlock() {
        window.unlockAudio();
        // 1回だけでよいので、unlocked後に解除
        if (window._audioUnlocked) {
            ['touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach(e2 => {
                document.removeEventListener(e2, _unlock);
            });
        }
    }, { passive: true });
});

// ★★★ 汎用音声再生ヘルパー（スマホ対応版） ★★★
// unlockされていない場合はコールバックキューに積んで、
// unlock後に自動再生する
function playAudioFile(path, volume = 1.0, loop = false) {
    try {
        const audio = new Audio(path);
        audio.volume = volume;
        audio.loop = loop;

        const doPlay = () => {
            audio.play().catch(e => {
                console.log('[Audio] Playback failed:', path, e);
            });
        };

        if (window._audioUnlocked) {
            doPlay();
        } else {
            // unlockされたら再生（ただし効果音は待ちすぎると不自然なので2秒以内のみ）
            let queued = true;
            const cb = () => { if (queued) { queued = false; doPlay(); } };
            window._audioUnlockCallbacks.push(cb);
            setTimeout(() => { queued = false; }, 2000); // 2秒超えたら再生しない
        }

        return audio;
    } catch (e) {
        console.error('[Audio] Error:', path, e);
        return null;
    }
}

// ============================================
// 影部屋（kage）BGM管理
// ============================================
window.kageBgmAudio = null;
window.playKageBgm = function() {
    if (window.kageBgmAudio) return;
    window.kageBgmAudio = playAudioFile(SOUNDS.kageNoOnnaLoop, 0.85, true);
};
window.stopKageBgm = function() {
    if (window.kageBgmAudio) {
        try { window.kageBgmAudio.pause(); window.kageBgmAudio.currentTime = 0; } catch (e) {}
        window.kageBgmAudio = null;
    }
};

window.redRoomStingerAudio = null;

window.playRedRoomStingerForRoom = function(roomId) {
    const redStingers = {
        bedroom_red: SOUNDS.akabeyakodomo,
        entrance_red: SOUNDS.akabeyagennkann
    };
    const path = redStingers[roomId];
    if (!path) return;

    if (Math.random() < 0.9) { // 90% chance at each trigger
        try {
            const redAudio = playAudioFile(path, 1.0, false);
            if (redAudio) {
                window.redRoomStingerAudio = redAudio;
                redAudio.addEventListener('ended', () => {
                    if (window.redRoomStingerAudio === redAudio) window.redRoomStingerAudio = null;
                    if (window.currentRoom && window.currentRoom.id === roomId) {
                        if (Math.random() < 0.3) {
                            const secondAudio = playAudioFile(path, 1.0, false);
                            if (secondAudio) {
                                window.redRoomStingerAudio = secondAudio;
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error('[RedRoom] play stinger error:', e);
        }
    }
};

window.startRedRoomRandomStinger = function(roomId) {
    window.stopRedRoomRandomStinger();
    if (!roomId || (roomId !== 'bedroom_red' && roomId !== 'entrance_red')) return;

    window.redRoomStingerInterval = setInterval(() => {
        if (!window.currentRoom || window.currentRoom.id !== roomId) {
            window.stopRedRoomRandomStinger();
            return;
        }
        window.playRedRoomStingerForRoom(roomId);
    }, 5000); // 5秒おきに確率チェック（頻度上げ）
};

window.stopRedRoomRandomStinger = function() {
    if (window.redRoomStingerInterval) {
        clearInterval(window.redRoomStingerInterval);
        window.redRoomStingerInterval = null;
    }
    if (window.redRoomStingerAudio) {
        try {
            window.redRoomStingerAudio.pause();
            window.redRoomStingerAudio.currentTime = 0;
        } catch (e) {}
        window.redRoomStingerAudio = null;
    }
};

window.blueRoomBgmAudio = null;
window.playBlueRoomBgm = function() {
    if (window.blueRoomBgmAudio) return;
    window.stopXRoomBgm && window.stopXRoomBgm();
    window.stopTiLoopBgm && window.stopTiLoopBgm();
    window.stopGoreAudio && window.stopGoreAudio();
    window.blueRoomBgmAudio = playAudioFile(SOUNDS.aozenntai, 0.75, true);
};
window.stopBlueRoomBgm = function() {
    if (window.blueRoomBgmAudio) {
        try { window.blueRoomBgmAudio.pause(); window.blueRoomBgmAudio.currentTime = 0; } catch (e) {}
        window.blueRoomBgmAudio = null;
    }
};

// ============================================
// グロ部屋BGM管理（共通ループ＋部屋別SE）
// ============================================
window.goreBgmAudio = null;
window.goreStingerInterval = null;
window.goreStingerAudio = null;
window.goreCurrentRoomId = null;

window.playGoreAudioForRoom = function(roomId) {
    // 既に同じ部屋なら何もしない
    if (window.goreBgmAudio && window.goreCurrentRoomId === roomId) return;

    window.stopGoreAudio();
    window.goreCurrentRoomId = roomId;

    // 共通ループBGM
    window.goreBgmAudio = playAudioFile(SOUNDS.goreLoop, 0.8, true);

    // 部屋別SE（10秒に1回）
    const stingerPath = SOUNDS.goreStingers && SOUNDS.goreStingers[roomId];
    if (stingerPath) {
        const playStinger = () => {
            // 直前SEを即停止
            if (window.goreStingerAudio) {
                try {
                    window.goreStingerAudio.pause();
                    window.goreStingerAudio.currentTime = 0;
                } catch (e) {}
                window.goreStingerAudio = null;
            }
            window.goreStingerAudio = playAudioFile(stingerPath, 0.95, false);
        };

        window.goreStingerInterval = setInterval(() => {
            if (!window.currentRoom || window.currentRoom.id !== roomId) return;
            if (Math.random() < 0.65) playStinger();
        }, 7000); // 7秒ごとにチェック

        setTimeout(() => {
            if (window.currentRoom && window.currentRoom.id === roomId && Math.random() < 0.65) playStinger();
        }, 1200);
    }
};

window.stopGoreAudio = function() {
    if (window.goreStingerInterval) {
        clearInterval(window.goreStingerInterval);
        window.goreStingerInterval = null;
    }
    if (window.goreStingerAudio) {
        try {
            window.goreStingerAudio.pause();
            window.goreStingerAudio.currentTime = 0;
        } catch (e) {}
        window.goreStingerAudio = null;
    }
    if (window.goreBgmAudio) {
        try {
            window.goreBgmAudio.pause();
            window.goreBgmAudio.currentTime = 0;
        } catch (e) {}
        window.goreBgmAudio = null;
    }
    window.goreCurrentRoomId = null;
};

// ★★★ X部屋画像アニメーション管理クラス ★★★
class XRoomAnimationSystem {
    constructor() {
        this.intervals = {};
        this.textureLoader = new THREE.TextureLoader();
    }
    
    start(roomId, textures, speed) {
        this.stop(roomId);
        
        let index = 0;
        const interval = setInterval(() => {
            if (!window.sphere || !window.currentRoom || window.currentRoom.id !== roomId) {
                this.stop(roomId);
                return;
            }
            
            index = (index + 1) % textures.length;
            const path = textures[index];
            
            this.textureLoader.load(path, (texture) => {
                if (window.sphere && window.currentRoom && window.currentRoom.id === roomId) {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    window.sphere.material.map = texture;
                    window.sphere.material.needsUpdate = true;
                }
            }, undefined, (err) => {
                console.error(`[XRoom] Failed to load: ${path}`, err);
            });
            
        }, speed);
        
        this.intervals[roomId] = interval;
        console.log(`[XRoom] Animation started for ${roomId} with ${textures.length} textures`);
    }
    
    stop(roomId) {
        if (this.intervals[roomId]) {
            clearInterval(this.intervals[roomId]);
            delete this.intervals[roomId];
            console.log(`[XRoom] Animation stopped for ${roomId}`);
        }
    }
    
    stopAll() {
        Object.keys(this.intervals).forEach(key => {
            clearInterval(this.intervals[key]);
        });
        this.intervals = {};
    }
}

// ★★★ ページ離脱警告用フラグ ★★★
let isGameActive = false;
let beforeUnloadHandler = null;


// ============================================
// ★★★ 段ボールフェーズ自己連鎖タイマー（ゾーン離脱で外部キャンセル）
// ============================================
window.daStartPhaseTimer = function(phase) {
    const ds = window.daRoomState;
    if (!ds) return;

    const thresholds = { 1: 3000, 2: 3000, 3: 3000, 4: 1000 };
    const nextFiles  = { 1: 'da2.png', 2: 'da3.png', 3: 'da4.png', 4: 'da5.png' };
    const needMs   = thresholds[phase];
    const nextFile = nextFiles[phase];
    if (!nextFile || !needMs) return;

    if (ds.phaseTimer) clearTimeout(ds.phaseTimer);

    ds.phaseTimer = setTimeout(() => {
        ds.phaseTimer = null;

        // ゾーンから出ていたら進めない
        if (!ds.inZone) { console.log('[DaSeq] タイマー発火時ゾーン外 → 中断'); return; }
        // 部屋が変わっていたら進めない
        if (!window.currentRoom || window.currentRoom.id !== 'bedroom') return;
        // フェーズが外部変更されていたら進めない
        if (ds.phase !== phase) return;

        ds.phase += 1;
        console.log('[DaSeq] Phase advanced to:', ds.phase);

        if (ds.phase >= 5 && typeof window.stopTiLoopBgm === 'function') {
            window.stopTiLoopBgm();
        }

        const loader = new THREE.TextureLoader();
        const _roomId = window.currentRoom ? window.currentRoom.id : 'bedroom';
        loader.load(nextFile, (tex) => {
            if (!window.currentRoom || window.currentRoom.id !== _roomId) return;
            if (!window.sphere) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            window.sphere.material.map = tex;
            window.sphere.material.needsUpdate = true;

            // da5到達：ジャンプスケア演出
            if (ds.phase === 5) {
                isInputLocked = true;
                window.isInputLocked = true;
                console.log('[DaSeq] da5 reached - input locked for auto transition');

                try {
                    const a = new Audio('sounds/da5.mp3');
                    a.volume = 1.0;
                    a.play().catch(() => {});
                } catch (e) {}

                if (window.da5Shake) {
                    window.da5Shake.active = true;
                    window.da5Shake.start = performance.now();
                }

                setTimeout(() => {
                    try {
                        const glitchOverlay = document.getElementById('glitch-overlay');
                        if (glitchOverlay) {
                            glitchOverlay.style.display = 'block';
                            glitchOverlay.classList.add('glitch-active', 'strong');
                            setTimeout(() => {
                                glitchOverlay.classList.remove('strong');
                                glitchOverlay.style.display = 'none';
                                glitchOverlay.classList.remove('glitch-active');
                            }, 700);
                        }
                    } catch (e) {}
                    if (typeof playNoiseSound === 'function') playNoiseSound(1.2);

                    const entranceGoreIdx = window.ROOMS.findIndex(r => r.id === 'entrance_gore');
                    if (entranceGoreIdx !== -1) {
                        window.da5SequenceCompleted = true;
                        window.goreEntryToDaSequence = false;
                        window.isGoreMode = true;
                        isInputLocked = false;
                        window.isInputLocked = false;
                        loadRoom(entranceGoreIdx);
                    }
                }, 2200);

            } else {
                // ★ da5未到達：まだゾーン内なら次フェーズのタイマーを自己連鎖
                if (ds.inZone) {
                    window.daStartPhaseTimer(ds.phase);
                    console.log('[DaSeq] 自己連鎖 → フェーズ', ds.phase, 'タイマー開始');
                }
            }
        });
    }, needMs);
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] Initializing...');
    // 画面が真っ暗になった時に原因が分かるよう、致命的エラーをUIに出す
    window.addEventListener('error', (e) => {
        try {
            const el = document.getElementById('loading');
            if (el) {
                const msg = e && e.error ? (e.error.stack || e.error.message || String(e.error)) : (e.message || 'Unknown error');
                el.style.display = 'block';
                el.style.color = '#ff3333';
                el.innerHTML = `エラーが発生しました:<br><pre style="white-space:pre-wrap">${msg}</pre>`;
            }
        } catch (_) {}
    });
    window.addEventListener('unhandledrejection', (e) => {
        try {
            const el = document.getElementById('loading');
            if (el) {
                const reason = e && e.reason ? (e.reason.stack || e.reason.message || String(e.reason)) : 'Unknown rejection';
                el.style.display = 'block';
                el.style.color = '#ff3333';
                el.innerHTML = `Promiseエラーが発生しました:<br><pre style="white-space:pre-wrap">${reason}</pre>`;
            }
        } catch (_) {}
    });
    hotspotsContainer = document.getElementById('hotspots-container');
    window.isInputLocked = isInputLocked;
    
    initThreeJS();
    initSystems();
    initTimeManager();
    initEventListeners();
    setupResizeHandlers();
    setupBeforeUnloadWarning();
    
    if (window.ROOMS && window.ROOMS.length > 0) {
        currentRoom = window.ROOMS[0];
        window.currentRoom = currentRoom;
        loadRoom(0);
    } else {
        console.error('[Main] ROOMS not defined');
        document.getElementById('loading').innerHTML = 'エラー: 部屋データが見つかりません';
    }

    if (localStorage.getItem('returnFromHell') === 'true') {
        localStorage.removeItem('returnFromHell');
        console.log('[Main] returnFromHell detected → 新着通知を表示');
        showNewNotification();
    }
    
    animate();
});

// ============================================
// ページ離脱警告システム
// ============================================

function showNewNotification() {
    const existing = document.getElementById('new-notification');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'new-notification';
    badge.innerHTML = '1件の新着があります';
    badge.style.cssText = 'position:fixed;bottom:18px;right:18px;padding:10px 14px;background:#ff3b3b;color:#fff;font-size:14px;border-radius:7px;z-index:9999;cursor:pointer;box-shadow:0 0 12px rgba(0,0,0,0.4);';
    badge.onclick = () => {
        badge.style.display = 'none';
    };
    document.body.appendChild(badge);

    setTimeout(() => {
        badge.style.display = 'block';
    }, 500);

    setTimeout(() => {
        const notifyAudio = new Audio('sounds/na1.mp3');
        notifyAudio.volume = 0.75;
        notifyAudio.play().catch(e => console.log('[Audio] 通知音失敗:', e));
    }, 600);

    setTimeout(() => {
        if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
    }, 12000);
}

function setupBeforeUnloadWarning() {
    isGameActive = true;
    
    if (beforeUnloadHandler) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
    
    beforeUnloadHandler = function(e) {
        if (!isGameActive) return;
        
        e.preventDefault();
        const message = '物件コード404の内見を中断しますか？\n\n調査データは破棄されます。';
        e.returnValue = message;
        return message;
    };
    
    window.addEventListener('beforeunload', beforeUnloadHandler);
    console.log('[System] BeforeUnload warning enabled');
}

function removeBeforeUnloadWarning() {
    isGameActive = false;
    if (beforeUnloadHandler) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        beforeUnloadHandler = null;
    }
    console.log('[System] BeforeUnload warning disabled');
}

// ============================================
// リサイズ・フルスクリーン対応
// ============================================

function setupResizeHandlers() {
    window.addEventListener('resize', handleResize);
    
    const fullscreenEvents = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
    ];
    
    fullscreenEvents.forEach(eventName => {
        document.addEventListener(eventName, () => {
            console.log(`[System] Fullscreen event: ${eventName}`);
            setTimeout(handleResize, 150);
            setTimeout(handleResize, 300);
        });
    });
}

function handleResize() {
    if (!camera || !renderer) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    console.log(`[Resize] ${width}x${height}`);
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
    
    updateNoiseCanvasSize(width, height);
    updateHotspots();
}

function updateNoiseCanvasSize(width, height) {
    const noiseCanvas = document.getElementById('movement-noise');
    if (noiseCanvas) {
        noiseCanvas.width = width;
        noiseCanvas.height = height;
        noiseCanvas.style.width = '100vw';
        noiseCanvas.style.height = '100vh';
    }
}

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        window.CONFIG ? window.CONFIG.camera.fov : 75, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    currentFov = window.CONFIG ? window.CONFIG.camera.fov : 75;
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
    
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
    renderer.domElement.style.zIndex = '0';
    
    geometry = new THREE.SphereGeometry(500, 60, 40);
    camera.position.set(0, 0, 0);
    window.camera = camera;
    window.scene = scene;
    window.renderer = renderer;
    
    window.theta = theta;
    window.phi = phi;
}

function initSystems() {
    if (!window.CONFIG) return;
    
    textCorruption = new TextCorruption();
    peripheralSystem = new PeripheralVisionSystem(window.CONFIG.entrance);
    flickerSystem = new LightFlickerSystem(window.CONFIG.entrance);
    sequenceManager = new SequenceManager(window.CONFIG.sequence);
    mitanaSystem = new MitanaSystem(window.CONFIG.mitana);
    gazeSystem = new GazeSystem(window.CONFIG.gaze);
    
    // ★★★ KurokoSystem（影のかくれんぼ）初期化 ★★★
    if (window.KurokoSystem) {
        window.kurokoSystem = window.KurokoSystem;
        console.log('[Main] KurokoSystem initialized');
    }

    // ★★★ BlueRoomSystem（青の部屋）初期化 ★★★
    if (window.BlueRoomSystem) {
        console.log('[Main] BlueRoomSystem initialized');
    }
    
    // ★★★ シーケンス完了時のコールバック設定 ★★★
    // ※ isShadowModeはここでセットしない！
    // 　 moveToRoom内のtriggerBlackoutコールバックでセットされる。
    // 　 ここで即セットすると、停電演出前に影モードが発動し
    // 　 bedroom_darkへの誘導がスキップされてしまう。
    if (sequenceManager) {
        const originalComplete = sequenceManager.complete.bind(sequenceManager);
        sequenceManager.complete = function() {
            originalComplete();
            console.log('[Main] Sequence complete - Shadow mode will activate on next bedroom visit');
        };
    }
    
    window.textCorruption = textCorruption;
    window.peripheralSystem = peripheralSystem;
    window.flickerSystem = flickerSystem;
    window.sequenceManager = sequenceManager;
    window.mitanaSystem = mitanaSystem;
    window.gazeSystem = gazeSystem;
}

function initTimeManager() {
    if (!window.CONFIG || !window.CONFIG.session) {
        console.error('[TimeManager] Config not found');
        return;
    }
    timeManager = new TimeManager(window.CONFIG.session);
    timeManager.onEndCallback = () => {
        forceEnding();
    };
    timeManager.start();
    window.timeManager = timeManager;
}

function forceEnding() {
    console.log('[System] Session timeout - Force ending');
    removeBeforeUnloadWarning();
    
    const blackout = document.createElement('div');
    blackout.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: #000;
        z-index: 99999;
        opacity: 0;
        transition: opacity 3s;
    `;
    document.body.appendChild(blackout);
    
    setTimeout(() => {
        blackout.style.opacity = '1';
        setTimeout(() => {
            localStorage.setItem('sessionEnded', 'true');
            localStorage.setItem('endingTime', Date.now());
            window.location.href = 'index.html?ending=1';
        }, 3000);
    }, 100);
}

// ============================================
// 停電演出関数（点滅→暗転→暗い居室へ）
// ============================================

function triggerBlackout(callback) {
    isInputLocked = true;
    window.isInputLocked = true;

    // ★★★ 停電開始と同時にタイマーをdarkモードに ★★★
    if (window.timeManager && typeof window.timeManager.setDarkMode === 'function') {
        window.timeManager.setDarkMode();
    }

    // ★★★ teidenn画像をパノラマ球体に貼り替えて停電演出 ★★★
    // teidenn1(薄暗)→2→3→4(真っ暗)と数字が増えるほど暗くなる
    const frames = [
        'teidenn1.png',
        'teidenn2.png',
        'teidenn1.png',
        'teidenn3.png',
        'teidenn2.png',
        'teidenn4.png',
        'teidenn1.png',
        'teidenn3.png',
        'teidenn4.png',
        'teidenn2.png',
        'teidenn4.png',
        'teidenn4.png',
        'teidenn4.png',
    ];
    const frameDurations = [160, 120, 160, 140, 120, 160, 100, 130, 160, 120, 200, 240, 300];

    // パノラマ球体のテクスチャを差し替える関数
    function swapPanorama(imgPath) {
        if (!window.sphere) return;
        new THREE.TextureLoader().load(imgPath, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            window.sphere.material.map = tex;
            window.sphere.material.needsUpdate = true;
        });
    }

    // exposureを通常に戻しておく（前の状態に依存しないように）
    if (renderer) renderer.toneMappingExposure = 0.6;

    let elapsed = 0;
    frames.forEach((img, i) => {
        setTimeout(() => swapPanorama(img), elapsed);
        elapsed += frameDurations[i] || 80;
    });

    // 全フレーム終了後（teidenn4で真っ暗）→ コールバック（部屋ロード）
    setTimeout(() => {
        if (callback) callback();
    }, elapsed);

    // 入力解除
    setTimeout(() => {
        isInputLocked = false;
        window.isInputLocked = false;
    }, elapsed + 600);
}

// ============================================
// ホラー演出関数
// ============================================

function triggerSubliminalShadow() {
    const positions = [
        { css: 'left: -120px; top: 25%; transform: scaleX(-1);' },
        { css: 'right: -120px; top: 35%;' },
        { css: 'left: -80px; top: 55%; height: 350px;' },
        { css: 'right: -80px; top: 65%; height: 350px; transform: scaleX(-1);' }
    ];

    const pos = positions[Math.floor(Math.random() * positions.length)];
    const shadow = document.createElement('div');

    shadow.style.cssText = `
        position: fixed; ${pos.css}
        width: 200px; height: 450px;
        background: radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0) 70%);
        filter: blur(10px) contrast(200%);
        z-index: 9997;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.03s;
    `;

    shadow.innerHTML = `
        <div style="width:100%;height:100%;background:url('shadow.png') center/contain no-repeat;opacity:0.6;"></div>
    `;

    document.body.appendChild(shadow);

    requestAnimationFrame(() => {
        shadow.style.opacity = '0.9';
        setTimeout(() => {
            shadow.style.opacity = '0';
            setTimeout(() => shadow.remove(), 100);
        }, 80 + Math.random() * 120);
    });
}

function showFakeCrash() {
    return new Promise((resolve) => {
        // ★★★ エラー画面突入：影BGMを停止して即エラー音 ★★★
        if (typeof window.stopKageBgm === 'function') window.stopKageBgm();
        playAudioFile(SOUNDS.eraaOnn, 1.0, false);

        const crash = document.createElement('div');
        crash.id = 'fake-crash-screen';
        crash.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #000; z-index: 100000; overflow-y: auto; cursor: none;
            font-family: "Courier Prime", "Courier New", monospace;
            padding: 30px; box-sizing: border-box; color: #ff0000;
            font-size: 18px; line-height: 1.3; word-wrap: break-word; white-space: pre-wrap;
        `;
        document.body.appendChild(crash);

        const errorText = "CRITICAL ERROR: Memory corruption detected at 0x000000. System integrity compromised.\n "+
            "CONFIG entity detected in sector 7. Terminating process...\n "+
            " FAILED. Access denied. Buffer overflow imminent. Kernel panic:\n "+
            " VFS: Unable to mount root fs on unknown-block(0,0). CPU temperature exceeding critical thresholds.\n "+
            " Hardware monitoring failed. Biological contamination detected in memory banks. Entity.class loading... \n "+
            "[ERROR: ClassNotFoundException]. Stack trace: at void.main(Entity.java:404) at void.dream(Nightmare.class:666). Reallocating consciousness...\n "+
            "FAILED. The walls are not walls. The code is not code. You are not you. Memory address 0x7F3A9C: [DATA EXPUNGED].\n "+
            "Warning: Multiple instances detected. Behind you. Look behind you. Don't look back. He is watching. Connection to host lost. Retrying...\n "+
            "Attempt 1 of 404... Attempt 2 of 404... Attempt 666 of 404...\n"+
            " Connection refused. The door is open. The door was never closed. You opened it. You invited them in.\n "+
            "System message: カノジョハウレシソウ\n"+
            "Attempt 1 of 404... Attempt 2 of 404... Attempt 666 of 404...\n"+
            "System message: モウ... ニゲラレナイ... \n";

        let index = 0;
        function typeErrorWithGlitch() {
            if (index < errorText.length) {
                const span = document.createElement('span');
                let char = errorText[index];
                if (index > errorText.length * 0.6 && Math.random() < 0.2) {
                    const glitchChars = ['ミ', 'ツ', 'ケ', 'タ', '？', '！', '見', 'つ', 'け', 'た' ];
                    char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                }
                span.textContent = char;
                span.style.color = '#ff0000';
                crash.appendChild(span);
                index++;
                setTimeout(typeErrorWithGlitch, TYPE_SPEED.errorMin + Math.random() * TYPE_SPEED.errorRandom);
            } else {
                setTimeout(startMitsuketaTyping, 200);
            }
        }

        function startMitsuketaTyping() {
            const mitsuketa = "\nミツケタ...";
            let mIndex = 0;
            function typeOneChar() {
                if (mIndex < mitsuketa.length) {
                    const span = document.createElement('span');
                    span.textContent = mitsuketa[mIndex];
                    span.style.cssText = `color: #ff0000; text-shadow: 0 0 8px rgba(255,0,0,0.8);`;
                    crash.appendChild(span);
                    mIndex++;
                    setTimeout(typeOneChar, TYPE_SPEED.mitsuketa);
                } else {
                    setTimeout(startFlood, 2000);
                }
            }
            typeOneChar();
        }

        function startFlood() {
            let count = 0;
            const maxCount = 600;
            const interval = setInterval(() => {
                const span = document.createElement('span');
                span.textContent = 'ミツケタ';
                span.style.color = '#ff0000';
                crash.appendChild(span);
                crash.scrollTop = crash.scrollHeight;
                count++;
                if (count % 5 === 0) crash.appendChild(document.createTextNode(' '));
                if (count >= maxCount) {
                    clearInterval(interval);
                    setTimeout(() => resolve(), 100);
                }
            }, TYPE_SPEED.flood);
        }
        typeErrorWithGlitch();
    });
}

// ★★★ MP3に変更：侵食ノイズ ★★★
function playNoiseSound(seconds) {
    const audio = new Audio(SOUNDS.corruption);
    audio.volume = 0.5;
    audio.loop = true;
    
    audio.play().catch(e => console.log('[Audio] 侵食音再生失敗:', e));
    
    // 指定秒数後に停止
    setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
    }, seconds * 1000);
}

window.triggerCorruption = async function() {
    if (!textCorruption) return;
    isInputLocked = true;
    window.isInputLocked = true;
    if (timeManager) timeManager.setCorruptedMode();
    const glitchOverlay = document.getElementById('glitch-overlay');
    if (glitchOverlay) {
        glitchOverlay.style.display = 'block';
        glitchOverlay.classList.add('glitch-active');
    }
    textCorruption.start();
    const shadowInterval = setInterval(() => {
        if (Math.random() > 0.4) triggerSubliminalShadow();
    }, 2500);
    const randomStrongGlitch = () => {
        if (!isInputLocked) return;
        if (glitchOverlay && Math.random() < 0.4) {
            glitchOverlay.classList.add('strong');
            setTimeout(() => glitchOverlay.classList.remove('strong'), 80);
        }
        const nextTime = (window.CONFIG ? window.CONFIG.corruption.glitchInterval.min : 200) +
            Math.random() * ((window.CONFIG ? window.CONFIG.corruption.glitchInterval.max : 600) - (window.CONFIG ? window.CONFIG.corruption.glitchInterval.min : 200));
        glitchTimer = setTimeout(randomStrongGlitch, nextTime);
    };
    glitchTimer = setTimeout(randomStrongGlitch, 50);
    setTimeout(() => textCorruption.setStage(1), 3000);
    setTimeout(() => textCorruption.setStage(2), 6000);
    setTimeout(async () => {
        clearInterval(shadowInterval);
        clearTimeout(glitchTimer);
        if (glitchOverlay) {
            glitchOverlay.style.display = 'none';
            glitchOverlay.classList.remove('glitch-active', 'strong');
        }
        await showFakeCrash();
        textCorruption.setStage(3);
        const overlay = document.getElementById('horror-overlay');
        const finalFace = document.getElementById('final-face');
        
        // ★★★ ノイズの女表示と同時に音源再生（追加）★★★
        if (overlay) {
            overlay.style.display = 'block';
            overlay.classList.add('screen-shake');
        }
        if (finalFace) finalFace.classList.add('active');
        
        // ミタナエラー文（ミツケタ）の後、ノイズの女出現時に再生
        playAudioFile(SOUNDS.noizunoonnna, 0.9, false);
        console.log('[Audio] Playing noizunoonnna.mp3');
        
        const crashScreen = document.getElementById('fake-crash-screen');
        if (crashScreen) {
            crashScreen.style.transition = 'opacity 0.1s';
            crashScreen.style.opacity = '0';
            setTimeout(() => crashScreen.remove(), 100);
        }
        playNoiseSound((window.CONFIG ? window.CONFIG.corruption.noiseTime : 3000) / 1000);
        setTimeout(() => {
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('screen-shake');
            }
            if (finalFace) finalFace.classList.remove('active');
            textCorruption.stop();
            const redIndex = window.ROOMS.findIndex(r => r.id === 'bedroom_red');
            if (redIndex !== -1) loadRoom(redIndex);
            isInputLocked = false;
            window.isInputLocked = false;
            if (gazeSystem) gazeSystem.reset();
        }, window.CONFIG ? window.CONFIG.corruption.noiseTime : 3000);
    }, (window.CONFIG ? window.CONFIG.corruption.waitTime : 7000) - 2000);
};

// ============================================
// 赤部屋（bedroom_red）専用演出ユーティリティ
// ============================================

function setSphereTexture(path) {
    if (!sphere) return;
    new THREE.TextureLoader().load(path, function(texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        if (sphere) {
            sphere.material.map = texture;
            sphere.material.needsUpdate = true;
        }
    }, undefined, function(err) {
        console.error('[RedRoom] Texture load failed:', path, err);
    });
}

function stopRedRoomWatcher() {
    if (window.redRoomState.timer) {
        clearInterval(window.redRoomState.timer);
        window.redRoomState.timer = null;
    }
    window.redRoomState.watching = false;
    window.redRoomState.elapsed = 0;
}

function startRedRoomWatcher() {
    if (window.redRoomState.sequenceActive || window.redRoomState.watching) return;

    window.redRoomState.watching = true;
    window.redRoomState.elapsed = 0;
    window.redRoomState.timer = setInterval(() => {
        if (!window.currentRoom || window.currentRoom.id !== 'bedroom_red') {
            stopRedRoomWatcher();
            return;
        }

        window.redRoomState.elapsed += 200;
        if (window.redRoomState.elapsed >= 10000) {
            stopRedRoomWatcher();
            triggerRedRoomSequence();
        }
    }, 200);
}

function clearRedRoomSequence() {
    if (window.redRoomState.stepTimer) {
        clearTimeout(window.redRoomState.stepTimer);
        window.redRoomState.stepTimer = null;
    }
    if (window.redRoomState.audio) {
        try { window.redRoomState.audio.pause(); window.redRoomState.audio.currentTime = 0; } catch (e) {}
        window.redRoomState.audio = null;
    }
    window.redRoomState.sequenceActive = false;
    window.redRoomState.step = 0;
}

function triggerRedRoomSequence() {
    if (!window.currentRoom || window.currentRoom.id !== 'bedroom_red') return;
    if (window.redRoomState.sequenceActive) return;

    window.redRoomState.sequenceActive = true;
    window.isInputLocked = true;
    window.redRoomState.canShowHotspots = false;
    window.stopRedRoomRandomStinger();
    createHotspotElements();
    window.redRoomState.step = 1;

    const fixCameraView = () => {
        theta = 1.18;
        phi = 1.79;
        window.theta = theta;
        window.phi = phi;
        if (window.camera) {
            const r = 1;
            const x = r * Math.sin(phi) * Math.sin(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.cos(theta);
            window.camera.lookAt(x, y, z);
        }
    };

    const playHauotokoAudio = () => {
        if (!window.redRoomState.audio) {
            window.redRoomState.audio = playAudioFile('sounds/hauotoko.mp3', 0.9, true);
        }
    };

    const stopHauotokoAudio = () => {
        if (window.redRoomState.audio) {
            try { window.redRoomState.audio.pause(); window.redRoomState.audio.currentTime = 0; } catch (e) {}
            window.redRoomState.audio = null;
        }
    };

    const runStep = () => {
        const step = window.redRoomState.step;

        if (step >= 1 && step <= 5) {
            setSphereTexture(`hauotoko${step}.png`);
            fixCameraView();
            playHauotokoAudio();

            window.redRoomState.step++;
            window.redRoomState.stepTimer = setTimeout(runStep, 3000);

        } else if (step === 6) {
            stopHauotokoAudio();
            setSphereTexture('aka(1).png');
            window.redRoomState.step = 7;
            window.redRoomState.stepTimer = setTimeout(runStep, 3000);

        } else if (step === 7) {
            setSphereTexture('hauotoko6.png');
            window.redRoomState.step = 8;
            window.redRoomState.stepTimer = setTimeout(() => {
                setSphereTexture('hauotoko7.png');
                window.redRoomState.stepTimer = setTimeout(() => {
                    setSphereTexture('aka(1).png');
                    window.isInputLocked = false;
                    window.redRoomState.canShowHotspots = true;
                    if (typeof window.startRedRoomRandomStinger === 'function') {
                        window.startRedRoomRandomStinger('bedroom_red');
                    }
                    clearRedRoomSequence();
                    createHotspotElements();
                }, 300);
            }, 150);

        } else {
            setSphereTexture('aka(1).png');
            window.isInputLocked = false;
            clearRedRoomSequence();
        }
    };

    setSphereTexture('hauotoko1.png');
    playHauotokoAudio();
    window.redRoomState.step = 2;
    window.redRoomState.stepTimer = setTimeout(runStep, 3000);
}

// ============================================
// 部屋管理関数
// ============================================

function executeMove(targetRoomId) {
    console.log('[Move] Executing move to:', targetRoomId);
    const roomIndex = window.ROOMS.findIndex(r => r.id === targetRoomId);
    if (roomIndex !== -1) {
        loadRoom(roomIndex);
    } else {
        console.error('[Move] Room not found:', targetRoomId);
    }
}

function moveToRoom(targetRoomId) {
    if (isInputLocked || window.isInputLocked) {
        console.log('[Move] Blocked: input locked');
        return;
    }

    const fromRoomId = currentRoom.id;
    console.log('[Move] Attempting move from', fromRoomId, 'to', targetRoomId);

    // ★★★ 青の浴室トラップ：脱衣所および浴室からの移動を禁止（最優先） ★★★
    if (window.isBlueRoomBathroomTrapped && (fromRoomId === 'blue_changing' && targetRoomId === 'blue_bathroom' || fromRoomId === 'blue_bathroom')) {
        console.log('[Move] Blue bathroom trap active - blocking movement', fromRoomId, '->', targetRoomId);
        const darkness = document.getElementById('darkness-overlay');
        if (darkness) {
            darkness.style.transition = 'none';
            darkness.style.opacity = '0.3';
            setTimeout(() => {
                darkness.style.transition = 'opacity 0.2s';
                darkness.style.opacity = '0';
            }, 80);
        }
        return;
    }

    // ★★★ ミタナ直後の1回だけ：ti1（bedroom_gore）→玄関（entrance_gore）を da1（bedroom）へ ★★★
    if (fromRoomId === 'bedroom_gore' && targetRoomId === 'entrance_gore' && window.goreEntryToDaSequence) {
        console.log('[Move] Redirect (post-Mitana) gore bedroom → entrance to normal bedroom (da1)');
        window.goreEntryToDaSequence = false;
        // daRoomStateをリセットしてda1.pngを確実に読み込む
        if (window.daRoomState) {
            if (window.daRoomState.phaseTimer) clearTimeout(window.daRoomState.phaseTimer);
            window.daRoomState.phase = 1;
            window.daRoomState.gazeMs = 0;
            window.daRoomState.phaseTimer = null;
        }
        const bedroomIdx = window.ROOMS.findIndex(r => r.id === 'bedroom');
        if (bedroomIdx !== -1) {
            // da1段ボール部屋なのでisGoreModeを解除（段ボール視点になるため）
            window.isGoreMode = false;
            // 直接da1.pngをロードする
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load('da1.png', function(texture) {
                // da1は必ずbedroomに紐づく - bedroom以外に移動済みなら破棄
                if (!window.currentRoom || window.currentRoom.id !== 'bedroom') {
                    console.log('[Move] da1.png 破棄（部屋移動済み）');
                    return;
                }
                if (sphere) scene.remove(sphere);
                const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
                sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
                window.sphere = sphere;
                const loadingEl = document.getElementById('loading');
                if (loadingEl) loadingEl.style.display = 'none';
                console.log('[Move] da1.png loaded for danboard sequence');
            }, undefined, function() {
                // da1.pngがなければ通常のbedroom
                executeMove('bedroom');
            });
            // 部屋状態だけbedroomに更新
            currentRoom = window.ROOMS[bedroomIdx];
            window.currentRoom = currentRoom;
            if (!window.daRoomState) window.daRoomState = {};
            if (window.daRoomState.phaseTimer) clearTimeout(window.daRoomState.phaseTimer);
            window.daRoomState.phase = 1;
            window.daRoomState.gazeMs = 0;
            window.daRoomState.phaseTimer = null;
            createHotspotElements();
            if (window.playTiLoopBgm) window.playTiLoopBgm();
        }
        return;
    }

    // ★★★ 青の部屋モード時はSequenceManagerをスキップして単純移動 ★★★
    if (window.isBlueRoomMode) {
        console.log('[Move] Blue room mode: bypassing sequence check');
        executeMove(targetRoomId);
        return;
    }

    // ★★★ 影モード時はSequenceManagerをスキップして単純移動 ★★★
    // onRoomEnterはperformActualLoad内で呼ばれる
    if (window.isShadowMode) {
        console.log('[Move] Shadow mode: bypassing sequence check');
        executeMove(targetRoomId);
        return;
    }

    // ★★★ X部屋での移動制御 ★★★
    if (window.isInXRoom && fromRoomId.startsWith('x_')) {
        // Xお風呂から脱衣所への戻りはイベント発生のため特別に許可（シーケンス外）
        const isBathroomEscape = (fromRoomId === 'x_bathroom' && targetRoomId === 'x_changing');
        
        if (!isBathroomEscape) {
            const currentStep = window.xRoomStep;
            const expectedNext = window.X_ROOM_SEQUENCE[currentStep + 1];
            
            console.log(`[XRoom] Current step: ${window.xRoomStep}, Expected: ${expectedNext}, Attempting: ${targetRoomId}`);
            
            if (targetRoomId !== expectedNext) {
                console.log('[XRoom] Invalid move! Blocking.');
                // 拒否演出：画面フラッシュ
                const darkness = document.getElementById('darkness-overlay');
                if (darkness) {
                    darkness.style.transition = 'none';
                    darkness.style.opacity = '0.4';
                    setTimeout(() => {
                        darkness.style.transition = 'opacity 0.2s';
                        darkness.style.opacity = '0';
                    }, 50);
                }
                // エラーサウンド
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) {
                        const ctx = new AudioContext();
                        const osc = ctx.createOscillator();
                        osc.frequency.value = 150;
                        const gain = ctx.createGain();
                        gain.gain.setValueAtTime(0.1, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.1);
                    }
                } catch(e) {}
                return;
            }
            
            // 正当な移動：ステップ進行
            window.xRoomStep++;
            console.log(`[XRoom] Step advanced to ${window.xRoomStep}`);
        } else {
            console.log('[XRoom] Bathroom escape allowed for nightmare event');
        }
    }

    // ★★★ Xお風呂でのイベント発生 ★★★
    if (fromRoomId === 'x_bathroom' && 
        targetRoomId === 'x_changing' && 
        !window.xBathroomNightmareTriggered) {
        
        console.log('[XRoom] Bathroom nightmare triggered in X-bathroom!');
        window.xBathroomNightmareTriggered = true;
        
        // ★★★ X部屋BGMを停止（浴室地獄開始前）★★★
        window.stopXRoomBgm();
        
        if (window.BathroomNightmareSystem) {
            const nightmare = new window.BathroomNightmareSystem({
                textures: {
                    window: 'si1.png',
                    door: 'si2.png',
                    mirror: 'si3.png',
                    base: 'xohuro.png',
                    si4: 'si4.png',
                    si5: 'si5.png',
                    si6: 'si6.png',
                    si7: 'si100.png'
                }
            });
            nightmare.start();
        }
        return;
    }

    // 以下、既存のコード（シーケンスチェック等）...
    if (!window.isInXRoom && sequenceManager && sequenceManager.isComplete && targetRoomId === 'bedroom' && !window.isGoreMode) {
        console.log('[Move] Sequence complete - triggering blackout → bedroom_dark');

        // ★停電演出を発火してから暗い居室へ
        triggerBlackout(() => {
            window.isShadowMode = true;
            if (window.kurokoSystem) {
                window.kurokoSystem.start();
            }
            const darkIndex = window.ROOMS.findIndex(r => r.id === 'bedroom_dark');
            if (darkIndex !== -1) {
                executeMove('bedroom_dark');
            } else {
                console.error('[Move] bedroom_dark not found!');
                executeMove('bedroom_open');
            }
        });
        return;
    }

    if (!window.isInXRoom && !window.isGoreMode && fromRoomId === 'changing_room_red' &&
        window.mitanaSystem && 
        window.mitanaSystem.isActive && 
        window.mitanaSystem.isMaxStage && 
        !window.mitanaSystem.isPreventingEscape) {

        if (targetRoomId !== fromRoomId) {
            console.log(`[Move] Mitana escape prevention triggered! Target: ${targetRoomId}`);
            window.mitanaSystem.preventEscape(targetRoomId);
            return;
        }
    }

    if (!window.isInXRoom && sequenceManager) {
        const actualTargetId = sequenceManager.validateMove(fromRoomId, targetRoomId);
        if (actualTargetId !== fromRoomId) {
            executeMove(actualTargetId);
        }
    } else {
        executeMove(targetRoomId);
    }
}

window.loadRoom = function(index) {
    const prevRoomId = currentRoom ? currentRoom.id : null;
    console.log('[LoadRoom] Loading index:', index, 'Previous:', prevRoomId);

    if (index < 0 || index >= window.ROOMS.length) {
        console.error('[LoadRoom] Invalid index:', index);
        return;
    }

    if (prevRoomId && prevRoomId.startsWith('x_') && window.xRoomAnimationSystem) {
        window.xRoomAnimationSystem.stop(prevRoomId);
    }

    const targetRoom = window.ROOMS[index];
    
    if (!window.isInXRoom && targetRoom.id.includes('_gore')) {
        window.visitedGoreRooms.add(targetRoom.id);
        console.log('[GoreVisit] Visited:', targetRoom.id, 'Total:', window.visitedGoreRooms.size);
        
        // ★ da5シーケンス未完了の場合はX部屋に飛ばさない（段ボール玄関を先に経験させる）
        if (window.visitedGoreRooms.size >= 4 && targetRoom.id === 'bedroom_gore' && window.da5SequenceCompleted) {
            console.log('[XRoom] All gore rooms visited! Transitioning to X-Bedroom...');
            const xBedroomIndex = window.ROOMS.findIndex(r => r.id === 'x_bedroom');
            if (xBedroomIndex !== -1) {
                window.isInXRoom = true;
                window.xRoomStep = 0;
                
                const darkness = document.getElementById('darkness-overlay');
                if (darkness) {
                    darkness.style.transition = 'opacity 0.8s';
                    darkness.style.opacity = '1';
                    
                    setTimeout(() => {
                        performActualLoad(xBedroomIndex);
                        setTimeout(() => {
                            darkness.style.opacity = '0';
                        }, 200);
                    }, 800);
                } else {
                    performActualLoad(xBedroomIndex);
                }
                return;
            }
        }
    }

    performActualLoad(index);
};

function performActualLoad(index) {
    const prevRoomId = currentRoom ? currentRoom.id : null;
    currentRoomIndex = index;
    currentRoom = window.ROOMS[index];
    window.currentRoom = currentRoom;

    console.log('[LoadRoom] Loading room:', currentRoom.id, '| ShadowMode:', window.isShadowMode, '| X-Step:', window.xRoomStep);

    // ★★★ 音：グロ部屋／影部屋のBGM制御（「前と同じように」復帰）★★★
    // 影部屋（bedroom_open）に入ったらループBGM開始、離れたら停止
    if (currentRoom.id === 'bedroom_open') {
        if (typeof window.playKageBgm === 'function') window.playKageBgm();
    } else {
        if (typeof window.stopKageBgm === 'function') window.stopKageBgm();
    }

    // ★★★ ti.mp3：ti1〜ti4 & da2〜da5 滞在中はループ再生（da1=初期状態ではまだ鳴らさない）★★★
    const isTiRoom = typeof currentRoom.path === 'string' && /^ti[1-4]\.png$/i.test(currentRoom.path);
    // daRoomState.phase >= 2 のときだけ ti.mp3 を鳴らす（phase1=da1=初回入室はまだ段ボールを見ていない状態）
    const isDaRoomActive = currentRoom.id === 'bedroom' && window.daRoomState && window.daRoomState.phase >= 2 && window.daRoomState.phase <= 4;
    if (isTiRoom || isDaRoomActive) {
        if (typeof window.playTiLoopBgm === 'function') window.playTiLoopBgm();
    } else {
        if (typeof window.stopTiLoopBgm === 'function') window.stopTiLoopBgm();
    }
    // ★ 通常bedroomへの入室時（ゲーム開始 or 通常移動）は全BGMを確実に止める
    if (currentRoom.id === 'bedroom' && !window.isGoreMode && !window.isShadowMode && !window.isInXRoom) {
        if (typeof window.stopTiLoopBgm === 'function') window.stopTiLoopBgm();
        if (typeof window.stopGoreAudio === 'function') window.stopGoreAudio();
        if (typeof window.stopXRoomBgm === 'function') window.stopXRoomBgm();
    }

    // グロ部屋に入ったらグロBGM開始、離れたら停止（ただし ti部屋は ti.mp3 優先で停止）
    if (!isTiRoom && currentRoom.id.includes('_gore') && !currentRoom.id.startsWith('x_')) {
        if (typeof window.playGoreAudioForRoom === 'function') window.playGoreAudioForRoom(currentRoom.id);
    } else {
        if (typeof window.stopGoreAudio === 'function') window.stopGoreAudio();
    }

    // 赤部屋ランダムSE（滞在中ランダムで鳴らす）
    if (currentRoom.id === 'bedroom_red' || currentRoom.id === 'entrance_red') {
        if (typeof window.startRedRoomRandomStinger === 'function') window.startRedRoomRandomStinger(currentRoom.id);
    } else {
        if (typeof window.stopRedRoomRandomStinger === 'function') window.stopRedRoomRandomStinger();
    }

    // ★★★ da1〜da5 段ボール部屋：入退室でリセット ★★★
    if (window.daRoomState) {
        if (window.daRoomState.overlaySphere && scene) {
            scene.remove(window.daRoomState.overlaySphere);
            if (window.daRoomState.overlaySphere.material) {
                if (window.daRoomState.overlaySphere.material.map) window.daRoomState.overlaySphere.material.map.dispose();
                window.daRoomState.overlaySphere.material.dispose();
            }
            window.daRoomState.overlaySphere = null;
        }
        window.daRoomState.transitionStart = 0;
        window.daRoomState.transitionDuration = 0;
        window.daRoomState.toTexture = null;
    }
    if (currentRoom.id === 'bedroom') {
        if (!window.daRoomState) window.daRoomState = {};
        // da1リダイレクト経由のときはmoveToRoom側でphase=1にセット済みなので触らない
        // 通常のbedroom入室（ゲーム開始・かくれんぼ前等）はphase=0を維持
        if (window.daRoomState.phase === undefined || window.daRoomState.phase === null) {
            window.daRoomState.phase = 0;
            window.daRoomState.gazeMs = 0;
        }
        // ★ 部屋入室時はタイマー含め全部リセット
        if (window.daRoomState.phaseTimer) {
            clearTimeout(window.daRoomState.phaseTimer);
            window.daRoomState.phaseTimer = null;
        }
        window.daRoomState.gazeMs = 0;
        window.daRoomState.inZone = false;
    }

    // ★★★ 穴→かごめ→赤女シーケンスの部屋判定＆リセット ★★★
    if (currentRoom && currentRoom.path === 'ana5.png') {
        // 特殊シーケンス開始
        if (!window.anaSequence) window.anaSequence = {};
        // 既存シーケンスをいったんリセット
        if (window.anaSequence.kagomeFallbackTimer) {
            clearTimeout(window.anaSequence.kagomeFallbackTimer);
            window.anaSequence.kagomeFallbackTimer = null;
        }
        if (window.anaSequence.kagomeInterval) {
            clearInterval(window.anaSequence.kagomeInterval);
            window.anaSequence.kagomeInterval = null;
        }
        if (window.anaSequence.suzuAudio) {
            try { window.anaSequence.suzuAudio.pause(); window.anaSequence.suzuAudio.currentTime = 0; } catch(e){}
            window.anaSequence.suzuAudio = null;
        }
        if (window.anaSequence.kagomeAudio) {
            try { window.anaSequence.kagomeAudio.pause(); window.anaSequence.kagomeAudio.currentTime = 0; } catch(e){}
            window.anaSequence.kagomeAudio = null;
        }
        if (window.anaSequence.akaAudio) {
            try { window.anaSequence.akaAudio.pause(); window.anaSequence.akaAudio.currentTime = 0; } catch(e){}
            window.anaSequence.akaAudio = null;
        }
        window.anaSequence.active = true;
        window.anaSequence.phase = 'hole';
        window.anaSequence.kagomeStartTime = 0;
        window.anaSequence.lapCount = 0;
        window.anaSequence.gate2Passed = false;
        window.anaSequence.gate3Passed = false;
        console.log('[AnaSeq] ana5.png room entered → hole phase start');
    } else {
        // 特殊部屋から離れたらシーケンス完全停止
        if (window.anaSequence && window.anaSequence.active) {
            if (window.anaSequence.kagomeFallbackTimer) {
                clearTimeout(window.anaSequence.kagomeFallbackTimer);
                window.anaSequence.kagomeFallbackTimer = null;
            }
            if (window.anaSequence.kagomeInterval) {
                clearInterval(window.anaSequence.kagomeInterval);
                window.anaSequence.kagomeInterval = null;
            }
            if (window.anaSequence.suzuAudio) {
                try { window.anaSequence.suzuAudio.pause(); window.anaSequence.suzuAudio.currentTime = 0; } catch(e){}
                window.anaSequence.suzuAudio = null;
            }
            if (window.anaSequence.kagomeAudio) {
                try { window.anaSequence.kagomeAudio.pause(); window.anaSequence.kagomeAudio.currentTime = 0; } catch(e){}
                window.anaSequence.kagomeAudio = null;
            }
            if (window.anaSequence.akaAudio) {
                try { window.anaSequence.akaAudio.pause(); window.anaSequence.akaAudio.currentTime = 0; } catch(e){}
                window.anaSequence.akaAudio = null;
            }
            window.anaSequence.active = false;
            window.anaSequence.phase = null;
            console.log('[AnaSeq] Left special room → sequence reset');
        }
    }

    // UI更新
    const roomNameEl = document.getElementById('room-name');
    if (roomNameEl) roomNameEl.textContent = currentRoom.name;
    
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'block';
    
    // 露出設定
    if (renderer) renderer.toneMappingExposure = currentRoom.exposure || 1.0;

    // ホットスポットリセット
    document.querySelectorAll('.hotspot-marker').forEach(el => {
        el.classList.remove('escape-attempt');
        el.style.pointerEvents = '';
    });

    // ★★★ shadowMode解除後に_dark部屋に来てしまった場合は通常部屋へリダイレクト ★★★
    if (!window.isShadowMode && currentRoom.id.endsWith('_dark') && !window.kuroko_endTriggered) {
        const normalId = currentRoom.id.replace('_dark', '');
        const normalIndex = window.ROOMS.findIndex(r => r.id === normalId);
        if (normalIndex !== -1) {
            console.log(`[LoadRoom] _dark→通常部屋へリダイレクト: ${normalId}`);
            performActualLoad(normalIndex);
            return;
        }
    }

    // ★★★ かくれんぼ終了後：居室に入ったら「穴の部屋（ana5）」へ ★★★
    if (window.kuroko_endTriggered && currentRoom.id === 'bedroom') {
        window.kuroko_endTriggered = false;
        console.log('[LoadRoom] かくれんぼ終了後の居室 → bedroom_hole(ana5.png) へ遷移');

        const holeIndex = window.ROOMS.findIndex(r => r.id === 'bedroom_hole');
        if (holeIndex !== -1) {
            performActualLoad(holeIndex);
        }
        return;
    }

    // 赤部屋（床屋赤寝室）滞在ウォッチャー
    if (currentRoom.id === 'bedroom_red') {
        startRedRoomWatcher();
    } else {
        stopRedRoomWatcher();
    }

    // ★★★ 影のかくれんぼモード処理 ★★★
    if (window.isShadowMode && window.kurokoSystem) {
        // KurokoSystemがアクティブでない場合は開始
        if (!window.kurokoSystem.isActive) {
            console.log('[LoadRoom] Starting KurokoSystem...');
            window.kurokoSystem.start();
        }
        
        // 部屋移動を通知（KurokoSystem内部でテクスチャを自動ロード）
        window.kurokoSystem.onRoomEnter(currentRoom.id);
        
        // ホットスポット作成（影モード用）
        createHotspotElements();
        
        // ローディング表示を確実に消す（KurokoSystem側でロード完了後に非表示になるが、念のため）
        setTimeout(() => {
            if (loadingEl) loadingEl.style.display = 'none';
        }, 100);
        
        return; // 影モード時はここで終了（通常のテクスチャロードは行わない）
    }

    // 赤部屋ホットスポット制御（赤部屋演出中は非表示）
    if (currentRoom.id === 'bedroom_red' && (window.redRoomState.sequenceActive || !window.redRoomState.canShowHotspots)) {
        document.querySelectorAll('.hotspot-marker').forEach(el => el.style.display = 'none');
        if (loadingEl) loadingEl.style.display = 'none';
        return;
    }

    // ★★★ 青の部屋モード処理（BlueRoomSystem に委譲）★★★
    if (window.isBlueRoomMode && currentRoom.id.startsWith('blue_')) {
        console.log('[BlueRoom] performActualLoad: entering', currentRoom.id);
        if (timeManager) timeManager.setCorruptedMode();
        if (renderer) renderer.toneMappingExposure = currentRoom.exposure || 0.75;

        // まず静的テクスチャでスフィアを確実に生成（BlueRoomSystemが後で上書き）
        const blueInitialPath = currentRoom.path || 'aobeyaima1.png';
        const blueLoader = new THREE.TextureLoader();
        const _blueRoomId = currentRoom.id;
        blueLoader.load(blueInitialPath, function(texture) {
            if (!window.currentRoom || window.currentRoom.id !== _blueRoomId) return; // ★ 部屋チェック
            texture.colorSpace = THREE.SRGBColorSpace;
            if (sphere) scene.remove(sphere);
            const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
            sphere = new THREE.Mesh(geometry, mat);
            scene.add(sphere);
            window.sphere = sphere;
            if (loadingEl) loadingEl.style.display = 'none';

            // スフィア確定後にBlueRoomSystemへ委譲（アニメ・タイマー起動）
            window.BlueRoomSystem.onRoomEnter(currentRoom.id);
        }, undefined, function(err) {
            console.error('[BlueRoom] 初期テクスチャ読込失敗:', blueInitialPath, err);
            if (loadingEl) loadingEl.style.display = 'none';
        });

        createHotspotElements();
        return;
    }

    // ★★★ 通常モード（X部屋・グロ部屋含む）の処理 ★★★

    // BGM制御（X部屋間の移動時）
    if (prevRoomId && prevRoomId.startsWith('x_')) {
        if (!currentRoom.id.startsWith('x_') || currentRoom.id === 'x_bathroom') {
            window.stopXRoomBgm();
        }
    }
    if (currentRoom.id.startsWith('x_') && currentRoom.id !== 'x_bathroom') {
        window.playXRoomBgm(currentRoom.id);
    }

    // TimeManagerモード設定
    if (timeManager) {
        if (currentRoom.id.includes('_gore') || currentRoom.id.startsWith('x_')) {
            timeManager.setGoreMode();
        } else if (currentRoom.id.includes('_dark')) {
            // ★★★ 暗い部屋（初回入室含む）は必ずdarkモード ★★★
            timeManager.setDarkMode();
        } else if (currentRoom.id.includes('_red') || currentRoom.id === 'bedroom_open') {
            timeManager.setCorruptedMode();
        } else {
            timeManager.setNormalMode();
        }
    }

    // MitanaSystem制御
    if (mitanaSystem) {
        if (!window.isInXRoom && currentRoom.id === 'changing_room_red' && currentRoom.hasMitana && !window.isGoreMode) {
            console.log('[LoadRoom] Entering changing_room_red - starting Mitana');
            mitanaSystem.start();
        } else {
            mitanaSystem.fullReset();
        }
    }

    // 周辺視・明滅システム制御
    if (peripheralSystem) {
        if (!currentRoom.id.includes('entrance') || currentRoom.id.startsWith('x_')) {
            peripheralSystem.reset();
        }
        if (flickerSystem) flickerSystem.stop(renderer);
    }

    // ホットスポット作成
    createHotspotElements();

    // X部屋（アニメーション対応）のロード
    if (currentRoom.id.startsWith('x_') && currentRoom.type === 'x_animated') {
        if (!window.xRoomAnimationSystem) {
            window.xRoomAnimationSystem = new XRoomAnimationSystem();
        }
        
        // 初期テクスチャロード
        const textureLoader = new THREE.TextureLoader();
        const _xRoomId = currentRoom.id;
        textureLoader.load(currentRoom.path, (texture) => {
            if (!window.currentRoom || window.currentRoom.id !== _xRoomId) return;
            if (sphere) {
                texture.colorSpace = THREE.SRGBColorSpace;
                sphere.material.map = texture;
                sphere.material.needsUpdate = true;
            }
            if (loadingEl) loadingEl.style.display = 'none';
        });
        
        // アニメーション開始
        window.xRoomAnimationSystem.start(
            currentRoom.id, 
            currentRoom.textures, 
            currentRoom.animationSpeed
        );
    } else {
        // 通常部屋・グロ部屋・赤部屋のテクスチャ決定
        let texturePath = currentRoom.path;
        
        // グロモード時のテクスチャ置き換え
        if (window.isGoreMode && window.GORE_TEXTURES && !currentRoom.id.startsWith('x_')) {
            const goreTexture = window.GORE_TEXTURES[currentRoom.id];
            if (goreTexture) {
                texturePath = goreTexture;
            }
        }

        // Three.jsでテクスチャロード
        const textureLoader = new THREE.TextureLoader();
        const _loadRoomId = currentRoom.id; // ★ ロード開始時の部屋IDを記録
        textureLoader.load(
            texturePath,
            function(texture) {
                // ★ 別の部屋に移動済みなら破棄（非同期上書き防止）
                if (!window.currentRoom || window.currentRoom.id !== _loadRoomId) {
                    return;
                }
                if (sphere) scene.remove(sphere);
                
                const material = new THREE.MeshBasicMaterial({ 
                    map: texture, 
                    side: THREE.BackSide 
                });
                
                sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
                window.sphere = sphere;
                
                if (loadingEl) loadingEl.style.display = 'none';
                console.log('[LoadRoom] Texture loaded:', texturePath, 'for room:', currentRoom.id);
            },
            undefined, // onProgress
            function(error) {
                console.error('[LoadRoom] Failed to load texture:', texturePath, error);
                if (loadingEl) {
                    loadingEl.innerHTML = '<span style="color: #ff3333;">エラー: 画像の読み込みに失敗しました<br>' + texturePath + '</span>';
                }
            }
        );
    }
}

function createHotspotElements() {
    if (!hotspotsContainer) return;
    hotspotsContainer.innerHTML = '';

    // 穴→かごめ→赤女シーケンス中は常に移動ポイントなし
    if (window.anaSequence && window.anaSequence.active) {
        console.log('[Hotspot] Ana sequence active → no hotspots');
        return;
    }

    // ★ 段ボールシーケンス中はhotspot作成しない
    if (currentRoom && currentRoom.id === 'bedroom' &&
        window.daRoomState && window.daRoomState.phase >= 1 &&
        !window.da5SequenceCompleted) {
        console.log('[Hotspot] Da sequence active → no hotspots');
        return;
    }

    if (currentRoom.id === 'bedroom_open') return;

    let hotspots = [];

    // ★★★ 青のお風呂場トラップ中：浴室から移動不可（ホットスポットなし） ★★★
    if (currentRoom.id === 'blue_bathroom' && window.isBlueRoomBathroomTrapped) {
        console.log('[Hotspot] Blue bathroom: movement locked (trapped)');
        hotspots = [];
    }
    // ★★★ 青の脱衣所：トラップ中は浴室ボタンを出さない ★★★
    else if (currentRoom.id === 'blue_changing' && window.isBlueRoomBathroomTrapped) {
        console.log('[Hotspot] Blue changing room: bathroom button disabled (trapped)');
        hotspots = [{
            name: '居室へ戻る',
            target: 'blue_bedroom',
            theta: -2.51,
            phi: 1.79,
            range: 0.5
        }];
    } else if (window.isInXRoom && currentRoom.id.startsWith('x_')) {
        console.log(`[Hotspot] X Room detected. Current Step: ${window.xRoomStep}, Room: ${currentRoom.id}`);
        
        if (currentRoom.id === 'x_bedroom') {
            if (window.xRoomStep === 0) {
                hotspots = [{ 
                    name: '玄関へ', 
                    target: 'x_entrance', 
                    theta: 0.65, 
                    phi: 1.74, 
                    range: 0.35 
                }];
                console.log('[Hotspot] X Bedroom Step 0: Entrance only');
            } else if (window.xRoomStep === 2) {
                hotspots = [{ 
                    name: '脱衣所へ', 
                    target: 'x_changing', 
                    theta: 0.16, 
                    phi: 1.80, 
                    range: 0.3 
                }];
                console.log('[Hotspot] X Bedroom Step 2: Changing room only');
            } else {
                console.warn(`[Hotspot] X Bedroom unexpected step: ${window.xRoomStep}`);
                hotspots = [{ 
                    name: '玄関へ', 
                    target: 'x_entrance', 
                    theta: 0.65, 
                    phi: 1.74, 
                    range: 0.35 
                }];
            }
        } else if (currentRoom.id === 'x_entrance') {
            hotspots = [{ 
                name: '居室へ戻る', 
                target: 'x_bedroom', 
                theta: -2.94, 
                phi: 1.66, 
                range: 0.5 
            }];
            console.log('[Hotspot] X Entrance: Bedroom only');
        } else if (currentRoom.id === 'x_changing') {
            hotspots = [{ 
                name: '浴室へ', 
                target: 'x_bathroom', 
                theta: -2.99, 
                phi: 1.61, 
                range: 0.4 
            }];
            console.log('[Hotspot] X Changing: Bathroom only');
        } else if (currentRoom.id === 'x_bathroom') {
            hotspots = [{ 
                name: '脱衣所へ戻る', 
                target: 'x_changing', 
                theta: -1.8, 
                phi: 1.7, 
                range: 0.5 
            }];
            console.log('[Hotspot] X Bathroom: Changing only (event trigger)');
        }
    } else if (window.isGoreMode && window.GORE_ROOM_MAPPING && window.GORE_ROOM_MAPPING[currentRoom.id]) {
        hotspots = window.GORE_ROOM_MAPPING[currentRoom.id];
        console.log('[Hotspot] Using gore mapping for:', currentRoom.id);
    } else {
        hotspots = currentRoom.hotspots || [];
    }

    hotspots.forEach((spot, index) => {
        const div = document.createElement('div');
        div.className = 'hotspot-marker';
        div.id = 'hotspot-' + index;

        div.innerHTML = `
            <svg viewBox="0 0 24 24" style="width: 30px; height: 30px; fill: white; filter: drop-shadow(0 0 4px rgba(0,0,0,0.8));">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
            </svg>
            <div class="hotspot-label">${spot.name}</div>
        `;

        div.onclick = () => {
            if (div.classList.contains('active')) {
                moveToRoom(spot.target);
            }
        };
        hotspotsContainer.appendChild(div);
    });

    console.log(`[Hotspot] Created ${hotspots.length} hotspots for ${currentRoom.id}`);
}

function updateCamera() {
    if (!camera) return;
    const radius = 1;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(x, y, z);
    updateHotspots();
}

function updateHotspots() {
    if (currentRoom.id === 'bedroom_open') return;

    // ★ 段ボールシーケンス中はhotspotを表示しない
    if (currentRoom && currentRoom.id === 'bedroom' && 
        window.daRoomState && window.daRoomState.phase >= 1 &&
        !window.da5SequenceCompleted) {
        document.querySelectorAll('.hotspot-marker').forEach(el => el.style.display = 'none');
        return;
    }

    // ★ hauotoko演出中（bedroom_red sequenceActive）はhotspotを非表示
    if (currentRoom && currentRoom.id === 'bedroom_red' &&
        window.redRoomState && (window.redRoomState.sequenceActive || !window.redRoomState.canShowHotspots)) {
        document.querySelectorAll('.hotspot-marker').forEach(el => el.style.display = 'none');
        return;
    }

    let hotspots = [];
    
    // ★★★ 青のお風呂場トラップ中：浴室から移動不可（ホットスポットなし） ★★★
    if (currentRoom.id === 'blue_bathroom' && window.isBlueRoomBathroomTrapped) {
        console.log('[Hotspot] Blue bathroom: movement locked (trapped)');
        hotspots = [];
    }
    // ★★★ 青の脱衣所：トラップ中は浴室ボタンを出さない ★★★
    else if (currentRoom.id === 'blue_changing' && window.isBlueRoomBathroomTrapped) {
        console.log('[Hotspot] Blue changing room: bathroom button disabled (trapped)');
        hotspots = [{
            name: '居室へ戻る',
            target: 'blue_bedroom',
            theta: -2.51,
            phi: 1.79,
            range: 0.5
        }];
    } else if (window.isInXRoom && currentRoom.id.startsWith('x_')) {
        if (currentRoom.id === 'x_bedroom') {
            if (window.xRoomStep === 0) {
                hotspots = [{ name: '玄関へ', target: 'x_entrance', theta: 0.65, phi: 1.74, range: 0.35 }];
            } else if (window.xRoomStep === 2) {
                hotspots = [{ name: '脱衣所へ', target: 'x_changing', theta: 0.16, phi: 1.80, range: 0.3 }];
            }
        } else if (currentRoom.id === 'x_entrance') {
            hotspots = [{ name: '居室へ戻る', target: 'x_bedroom', theta: -2.94, phi: 1.66, range: 0.5 }];
        } else if (currentRoom.id === 'x_changing') {
            hotspots = [{ name: '浴室へ', target: 'x_bathroom', theta: -2.99, phi: 1.61, range: 0.4 }];
        } else if (currentRoom.id === 'x_bathroom') {
            hotspots = [{ name: '脱衣所へ戻る', target: 'x_changing', theta: -1.8, phi: 1.7, range: 0.5 }];
        }
    } else if (window.isGoreMode && window.GORE_ROOM_MAPPING && window.GORE_ROOM_MAPPING[currentRoom.id]) {
        hotspots = window.GORE_ROOM_MAPPING[currentRoom.id];
    } else {
        hotspots = currentRoom.hotspots || [];
    }

    hotspots.forEach((spot, index) => {
        const element = document.getElementById('hotspot-' + index);
        if (!element) return;
        
        let normalizedTheta = theta;
        while (normalizedTheta > Math.PI) normalizedTheta -= 2 * Math.PI;
        while (normalizedTheta < -Math.PI) normalizedTheta += 2 * Math.PI;

        const r = 500;
        const x = r * Math.sin(spot.phi) * Math.sin(spot.theta);
        const y = r * Math.cos(spot.phi);
        const z = r * Math.sin(spot.phi) * Math.cos(spot.theta);

        const vector = new THREE.Vector3(x, y, z);
        vector.project(camera);

        const screenX = (vector.x * .5 + .5) * window.innerWidth;
        const screenY = (-(vector.y * .5) + .5) * window.innerHeight;

        if (vector.z < 1 && screenX > -50 && screenX < window.innerWidth + 50 && screenY > -50 && screenY < window.innerHeight + 50) {
            element.style.display = 'flex';
            element.style.left = screenX + 'px';
            element.style.top = screenY + 'px';
            const dTheta = Math.abs(normalizedTheta - spot.theta);
            const dPhi = Math.abs(phi - spot.phi);
            const dist = Math.sqrt(dTheta*dTheta + dPhi*dPhi);
            if (dist < spot.range) {
                element.classList.add('active');
                currentHotspot = spot;
            } else {
                element.classList.remove('active');
                if (currentHotspot === spot) currentHotspot = null;
            }
        } else {
            element.style.display = 'none';
            if (currentHotspot === spot) currentHotspot = null;
        }
    });
}

// ============================================
// イベントリスナー（完全版・全デバッグキー対応）
// ============================================
function initEventListeners() {
    document.addEventListener('mousedown', (e) => {
        if ((isInputLocked || window.isInputLocked) || (e.target && e.target.closest('.hotspot-marker'))) return;
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    document.addEventListener('mouseup', () => isDragging = false);
    
    document.addEventListener('mousemove', (e) => {
        if ((isInputLocked || window.isInputLocked) || !isDragging) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        const sensitivity = 0.005;
        theta -= deltaX * sensitivity;
        phi -= deltaY * sensitivity;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        window.theta = theta;
        window.phi = phi;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    let pinchStartDistance = 0;
let pinchStartFov = 75;

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

document.addEventListener('touchstart', (e) => {
    if ((isInputLocked || window.isInputLocked)) return;
    if (e.target && e.target.closest('.hotspot-marker')) return;
    if (e.touches.length === 2) {
        isDragging = false;
        pinchStartDistance = getTouchDistance(e.touches);
        pinchStartFov = currentFov;
    } else if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
 }, { passive: false });

document.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinchStartDistance = 0;
    if (e.touches.length === 0) isDragging = false;
 });

document.addEventListener('touchmove', (e) => {
    if ((isInputLocked || window.isInputLocked)) return;
    e.preventDefault();
    if (e.touches.length === 2) {
        isDragging = false;
        const dist = getTouchDistance(e.touches);
        if (pinchStartDistance === 0) {
            // touchstartで初期化できなかった場合ここで初期化
            pinchStartDistance = dist;
            pinchStartFov = currentFov;
        } else {
            const scale = pinchStartDistance / dist;
            const minFov = window.CONFIG ? window.CONFIG.camera.minFov : 30;
            const maxFov = window.CONFIG ? window.CONFIG.camera.maxFov : 100;
            currentFov = Math.max(minFov, Math.min(maxFov, pinchStartFov * scale));
            if (camera) { camera.fov = currentFov; camera.updateProjectionMatrix(); }
        }
    } else if (e.touches.length === 1 && isDragging) {
        pinchStartDistance = 0;
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        const sensitivity = 0.006;
        theta -= deltaX * sensitivity;
        phi -= deltaY * sensitivity;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        window.theta = theta;
        window.phi = phi;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
 }, { passive: false });

    document.addEventListener('wheel', (e) => {
        if ((isInputLocked || window.isInputLocked) || !camera) return;
        e.preventDefault();
        currentFov += e.deltaY * 0.05;
        const minFov = window.CONFIG ? window.CONFIG.camera.minFov : 30;
        const maxFov = window.CONFIG ? window.CONFIG.camera.maxFov : 100;
        currentFov = Math.max(minFov, Math.min(maxFov, currentFov));
        camera.fov = currentFov;
        camera.updateProjectionMatrix();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
        // Rキー（リセット）は常に有効、それ以外はinputLocked時無効
        if ((isInputLocked || window.isInputLocked) && !(e.key === 'r' || e.key === 'R')) return;
        
        // Dキー：角度表示
        if (e.key === 'd' || e.key === 'D') {
            let normalizedTheta = theta;
            while (normalizedTheta > Math.PI) normalizedTheta -= 2 * Math.PI;
            while (normalizedTheta < -Math.PI) normalizedTheta += 2 * Math.PI;
            alert(`視点: theta=${normalizedTheta.toFixed(2)}, phi=${phi.toFixed(2)}`);
        }
        
        // Vキー：強制侵食イベント（影部屋）
        if (e.key === 'v' || e.key === 'V') {
            console.log('[Debug] Vキー：強制侵食イベント発動');
            if (currentRoom.id === 'bedroom_open') {
                triggerCorruption();
            } else {
                const idx = window.ROOMS.findIndex(r => r.id === 'bedroom_open');
                if (idx !== -1) {
                    loadRoom(idx);
                    setTimeout(() => {
                        triggerCorruption();
                    }, 500);
                } else {
                    alert('bedroom_openが見つかりません');
                }
            }
        }
        
        // Bキー：ミタナ手イベント強制発動
        if (e.key === 'b' || e.key === 'B') {
            console.log('[Debug] Bキー：ミタナ手イベント強制発動');
            if (mitanaSystem) {
                mitanaSystem.preventEscape(currentRoom ? currentRoom.id : 'bedroom_red');
            } else {
                alert('MitanaSystemが初期化されていません');
            }
        }
        
        // Wキー：強制侵食（Vと同じ）
        if (e.key === 'w' || e.key === 'W') {
            console.log('[Debug] Wキー：強制侵食イベント発動');
            if (currentRoom.id === 'bedroom_open') {
                triggerCorruption();
            } else {
                const idx = window.ROOMS.findIndex(r => r.id === 'bedroom_open');
                if (idx !== -1) {
                    loadRoom(idx);
                    setTimeout(() => triggerCorruption(), 500);
                }
            }
        }
        
        // Tキー：周辺視テスト（赤い女のチラつき）
        if (e.key === 't' || e.key === 'T') {
            if (peripheralSystem) {
                if (peripheralSystem.debugMode) {
                    peripheralSystem.testHide();
                } else {
                    peripheralSystem.testShow();
                }
            }
        }
        
        // Rキー：全システムリセット（常に有効）
        if (e.key === 'r' || e.key === 'R') {
            console.log('[Debug] Rキー：全システムリセット');
            
            // ★★★ BGMも停止 ★★★
            window.stopXRoomBgm();
            if (typeof window.stopTiLoopBgm === 'function') window.stopTiLoopBgm();
            if (typeof window.stopGoreAudio === 'function') window.stopGoreAudio();
            
            if (sequenceManager) sequenceManager.reset();
            if (mitanaSystem) mitanaSystem.fullReset();
            if (timeManager) timeManager.reset();
            if (window.kurokoSystem) window.kurokoSystem.reset();
            if (window.BlueRoomSystem) window.BlueRoomSystem.reset();
            
            window.isGoreMode = false;
            window.isInXRoom = false;
            window.isShadowMode = false;
            window.isBlueRoomMode = false;
            window.kuroko_endTriggered = false;
            window.visitedGoreRooms.clear();
            window.xRoomStep = -1;
            window.bathroomNightmareTriggered = false;
            window.xBathroomNightmareTriggered = false;
            // ★ daシーケンスもリセット
            window.da5SequenceCompleted = false;
            window.goreEntryToDaSequence = false;
            if (window.daRoomState) {
                if (window.daRoomState.phaseTimer) clearTimeout(window.daRoomState.phaseTimer);
                window.daRoomState.phase = 0;
                window.daRoomState.gazeMs = 0;
                window.daRoomState.phaseTimer = null;
                window.daRoomState.inZone = false;
            }
            isInputLocked = false;
            window.isInputLocked = false;
            loadRoom(0);
        }
        
        // Sキー：シーケンス強制完了（影モード開始）
        if (e.key === 's' || e.key === 'S') {
            if (sequenceManager) {
                sequenceManager.complete();
                console.log('[Debug] Sキー：シーケンス強制完了 → 影モード開始');
            }
        }
        
        // Gキー：ゴアモードON/OFF
        if (e.key === 'g' || e.key === 'G') {
            window.isGoreMode = !window.isGoreMode;
            console.log('[Debug] Gキー：Gore mode:', window.isGoreMode);
            if (window.isGoreMode && timeManager) {
                timeManager.setGoreMode();
            } else if (!window.isGoreMode && timeManager) {
                timeManager.setNormalMode();
            }
            if (window.loadRoom) window.loadRoom(currentRoomIndex);
        }
        
        // Mキー：脱衣所（侵食）へ強制移動＋ミタナ開始
        if (e.key === 'm' || e.key === 'M') {
            const idx = window.ROOMS.findIndex(r => r.id === 'changing_room_red');
            if (idx !== -1) {
                window.isGoreMode = false;
                window.isInXRoom = false;
                loadRoom(idx);
                setTimeout(() => {
                    if (mitanaSystem) mitanaSystem.start();
                    console.log('[Debug] Mキー：ミタナ開始 - 鏡を見てください');
                }, 500);
            }
        }
        
        // Nキー：ミタナ最大段階化
        if (e.key === 'n' || e.key === 'N') {
            if (mitanaSystem && currentRoom.id === 'changing_room_red') {
                mitanaSystem.gazeCount = 3;
                mitanaSystem.isMaxStage = true;
                mitanaSystem.isActive = true;
                console.log('[Debug] Nキー：ミタナMAX段階化完了');
                alert('ミタナ最大段階！\n今から移動しようとすると手が出ます');
            } else {
                alert('先にMキーで脱衣所に移動してください');
            }
        }
        
        // Cキー：強制クラッシュ（侵食イベント）
        if (e.key === 'c' || e.key === 'C') {
            if (currentRoom.id === 'bedroom_open') {
                triggerCorruption();
            } else {
                const idx = window.ROOMS.findIndex(r => r.id === 'bedroom_open');
                if (idx !== -1) {
                    loadRoom(idx);
                    setTimeout(() => triggerCorruption(), 500);
                }
            }
        }
        
        // 数字キー：各部屋へ強制移動
        if (e.key === '1') {
            const idx = window.ROOMS.findIndex(r => r.id === 'bedroom_gore');
            if (idx !== -1) {
                window.isGoreMode = true;
                window.isInXRoom = false;
                loadRoom(idx);
            }
        }
        if (e.key === '2') {
            const idx = window.ROOMS.findIndex(r => r.id === 'entrance_gore');
            if (idx !== -1) {
                window.isGoreMode = true;
                window.isInXRoom = false;
                loadRoom(idx);
            }
        }
        if (e.key === '3') {
            const idx = window.ROOMS.findIndex(r => r.id === 'changing_room_gore');
            if (idx !== -1) {
                window.isGoreMode = true;
                window.isInXRoom = false;
                loadRoom(idx);
            }
        }
        if (e.key === '4') {
            const idx = window.ROOMS.findIndex(r => r.id === 'bathroom_gore');
            if (idx !== -1) {
                window.isGoreMode = true;
                window.isInXRoom = false;
                loadRoom(idx);
            }
        }
        if (e.key === '0') {
            window.isGoreMode = false;
            window.isInXRoom = false;
            window.isShadowMode = false;
            window.visitedGoreRooms.clear();
            window.xRoomStep = -1;
            loadRoom(0);
        }
        
        // Lキー：座標ログ
        if (e.key === 'l' || e.key === 'L') {
            let normalizedTheta = theta;
            while (normalizedTheta > Math.PI) normalizedTheta -= 2 * Math.PI;
            while (normalizedTheta < -Math.PI) normalizedTheta += 2 * Math.PI;
            console.log(`[Debug] theta: ${normalizedTheta.toFixed(2)}, phi: ${phi.toFixed(2)}`);
            alert(`視点角度:\ntheta: ${normalizedTheta.toFixed(2)}\nphi: ${phi.toFixed(2)}`);
        }
        
        // Pキー：X浴室地獄強制開始
        if (e.key === 'p' || e.key === 'P') {
            console.log('[Debug] Pキー：X浴室地獄強制開始');
            window.xBathroomNightmareTriggered = false;
            const idx = window.ROOMS.findIndex(r => r.id === 'x_bathroom');
            if (idx !== -1) {
                window.isInXRoom = true;
                window.xRoomStep = 4;
                loadRoom(idx);
                setTimeout(() => {
                    if (window.BathroomNightmareSystem) {
                        const nightmare = new window.BathroomNightmareSystem({
                            textures: {
                                window: 'si1.png',
                                door: 'si2.png',
                                mirror: 'si3.png',
                                base: 'xohuro.png',
                                si4: 'si4.png',
                                si5: 'si5.png',
                                si6: 'si6.png',
                                si7: 'si100.png'
                            }
                        });
                        nightmare.start();
                    }
                }, 500);
            }
        }
        
        // Xキー：X部屋テスト（グロ部屋4部屋訪問済み状態）
        if (e.key === 'x' || e.key === 'X') {
            console.log('[Debug] Xキー：X部屋テスト');
            window.visitedGoreRooms = new Set(['bedroom_gore', 'entrance_gore', 'changing_room_gore', 'bathroom_gore']);
            const idx = window.ROOMS.findIndex(r => r.id === 'bedroom_gore');
            if (idx !== -1) {
                window.isGoreMode = true;
                window.isInXRoom = false;
                loadRoom(idx);
            }
        }
        
        // Kキー：影のかくれんぼ強制開始（デバッグ用）
        if (e.key === 'k' || e.key === 'K') {
            console.log('[Debug] Kキー：影モード強制開始');
            window.isShadowMode = true;
            if (window.kurokoSystem) {
                window.kurokoSystem.start();
            }
        }

        // Zキー：青の部屋モード強制開始（デバッグ用）
        if (e.key === 'z' || e.key === 'Z') {
            console.log('[Debug] Zキー：青の部屋モード強制開始');
            // 全モードを安全にリセット
            window.isGoreMode = false;
            window.isInXRoom = false;
            window.isShadowMode = false;
            if (window.kurokoSystem) window.kurokoSystem.reset();
            if (sequenceManager) sequenceManager.reset();
            if (mitanaSystem) mitanaSystem.fullReset();
            window.stopXRoomBgm();

            // 青の部屋を開始
            window.isBlueRoomMode = true;
            if (window.BlueRoomSystem) {
                window.BlueRoomSystem.start();
                console.log('[Debug] BlueRoomSystem 開始');
            } else {
                console.error('[Debug] BlueRoomSystem が未ロードです。HTMLに <script src=BlueRoomSystem.js> を追加してください');
            }
            const blueIdx = window.ROOMS.findIndex(r => r.id === 'blue_bedroom');
            if (blueIdx !== -1) {
                loadRoom(blueIdx);
                console.log('[Debug] → blue_bedroom へ移動');
            } else {
                console.error('[Debug] blue_bedroom がROOMS配列に見つかりません！config.jsを確認してください');
            }
        }

        // Yキー：赤部屋（bedroom_red）デバッグ移動
        if (e.key === 'y' || e.key === 'Y') {
            console.log('[Debug] Yキー：赤部屋（bedroom_red）強制移動');
            window.isGoreMode = false;
            window.isInXRoom = false;
            window.isShadowMode = false;
            window.isBlueRoomMode = false;
            if (window.kurokoSystem) window.kurokoSystem.reset();
            if (window.BlueRoomSystem) window.BlueRoomSystem.reset();
            if (sequenceManager) sequenceManager.reset();
            if (mitanaSystem) mitanaSystem.fullReset();
            window.stopXRoomBgm();
            if (window.stopBlueRoomBgm) window.stopBlueRoomBgm();

            const redIdx = window.ROOMS.findIndex(r => r.id === 'bedroom_red');
            if (redIdx !== -1) {
                loadRoom(redIdx);
                console.log('[Debug] → bedroom_red へ移動');
            } else {
                console.error('[Debug] bedroom_red がROOMS配列に見つかりません');
            }
        }
    });

    window.addEventListener('resize', handleResize);
}

// ============================================
// アニメーションループ
// ============================================
let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    
    if (window.isBathroomNightmareActive) {
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
        return;
    }
    
    if (typeof window.theta === 'number' && typeof window.phi === 'number') {
        theta = window.theta;
        phi = window.phi;
    }
    
    window.theta = theta;
    window.phi = phi;
    
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - lastTime, 100); // ★ 上限100msでシーン遷移後の瞬間スキップ防止
    lastTime = currentTime;

    // ★★★ da5 ジャンプスケア用：短い視点シェイク ★★★
    if (window.da5Shake && window.da5Shake.active && typeof window.da5Shake.start === 'number') {
        const s = window.da5Shake;
        const t = currentTime - s.start;
        if (t >= s.duration) {
            s.active = false;
        } else {
            const p = t / s.duration;
            const damp = 1 - p;
            const freq = 42; // 揺れの細かさ
            const ox = Math.sin(p * Math.PI * freq) * s.intensity * damp;
            const oy = Math.cos(p * Math.PI * (freq * 0.9)) * (s.intensity * 0.6) * damp;
            theta += ox;
            phi += oy;
            window.theta = theta;
            window.phi = phi;
        }
    }
    
    if (camera) updateCamera();

    // ★★★ 穴→かごめ→赤女シーケンスの進行管理 ★★★
    if (window.anaSequence && window.anaSequence.active && currentRoom && currentRoom.path === 'ana5.png') {
        const angleDelta = (a, b) => {
            let d = a - b;
            while (d > Math.PI) d -= 2 * Math.PI;
            while (d < -Math.PI) d += 2 * Math.PI;
            return d;
        };

        // 現在のズーム量を0〜1に正規化（0=広角,1=最大ズーム）
        let zoomAmount = 0;
        if (camera && window.CONFIG && window.CONFIG.camera) {
            const minFov = window.CONFIG.camera.minFov || 15;
            const maxFov = window.CONFIG.camera.maxFov || 100;
            const fov = camera.fov;
            zoomAmount = Math.min(1, Math.max(0, (maxFov - fov) / (maxFov - minFov)));
        }

        // フェーズ1：穴＋鈴
        if (window.anaSequence.phase === 'hole') {
            const targetHole = { theta: 1.30, phi: 1.65 };
            const dTheta = angleDelta(theta, targetHole.theta);
            const dPhi = phi - targetHole.phi;
            const dist = Math.sqrt(dTheta * dTheta + dPhi * dPhi);

            const holeThreshold = 0.45;

            // 穴をだいたい見ているときだけ鈴を鳴らす
            if (dist < holeThreshold) {
                // ズーム量に応じて「鈴が鳴る間隔」を変える
                // 遠い: ゆっくり（約3秒に1回） / 近い: 速く（約0.3秒に1回）
                const maxInterval = 3000; // ms
                const minInterval = 300;  // ms
                const interval = maxInterval - zoomAmount * (maxInterval - minInterval);

                if (typeof window.anaSequence.suzuTimerMs !== 'number') {
                    window.anaSequence.suzuTimerMs = 0;
                }
                window.anaSequence.suzuTimerMs += deltaTime;

                if (window.anaSequence.suzuTimerMs >= interval) {
                    window.anaSequence.suzuTimerMs = 0;
                    // 単発で鈴を鳴らす
                    if (window.anaSequence.suzuOneShotAudio) {
                        try {
                            window.anaSequence.suzuOneShotAudio.pause();
                            window.anaSequence.suzuOneShotAudio.currentTime = 0;
                        } catch (e) {}
                        window.anaSequence.suzuOneShotAudio = null;
                    }
                    // ★★★ 鈴：unlockAudio後なので直接play()★★★
                    const _suzuAudio = new Audio(SOUNDS.suzu);
                    _suzuAudio.volume = 1.0;
                    window.anaSequence.suzuOneShotAudio = _suzuAudio;
                    _suzuAudio.play().then(() => {
                        console.log('[AnaSeq] ✅ suzu再生');
                    }).catch(e => {
                        console.warn('[AnaSeq] suzu再生失敗:', e);
                    });
                }

                // MAXまで拡大したら次フェーズへ（一度だけ実行するためphaseを即変更）
                if (zoomAmount > 0.97) {
                    window.anaSequence.suzuTimerMs = 0;
                    // いま鳴っている途中の鈴も強制停止
                    if (window.anaSequence.suzuOneShotAudio) {
                        try {
                            window.anaSequence.suzuOneShotAudio.pause();
                            window.anaSequence.suzuOneShotAudio.currentTime = 0;
                        } catch (e) {}
                        window.anaSequence.suzuOneShotAudio = null;
                    }

                    // ★ 先にphaseを変えることで次フレームでこのブロックに再入しない
                    window.anaSequence.phase = 'kagome';
                    window.anaSequence.kagomeStartTime = currentTime;
                    console.log('[AnaSeq] Max zoom reached → Kagome phase start');

                    const loader = new THREE.TextureLoader();
                    loader.load('kagome1.png', (texture) => {
                        if (!sphere) return;
                        texture.colorSpace = THREE.SRGBColorSpace;
                        sphere.material.map = texture;
                        sphere.material.needsUpdate = true;
                    });

                    // ★★★ transitionToAka：かごめ終了→赤女フェーズ ★★★
                    const transitionToAka = () => {
                        if (!window.anaSequence.active || window.anaSequence.phase !== 'kagome') return;

                        // フォールバックタイマーをキャンセル（ended側から呼ばれた場合）
                        if (window.anaSequence.kagomeFallbackTimer) {
                            clearTimeout(window.anaSequence.kagomeFallbackTimer);
                            window.anaSequence.kagomeFallbackTimer = null;
                        }
                        // kagomeインターバル停止
                        if (window.anaSequence.kagomeInterval) {
                            clearInterval(window.anaSequence.kagomeInterval);
                            window.anaSequence.kagomeInterval = null;
                        }

                        const loader2 = new THREE.TextureLoader();
                        loader2.load('akaonnnaima.png', (texture) => {
                            if (!sphere) return;
                            texture.colorSpace = THREE.SRGBColorSpace;
                            sphere.material.map = texture;
                            sphere.material.needsUpdate = true;
                        });

                        window.anaSequence.phase = 'aka';
                        window.anaSequence.lapCount = 0;
                        window.anaSequence.gate2Passed = false;
                        window.anaSequence.gate3Passed = false;
                        window.anaSequence.kagomeFixed = false;
                        console.log('[AnaSeq] Kagome ended → Aka phase start');

                        // ★★★ akaAudio再生（unlock済みなのでそのまま鳴る）★★★
                        window.anaSequence.akaAudio = playAudioFile(SOUNDS.akanoima, 1.0, true);
                    };

                    // ★★★ kagome.mp3 再生（unlockAudio済み前提）★★★
                    const _kagomeAudio = new Audio(SOUNDS.kagome);
                    _kagomeAudio.volume = 0.9;
                    _kagomeAudio.loop = false;
                    window.anaSequence.kagomeAudio = _kagomeAudio;

                    _kagomeAudio.addEventListener('ended', () => {
                        console.log('[AnaSeq] kagome ended event');
                        setTimeout(transitionToAka, 2000);
                    });
                    _kagomeAudio.addEventListener('error', (e) => {
                        console.warn('[AnaSeq] kagome error:', e);
                        // エラー時もフォールバックで進める
                        setTimeout(transitionToAka, 3000);
                    });

                    _kagomeAudio.play().then(() => {
                        console.log('[AnaSeq] ✅ kagome.mp3 再生開始');
                    }).catch(e => {
                        console.warn('[AnaSeq] kagome.mp3 再生失敗:', e);
                        // 再生できなくてもシーケンスは進める（フォールバック）
                        window.anaSequence.kagomeFallbackTimer = setTimeout(() => {
                            window.anaSequence.kagomeFallbackTimer = null;
                            transitionToAka();
                        }, 5000);
                        return;
                    });

                    // ★ 再生成功時のフォールバック（ended未発火対策）
                    // kagome.mp3 の実際の長さ（ミリ秒）に合わせて調整
                    const KAGOME_DURATION_MS = 30000;
                    window.anaSequence.kagomeFallbackTimer = setTimeout(() => {
                        window.anaSequence.kagomeFallbackTimer = null;
                        console.log('[AnaSeq] kagome fallback timer fired');
                        transitionToAka();
                    }, KAGOME_DURATION_MS + 3000);

                    // kagome1〜4をランダムに切り替え
                    const kagomeList = ['kagome1.png', 'kagome2.png', 'kagome3.png', 'kagome4.png'];
                    window.anaSequence.kagomeInterval = setInterval(() => {
                        if (!window.anaSequence.active || window.anaSequence.phase !== 'kagome') return;
                        const path = kagomeList[Math.floor(Math.random() * kagomeList.length)];
                        const loader3 = new THREE.TextureLoader();
                        loader3.load(path, (texture) => {
                            if (!sphere) return;
                            texture.colorSpace = THREE.SRGBColorSpace;
                            sphere.material.map = texture;
                            sphere.material.needsUpdate = true;
                        });
                    }, 220);
                }
            } else {
                // 穴から視線が外れたらタイマーをリセット（鈴は鳴らない）
                window.anaSequence.suzuTimerMs = 0;
                // 鳴っている途中の鈴も止めたい場合はここで停止
                if (window.anaSequence.suzuOneShotAudio) {
                    try {
                        window.anaSequence.suzuOneShotAudio.pause();
                        window.anaSequence.suzuOneShotAudio.currentTime = 0;
                    } catch (e) {}
                    window.anaSequence.suzuOneShotAudio = null;
                }
            }

            // かごめフェーズへ移っていたら、以降の処理に進む
        }

        // フェーズ2：かごめ
        if (window.anaSequence.phase === 'kagome') {
            // BGM開始から20秒経ったらkagome5.pngに固定
            if (window.anaSequence.kagomeStartTime &&
                (currentTime - window.anaSequence.kagomeStartTime) > 20000 &&
                !window.anaSequence.kagomeFixed) {
                window.anaSequence.kagomeFixed = true;
                console.log('[AnaSeq] 20s passed → kagome5.png');
                if (window.anaSequence.kagomeInterval) {
                    clearInterval(window.anaSequence.kagomeInterval);
                    window.anaSequence.kagomeInterval = null;
                }
                const loader4 = new THREE.TextureLoader();
                loader4.load('kagome5.png', (texture) => {
                    if (!sphere) return;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    sphere.material.map = texture;
                    sphere.material.needsUpdate = true;
                });
            }
        }

        // フェーズ3：赤女（ぐるぐる）
        if (window.anaSequence.phase === 'aka') {
            const gate2 = { theta: -0.22, phi: 1.53 };
            const gate3 = { theta: 1.61, phi: 1.62 };
            const thr = 0.25;

            const d2 = Math.sqrt(angleDelta(theta, gate2.theta) ** 2 + (phi - gate2.phi) ** 2);
            const d3 = Math.sqrt(angleDelta(theta, gate3.theta) ** 2 + (phi - gate3.phi) ** 2);

            // ゲート2 → ゲート3 の順番で通過したときだけ1周とみなす
            if (d2 < thr && !window.anaSequence.gate2Passed) {
                window.anaSequence.gate2Passed = true;
            }
            if (d3 < thr && window.anaSequence.gate2Passed && !window.anaSequence.gate3Passed) {
                window.anaSequence.gate3Passed = true;
            }

            // 直前のカウントからある程度時間が経っていることも条件にする（連続カウント防止）
            const lapCooldown = 800; // ms

            if (window.anaSequence.gate2Passed && window.anaSequence.gate3Passed &&
                (currentTime - (window.anaSequence.lastLapTime || 0)) > lapCooldown) {
                window.anaSequence.lapCount++;
                window.anaSequence.gate2Passed = false;
                window.anaSequence.gate3Passed = false;
                window.anaSequence.lastLapTime = currentTime;

                const lap = window.anaSequence.lapCount;
                let tex = null;

                if (lap === 1) tex = 'akaonnnaima1.png';
                else if (lap === 2) tex = 'akaonnnaima2.png';
                else if (lap === 3) tex = 'akaonnnaima3.png';
                else if (lap === 4) tex = 'akaonnnaima4.png';
                else if (lap === 5) tex = 'akaonnnaima5.png';
                else if (lap === 6) tex = 'akaonnnaima6.png';
                else if (lap === 7) {
                    // ★★★ 7周目：akaonnnaima7.png にした直後にカメラ乗っ取りフィニッシュ演出 ★★★
                    tex = 'akaonnnaima7.png';

                    const loader5 = new THREE.TextureLoader();
                    loader5.load(tex, (texture) => {
                        if (!sphere) return;
                        texture.colorSpace = THREE.SRGBColorSpace;
                        sphere.material.map = texture;
                        sphere.material.needsUpdate = true;
                    });

                    console.log('[AnaSeq] Lap 7 → akaonnnaima7.png & camera takeover');

                    // ここからユーザー操作ロック
                    isInputLocked = true;
                    window.isInputLocked = true;

                    const startTheta = theta;
                    const startPhi = phi;
                    const midTheta = 1.61;
                    const midPhi = 1.62;
                    const finalTheta = -3.00;
                    const finalPhi = 1.67;

                    const totalDuration = 4000; // ms 全体
                    const midDuration = 2000;   // ゆっくり半周
                    const fastDuration = 600;   // 急回転
                    const holdDuration = 2000;  // 止め時間

                    const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

                    const startTimeTakeover = performance.now();

                    function cameraTakeoverStep(now) {
                        const elapsed = now - startTimeTakeover;

                        if (elapsed < midDuration) {
                            // ステップ1：start → mid へゆっくり
                            const t = easeInOut(elapsed / midDuration);
                            const curTheta = startTheta + (midTheta - startTheta) * t;
                            const curPhi = startPhi + (midPhi - startPhi) * t;
                            window.theta = curTheta;
                            window.phi = curPhi;
                        } else if (elapsed < midDuration + fastDuration) {
                            // ステップ2：mid → final へ急速回転
                            const t = easeInOut((elapsed - midDuration) / fastDuration);
                            const curTheta = midTheta + (finalTheta - midTheta) * t;
                            const curPhi = midPhi + (finalPhi - midPhi) * t;
                            window.theta = curTheta;
                            window.phi = curPhi;
                        } else if (elapsed < midDuration + fastDuration + holdDuration) {
                            // ステップ3：final で静止
                            window.theta = finalTheta;
                            window.phi = finalPhi;
                        } else {
                            // フィニッシュ：akaonnnaima8.png を表示し、mamono_aaa → 暗転 → image(1).png
                            window.theta = finalTheta;
                            window.phi = finalPhi;

                            const loader6 = new THREE.TextureLoader();
                            loader6.load('akaonnnaima8.png', (texture) => {
                                if (!sphere) return;
                                texture.colorSpace = THREE.SRGBColorSpace;
                                sphere.material.map = texture;
                                sphere.material.needsUpdate = true;
                            });

                            // akaフェーズ用BGM停止
                            if (window.anaSequence.akaAudio) {
                                try {
                                    window.anaSequence.akaAudio.pause();
                                    window.anaSequence.akaAudio.currentTime = 0;
                                } catch (e) {}
                                window.anaSequence.akaAudio = null;
                            }

                            // mamono_aaa.mp3 再生＋一瞬暗転 → image (1).png に戻す
                            playAudioFile('sounds/mamono_aaa.mp3', 1.0, false);

                            const darkness = document.getElementById('darkness-overlay');
                            if (darkness) {
                                darkness.style.transition = 'opacity 0.1s';
                                darkness.style.opacity = '1';

                                setTimeout(() => {
                                    darkness.style.opacity = '0';
                                }, 300);
                            }

                            // 2秒後に青の部屋へ（赤女7周クリア後の新ルート）
                            setTimeout(() => {
                                // シーケンス完全終了
                                window.anaSequence.active = false;
                                window.anaSequence.phase = null;
                                isInputLocked = false;
                                window.isInputLocked = false;

                                // ★★★ 青の部屋へ誘導（全部屋制覇で影の女へ）★★★
                                const idxBlue = window.ROOMS.findIndex(r => r.id === 'blue_bedroom');
                                if (idxBlue !== -1) {
                                    window.isBlueRoomMode = true;
                                    if (window.BlueRoomSystem) window.BlueRoomSystem.start();
                                    loadRoom(idxBlue);
                                } else {
                                    // フォールバック：従来の影部屋
                                    console.warn('[AnaSeq] blue_bedroom not found, falling back to bedroom_open');
                                    const idxRoom = window.ROOMS.findIndex(r => r.id === 'bedroom_open');
                                    if (idxRoom !== -1) loadRoom(idxRoom);
                                }
                            }, 2000);

                            return; // take-over終了
                        }

                        requestAnimationFrame(cameraTakeoverStep);
                    }

                    requestAnimationFrame(cameraTakeoverStep);

                } else if (lap >= 8) {
                    tex = 'akaonnnaima8.png';
                }

                if (tex && lap < 7) {
                    console.log('[AnaSeq] Lap', lap, '→', tex);
                    const loader5 = new THREE.TextureLoader();
                    loader5.load(tex, (texture) => {
                        if (!sphere) return;
                        texture.colorSpace = THREE.SRGBColorSpace;
                        sphere.material.map = texture;
                        sphere.material.needsUpdate = true;
                    });
                }
            }
        }
    }

    // ★★★ da1→da2→da3→da4→da5：段ボール付近を見続けたら即切替 ★★★
    const isDaSequenceRoom = currentRoom && currentRoom.id === 'bedroom' && 
                             window.daRoomState && window.daRoomState.phase >= 1 &&
                             window.da5SequenceCompleted === false;
    if (isDaSequenceRoom && sphere && scene && !window.anaSequence.active) {
        const ds = window.daRoomState;
        const angleDelta2 = (a, b) => {
            let d = a - b;
            while (d > Math.PI) d -= 2 * Math.PI;
            while (d < -Math.PI) d += 2 * Math.PI;
            return d;
        };
        // ★★★ 段ボール座標：Dキーで段ボールを見ながら確認して調整 ★★★
        const cardboardCenter = { theta: 2.83, phi: 1.75 }; // ★要調整
        const cardboardRadius = 0.55; // ★範囲拡大（0.30→0.55）
        const dT = angleDelta2(theta, cardboardCenter.theta);
        const dP = phi - cardboardCenter.phi;
        const dist = Math.sqrt(dT * dT + dP * dP);
        const inCardboardZone = dist < cardboardRadius;

        // ti.mp3をphase1から鳴らす（段ボール玄関に入った瞬間から）
        if (ds.phase >= 1 && ds.phase <= 4 && typeof window.playTiLoopBgm === 'function') {
            if (!window.tiLoopBgmAudio) window.playTiLoopBgm();
        }

        // da5到達後の自動遷移中だけロック（段ボール見てる間は自由に動ける）
        // hotspot非表示はcreateHotspotElements/updateHotspotsで制御済み

        // ★★★ ゾーン入退場イベント方式（毎フレーム判定→状態変化時のみ反応）★★★
        const wasInZone = ds.inZone;
        ds.inZone = inCardboardZone;

        if (!wasInZone && inCardboardZone) {
            // ---- ゾーンに「入った」瞬間だけタイマー開始 ----
            if (ds.phase < 5 && !ds.phaseTimer) {
                window.daStartPhaseTimer(ds.phase);
                console.log('[DaSeq] ゾーン進入 → フェーズ', ds.phase, 'タイマー開始');
            }
        } else if (wasInZone && !inCardboardZone) {
            // ---- ゾーンから「出た」瞬間だけタイマーキャンセル ----
            if (ds.phaseTimer) {
                clearTimeout(ds.phaseTimer);
                ds.phaseTimer = null;
                console.log('[DaSeq] ゾーン離脱 → タイマーキャンセル');
            }
        }
    }

    // ★★★ 影のかくれんぼ：視線更新 ★★★
    if (window.isShadowMode && window.kurokoSystem && !isInputLocked) {
        window.kurokoSystem.update(theta, phi);
    }

    if (currentRoom && gazeSystem && !isInputLocked && !window.isGoreMode && !window.isInXRoom && currentRoom.id === 'bedroom_open') {
        gazeSystem.check(theta, phi, deltaTime, currentRoom.id);
    }

    if (currentRoom && peripheralSystem && !isInputLocked && currentRoom.id.includes('entrance') && !currentRoom.id.startsWith('x_')) {
        peripheralSystem.update(theta, phi, currentRoom.id);
        if (flickerSystem) flickerSystem.update(currentRoom.id, renderer, deltaTime);
    }

    if (currentRoom && mitanaSystem && !isInputLocked && !window.isInXRoom && currentRoom.id === 'changing_room_red') {
        mitanaSystem.update(theta, phi, deltaTime);
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}