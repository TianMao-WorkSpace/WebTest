// 全域變數以供存取設定檔
window.appConfig = null;

// 1. 初始化與應用設定檔
/* [修改開頭] web.js 修改：簡化 initAppConfig 的自動登入呼叫流程 */
// 1. 初始化與應用設定檔
async function initAppConfig() {
    try {
        const res = await fetch('./data/config.json');
        if (!res.ok) throw new Error(`讀取 config.json 失敗 (HTTP ${res.status})`);        
        const config = await res.json();
        window.appConfig = config;

        // 動態設定 CSS 變數
        if (config.color) {
            console.log("設定css");
            let rootStyle = "";
            for (const [key, value] of Object.entries(config.color)) {
                rootStyle += `--${key}: ${value};\n`;
            }
            const styleElement = document.createElement('style');
            styleElement.innerHTML = `:root {\n${rootStyle}}`;
            document.head.appendChild(styleElement);
        }

        // 設定 Title & Icon
        document.title = config.title || "網站";
        const favicon = document.getElementById('site-favicon');
        if (favicon && config.icon) favicon.href = config.icon;
        // 設定 Header 品牌
        const siteNameEl = document.getElementById('site-name');
        if (siteNameEl) siteNameEl.textContent = config.title || "";
        const siteLogoEl = document.getElementById('site-logo');
        if (siteLogoEl && config.icon) {
            siteLogoEl.style.backgroundImage = `url('${config.icon}')`;
        }

        // 動態插入OGP Meta標籤
        if (config.OGP) {
            const ogpMap = {
                "og:title": config.OGP.title,
                "og:description": config.OGP.description,
                "og:url": config.OGP.url,
                "og:type": config.OGP.type,
                "og:image": config.OGP.image
            };
            for (const [prop, val] of Object.entries(ogpMap)) {
                if (val) {
                    const meta = document.createElement('meta');
                    meta.setAttribute('property', prop);
                    meta.setAttribute('content', val);
                    document.head.appendChild(meta);
                }
            }
        }
    } catch (err) {
        console.error("載入全域設定檔發生錯誤：", err);
    }
}
/* [修改結尾] */

