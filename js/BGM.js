class BGMPlayerManager {
    constructor() {
        this.bgmList = [];
        this.audio = new Audio();
        this.audio.crossOrigin = "anonymous";

        this.audioCtx = null;
        this.analyser = null;
        this.source = null;
        this.animationId = null;
        this.currentColor = this.getDefaultThemeColor();

        this.bindEvents();
    }
    /* [新增] 讀取 CSS 全域變數的輔助函式 */
    getDefaultThemeColor() {
        const cssColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--audioWidgetAccent-color').trim();
        return cssColor || "#975a56"; // 若讀取失敗的安全備用色
    }

    async init(jsonPath) {
        try {
            const res = await fetch(jsonPath);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            
            const data = await res.json();
            
            // 檢查資料是否為陣列且有內容
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error("BGM 資料為空或格式不正確");
            }

            this.bgmList = data;
            this.toggleBGMUI(true); // 顯示 BGM 元件
            this.renderSelect();
        } catch (e) {
            console.error("[BGMPlayerManager] 讀取 BGM.json 失敗或無資料:", e);
            this.bgmList = [];
            this.toggleBGMUI(false); // 隱藏 BGM 元件
        }
    }

    /* 📌 新增：控制 UI 元件顯示/隱藏的輔助函式 */
    toggleBGMUI(show) {
        const { bgmSelect, widget } = this.dom;
        const displayValue = show ? "" : "none";

        // 隱藏下拉選單外層的 .control-group (若存在)
        if (bgmSelect) {
            const controlGroup = bgmSelect.closest(".control-group") || bgmSelect;
            controlGroup.style.display = displayValue;
        }

        // 隱藏右下角播放器 Widget
        if (widget) {
            widget.style.display = displayValue;
        }
    }

    get dom() {
        return {
            bgmSelect: document.getElementById("bgm-select"),
            widget: document.getElementById("audio-widget"),
            closeBtn: document.getElementById("widget-close-btn"),
            gifImg: document.getElementById("widget-gif"),
            canvas: document.getElementById("widget-canvas"),
            volumeSlider: document.getElementById("widget-volume")
        };
    }

    // 提供外部檢查目前 BGM 是否正在播放/開啟
    isPlaying() {
        const { widget } = this.dom;
        return widget ? widget.classList.contains("active") : false;
    }

    renderSelect() {
        const { bgmSelect } = this.dom;
        if (!bgmSelect) return;
        bgmSelect.innerHTML = '<option value="">關閉</option>';
        this.bgmList.forEach((item, index) => {
            const opt = document.createElement("option");
            opt.value = index;
            opt.textContent = item.title;
            bgmSelect.appendChild(opt);
        });
    }

    bindEvents() {
        document.addEventListener("change", (e) => {
            if (e.target && e.target.id === "bgm-select") {
                this.handleBgmChange(e.target.value);
            }
        });

        document.addEventListener("click", (e) => {
            if (e.target && (e.target.id === "widget-close-btn" || e.target.closest("#widget-close-btn"))) {
                this.closeBgm();
            }
        });

        document.addEventListener("input", (e) => {
            if (e.target && e.target.id === "widget-volume") {
                const val = e.target.value;
                this.audio.volume = val;
                this.updateSliderTrack(val);
            }
        });

        this.audio.addEventListener("timeupdate", () => this.updateGifPosition());
        this.audio.addEventListener("ended", () => {
            this.audio.currentTime = 0;
            this.audio.play();
        });

        window.addEventListener("resize", () => {
            if (this.dom.widget && this.dom.widget.classList.contains("active")) {
                this.resizeCanvas();
            }
        });
    }

    initAudioContext() {
        if (this.audioCtx) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtx();
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 64;

            this.source = this.audioCtx.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
        } catch (e) {
            console.error("[BGMPlayerManager] 初始化 AudioContext 失敗:", e);
        }
    }

    async handleBgmChange(val) {
        if (val === "") {
            this.closeBgm();
        } else {
            const bgmItem = this.bgmList[val];
            if (bgmItem) {
                this.initAudioContext();
                if (this.audioCtx && this.audioCtx.state === "suspended") {
                    await this.audioCtx.resume();
                }

                this.audio.src = bgmItem.url;
                try {
                    await this.audio.play();
                    this.startVisualizer();
                } catch (e) {
                    console.error("[BGMPlayerManager] 播放失敗:", e);
                }

                // 當音樂開啟時：通知桌寵離場
                if (window.shimejiApp) {
                    window.shimejiApp.dismissForBGM();
                }

                this.showWidget();
            }
        }
    }

    showWidget() {
        const { widget, gifImg } = this.dom;
        if (!widget) return;

        widget.classList.add("active");

        // 檢查當前是否有選擇桌寵
        const shimejiData = window.shimejiApp ? window.shimejiApp.getCurrentData() : null;

        if (shimejiData && gifImg) {
            // 抓取桌寵的走路動態與顏色
            const walkMotion = shimejiData.idleMotions.find(m => m.id === "walk");
            gifImg.src = walkMotion ? walkMotion.url : shimejiData.idleMotions[0].url;
            gifImg.style.display = "block";

            this.currentColor = shimejiData.color || this.getDefaultThemeColor();
        } else if (gifImg) {
            gifImg.style.display = "none";
            this.currentColor = this.getDefaultThemeColor();
        }

        this.applyColorTheme(this.currentColor);
        setTimeout(() => this.resizeCanvas(), 50);
    }

    closeBgm() {
        const { bgmSelect, widget } = this.dom;
        if (bgmSelect) bgmSelect.value = "";
        if (widget) widget.classList.remove("active");

        this.audio.pause();
        this.audio.currentTime = 0;
        if (this.animationId) cancelAnimationFrame(this.animationId);

        // 音樂關閉時：若選單仍選有桌寵，恢復全螢幕桌寵登場
        if (window.shimejiApp) {
            window.shimejiApp.restoreFromBGM();
        }
    }

    applyColorTheme(color) {
        const { volumeSlider } = this.dom;
        if (!volumeSlider) return;
        volumeSlider.style.setProperty("--audioWidgetAccent-color", color);
        this.updateSliderTrack(volumeSlider.value);
    }

    updateSliderTrack(val) {
        const { volumeSlider } = this.dom;
        if (!volumeSlider) return;
        const pct = val * 100;
        const trackBg = getComputedStyle(document.documentElement)
            .getPropertyValue('--bgm-slider-track-bg').trim() || 'rgba(255,255,255,0.3)';
        volumeSlider.style.background = 
            `linear-gradient(to right, ${this.currentColor} 0%, ${this.currentColor} ${pct}%, ${trackBg} ${pct}%, ${trackBg} 100%)`;
        
    }

    updateGifPosition() {
        const { gifImg, widget } = this.dom;
        if (!this.audio.duration || !gifImg || !widget || gifImg.style.display === "none") return;

        const pct = (this.audio.currentTime / this.audio.duration);
        const trackWidth = widget.offsetWidth - 70; 
        const leftPx = pct * Math.max(0, trackWidth);
        gifImg.style.transform = `translateX(${leftPx}px)`;
    }

    startVisualizer() {
        const { canvas } = this.dom;
        if (!canvas || !this.analyser) return;
        const ctx = canvas.getContext("2d");
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            this.animationId = requestAnimationFrame(draw);
            this.analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 1.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height;
                ctx.fillStyle = this.currentColor;
                ctx.globalAlpha = 0.6;
                ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
                x += barWidth;
            }
        };
        draw();
    }

    resizeCanvas() {
        const { canvas, widget } = this.dom;
        if (!canvas || !widget) return;
        canvas.width = widget.offsetWidth - 24;
        canvas.height = 48;
    }
}