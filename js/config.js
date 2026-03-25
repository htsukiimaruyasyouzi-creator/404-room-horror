const CONFIG = {
    gaze: {
        target: { theta: -1.03, phi: 1.60 },
        threshold: 1.5,
        duration: 100
    },
    corruption: {
        waitTime: 7000,
        noiseTime: 3000,
        glitchInterval: { min: 200, max: 600 }
    },
    camera: { fov: 75, minFov: 5, maxFov: 100 },
    entrance: {
        suspiciousTheta: -2.94,
        suspiciousPhi: 1.66,
        peripheralThreshold: 0.8,
        flickerInterval: { min: 15000, max: 30000 },
        peripheralChance: 0.15
    },
    sequence: {
        route: ['entrance', 'bedroom', 'entrance', 'bedroom', 'changing_room', 'bedroom', 'entrance'],
        targetRoom: 'bedroom_dark'  // ★★★ 変更：bedroom_open → bedroom_dark ★★★
    },
    mitana: {
        mirrorTheta: 2.30,
        mirrorPhi: 1.42,
        threshold: 1.2,
        textures: [
            'aka(3).png',
            'mi.png',
            'mita.png',
            'mitana.png'
        ],
        stageNames: ['', 'ミ', 'ミタ', 'ミタナ...']
    },
    session: {
        duration: 600000,
        warningAt: 300000,
        dangerAt: 60000
    },
    // X部屋用設定
    xRoom: {
        sequence: ['x_bedroom', 'x_entrance', 'x_bedroom', 'x_changing', 'x_bathroom'],
        animationSpeed: { bedroom: 80, entrance: 100 }
    }
};

