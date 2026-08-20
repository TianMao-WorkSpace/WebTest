function profile(charL){
    // 2. 抓取 DOM 控制節點
    const menuBar = document.getElementById("char-menu-bar");
    const targetName = document.getElementById("target-name");
    const targetMainImg = document.getElementById("target-main-img");
    const targetThumbs = document.getElementById("target-thumbs");
    const targetTitle = document.getElementById("target-title");
    const targetIntro = document.getElementById("target-intro");

    // 3. 初始化：動態生成上方選單
    function initMenu() {
        charL.forEach((char, index) => {
            // 建立選單按鈕元素
            const charItem = document.createElement("div");
            charItem.className = "menu-char-item";
            charItem.setAttribute("data-index", index);

            // 抓取每個 name 裡的第一個 img 作為頭像來源
            const firstImgUrl = char.img[0] ? char.img[0].url : "";
            
            charItem.innerHTML = `
                <img src="${firstImgUrl}" class="menu-char-img" alt="${char.name}">
                <div class="menu-char-name">${char.name}</div>
            `;

            //監聽事件：滑鼠懸停 (mouseenter) 或 點擊 (click) 都能切換
            charItem.addEventListener("click", () => renderDetail(index));
            charItem.addEventListener("mouseenter", () => renderDetail(index));

            menuBar.appendChild(charItem);
        });

        // 預設渲染第一個角色的資料
        if (charL.length > 0) renderDetail(0);
    }

    // 4. 核心功能：切換並渲染下方指定的角色詳細資料
    function renderDetail(charIndex) {
        // A. 更新選單上的高亮 active 狀態
        const items = document.querySelectorAll(".menu-char-item");
        items.forEach((item, idx) => {
            if (idx === parseInt(charIndex)) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        const charData = charL[charIndex];
        if (!charData) return;

        // B. 填入基本姓名資料
        targetName.innerText = `${charData.name}`;

        // C. 生成左下角「其他圖片正方形小圖預覽」
        targetThumbs.innerHTML = ""; // 先清空舊小圖
        
        charData.img.forEach((imgObj, imgIdx) => {
            const thumb = document.createElement("img");
            thumb.src = imgObj.url;
            thumb.className = "thumb-item";
            if (imgIdx === 0) thumb.classList.add("active"); // 預設第一張小圖高亮

            // 點擊小圖預覽：切換右欄內文與中央大圖
            thumb.addEventListener("click", function() {
                // 清除其他小圖的高亮
                document.querySelectorAll(".thumb-item").forEach(t => t.classList.remove("active"));
                this.classList.add("active");
                
                // 替換大圖與對應文字
                switchImageContent(imgObj);
            });

            targetThumbs.appendChild(thumb);
        });

        // 預設初次載入該角色的第一張圖文資料
        if (charData.img[0]) {
            switchImageContent(charData.img[0]);
        }
    }

    // 5. 輔助功能：單純切換左欄大圖與右欄文案
    function switchImageContent(imgObj) {
        targetMainImg.src = imgObj.url;
        targetTitle.innerText = imgObj.title;
        var IntroContent = "";//
        for(let i = 0; i < imgObj.imgIntro.length; i++){
            IntroContent = IntroContent + "<div class = \"data\">";
            if(imgObj.imgIntro[i].title.length>0)
                IntroContent = IntroContent + "<div class=\"data_title\">"+imgObj.imgIntro[i].title+"：</div>";
            IntroContent = IntroContent + "<div class=\"data_article\">"+imgObj.imgIntro[i].content + "</div></div>";
        }
        targetIntro.innerHTML = IntroContent;
        //自動重設右側滾動條回到最頂端，防止看新資料時卡在下面
        document.querySelector(".detail-right-column").scrollTop = 0;
    }

    // 啟動網頁
    initMenu();
}