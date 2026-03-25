class TextCorruption {
    constructor() {
        this.targets = [
            { id: 'title', original: '物件コード：404', final: '▓▓▓' },
            { id: 'room-name', original: null, final: 'ミツケタ' },
            { id: 'controls', original: null, final: 'ミツケタ' }
        ];
        this.interval = null;
        this.glitchChars = '▓■□▒░ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ404';
        this.stage = 0;
    }

    start() {
        this.targets.forEach(t => {
            const el = document.getElementById(t.id);
            if (el && !t.original) t.original = el.innerText;
        });

        this.interval = setInterval(() => {
            this.corrupt();
        }, 150);
    }

    corrupt() {
        this.targets.forEach(t => {
            const el = document.getElementById(t.id);
            if (!el) return;
            
            let text = t.original;
            
            if (this.stage === 0) {
                text = text.split('').map(c => Math.random() > 0.9 ? this.glitchChars[Math.floor(Math.random() * this.glitchChars.length)] : c).join('');
            } else if (this.stage === 1) {
                text = text.split('').map(c => Math.random() > 0.6 ? this.glitchChars[Math.floor(Math.random() * this.glitchChars.length)] : c).join('');
                el.style.textShadow = '2px 0 #ff0000, -2px 0 #0000ff';
            } else if (this.stage === 2) {
                text = text.split('').map(c => Math.random() > 0.3 ? this.glitchChars[Math.floor(Math.random() * this.glitchChars.length)] : c).join('');
                el.style.color = '#ff0000';
            } else if (this.stage === 3) {
                text = t.final;
                el.style.color = '#ff0000';
                el.style.textShadow = '0 0 10px #ff0000';
            }
            
            el.innerText = text;
        });
    }

    setStage(s) { this.stage = s; }

    stop() {
        clearInterval(this.interval);
        this.targets.forEach(t => {
            const el = document.getElementById(t.id);
            if (el && t.original) {
                el.innerText = t.original;
                el.style.color = '';
                el.style.textShadow = '';
                el.style.transform = '';
            }
        });
    }
}

window.TextCorruption = TextCorruption;