const ROOMS = [
    // ===== 通常部屋 =====
    {
        id: 'bedroom', 
        name: '居室（6帖）', 
        path: 'image (1).png', 
        exposure: 0.6,
        type: 'normal',
        hotspots: [
            { name: '玄関へ', target: 'entrance', theta: 0.65, phi: 1.74, range: 0.35 },
            { name: '脱衣所へ', target: 'changing_room', theta: 0.16, phi: 1.80, range: 0.3 }
        ]
    },
    {
        id: 'entrance', 
        name: '玄関・キッチン', 
        path: 'gennkann1.png', 
        exposure: 0.005,
        type: 'normal',
        hotspots: [
            { name: '居室へ戻る', target: 'bedroom', theta: -2.94, phi: 1.66, range: 0.5 }
        ]
    },
    {
        id: 'changing_room', 
        name: '脱衣所・トイレ', 
        path: 'image (3).png', 
        exposure: 0.1,
        type: 'normal',
        hotspots: [
            { name: '居室へ戻る', target: 'bedroom', theta: -2.51, phi: 1.79, range: 0.5 },
            { name: '浴室へ', target: 'bathroom', theta: -2.99, phi: 1.61, range: 0.4 }
        ]
    },
    {
        id: 'bathroom', 
        name: '浴室', 
        path: 'image(4).png', 
        exposure: 0.15,
        type: 'normal',
        hotspots: [
            { name: '脱衣所へ戻る', target: 'changing_room', theta: -1.8, phi: 1.7, range: 0.5 }
        ]
    },
    
    // ===== 不穏な気配（旧：影部屋） - シーケンス外または別ルート用に保持 =====
    {
        id: 'bedroom_open', 
        name: '居室（6帖）- 不穏な気配', 
        path: 'kage(1).png', 
        exposure: 0.5,
        type: 'shadow',
        hotspots: [],
        autoTrigger: false
    },
    // 穴のある特別な居室
    {
        id: 'bedroom_hole',
        name: '居室（6帖）- 穴',
        path: 'ana5.png',
        exposure: 0.6,
        type: 'special',
        hotspots: []
    },
    
    // ===== 侵食部屋（赤） =====
    {
        id: 'bedroom_red', 
        name: '居室（6帖）- 侵食', 
        path: 'aka(1).png', 
        exposure: 0.3,
        type: 'corrupted',
        hotspots: [
            { name: '玄関へ', target: 'entrance_red', theta: 0.65, phi: 1.74, range: 0.35 },
            { name: '脱衣所へ', target: 'changing_room_red', theta: 0.16, phi: 1.80, range: 0.3 }
        ]
    },
    {
        id: 'entrance_red', 
        name: '玄関・キッチン - 侵食', 
        path: 'aka(2).png', 
        exposure: 0.005,
        type: 'corrupted',
        hotspots: [
            { name: '居室へ戻る', target: 'bedroom_red', theta: -2.94, phi: 1.66, range: 0.5 }
        ]
    },
    {
        id: 'changing_room_red', 
        name: '脱衣所・トイレ - 侵食', 
        path: 'aka(3).png', 
        exposure: 0.08,
        type: 'corrupted',
        hotspots: [
            { name: '居室へ戻る', target: 'bedroom_red', theta: -2.51, phi: 1.79, range: 0.5 },
            { name: '浴室へ', target: 'bathroom_red', theta: -2.99, phi: 1.61, range: 0.4 }
        ],
        hasMitana: true
    },
    {
        id: 'bathroom_red', 
        name: '浴室 - 侵食', 
        path: 'aka(4).png', 
        exposure: 0.12,
        type: 'corrupted',
        hotspots: [
            { name: '脱衣所へ戻る', target: 'changing_room_red', theta: -1.8, phi: 1.7, range: 0.5 }
        ]
    },
    
    // ===== 深層部屋（グロ） =====
    {
        id: 'bedroom_gore', 
        name: '居室 - 深層', 
        path: 'ti1.png', 
        exposure: 0.2,
        type: 'gore',
        hotspots: [
            { name: '脱衣所へ', target: 'changing_room_gore', theta: 0.16, phi: 1.80, range: 0.3 },
            { name: '玄関へ', target: 'entrance_gore', theta: 0.65, phi: 1.74, range: 0.35 }
        ]
    },
    {
        id: 'entrance_gore', 
        name: '玄関 - 深層', 
        path: 'ti2.png', 
        exposure: 0.01,
        type: 'gore',
        hotspots: [
            { name: '居室へ', target: 'bedroom_gore', theta: -2.94, phi: 1.66, range: 0.5 }
        ]
    },
    {
        id: 'changing_room_gore', 
        name: '脱衣所 - 深層', 
        path: 'ti3.png', 
        exposure: 0.1,
        type: 'gore',
        hotspots: [
            { name: '居室へ', target: 'bedroom_gore', theta: -2.51, phi: 1.79, range: 0.5 },
            { name: '浴室へ', target: 'bathroom_gore', theta: -2.99, phi: 1.61, range: 0.4 }
        ]
    },
    {
        id: 'bathroom_gore', 
        name: '浴室 - 深層', 
        path: 'ti4.png', 
        exposure: 0.15,
        type: 'gore',
        hotspots: [
            { name: '脱衣所へ', target: 'changing_room_gore', theta: -1.8, phi: 1.7, range: 0.5 }
        ]
    },
    
    // ===== X部屋（侵食深化） =====
    {
        id: 'x_bedroom',
        name: '居室（6帖）- 侵食深化',
        path: 'ozigi1.png',
        textures: ['ozigi1.png', 'ozigi2.png', 'ozigi3.png', 'ozigi4.png'],
        texturesReturn: ['ozigiatamanasi1.png', 'ozigiatamanasi2.png', 'ozigiatamanasi3.png'],
        exposure: 0.4,
        type: 'x_animated',
        animationSpeed: 80,
        hotspots: [
            { name: '玄関へ', target: 'x_entrance', theta: 0.65, phi: 1.74, range: 0.35 }
        ]
    },
    {
        id: 'x_entrance',
        name: '玄関・キッチン - 侵食深化',
        path: 'musi1.png',
        textures: ['musi1.png', 'musi2.png', 'musi3.png', 'musi4.png', 'musi5.png', 'musi6.png'],
        exposure: 0.005,
        type: 'x_animated',
        animationSpeed: 100,
        hotspots: [
            { name: '居室へ戻る', target: 'x_bedroom', theta: -2.94, phi: 1.66, range: 0.5 }
        ]
    },
    {
        id: 'x_changing',
        name: '脱衣所・トイレ - 侵食深化',
        path: 'atamanasi.png',
        exposure: 0.08,
        type: 'x_static',
        hotspots: [
            { name: '居室へ戻る', target: 'x_bedroom', theta: -2.51, phi: 1.79, range: 0.5 },
            { name: '浴室へ', target: 'x_bathroom', theta: -2.99, phi: 1.61, range: 0.4 }
        ]
    },
    {
        id: 'x_bathroom',
        name: '浴室 - 侵食深化',
        path: 'xohuro.png',
        exposure: 0.1,
        type: 'x_bathroom',
        hotspots: [
            { name: '脱衣所へ戻る', target: 'x_changing', theta: -1.8, phi: 1.7, range: 0.5 }
        ]
    },
    
    // ===== ★★★ 暗い部屋（かくれんぼ用）追加 ★★★ =====
    {
        id: 'bedroom_dark', 
        name: '居室（6帖）- 暗', 
        path: 'kuro1.png',  // 初期：女あり（遊ぼう）
        emptyPath: 'kura1.png',  // 女なし（空っぽ）
        exposure: 1.2,
        type: 'dark',
        hotspots: [
            { name: '玄関へ', target: 'entrance_dark', theta: 0.65, phi: 1.74, range: 0.35 },
            { name: '脱衣所へ', target: 'changing_room_dark', theta: 0.16, phi: 1.80, range: 0.3 }
        ]
    },
    {
        id: 'entrance_dark', 
        name: '玄関・キッチン - 暗', 
        path: 'kuro2.png',  // 女あり（まだだよ）
        emptyPath: 'kura2.png',  // 女なし
        exposure: 0.25,
        type: 'dark',
        hotspots: [
            { name: '居室へ戻る', target: 'bedroom_dark', theta: -2.94, phi: 1.66, range: 0.5 }
        ]
    },
    {
        id: 'changing_room_dark', 
        name: '脱衣所・トイレ - 暗', 
        path: 'kuro3.png',  // 女あり（もういいかい）
        emptyPath: 'kura3.png',  // 女なし
        exposure: 0.9,
        type: 'dark',
        hotspots: [
            { name: '居室へ戻る', target: 'bedroom_dark', theta: -2.51, phi: 1.79, range: 0.5 },
            { name: '浴室へ', target: 'bathroom_dark', theta: -2.99, phi: 1.61, range: 0.4 }
        ]
    },
    {
        id: 'bathroom_dark', 
        name: '浴室 - 暗', 
        path: 'kuro4.png',  // 女あり（みつけた）
        upsideDownPath: 'kuro5.png',  // 逆さま
        emptyPath: 'kura4.png',  // 女なし
        exposure: 0.95,
        type: 'dark',
        hotspots: [
            { name: '脱衣所へ戻る', target: 'changing_room_dark', theta: -1.8, phi: 1.7, range: 0.5 }
        ]
    },

    // ===== ★★★ 青の部屋（赤女7周後の新ルート）★★★ =====
    {
        id: 'blue_bedroom',
        name: '居室（6帖）- 青',
        path: 'aobeyaima1.png',      // 初期（ランダム選択はBlueRoomSystem側で制御）
        exposure: 0.75,
        type: 'blue',
        hotspots: [
            { name: '玄関へ',   target: 'blue_entrance', theta: 0.65,  phi: 1.74, range: 0.35 },
            { name: '脱衣所へ', target: 'blue_changing', theta: 0.16,  phi: 1.80, range: 0.3  }
        ]
    },
    {
        id: 'blue_entrance',
        name: '玄関・キッチン - 青',
        path: 'tema1.png',           // 手招きアニメーション（tema1〜6ループ）
        exposure: 0.25,
        type: 'blue',
        hotspots: [
            { name: '居室へ戻る', target: 'blue_bedroom', theta: -2.94, phi: 1.66, range: 0.5 }
        ]
    },
    {
        id: 'blue_changing',
        name: '脱衣所・トイレ - 青',
        path: 'yugami1.png',         // 歪みアニメーション（yugami1〜2交互）
        exposure: 0.2,
        type: 'blue',
        hotspots: [
            { name: '居室へ戻る', target: 'blue_bedroom',  theta: -2.51, phi: 1.79, range: 0.5 },
            { name: '浴室へ',     target: 'blue_bathroom', theta: -2.99, phi: 1.61, range: 0.4 }
        ]
    },
    {
        id: 'blue_bathroom',
        name: '浴室 - 青',
        path: 'aoburo1.png',         // 10秒ごとに進行（aoburo1〜8）
        exposure: 0.3,
        type: 'blue',
        hotspots: [
            { name: '脱衣所へ戻る', target: 'blue_changing', theta: -1.8, phi: 1.7, range: 0.5 }
        ]
    }
];

