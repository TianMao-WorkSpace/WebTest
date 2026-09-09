function profile(charL) {
    const menuBar = document.getElementById("char-menu-bar");
    const targetName = document.getElementById("target-name");
    const targetMainImg = document.getElementById("target-main-img");
    const targetThumbs = document.getElementById("target-thumbs");
    const targetTitle = document.getElementById("target-title");
    const targetIntro = document.getElementById("target-intro");
    const charDetailPanel = document.getElementById("char-detail-panel");
    const adultToggleWrapper = document.getElementById("adult-toggle-wrapper");
    const adultToggleInput = document.getElementById("adult-toggle-input");
    const toggleStatusText = document.getElementById("toggle-status-text");

    let currentMode = "normal"; 
    let currentCharIndex = 0;   

    // 綁定 Toggle 切換事件 (加入防呆與邏輯保護)
    adultToggleInput.addEventListener("change", async function() {
        if (this.checked) {
            // 先保持 switch 外觀不變，避免使用者以為已經開啟
            this.checked = false;

            // 觸發密碼驗證彈窗
            const isAdult = await checkAgeVerification();

            if (isAdult) {
                // 驗證成功：正式切換模式並勾選 Switch
                this.checked = true;
                currentMode = "adult";
                toggleStatusText.innerText = "成人向";
                charDetailPanel.classList.add("mode-adult");
                renderDetail(currentCharIndex);
            } else {
                // 驗證失敗或取消：維持一般向
                currentMode = "normal";
                toggleStatusText.innerText = "一般向";
                charDetailPanel.classList.remove("mode-adult");
            }
        } else {
            // 切換回一般向
            currentMode = "normal";
            toggleStatusText.innerText = "一般向";
            charDetailPanel.classList.remove("mode-adult");
            renderDetail(currentCharIndex);
        }
    });

    function isAdultImg(imgObj) {
        return String(imgObj.Adult) === "1";
    }

    function initMenu() {
        if (charL.length <= 1) {
            menuBar.style.display = "none";
        } else {
            charL.forEach((char, index) => {
                const charItem = document.createElement("div");
                charItem.className = "char-menu-item";
                charItem.setAttribute("data-index", index);

                const firstNormalImg = char.img.find(img => !isAdultImg(img)) || char.img[0];
                const firstImgUrl = firstNormalImg ? firstNormalImg.url : "";

                charItem.innerHTML = `
                    <img src="${firstImgUrl}" class="char-menu-img" alt="${char.name}">
                    <div class="char-menu-name">${char.name}</div>
                `;

                charItem.addEventListener("click", () => renderDetail(index));
                charItem.addEventListener("mouseenter", () => renderDetail(index));

                menuBar.appendChild(charItem);
            });
        }
        if (charL.length > 0) renderDetail(0);
    }

    function renderDetail(charIndex) {
        currentCharIndex = charIndex;

        const items = document.querySelectorAll(".char-menu-item");
        items.forEach((item, idx) => {
            if (idx === parseInt(charIndex)) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        const charData = charL[charIndex];
        if (!charData) return;

        targetName.innerText = `${charData.name}`;

        const hasAdultImg = charData.img.some(imgObj => isAdultImg(imgObj));

        if (hasAdultImg) {
            adultToggleWrapper.style.display = "flex";
        } else {
            adultToggleWrapper.style.display = "none";
            currentMode = "normal";
            adultToggleInput.checked = false;
            toggleStatusText.innerText = "一般向";
            charDetailPanel.classList.remove("mode-adult");
        }

        // 依當前模式過濾圖片：一般向只抓 Adult != 1，成人向只抓 Adult == 1
        const availableImgs = charData.img.filter(imgObj => {
            if (currentMode === "adult") {
                return isAdultImg(imgObj);
            } else {
                return !isAdultImg(imgObj);
            }
        });

        targetThumbs.innerHTML = "";

        availableImgs.forEach((imgObj, imgIdx) => {
            const thumb = document.createElement("img");
            thumb.src = imgObj.url;
            thumb.className = "thumb-item";
            if (imgIdx === 0) thumb.classList.add("active");

            thumb.addEventListener("click", function() {
                document.querySelectorAll(".thumb-item").forEach(t => t.classList.remove("active"));
                this.classList.add("active");
                switchImageContent(imgObj);
            });

            targetThumbs.appendChild(thumb);
        });

        if (availableImgs.length > 0) {
            switchImageContent(availableImgs[0]);
        } else {
            targetMainImg.src = "";
            targetTitle.innerText = "尚無資料";
            targetIntro.innerHTML = "";
        }
    }

    function switchImageContent(imgObj) {
        targetMainImg.src = imgObj.url;
        targetTitle.innerText = imgObj.title;

        var IntroContent = "";
        if (imgObj.imgIntro) {
            for (let i = 0; i < imgObj.imgIntro.length; i++) {
                IntroContent += '<div class="data">';
                if (imgObj.imgIntro[i].title.length > 0) {
                    IntroContent += '<div class="data_title">' + imgObj.imgIntro[i].title + '：</div>';
                }
                IntroContent += '<div class="data_article">' + imgObj.imgIntro[i].content + '</div></div>';
            }
        }

        targetIntro.innerHTML = IntroContent;
        document.querySelector(".detail-right-column").scrollTop = 0;
    }

    initMenu();
}