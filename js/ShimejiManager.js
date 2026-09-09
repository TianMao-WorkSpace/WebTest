class ShimejiManager {
    constructor() {
        this.configList = [];
        this.currentShimeji = null;
        this.domElement = null;
        
        // 用 Key-Value 結構保存所有預載好的 <img> DOM 節點
        // 例如: { "walk": imgElement, "drag_calm": imgElement, ... }
        this.imgNodes = {}; 
        this.currentActiveKey = null;

        // 狀態與位置
        this.x = 100;
        this.y = window.innerHeight - 128;
        this.vx = 0;
        this.vy = 0;
        this.direction = 1; // 1: 右, -1: 左
        this.stateTimer = null;
        this.currentState = null;

        // 互動狀態
        this.clickCount = 0;
        this.clickTimer = null;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.animFrameId = null;

        this.bindEvents();
    }

    async init(jsonPath) {
        try {
            const res = await fetch(jsonPath);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            
            const data = await res.json();

            // 檢查資料是否為非空陣列
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error("JSON 資料為空或格式不正確");
            }

            this.configList = data;
            this.toggleUI(true); // 確定有資料，顯示 UI
            this.renderSelect();
        } catch (e) {
            console.error("[ShimejiManager] 讀取 Shimeji.json 失敗或無資料:", e);
            this.configList = [];
            this.toggleUI(false); // 讀取失敗或無資料，隱藏 UI
        }
    }

    /* 📌 新增：控制選單區塊顯示/隱藏的輔助函式 */
    toggleUI(show) {
        const select = document.getElementById("shimeji-select");
        if (!select) return;

        // 優先找到外層的 .control-group 容器，若無則控制選單本身
        const container = select.closest(".control-group") || select;
        container.style.display = show ? "" : "none";
    }

    renderSelect() {
        const select = document.getElementById("shimeji-select");
        if (!select) return;
        select.innerHTML = '<option value="">關閉</option>';
        this.configList.forEach((item, index) => {
            const opt = document.createElement("option");
            opt.value = index;
            opt.textContent = item.title;
            select.appendChild(opt);
        });
    }

    bindEvents() {
        document.addEventListener("change", (e) => {
            if (e.target && e.target.id === "shimeji-select") {
                this.handleSelectChange(e.target.value);
            }
        });

        window.addEventListener("resize", () => {
            if (this.currentShimeji && !this.isDragging) {
                this.y = Math.min(this.y, window.innerHeight - 128);
                this.updateDOMPosition();
            }
        });
    }

    handleSelectChange(val) {
        if (val === "") {
            this.removePet();
        } else {
            const config = this.configList[val];
            if (config) {
                if (window.bgmApp && window.bgmApp.isPlaying()) {
                    this.currentShimeji = config;
                    window.bgmApp.showWidget();
                } else {
                    this.spawnPet(config);
                }
            }
        }
    }

    getCurrentData() {
        const select = document.getElementById("shimeji-select");
        if (!select || select.value === "") return null;
        return this.configList[select.value] || null;
    }

    // 核心解決方案：一次性建立所有動作的 DOM 圖片節點
    buildImageNodes(config) {
        this.imgNodes = {};
        const stateMap = {};

        // 收集所有狀態及其 URL
        if (config.idleMotions) {
            config.idleMotions.forEach(m => {
                stateMap[m.id] = m.url;
            });
        }
        if (config.interactions) {
            const { drag, clickLight, clickAngry, drop } = config.interactions;
            if (drag) {
                stateMap["drag_calm"] = drag.calmUrl;
                stateMap["drag_shake"] = drag.shakeUrl;
            }
            if (clickLight) stateMap["clickLight"] = clickLight.url;
            if (clickAngry) stateMap["clickAngry"] = clickAngry.url;
            if (drop) {
                stateMap["drop_falling"] = drop.fallingUrl;
                stateMap["drop_land"] = drop.landUrl;
                stateMap["drop_recover"] = drop.recoverUrl;
            }
        }

        // 為每一個動作創建 <img> 並掛載到 domElement 下
        for (const [key, url] of Object.entries(stateMap)) {
            if (!url) continue;
            const img = document.createElement("img");
            img.src = url;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.display = "none"; // 預設全部隱藏
            img.style.pointerEvents = "none"; // 避免圖片干擾拖拽事件
            img.draggable = false;

            this.domElement.appendChild(img);
            this.imgNodes[key] = img;
        }
    }

    // 顯示指定狀態的圖片（純 CSS 切換，不重載圖片）
    showImage(key) {
        if (this.currentActiveKey === key) return; // 狀態相同直接跳過

        // 隱藏當前顯示的圖片
        if (this.currentActiveKey && this.imgNodes[this.currentActiveKey]) {
            this.imgNodes[this.currentActiveKey].style.display = "none";
        }

        // 顯示目標圖片
        if (this.imgNodes[key]) {
            this.imgNodes[key].style.display = "block";
            this.currentActiveKey = key;
        } else {
            // 備用退路：若找不到該 key，嘗試用預設/第一個狀態
            const firstKey = Object.keys(this.imgNodes)[0];
            if (firstKey && this.imgNodes[firstKey]) {
                this.imgNodes[firstKey].style.display = "block";
                this.currentActiveKey = firstKey;
            }
        }
    }

    spawnPet(config) {
        this.removePet(false);
        this.currentShimeji = config;

        if (config.cursor) {
            document.body.style.cursor = `url('${config.cursor}'), auto`;
        }

        // 主容器
        this.domElement = document.createElement("div");
        this.domElement.className = "shimeji-pet";
        this.domElement.style.position = "fixed";
        this.domElement.style.width = "128px";
        this.domElement.style.height = "128px";
        this.domElement.style.zIndex = "99999";
        this.domElement.style.userSelect = "none";
        this.domElement.style.touchAction = "none";

        // 生成所有動作圖層
        this.buildImageNodes(config);
        document.body.appendChild(this.domElement);

        this.x = Math.random() * (window.innerWidth - 128);
        this.y = window.innerHeight - 128;
        this.updateDOMPosition();

        this.bindPetInteractions();
        this.startRandomStateMachine();
    }

    dismissForBGM() {
        if (!this.currentShimeji || !this.domElement) return;
        this.clearTimers();

        const leaveMotion = this.currentShimeji.idleMotions.find(m => m.id === "leave");
        this.showImage(leaveMotion ? "leave" : Object.keys(this.imgNodes)[0]);

        setTimeout(() => {
            if (this.domElement) {
                this.domElement.style.display = "none";
            }
        }, leaveMotion ? leaveMotion.minDuration : 2000);
    }

    restoreFromBGM() {
        const data = this.getCurrentData();
        if (data) {
            if (this.domElement) {
                this.domElement.style.display = "block";
                this.startRandomStateMachine();
            } else {
                this.spawnPet(data);
            }
        }
    }

    removePet(resetSelect = true) {
        this.clearTimers();
        if (this.domElement) {
            this.domElement.remove();
            this.domElement = null;
        }
        this.imgNodes = {};
        this.currentActiveKey = null;
        this.currentShimeji = null;
        document.body.style.cursor = "";

        if (resetSelect) {
            const select = document.getElementById("shimeji-select");
            if (select) select.value = "";
        }
    }

    clearTimers() {
        if (this.stateTimer) clearTimeout(this.stateTimer);
        if (this.clickTimer) clearTimeout(this.clickTimer);
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    }

    /* --- 隨機狀態機 --- */
    startRandomStateMachine() {
        if (!this.currentShimeji || this.isDragging) return;

        const motions = this.currentShimeji.idleMotions;
        const totalWeight = motions.reduce((sum, m) => sum + m.weight, 0);
        let rand = Math.random() * totalWeight;
        let selected = motions[0];

        for (const m of motions) {
            if (rand < m.weight) {
                selected = m;
                break;
            }
            rand -= m.weight;
        }

        this.currentState = selected;
        this.showImage(selected.id);

        if (selected.id === "leave") {
            setTimeout(() => {
                this.removePet(true);
            }, selected.minDuration);
            return;
        }

        if (selected.id === "walk") {
            this.direction = Math.random() > 0.5 ? 1 : -1;
            this.domElement.style.transform = `scaleX(${this.direction})`;
            this.startWalking(selected.speed || 2);
        }

        const duration = selected.minDuration + Math.random() * (selected.maxDuration - selected.minDuration);
        this.stateTimer = setTimeout(() => {
            this.startRandomStateMachine();
        }, duration);
    }

    startWalking(speed) {
        const walkLoop = () => {
            if (this.currentState?.id !== "walk" || this.isDragging) return;

            this.x += speed * this.direction;
            if (this.x <= 0) {
                this.x = 0;
                this.direction = 1;
                this.domElement.style.transform = `scaleX(${this.direction})`;
            } else if (this.x >= window.innerWidth - 128) {
                this.x = window.innerWidth - 128;
                this.direction = -1;
                this.domElement.style.transform = `scaleX(${this.direction})`;
            }

            this.updateDOMPosition();
            this.animFrameId = requestAnimationFrame(walkLoop);
        };
        this.animFrameId = requestAnimationFrame(walkLoop);
    }

    /* --- 滑鼠互動與物理拋甩 --- */
    bindPetInteractions() {
        const el = this.domElement;

        el.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.clearTimers();

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.vx = 0;
            this.vy = 0;

            el.setPointerCapture(e.pointerId);
            this.showImage("drag_calm");
        });

        el.addEventListener("pointermove", (e) => {
            if (!this.isDragging) return;

            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            const speed = Math.sqrt(dx * dx + dy * dy);

            this.vx = dx * 0.8;
            this.vy = dy * 0.8;

            this.x = e.clientX - 64;
            this.y = e.clientY - 64;
            this.updateDOMPosition();

            // 依據晃動速度僅切換顯示 (display)
            const dragCfg = this.currentShimeji.interactions.drag;
            if (speed > (dragCfg?.shakeThreshold || 15)) {
                this.showImage("drag_shake");
            } else {
                this.showImage("drag_calm");
            }

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        el.addEventListener("pointerup", (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            try {
                el.releasePointerCapture(e.pointerId);
            } catch (err) {}

            if (Math.abs(this.vx) < 2 && Math.abs(this.vy) < 2) {
                this.handleClickInteraction();
            } else {
                this.startPhysicsDrop();
            }
        });
    }

    handleClickInteraction() {
        this.clickCount++;
        if (this.clickTimer) clearTimeout(this.clickTimer);

        const inter = this.currentShimeji.interactions;

        if (this.clickCount >= 4) {
            this.clickCount = 0;
            this.showImage("clickAngry");
            setTimeout(() => this.startRandomStateMachine(), inter.clickAngry?.duration || 1000);
        } else {
            this.showImage("clickLight");
            this.clickTimer = setTimeout(() => {
                this.clickCount = 0;
                this.startRandomStateMachine();
            }, inter.clickLight?.duration || 800);
        }
    }

    startPhysicsDrop() {
        const dropCfg = this.currentShimeji.interactions.drop || {};
        const phys = this.currentShimeji.physics || { gravity: 0.8, friction: 0.98, bounce: 0.3 };
        
        this.showImage("drop_falling");

        const dropLoop = () => {
            if (this.isDragging) return;

            this.vy += phys.gravity;
            this.vx *= phys.friction;

            this.x += this.vx;
            this.y += this.vy;

            const groundY = window.innerHeight - 128;

            if (this.y >= groundY) {
                this.y = groundY;
                this.updateDOMPosition();

                this.showImage("drop_land");
                setTimeout(() => {
                    this.showImage("drop_recover");
                    setTimeout(() => {
                        this.startRandomStateMachine();
                    }, dropCfg.recoverDuration || 300);
                }, dropCfg.landDuration || 200);

                return;
            }

            if (this.x <= 0 || this.x >= window.innerWidth - 128) {
                this.vx *= -phys.bounce;
                this.x = Math.max(0, Math.min(this.x, window.innerWidth - 128));
            }

            this.updateDOMPosition();
            this.animFrameId = requestAnimationFrame(dropLoop);
        };

        this.animFrameId = requestAnimationFrame(dropLoop);
    }

    updateDOMPosition() {
        if (this.domElement) {
            this.domElement.style.left = `${this.x}px`;
            this.domElement.style.top = `${this.y}px`;
        }
    }
}