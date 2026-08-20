//萬用頁籤初始化函數：傳入【選單容器ID】、【顯示容器ID】、【該頁專屬資料】
function initTabApp(menuContainerId, viewContainerId, dataList) {
    const menuContainer = document.getElementById(menuContainerId);
    const viewContainer = document.getElementById(viewContainerId);

    if (!menuContainer || !viewContainer || !dataList || dataList.length === 0) return;

    //區域化的切換函數，利用閉包（Closure）鎖定這組頁籤專屬的容器與資料
    function switchTab(index) {
        // 1. 只尋找目前這個選單容器底下的 .tab-btn，不會影響到別組功能
        const allButtons = menuContainer.querySelectorAll(".tab-btn");
        allButtons.forEach(btn => btn.classList.remove("active"));

        // 2. 幫當前被點擊的按鈕加上 active 狀態
        if (allButtons[index]) {
            allButtons[index].classList.add("active");
        }

        // 3. 動態更換下方的 Iframe HTML
        const selectedTab = dataList[index];
        viewContainer.innerHTML = `
            <iframe 
                src="${selectedTab.url}" 
                class="tab-iframe"
                allow="autoplay">
            </iframe>`;
    }

    // 初始化：自動生成上方按鈕
    menuContainer.innerHTML = ""; // 先清空
    dataList.forEach((tab, i) => {
        const btn = document.createElement("button");
        btn.className = "tab-btn";
        btn.innerHTML = tab.title;
        
        //改用純 JS 的 .onclick 綁定，完全不用污染全域 window，再多組也不會打架！
        btn.onclick = function() {
            switchTab(i);
        };
        
        menuContainer.appendChild(btn);
    });

    // 預設載入：自動顯示「第一個（index 0）」頁籤內容
    switchTab(0);
}