const GORE_ROOM_MAPPING = {
    'bedroom_gore': [
        { name: '脱衣所へ', target: 'changing_room_gore', theta: 0.16, phi: 1.80, range: 0.3 },
        { name: '玄関へ', target: 'entrance_gore', theta: 0.65, phi: 1.74, range: 0.35 }
    ],
    'changing_room_gore': [
        { name: '居室へ', target: 'bedroom_gore', theta: -2.51, phi: 1.79, range: 0.5 },
        { name: '浴室へ', target: 'bathroom_gore', theta: -2.99, phi: 1.61, range: 0.4 }
    ],
    'bathroom_gore': [
        { name: '脱衣所へ', target: 'changing_room_gore', theta: -1.8, phi: 1.7, range: 0.5 }
    ],
    'entrance_gore': [
        { name: '居室へ', target: 'bedroom_gore', theta: -2.94, phi: 1.66, range: 0.5 }
    ],
    // X部屋マッピング
    'x_bedroom': [
        { name: '玄関へ', target: 'x_entrance', theta: 0.65, phi: 1.74, range: 0.35 }
    ],
    'x_entrance': [
        { name: '居室へ戻る', target: 'x_bedroom', theta: -2.94, phi: 1.66, range: 0.5 }
    ],
    'x_changing': [
        { name: '居室へ戻る', target: 'x_bedroom', theta: -2.51, phi: 1.79, range: 0.5 },
        { name: '浴室へ', target: 'x_bathroom', theta: -2.99, phi: 1.61, range: 0.4 }
    ],
    'x_bathroom': [
        { name: '脱衣所へ戻る', target: 'x_changing', theta: -1.8, phi: 1.7, range: 0.5 }
    ],
    // ★★★ 暗い部屋マッピング（KurokoSystem用）★★★
    'bedroom_dark': [
        { name: '玄関へ', target: 'entrance_dark', theta: 0.65, phi: 1.74, range: 0.35 },
        { name: '脱衣所へ', target: 'changing_room_dark', theta: 0.16, phi: 1.80, range: 0.3 }
    ],
    'entrance_dark': [
        { name: '居室へ戻る', target: 'bedroom_dark', theta: -2.94, phi: 1.66, range: 0.5 }
    ],
    'changing_room_dark': [
        { name: '居室へ戻る', target: 'bedroom_dark', theta: -2.51, phi: 1.79, range: 0.5 },
        { name: '浴室へ', target: 'bathroom_dark', theta: -2.99, phi: 1.61, range: 0.4 }
    ],
    'bathroom_dark': [
        { name: '脱衣所へ戻る', target: 'changing_room_dark', theta: -1.8, phi: 1.7, range: 0.5 }
    ],

    // ★★★ 青の部屋マッピング（BlueRoomSystem用）★★★
    'blue_bedroom': [
        { name: '玄関へ',   target: 'blue_entrance', theta: 0.65,  phi: 1.74, range: 0.35 },
        { name: '脱衣所へ', target: 'blue_changing', theta: 0.16,  phi: 1.80, range: 0.3  }
    ],
    'blue_entrance': [
        { name: '居室へ戻る', target: 'blue_bedroom', theta: -2.94, phi: 1.66, range: 0.5 }
    ],
    'blue_changing': [
        { name: '居室へ戻る', target: 'blue_bedroom',  theta: -2.51, phi: 1.79, range: 0.5 },
        { name: '浴室へ',     target: 'blue_bathroom', theta: -2.99, phi: 1.61, range: 0.4 }
    ],
    'blue_bathroom': [
        { name: '脱衣所へ戻る', target: 'blue_changing', theta: -1.8, phi: 1.7, range: 0.5 }
    ]
};

