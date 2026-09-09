/**
 * 全域成人年齡與密碼驗證模組 (支援當日/Session內勾選記住驗證)
 * @returns {Promise<boolean>} 驗證成功返回 true，失敗或取消返回 false
 */
async function checkAgeVerification() {
    // 0. 檢查 SessionStorage 是否已有當日驗證紀錄
    const todayStr = new Date().toISOString().split('T')[0]; // 取得格式如 "2026-03-31"
    const isVerifiedToday = sessionStorage.getItem("adult_verified_date") === todayStr;

    if (isVerifiedToday) {
        return true; // 已經驗證過且尚未換日，直接通過
    }

    // 1. 確保全域 Modal 元素存在 (不存在則動態注入 body)
    let ageModal = document.getElementById("global-age-modal");
    if (!ageModal) {
        ageModal = document.createElement("div");
        ageModal.id = "global-age-modal";
        ageModal.className = "global-age-modal-overlay";
        ageModal.innerHTML = `
            <div class="global-age-modal-content">
                <h3>成人向內容驗證</h3>
                <p>本區塊包含成人向內容，請輸入存取密碼：</p>
                <input type="password" id="global-adult-pwd-input" placeholder="請輸入密碼" autocomplete="off">
                
                <div class="remember-option" style="margin: 10px 0; font-size: 14px; text-align: left;">
                    <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <input type="checkbox" id="global-remember-today-input">
                        今日不再顯示此驗證
                    </label>
                </div>

                <div class="error-msg" id="global-pwd-error-msg" style="display: none;">密碼輸入錯誤</div>
                
                <div class="modal-btn-group">
                    <button type="button" class="btn-cancel" id="global-btn-pwd-cancel">取消</button>
                    <button type="button" class="btn-confirm" id="global-btn-pwd-submit">我已成年</button>
                </div>
            </div>
        `;
        document.body.appendChild(ageModal);
    }

    const adultPwdInput = document.getElementById("global-adult-pwd-input");
    const rememberInput = document.getElementById("global-remember-today-input");
    const pwdErrorMsg = document.getElementById("global-pwd-error-msg");
    const btnPwdSubmit = document.getElementById("global-btn-pwd-submit");
    const btnPwdCancel = document.getElementById("global-btn-pwd-cancel");

    // 2. 抓取 config.json 密碼進行比對
    try {
        const response = await fetch('./data/config.json');
        if (!response.ok) {
            throw new Error("無法讀取 config.json");
        }
        const config = await response.json();
        const correctPwd = String(config.password_adult || "");

        return new Promise((resolve) => {
            // 重置彈窗狀態
            adultPwdInput.value = "";
            if (rememberInput) rememberInput.checked = false;
            pwdErrorMsg.style.display = "none";
            ageModal.style.display = "flex";
            
            // 延遲聚焦以確保 Modal 已渲染
            setTimeout(() => adultPwdInput.focus(), 50);

            // 確認按鈕處理
            function handleSubmit() {
                if (adultPwdInput.value.trim() === correctPwd && correctPwd !== "") {
                    // 若勾選「今日不再顯示」，將當前日期存入 sessionStorage
                    if (rememberInput && rememberInput.checked) {
                        sessionStorage.setItem("adult_verified_date", todayStr);
                    }

                    cleanup();
                    resolve(true);
                } else {
                    pwdErrorMsg.style.display = "block";
                    adultPwdInput.value = "";
                    adultPwdInput.focus();
                }
            }

            // 取消按鈕處理
            function handleCancel() {
                cleanup();
                resolve(false);
            }

            // Enter 鍵送出
            function handleKeyDown(e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                }
            }

            function cleanup() {
                btnPwdSubmit.removeEventListener("click", handleSubmit);
                btnPwdCancel.removeEventListener("click", handleCancel);
                adultPwdInput.removeEventListener("keydown", handleKeyDown);
                ageModal.style.display = "none";
            }

            btnPwdSubmit.addEventListener("click", handleSubmit);
            btnPwdCancel.addEventListener("click", handleCancel);
            adultPwdInput.addEventListener("keydown", handleKeyDown);
        });
    } catch (err) {
        console.error("驗證失敗:", err);
        alert("無法讀取密碼設定檔案 (./data/config.json)，請檢查路徑或檔案內容。");
        return false;
    }
}