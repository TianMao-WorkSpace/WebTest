//萬用圖片展示初始化函數：傳入【目標容器ID】與【該頁專屬資料清單】
function initGalleryApp(targetContainerId, pictureDataList) {
    const appContainer = document.getElementById(targetContainerId);
    if (!appContainer || !pictureDataList || pictureDataList.length === 0) return;

    // 將區域運行狀態鎖定在此組功能內部，不與全域變數打架
    let selectedExhibitIndex = null; 

    // 1. 建立上方「展示大div」的核心容器 (一開始先不掛載裡面的內容)
    const displayMainBox = document.createElement("div");
    displayMainBox.className = "display-main-box";
    displayMainBox.style.display = "none"; // 預設隱藏
    appContainer.appendChild(displayMainBox);

    // 2. 建立下方「大div1」縮圖排列區
    const thumbsGrid = document.createElement("div");
    thumbsGrid.className = "gallery-thumbs-grid";
    appContainer.appendChild(thumbsGrid);

    // 3. 渲染下方的所有主圖正方形縮圖
    pictureDataList.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "thumb-card-item";

        // 上方是 title
        const titleDiv = document.createElement("div");
        titleDiv.className = "thumb-card-title";
        titleDiv.innerHTML = item.title || "未命名";

        // 下方是 url 縮圖
        const imgObj = document.createElement("img");
        imgObj.className = "thumb-card-img";
        imgObj.src = item.url;
        imgObj.onerror = function() {
            imgObj.style.backgroundColor = "var(--bright-gray1)";
        };

        card.appendChild(titleDiv);
        card.appendChild(imgObj);
        thumbsGrid.appendChild(card);

        // 點擊事件：選中主展位
        card.onclick = function() {
            // 切換被選中狀態的 Class (精準限制在目前這個容器底下的縮圖區)
            thumbsGrid.querySelectorAll(".thumb-card-item").forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");

            selectedExhibitIndex = index;
            displayMainBox.style.display = "flex"; // 顯示大展示區
            
            // 渲染大展示區內部
            renderDisplayBox(item, displayMainBox);
        };
    });

    // 內部封裝：渲染上方展示大 div 的內部結構（左主圖、右側關聯清單）
    function renderDisplayBox(item, container) {
        container.innerHTML = ""; // 清空舊內容

        // 【左側：主圖div】
        const primaryPanel = document.createElement("div");
        primaryPanel.className = "exhibit-primary-panel";

        const exTitle = document.createElement("h3");
        exTitle.className = "exhibit-title";
        
        const exImgWrapper = document.createElement("div");
        exImgWrapper.className = "exhibit-image-wrapper";
        const exImg = document.createElement("img");
        exImg.className = "exhibit-large-img";
        
        const exNotes = document.createElement("p");
        exNotes.className = "exhibit-notes";

        exImgWrapper.appendChild(exImg);
        primaryPanel.appendChild(exTitle);
        primaryPanel.appendChild(exImgWrapper);
        primaryPanel.appendChild(exNotes);

        // 更新主圖面板的共用函數
        function updatePrimaryContent(title, url, notes) {
            exTitle.innerHTML = title || "未命名";
            exImg.src = url;
            exNotes.innerHTML = notes || "暫無說明。";
        }

        // 預設帶入該展位資料
        updatePrimaryContent(item.title, item.url, item.notes);

        // 【右側：其他圖div】
        const sidePanel = document.createElement("div");
        sidePanel.className = "exhibit-side-panel";
        
        const exTitle2 = document.createElement("h3");
        exTitle2.innerHTML = "圖片列表";
        sidePanel.appendChild(exTitle2);

        // 收集所有要放在右側的圖片清單 (包含主圖本身以及所有的子局部圖 view)
        const itemsList = [];
        
        itemsList.push({
            title: item.title,
            url: item.url,
            notes: item.notes,
            isPrimary: true
        });

        if (item.view && item.view.length > 0) {
            item.view.forEach(v => {
                itemsList.push({
                    title: v.title,
                    url: v.url,
                    notes: v.notes,
                    isPrimary: false
                });
            });
        }

        // 依序渲染右側縱向列表
        itemsList.forEach((subItem, subIndex) => {
            const sideCard = document.createElement("div");
            sideCard.className = "thumb-card-item PanelLeft";
            
            if(subIndex === 0) {
                sideCard.classList.add("selected");
            }

            const sTitle = document.createElement("div");
            sTitle.className = "thumb-card-title";
            sTitle.innerHTML = subItem.title;

            const sImg = document.createElement("img");
            sImg.className = "thumb-card-img";
            sImg.src = subItem.url;
            sImg.onerror = function() {
                sImg.style.backgroundColor = "var(--bright-gray1)";
            };
            
            sideCard.appendChild(sTitle);
            sideCard.appendChild(sImg);
            sidePanel.appendChild(sideCard);

            // 右側圖片點擊事件
            sideCard.onclick = function() {
                sidePanel.querySelectorAll(".thumb-card-item").forEach(c => c.classList.remove("selected"));
                sideCard.classList.add("selected");

                // 將該圖片的資訊套用到左側主圖 div
                updatePrimaryContent(subItem.title, subItem.url, subItem.notes);
            };
        });

        container.appendChild(primaryPanel);
        container.appendChild(sidePanel);
    }
}