// 各頁面功能對應的處理函式(各功能原script)
const renderHandlers = {
    "Home": async function() {
        // 1. 抓取 txt 檔案路徑並載入內容
        const txtPath = window.appConfig ? window.appConfig.home : "";
        const artEl = document.querySelector("#content-box .page_article");

        if (artEl && txtPath) {
            try {
                const response = await fetch(txtPath);
                if (!response.ok) throw new Error(`無法載入 txt 檔案: ${response.status}`);
                
                const txtContent = await response.text();
                
                // 使用 textContent 確保文字原樣呈現（包含空格、換行），同時防止 HTML 標籤渲染與 XSS
                artEl.textContent = txtContent;
                
                // 透過 CSS 樣式確保 DOM 會渲染空格與換行
                artEl.style.whiteSpace = "pre-wrap";
            } catch (error) {
                console.error("載入 Home txt 內容失敗：", error);
                artEl.textContent = "內容載入失敗。";
            }
        }

        // 2. 驗證登入
        if (typeof checkHomeLoginState === "function") {
            checkHomeLoginState();
        }

        // 🌟 3. 載入遊戲專區 JSON 設定檔並初始化
        try {
            const res = await fetch('./data/Game.json');
            if (!res.ok) throw new Error("無 Game.json 檔案");
            const gamesData = await res.json();
            initGameZone(gamesData);
        } catch (e) {
            console.warn("未發現遊戲資料檔或載入失敗：", e);
        }
    },
    "Intro": function(data) {
        if (typeof initintros === "function") {
            initintros("intro-container", data);
        }
    },
    "Story": function(data) {
        if (!window.isStoryMetaInitialized) {
            window.rating = [
                {title:"保護級 (P)",logo:"6+",color:"var(--rating01-bg)",content:"未滿6歲不宜，6-12歲需成人陪同。",alarm:false},
                {title:"輔導級 (PG-13)",logo:"12+",color:"var(--rating02-bg)",content:"未滿12歲不得觀看。",alarm:true,alarmcontent:"內容含可能引起不安之畫面，請斟酌觀看"},
                {title:"輔導級 (PG-15)",logo:"15+",color:"var(--rating03-bg)",content:"未滿15歲不得觀看。",alarm:true,alarmcontent:"內容含可能引起不安之畫面，請斟酌觀看"},
                {title:"限制級 (R-18)",logo:"18+",color:"var(--rating04-bg)",content:"未滿18歲不得觀看。",alarm:true,alarmcontent:"含限制級內容，未滿18歲者請立刻離開"}
            ];
            window.Categories = [
                {title:"F/F",logo:"♀",color:"var(--CategoriesFF-bg)",content:"百合、女同性戀情節。故事的核心情感或肉體關係發生在女性角色之間。"},
                {title:"F/M",logo:"⚥",color:"var(--CategoriesFM-bg)",content:"傳統異性戀情節（言情、BG）。故事核心關係為一男一女。"},
                {title:"M/M",logo:"♂",color:"var(--CategoriesMM-bg)",content:"耽美、BL、男同性戀情節。故事核心關係為男性角色之間。"},
                {title:"Gen",logo:"☉",color:"var(--CategoriesGen-bg)",content:"一般向、無CP。故事不以戀愛、性關係為核心，主要聚焦於友情、親情、組隊冒險、陰謀解謎或世界觀展現。"},
                {title:"Multi",logo:"▞",color:"var(--CategoriesMulti-bg)",content:"多角關係、後宮、NP、或是故事中同時包含多對不同性別組合的感情線（例如同時有 M/M 也有 F/M）。"},
                {title:"Other",logo:"♅",color:"var(--CategoriesOther-bg)",content:"超越傳統人類性別認同的關係。例如無性戀、非二元性別、或是跨越物種（人與怪物、人與不可名狀之物、AI與機械）的特殊情感連結。"}
            ];
            // 初始化完成後設置標記
            window.isStoryMetaInitialized = true;
        }
        window.Story = data;
        window.activeStoryId = window.Story[0] ? window.Story[0].id : 0;
        window.storyStates = {};

        window.Story.forEach(s => {
            window.storyStates[s.id] = {
                mode: 'home',
                chapterNum: s.Chapter[0] ? s.Chapter[0].num : 0,
                pageNum: 0,
                unlocked: false
            };
        });

        if (typeof renderTabs === "function") renderTabs();
        if (typeof renderActiveContent === "function") renderActiveContent();
    },
    "charRels": function(data) {
        // data[0] 是 charRels.json，data[1] 是 orgColor.json
        const charRelL = data[0];
        const orgColor = data[1];

        window.charRelL = charRelL;
        window.orgColor = orgColor;

        if (typeof initGlobalTabs === "function") {
            initGlobalTabs(orgColor, charRelL);
        }
    },
    "charProfiles": function(data) {
        if (typeof profile === "function") {
            profile(data);
        }
    },
    "Timeline": function(data) {
        // data[0] 會得到 timelineMilestones.json
        // data[1] 會得到 timelineData.json
        const [timelineMilestones, timelineData] = data;

        // 全域賦值，方便後續圖表元件存取
        window.timelineMilestones = timelineMilestones;
        window.timelineData = timelineData;

        // 執行你的時間軸初始化/渲染函式
        if (typeof initTimeline === "function") {
            initTimeline(timelineMilestones, timelineData);
        }
    },
    "Doc": function(data) {
        if (typeof initTabApp === "function") {
            initTabApp("tabs-menu", "tabs-view", data);
        }
    },
    "Gallery": function(data) {
        if (typeof initGalleryAppModule === "function") {
            initGalleryAppModule("tabs-menu", "tabs-view", data);
        }
    }
};

// 4. 切換頁面主函式
/* [修改] web.js：修正 switchPage 參數與標題顯示邏輯 */
// 全域暫存 pageData 避免重複 fetch
window.cachedPageData = null;

