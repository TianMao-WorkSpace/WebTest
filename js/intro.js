function initintros(containerId, introData) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`找不到 ID 為 "${containerId}" 的容器`);
      return;
    }
  
    // 清空既有內容
    container.innerHTML = "";
  
    introData.forEach((intro) => {
      // 建立作者卡片根節點
      const card = document.createElement("div");
      card.className = "intro-card";
  
      // 1. 若有指定字體顏色，設定為 CSS 變數 --intro-color
      if (intro.font_color && intro.font_color.trim() !== "") {
        card.style.setProperty("--intro-color", intro.font_color);
      }
  
      const iconStr = intro.icon || "❖";
  
      // 2. 組合「簡介」清單 HTML
      const introItemsHtml = (intro.intro || []).map((item) => `
        <div class="intro-intro-item">
          <div class="intro-intro-title"> ${iconStr} ${item.title || ""} </div>
          <div class="intro-intro-text">${item.text || ""}</div>
        </div>
      `).join("");
  
      // 3. 組合「外站連結與子連結」清單 HTML
      const webItemsHtml = (intro.web || []).map((webItem) => {
        let subpagesHtml = "";
  
        // 判斷是否存在子連結並渲染
        if (webItem.Subpage && Array.isArray(webItem.Subpage) && webItem.Subpage.length > 0) {
          subpagesHtml = `
            <div class="intro-subpage-list">
              ${webItem.Subpage.map((sub) => `
                <div class="intro-subpage-item">
                  <a href="${sub.url}" target="_blank" rel="noopener noreferrer">${iconStr} ${sub.title}</a>
                </div>
              `).join("")}
            </div>
          `;
        }
  
        return `
          <div class="intro-web-item">
            <div class="intro-web-main">
              <a href="${webItem.url}" target="_blank" rel="noopener noreferrer" class="intro-web-title">🔗 ${webItem.title}</a>
            </div>
            ${subpagesHtml}
          </div>
        `;
      }).join("");
  
      // 4. 填充整張卡片的 HTML 結構
      card.innerHTML = `
        <!-- 第一列:頭像+外站 -->
        <div class="intro-row1">
          <!-- 左邊區塊：頭像 -->
          <div class="intro-block intro-block-left">
            <img class="intro-avatar" src="${intro.url}" alt="${intro.name || '作者頭像'}">
            <div class="intro-name">${intro.name || ""}</div>
            </div>
          <!-- 中間區塊：外站連結 -->
          <div class="intro-block intro-block-middle">
            <div class="intro-section-title">外站連結</div>
            <div class="intro-web-item">
              ${webItemsHtml}
              </div>
            </div>
          </div>
        <!-- 第二列:簡介 -->
        <div class="intro-row2">
            <div class="intro-section-title">簡介</div>
            <div class="intro-intro-list">
              ${introItemsHtml}
              </div>
            </div>
        </div>
      `;
  
      // 5. 掛載至頁面容器中
      container.appendChild(card);
    });
  }