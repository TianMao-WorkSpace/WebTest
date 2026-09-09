/* [修改開頭] login.js 修改：支援 URL page 參數解析與權限過濾改用 page 比對 */

// 1. 解析網址帶入的 ?id=帳號&pwd=密碼 參數並嘗試自動登入
function checkUrlAutoLogin() {
    if (!window.appConfig || !window.appConfig.account) return false;

    const urlParams = new URLSearchParams(window.location.search);
    const urlId = urlParams.get('id');
    const urlPwd = urlParams.get('pwd');

    if (urlId && urlPwd) {
        const targetAcc = window.appConfig.account.find(a => a.id === urlId && a.pwd === urlPwd);
        if (targetAcc) {
            saveLoginState(targetAcc);
            return true;
        }
    }
    return false;
}

// 2. 儲存登入狀態與處理 adult 權限
function saveLoginState(acc) {
    sessionStorage.setItem('wctotg_USER_ID', acc.id);
    
    // 若 account.adult 為 true，直接存入 sessionStorage 比照 checkAge.js 驗證成功
    if (acc.adult === true) {
        const todayStr = new Date().toISOString().split('T')[0];
        sessionStorage.setItem("adult_verified_date", todayStr);
    }

    showToast(`${acc.name}，${acc.Welcome}`);
    document.getElementById("login-name").textContent=acc.name+" 已登入";
}

