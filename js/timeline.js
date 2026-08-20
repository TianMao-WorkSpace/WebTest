function timeline(timelineMilestones,timelineData){
    // 依據 sortOrder 排序
    timelineMilestones.sort((a, b) => a.sortOrder - b.sortOrder);

    // ==========================================
    // 3. 全新演算法：防重疊 Grid 生成
    // ==========================================
    let gridHTML = `<div class="timeline-grid-container" id="dynamic-grid">`;

    // 【步驟 A】先畫出左側的時間軸刻度（固定在第 1 欄）
    for (let i = 0; i < timelineMilestones.length; i++) {
        gridHTML += `<div class="grid-time-cell" style="grid-row: ${i + 1}; grid-column: 1;">●${timelineMilestones[i].name}</div>`;
    }
    // 輔助函式：用來產生帶有資料索引(data-index)的卡片 HTML
    function createCardHTML(ev) {
        // 找出這個事件在原 timelineData 陣列中的真實 index 位置
        let globalIndex = timelineData.indexOf(ev);
        let isLongTerm = ev.endId ? "long-term-event" : "";
        
        //關鍵點：加上 data-index="${globalIndex}"，讓 JS 知道滑鼠摸到的是哪一個事件
        if(ev.type=="other"){
            if(isLongTerm=="long-term-event"){
                return `
                <div class="event-card ${isLongTerm} long-term-event-other" data-index="${globalIndex}">
                    <div class="event-title">${ev.title}</div>
                </div>`;
                }
            return `
            <div class="event-card ${isLongTerm} event-card-other" data-index="${globalIndex}">
                <div class="event-title">${ev.title}</div>
            </div>`;
            }
        else{
            return `
            <div class="event-card ${isLongTerm}" data-index="${globalIndex}">
                <div class="event-title">${ev.title}</div>
            </div>`;
        }
        
    }

    // 【步驟 B】畫一般事件（固定在第 2 欄）
    for (let i = 0; i < timelineMilestones.length; i++) {
        let m = timelineMilestones[i];
        let normals = timelineData.filter(ev => ev.startId === m.id && !ev.endId);
        let normalCards = normals.map(ev => createCardHTML(ev)).join('');
        gridHTML += `
            <div class="grid-events-wrapper" style="grid-row: ${i + 1}; grid-column: 2;">
                ${normalCards}
            </div>`;
        // let normalCards = normals.map(ev => `<div class="event-card"><div class="event-title">${ev.title}</div></div>`).join('');
        // gridHTML += `<div class="grid-events-wrapper" style="grid-row: ${i + 1}; grid-column: 2;">${normalCards}</div>`;
    }

    // 【步驟 C】🔥 核心演算法：動態計算跨度事件的「欄位（Column）」
    let longTermEvents = timelineData.filter(ev => ev.endId);
    
    // 紀錄每一欄目前被佔據到的最新行號（Key 是欄位 index，Value 是該欄最後一行的 row 號碼）
    // 預設從第 3 欄開始放跨度事件
    let columnTrackers = { 3: 0 }; 

    longTermEvents.forEach(ev => {
        let startIndex = timelineMilestones.findIndex(m => m.id === ev.startId);
        let endIndex = timelineMilestones.findIndex(m => m.id === ev.endId);

        let gridStartLine = startIndex + 1;
        let gridEndLine = endIndex + 2; 

        // 幫這個事件找一個「目前有空」的欄位
        let assignedColumn = 3; // 預設從第 3 欄開始找
        
        while (true) {
            // 如果這一欄目前記錄的最後行號，比我這個事件的「開始行號」還要小，代表這一欄現在是空的！
            if (!columnTrackers[assignedColumn] || columnTrackers[assignedColumn] < gridStartLine) {
                // 找到了！把這一欄佔為己有，並更新這一欄的最新佔用結束行號
                columnTrackers[assignedColumn] = gridEndLine - 1;
                break;
            } else {
                // 如果這一欄還被別的事件佔著，就往右邊下一欄（4欄、5欄...）繼續找空位
                assignedColumn++;
                if (!columnTrackers[assignedColumn]) {
                    columnTrackers[assignedColumn] = 0; // 初始化新欄位
                }
            }
        }
        
        // 動態將跨度事件指派到它專屬的「不塞車欄位（assignedColumn）」
        let cardHTML = createCardHTML(ev);
        // 修改生成的 HTML，注入網格位置

        let positionedCard = cardHTML.replace('class="event-card', `style="grid-row: ${gridStartLine} / ${gridEndLine}; grid-column: ${assignedColumn};" class="event-card`);
        gridHTML += positionedCard;

        
        
    });

    gridHTML += `</div>`;

    // 4. 渲染到畫面上
    const timelineContainer = document.getElementById("world_timeline");
    if(timelineContainer) {
        timelineContainer.innerHTML = gridHTML;
        
        // 💡 根據最後算出來總共用了幾欄，動態調整 CSS Grid 的欄數
        let totalColumns = Object.keys(columnTrackers).length + 2; // 加上時間與一般事件2欄
        let gridContainer = document.getElementById("dynamic-grid");
        
        // 動態生成 CSS：例如 "20% 30% 25% 25%" 讓所有跨度欄位均分剩餘空間
        let columnStyle = "150px 150px"; 
        for(let k = 3; k <= totalColumns; k++) {
            columnStyle += " 150px"; // 每多一欄重疊，就自動擴充一欄，且寬度至少150px
        }
        gridContainer.style.gridTemplateColumns = columnStyle;
    }
    // ==========================================
    // 4. 🔥 全新互動演算法：固定右側、延遲防熄滅
    // ==========================================
    const tooltip = document.getElementById("timeline-tooltip");
    const cards = document.querySelectorAll(".event-card");
    let hideTimeout; // 用來紀錄延遲隱藏的定時器

    cards.forEach(card => {
        // A. 當滑鼠「移入」事件卡片時
        card.addEventListener("mouseenter", function(e) {
            clearTimeout(hideTimeout); //立刻中斷任何準備隱藏的指令

            // 1. 抓出卡片資料並塞入懸浮框 (這部分跟之前一樣)
            let idx = this.getAttribute("data-index");
            let data = timelineData[idx];
            let startName = timelineMilestones.find(m => m.id === data.startId).name;
            let endName = data.endId ? " ~ " + timelineMilestones.find(m => m.id === data.endId).name : "";

            document.getElementById("tt-title").innerText = data.title;
            document.getElementById("tt-time").innerText = `時間：${startName}${endName}`;
            document.getElementById("tt-desc").innerText = data.desc;

            // 4. 顯示懸浮框，並重置懸浮框內部的捲軸到最頂端
            tooltip.style.display = "block";
            tooltip.scrollTop = 0; 
        });

        // B. 當滑鼠「移出」事件卡片時
        card.addEventListener("mouseleave", function() {
            //不要立刻隱藏！留 200 毫秒的時間讓使用者的滑鼠可以「走過去」懸浮框
            hideTimeout = setTimeout(function() {
                tooltip.style.display = "none";
            }, 200);
        });
    });

    // C.新增：當滑鼠「移入」懸浮框本身時
    tooltip.addEventListener("mouseenter", function() {
        clearTimeout(hideTimeout); //使用者滑鼠進來了！取消隱藏，讓使用者安心看字、拉捲軸
    });

    // D.新增：當滑鼠「移出」懸浮框本身時
    tooltip.addEventListener("mouseleave", function() {
        // 滑鼠真的離開說明框了，直接隱藏
        tooltip.style.display = "none";
    });
}