const GORE_TEXTURES = {
    'entrance': 'ti2.png',
    'changing_room': 'ti3.png',
    'changing_room_red': 'ti3.png',
    'bathroom': 'ti4.png',
    'bathroom_red': 'ti4.png',
    'bedroom': 'ti1.png',
    'bedroom_red': 'ti1.png',
    'bedroom_open': 'ti1.png',
    'bedroom_gore': 'ti1.png',
    'changing_room_gore': 'ti3.png',
    'bathroom_gore': 'ti4.png',
    'entrance_gore': 'ti2.png'
};

// グロ部屋リスト（訪問チェック用）
const GORE_ROOMS_LIST = ['bedroom_gore', 'entrance_gore', 'changing_room_gore', 'bathroom_gore'];

// ===== グローバル登録 =====
window.CONFIG = CONFIG;
window.ROOMS = ROOMS;
window.GORE_ROOM_MAPPING = GORE_ROOM_MAPPING;
window.GORE_TEXTURES = GORE_TEXTURES;
window.GORE_ROOMS_LIST = GORE_ROOMS_LIST;
window.X_ROOM_SEQUENCE = CONFIG.xRoom.sequence;

// ===== ★★★ 黒部屋（かくれんぼ）設定 ★★★ =====
window.KUROKO_CONFIG = {
    stages: [
        { 
            id: 'dark_bedroom_1',
            roomId: 'bedroom_dark',
            image: 'kuro1.png', 
            emptyImage: 'kura1.png',
            audio: 'asobo.mp3', 
            text: '遊ぼう、私と一緒に',
            loop: true,
            girlTheta: 0.5,  // 居室の女の位置（調整可能）
            girlPhi: 1.5,
            girlRange: 0.6
        },
        { 
            id: 'dark_changing',
            roomId: 'changing_room_dark',
            image: 'kuro3.png', 
            emptyImage: 'kura3.png',
            audio: 'mouiikai1.mp3', 
            text: 'もういいかい',
            loop: true,
            girlTheta: -2.8,
            girlPhi: 1.6,
            girlRange: 0.6
        },
        { 
            id: 'dark_entrance',
            roomId: 'entrance_dark',
            image: 'kuro2.png', 
            emptyImage: 'kura2.png',
            audio: 'madadayo1.mp3', 
            text: 'まだだよ',
            loop: true,
            girlTheta: -2.5,
            girlPhi: 1.6,
            girlRange: 0.6
        },
        { 
            id: 'dark_bedroom_2',
            roomId: 'bedroom_dark',
            image: 'kuro1.png', 
            emptyImage: 'kura1.png',
            audio: 'mouiiyo.mp3', 
            text: 'もういいよ',
            loop: false,  // 1回のみ
            playOnce: true,
            girlTheta: 0.5,
            girlPhi: 1.5,
            girlRange: 0.6,
            disappearAfterPlay: true  // 再生後に女が消える
        },
        { 
            id: 'dark_bathroom',
            roomId: 'bathroom_dark',
            image: 'kuro4.png', 
            emptyImage: 'kura4.png',
            upsideDownImage: 'kuro5.png',
            audio: '0mituketa2.mp3', 
            text: 'んんふ、見つけた',
            loop: false,
            girlTheta: 2.0,
            girlPhi: 1.4,
            girlRange: 0.7,
            transformToUpsideDown: true,  // 逆さまに変形
            triggerShadowWoman: true  // 最終イベント発火
        }
    ],
    
    // 女が消えた後の空っぽの暗闘画像マッピング
    emptyDarkImages: {
        'bedroom_dark': 'kura1.png',
        'entrance_dark': 'kura2.png',
        'changing_room_dark': 'kura3.png',
        'bathroom_dark': 'kura4.png'
    }
};