// 3. 顯示 Toast 訊息提示
function showToast(msg) {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// 4. 手動按鈕/Enter鍵觸發登入驗證
function setpwd() {
    if (!window.appConfig || !window.appConfig.account) return;

    const selectEl = document.getElementById("account-select");
    const pwdInput = document.getElementById("pwd");
    
    if (!selectEl || !pwdInput) return;

    const selectedId = selectEl.value;
    const inputPwd = pwdInput.value;

    const targetAcc = window.appConfig.account.find(a => a.id === selectedId);

    if (targetAcc && targetAcc.pwd === inputPwd) {
        saveLoginState(targetAcc);
        login();
    } else {
        window.alert("密碼不正確");
        const sidebar = document.getElementById("side-bar");
        if (sidebar && !sidebar.querySelector('.nav_btn')) {
            sidebar.innerHTML = "請登入";
        }
    }
}

// 5. 根據當前登入帳號的權限 (page) 繪製側邊欄並處理指定頁面跳轉
async function login() {
    
    const mimaEl = document.getElementById("mima");
    if (mimaEl) mimaEl.style.display = "none";
    
    const articles = document.getElementsByClassName("page_article");
    if (articles.length > 0) articles[0].style.display = "";

    const sidebar = document.getElementById("side-bar");
    if (sidebar && sidebar.querySelector('.nav_btn')) {
        return; 
    }

    const currentUserId = sessionStorage.getItem('wctotg_USER_ID');
    const currentAcc = window.appConfig.account.find(a => a.id === currentUserId);
    if (!currentAcc) return;

    try {
        const response = await fetch('./data/pageData.json');
        if (!response.ok) throw new Error(`HTTP 錯誤！狀態碼：${response.status}`);
        
        const pageData = await response.json();
        
        // 解析權限：如果為 "All"，代表無限制；否則轉為陣列比對 page
        const allowPages = currentAcc.page === "All" 
            ? "All" 
            : currentAcc.page.split(',').map(p => p.trim());

        // 輔助函式：檢查項目是否被允許顯示 (改為比對 page 變數)
        const isAllowed = (pageKey) => {
            if (allowPages === "All") return true;
            return allowPages.includes(pageKey);
        };

        var allPage = '<div class="menu-btn" style="width:220px;height:30px;padding:5px;padding-right:10px;text-align: right;color:var(--sideBar-font);font-size:14px">收合</div>';
        
        for (let i = 0; i < pageData.length; i++) {
            let item = pageData[i];
            
            if (item.func !== "menu") {
                if (isAllowed(item.page)) {
                    // 🌟 關鍵修改：將 switchPage 的第一個參數從 item.title 改為 item.page
                    allPage += `<button class="nav_btn" onclick="switchPage('${item.page}', '${item.func}', '${item.path}')">${window.appConfig.sidebarFuncBullet}${item.title}</button>`;
                }
            } else if (item.func === "menu" && item.children) {
                let subButtons = "";
                for (let j = 0; j < item.children.length; j++) {
                    let subItem = item.children[j];
                    if (isAllowed(subItem.page)) {
                        // 🌟 關鍵修改：將 switchPage 的第一個參數從 subItem.title 改為 subItem.page
                        subButtons += `<button class="nav_btn2" onclick="switchPage('${subItem.page}', '${subItem.func}', '${subItem.path}')">${window.appConfig.sidebarChildBullet}${subItem.title}</button>`;
                    }
                }
                if (subButtons !== "") {
                    allPage += `<div class="nav_mnu">${window.appConfig.sidebarMenuBullet}${item.title}${subButtons}</div>`;
                }
            }
        }

        if (sidebar) {
            const mediaControls = sidebar.querySelector('.media-controls');
            const mediaControlsHtml = mediaControls ? mediaControls.outerHTML : '';
            sidebar.innerHTML = allPage + mediaControlsHtml;
        }

        // 🌟 檢查網址是否有 &page=xxxx，若有且權限允許則進行跳轉
        const urlParams = new URLSearchParams(window.location.search);
        const targetPage = urlParams.get('page');
        if (targetPage && isAllowed(targetPage)) {
            navigateToTargetPage(pageData, targetPage);
        }

    } catch (error) {
        console.error("載入選單資料失敗：", error);
    }
}

// 輔助函式：搜尋 pageData 找到對應的 page 並跳轉
function navigateToTargetPage(pageData, targetPageKey) {
    let targetItem = null;

    for (const item of pageData) {
        if (item.func !== "menu" && item.page === targetPageKey) {
            targetItem = item;
            break;
        } else if (item.func === "menu" && item.children) {
            const subMatch = item.children.find(child => child.page === targetPageKey);
            if (subMatch) {
                targetItem = subMatch;
                break;
            }
        }
    }

    if (targetItem) {
        switchPage(targetItem.page, targetItem.func, targetItem.path);
    }
}

// 6. 檢查登入狀態並初始化首頁帳號下拉選單
function checkHomeLoginState() {
    const pageArticle = document.getElementsByClassName("page_article")[0];
    if (pageArticle) pageArticle.style.display = "none";

    // 動態填入下拉選單選項
    const selectEl = document.getElementById("account-select");
    if (selectEl && window.appConfig && window.appConfig.account) {
        selectEl.innerHTML = "";
        window.appConfig.account.forEach(acc => {
            const opt = document.createElement("option");
            opt.value = acc.id;
            opt.textContent = acc.name;
            selectEl.appendChild(opt);
        });
        
        // 若已有自動登入/已記錄的帳號，預設選取該帳號
        const savedId = sessionStorage.getItem('wctotg_USER_ID');
        if (savedId) selectEl.value = savedId;
    }

    // 判斷是否已經處於有效登入狀態
    const currentUserId = sessionStorage.getItem('wctotg_USER_ID');
    if (currentUserId && window.appConfig && window.appConfig.account) {
        const loggedAcc = window.appConfig.account.find(a => a.id === currentUserId);
        if (loggedAcc) {
            login();
            return;
        }
    }

    // 未登入則顯示登入表單
    const mimaEl = document.getElementById("mima");
    if (mimaEl) mimaEl.style.display = "";

    const input = document.querySelector('#pwd');
    if (input) {
        input.replaceWith(input.cloneNode(true)); // 清除重複綁定的監聽器
        const newInput = document.querySelector('#pwd');
        newInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                setpwd();
            }
        });
    }
}
/* [修改結尾] */