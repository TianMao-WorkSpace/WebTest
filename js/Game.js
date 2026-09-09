function initGameZone(gamesData) {
    const container = document.getElementById("game-container");
    const navEl = document.getElementById("game-tabs-nav");
    const contentEl = document.getElementById("game-tabs-content");
    if (!container || !navEl || !contentEl) return;

    // 過濾出顯示的項目（首頁或 show != "0" 的遊戲）
    const activeItems = gamesData.filter(item => item.type === "menu" || item.show !== "0");

    // 若全部 show 為 0 (只剩 menu 或無項目)，隱藏整個遊戲容器
    const hasActiveGame = gamesData.some(item => item.type === "game" && item.show !== "0");
    if (!hasActiveGame) {
        container.style.display = "none";
        return;
    } else {
        container.style.display = "flex";
    }

    navEl.innerHTML = "";
    contentEl.innerHTML = "";

    activeItems.forEach((item, index) => {
        // 生成頁籤按鈕
        const btn = document.createElement("button");
        btn.className = `tab-btn ${index === 0 ? "active" : ""}`;
        
        if (item.type === "menu") {
            btn.innerHTML = `<span>${item.name}</span>`;
        } else {
            const logoImg = item.logo ? `<img src="${item.logo}" style="width:16px;height:16px;">` : "";
            btn.innerHTML = `
                ${logoImg}
                <span class="tab-title">${item.name}</span>
                <span class="tab-short-name">${item.name}</span>
            `;
        }

        btn.onclick = () => {
            // 切換時先銷毀當前遊戲（離場即重置）
            if (typeof currentDinoGameDestroy === "function") {
                currentDinoGameDestroy();
            }
            
            document.querySelectorAll("#game-tabs-nav .tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderGameTabContent(item);
        };

        navEl.appendChild(btn);
    });

    // 預設渲染第一個頁籤（首頁）
    renderGameTabContent(activeItems[0]);
}

// 渲染頁籤內容
function renderGameTabContent(item) {
    const contentEl = document.getElementById("game-tabs-content");
    contentEl.innerHTML = "";
    if(item.cover.length>0)
        contentEl.style.background = item.cover;

    if (item.type === "menu") {
        // --- 渲染遊戲首頁 ---
        let html = `<div class="game-menu-view"><div>${item.Intro}</div><div class="game-score-list">`;
        
        // 取得所有遊戲最高分
        fetch('./data/Game.json').then(r => r.json()).then(games => {
            games.filter(g => g.type === "game" && g.show !== "0").forEach(g => {
                const gLogo = g.logo ? `<img src="${g.logo}" style="width:16px;height:16px;"> ` : "";
                html += `<div class="game-score-item" style="background:${item.scoreItem_bg} no-repeat center / contain;">${gLogo}<strong>${g.name}</strong></div>`;
                
                g.role.forEach(r => {
                    const localKey = r.LocalStorage;
                    const score = localStorage.getItem(localKey);
                    if (score !== null) {
                        const numScore = Number(score);
                        const passScore = Number(r.Pass);
                        let badge = "";
                        if (r.Pass !== "") {
                            badge = numScore >= passScore ? " 🎖️" : ` / ${r.Pass}`;
                        }
                        const rLogo = r.rolelogo ? `<img src="${r.rolelogo}" style="width:14px;height:14px;"> ` : "";
                        html += `<div class="role-score-item">${rLogo}${r.roleName}: ${numScore}${badge}</div>`;
                    }
                });
            });
            html += `</div></div>`;
            contentEl.innerHTML = html;
        });

    } else if (item.type === "game") {
        // --- 渲染小遊戲準備畫面 ---
        let selectedRoleIndex = 0;

        const renderInitScreen = () => {
            let rolesHtml = item.role.map((r, idx) => `
                <div class="role-card ${idx === selectedRoleIndex ? 'selected' : ''}" data-idx="${idx}">
                    <img src="${r.rolelogo}" title="${r.roleName}">
                    <div>${r.roleName}</div>
                </div>
            `).join('');

            contentEl.innerHTML = `
                <div class="game-init-panel">
                    <div class="game-intro">${item.Intro || ''}</div>
                    <div class="role-select-list">${rolesHtml}</div>
                    <button id="game-start-btn" class="tab-btn" style="background:${item.playBtn} no-repeat center / contain;">${item.playBtnText || '開始遊戲'}</button>
                </div>
            `;

            // 選角綁定
            contentEl.querySelectorAll('.role-card').forEach(card => {
                card.onclick = () => {
                    selectedRoleIndex = Number(card.dataset.idx);
                    renderInitScreen();
                };
            });

            // 開始按鈕點擊
            document.getElementById('game-start-btn').onclick = () => {
                const activeRole = item.role[selectedRoleIndex];
                
                // 套用 CSS 變數
                if (activeRole.css) {
                    for (const [key, value] of Object.entries(activeRole.css)) {
                        document.documentElement.style.setProperty(`--${key}`, value);
                    }
                }

                // 進入遊戲介面
                contentEl.innerHTML = `
                    <div class="game-play-header">
                        <div>歷史最高: <span id="game-high-score">0</span></div>
                        <div>本次分數: <span id="game-current-score">0</span></div>
                    </div>
                    <div id="DinoGame-container">
                        <div id="score-board" style="display:none;">SCORE: 0</div>
                        <div id="dino"></div>
                        <div id="game-over-text">
                            <h2>GAME OVER</h2>
                            <p>按「空白鍵」或「點擊畫面」重新開始</p>
                        </div>
                    </div>
                `;

                // 啟動對應小遊戲 JS (例如 DinoGame)
                if (item.name === "DinoGame" && typeof initDinoGame === "function") {
                    initDinoGame(activeRole);
                }
            };
        };

        renderInitScreen();
    }
}