async function switchPage(pageKey, func, dataPath) {
    const vw = window.innerWidth;
    if (vw < 1000) {
        const sidebar = document.getElementById("side-bar");
        if (sidebar) sidebar.classList.add("hide");
    }

    const contentBox = document.getElementById("content-box");
    const tpl = document.getElementById(`tpl-${func}`);

    if (!tpl) {
        console.error(`找不到對應的 Template: tpl-${func}`);
        return;
    }

    // 🌟 根據 pageKey 找尋 pageData 中的 title (用於頂部標題顯示)
    let displayTitle = pageKey;
    let matchedPageConfig = null; // 🌟 新增：紀錄當前頁面對應的 json 設定物件

    try {
        if (!window.cachedPageData) {
            const res = await fetch('./data/pageData.json');
            if (res.ok) window.cachedPageData = await res.json();
        }

        if (window.cachedPageData) {
            for (const item of window.cachedPageData) {
                if (item.func !== "menu" && item.page === pageKey) {
                    displayTitle = item.title;
                    matchedPageConfig = item; // 🌟 取得設定
                    break;
                } else if (item.func === "menu" && item.children) {
                    const matchedChild = item.children.find(child => child.page === pageKey);
                    if (matchedChild) {
                        displayTitle = matchedChild.title;
                        matchedPageConfig = matchedChild; // 🌟 取得設定
                        break;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("讀取頁面標題名稱失敗，將使用 pageKey 代替：", e);
    }

    // 🌟 更新 Tooltip 狀態
    updatePageTooltip(matchedPageConfig);

    
    // 渲染頁面標題與 Template 內容
    const pageTitleHtml = `<div class="page_title">${displayTitle}</div>`;
    contentBox.innerHTML = pageTitleHtml + tpl.innerHTML;

    // 若未提供資料路徑，直接執行 Handler
    if (!dataPath || (Array.isArray(dataPath) && dataPath.length === 0)) {
        if (renderHandlers[func]) renderHandlers[func](null);
        return;
    }

    // 將單一字串統一轉為陣列處理
    let paths = [];
    if (Array.isArray(dataPath)) {
        paths = dataPath;
    } else if (typeof dataPath === 'string') {
        paths = dataPath.includes(',') ? dataPath.split(',').map(p => p.trim()) : [dataPath];
    }

    // 同時發送多個 Ajax 請求
    Promise.all(paths.map(path => {
        return fetch(path).then(res => {
            if (!res.ok) throw new Error(`載入失敗: ${path}`);
            return path.endsWith('.json') ? res.json() : res.text();
        });
    }))
    .then(results => {
        if (renderHandlers[func]) {
            const dataToPass = paths.length === 1 ? results[0] : results;
            renderHandlers[func](dataToPass);
        }
    })
    .catch(err => {
        console.error(`載入資料檔時發生錯誤:`, err);
    });
}
function adjustColorBrightness(hexColor, percent) {
    if (!hexColor || !hexColor.startsWith('#')) return hexColor;
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    let num = parseInt(hex, 16);
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 處理並更新頁面 Tooltip 顯示邏輯
function updatePageTooltip(pageConfig) {
    const wrapper = document.getElementById("page-tooltip-wrapper");
    const triggerBtn = document.getElementById("tooltip-trigger-btn");
    const panel = document.getElementById("tooltip-panel");
    const content = document.getElementById("tooltip-content");
    const inner = document.getElementById("tooltip-inner");
    const guide = document.getElementById("tooltip-guide");
    const textBody = document.getElementById("tooltip-text-body");
    const closeBtn = document.getElementById("tooltip-close-btn");

    if (!wrapper) return;

    // 檢查是否有 Tooltip 資料
    if (!pageConfig || !pageConfig.Tooltip || pageConfig.Tooltip.trim() === "") {
        wrapper.style.display = "none";
        return;
    }

    // 1. 初始化顯示狀態 (回到右下角懸浮圓鈕)
    wrapper.style.display = "flex";
    triggerBtn.style.display = "block";
    panel.style.display = "none";
    panel.classList.remove("is-active");

    // 2. 設定 Trigger 按鈕背景 (Tooltip_icon 或備用變數)
    if (pageConfig["Tooltip_icon"] && pageConfig["Tooltip_icon"].trim() !== "") {
        triggerBtn.style.background = pageConfig["Tooltip_icon"];
    } else {
        triggerBtn.style.background = "var(--pageTooltipIcon-bg)";
    }

    // 3. 設定內文與顏色 (若為空則讀取 CSS 變數)
    textBody.innerHTML = pageConfig["Tooltip"];
    const bgColor = pageConfig["Tooltip-bg"] || getComputedStyle(document.documentElement).getPropertyValue('--pageTooltip-bg').trim() || "#ffffff";
    const fontColor = pageConfig["Tooltip-font"] || getComputedStyle(document.documentElement).getPropertyValue('--pageTooltip-font').trim() || "#333333";

    inner.style.backgroundColor = bgColor;
    inner.style.color = fontColor;
    inner.style.borderColor = bgColor; // 🌟 補上這行，讓尾巴吃相同的背景色

    // 4. 計算按鈕顏色 (背景加深 -25%, 文字調淺 +40%)
    const btnBg = adjustColorBrightness(bgColor, -25);
    const btnFont = adjustColorBrightness(bgColor, 40);
    closeBtn.style.backgroundColor = btnBg;
    closeBtn.style.color = btnFont;
    // ----------------------------------------------------
    // 🌟 功能 A：微動效隨機讓按鈕輕微晃動 (Wiggle)
    // ----------------------------------------------------
    function triggerRandomWiggle() {
        // 只有在按鈕顯示且面板沒展開時才搖晃
        if (triggerBtn.style.display !== "none" && !panel.classList.contains("is-active")) {
            triggerBtn.classList.add("is-wiggling");

            // 動畫結束後移除 class（0.8s）
            setTimeout(() => {
                triggerBtn.classList.remove("is-wiggling");
            }, 800);
        }

        // 隨機產生下一次搖晃的時間間隔 (例如 5 ~ 9 秒內隨機)
        const randomDelay = Math.floor(Math.random() * 4000) + 5000;
        tooltipWiggleTimer = setTimeout(triggerRandomWiggle, randomDelay);
    }
    // 啟動第一次隨機搖晃
    tooltipWiggleTimer = setTimeout(triggerRandomWiggle, 3000);

    // ----------------------------------------------------
    // 🌟 功能 B：智慧隱現（滾動淡化 / 停頓清晰）
    // ----------------------------------------------------
    // window.onscroll = function() {
    //     // 只有在面板沒展開時，按鈕才需要做滾動智慧隱現
    //     if (panel.classList.contains("is-active") || triggerBtn.style.display === "none") {
    //         return;
    //     }
    //     // 1. 滾動時立即加上淡化 Class
    //     triggerBtn.classList.add("is-scrolling");
    //     // 2. 清除之前的停頓計時
    //     if (tooltipScrollTimer) {
    //         clearTimeout(tooltipScrollTimer);
    //     }
    //     // 3. 當使用者「停頓」滾動超過 250ms 時，恢復清晰
    //     tooltipScrollTimer = setTimeout(() => {
    //         triggerBtn.classList.remove("is-scrolling");
    //     }, 250);
    // };
    // // 🌟 使用 addEventListener 避免被其他腳本覆蓋 window.onscroll
    // window.addEventListener("scroll", handleScroll, { passive: true });
    // document.addEventListener("scroll", handleScroll, { passive: true }); // 針對 document/body 滾動的補充捕捉
    // 5. 點擊懸浮 ICON 展開面板
    triggerBtn.onclick = function() {
        triggerBtn.style.display = "none";

        // 檢查 Tooltip_icon2
        guide.style.display = "block";
        if (pageConfig["Tooltip_icon2"] && pageConfig["Tooltip_icon2"].trim() !== "") {
            const icon2 = pageConfig["Tooltip_icon2"].trim().replace(/;$/, '');
            guide.style.background = icon2;
        } else {
            const icon1 = pageConfig["Tooltip_icon1"].trim().replace(/;$/, '');
            guide.style.background = icon1 || "var(--pageTooltipIcon-bg)";
        }

        // 顯示面板並觸發彈跳放大動畫
        panel.style.display = "flex";
        setTimeout(() => {
            panel.classList.add("is-active");
        }, 10);
    };

    // 6. 點擊【關閉說明】回到懸浮 ICON
    closeBtn.onclick = function() {
        // 🌟 觸發縮小淡出動畫
        panel.classList.remove("is-active");

        // 🌟 等待 300ms 動畫結束後，才將面板隱藏並顯示圓形 ICON
        setTimeout(() => {
            panel.style.display = "none";
            triggerBtn.style.display = "block";
        }, 300);
    };
}
/* [Tooltip 邏輯 修改結尾] */
// 5. 事件代理綁定
(function() {
    document.addEventListener("click", function(e) {
        if (e.target.closest(".menu-btn")) {
            const sidebar = document.getElementById("side-bar");
            if (sidebar) {
                sidebar.classList.toggle("hide");
                // console.log("側邊欄狀態已切換");
            }
        }
        if (e.target.closest("#site-name")) {
            switchPage('首頁', 'Home');
            // console.log("已回到首頁");
        }
    });
})();