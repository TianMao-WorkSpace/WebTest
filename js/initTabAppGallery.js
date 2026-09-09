// === 1. 批次多頁籤模組初始化函數 (全新改版) ===
function initGalleryAppModule(menuContainerId, viewContainerId, galleryDataSet) {
  const menuNav = document.getElementById(menuContainerId);
  const viewNav = document.getElementById(viewContainerId);
  if (!menuNav || !viewNav || !Array.isArray(galleryDataSet)) return;

  // 清空 container 防止重複初始化
  menuNav.innerHTML = "";
  viewNav.innerHTML = "";

  galleryDataSet.forEach((tabItem, index) => {
    const panelId = `${viewContainerId}-panel-${index}`;

    // 建立頁籤按鈕
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.innerHTML = tabItem.tabLabel || `頁籤 ${index + 1}`;

    // 建立頁籤面板
    const panel = document.createElement("div");
    panel.className = "tab-panel";
    panel.id = panelId;

    // 預設選中第一個頁籤
    if (index === 0) {
      btn.classList.add("active");
      panel.classList.add("active");
    }

    // 點擊切換頁籤邏輯
    btn.onclick = function () {
      menuNav.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      viewNav.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      panel.classList.add("active");
    };

    menuNav.appendChild(btn);
    viewNav.appendChild(panel);

    // 初始化該頁籤內部的 Gallery 展示架構
    initGalleryApp(panelId, tabItem.data || []);
  });
}

// === 2. 主展示邏輯核心函數 ===
function initGalleryApp(targetContainerId, dataList) {
  const appContainer = document.getElementById(targetContainerId);
  if (!appContainer || !dataList || dataList.length === 0) return;

  let activeAudioCtx = null;
  let activeAnalyser = null;
  let animationFrameId = null;

  // 上方大展示區
  const displayMainBox = document.createElement("div");
  displayMainBox.className = "display-main-box";
  displayMainBox.style.display = "none";
  appContainer.appendChild(displayMainBox);

  // 下方縮圖網格區
  const thumbsGrid = document.createElement("div");
  thumbsGrid.className = "gallery-thumbs-grid";
  appContainer.appendChild(thumbsGrid);

  // 渲染縮圖卡片
  dataList.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "thumb-card-item";

    const titleDiv = document.createElement("div");
    titleDiv.className = "thumb-card-title";
    
    const titleText = document.createElement("span");
    titleText.className = "thumb-card-title-text";
    titleText.innerHTML = item.title || "未命名";
    titleDiv.appendChild(titleText);

    if (String(item.Adult) === "1") {
      const adultBgTag = document.createElement("div");
      adultBgTag.className = "thumb-adult-bg-tag";
      adultBgTag.innerHTML = "🔞";
      titleDiv.appendChild(adultBgTag);
    }

    card.appendChild(titleDiv);
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "thumb-card-img-wrapper";

    // 判斷 item.url 是否為空，若為空則嘗試抓取 view 陣列中最後一筆的 url
    let coverUrl = item.url;
    if ((!coverUrl || coverUrl.trim() === "") && item.view && item.view.length > 0) {
      const lastViewItem = item.view[item.view.length - 1];
      coverUrl = lastViewItem.url || "";
    }

    const imgObj = document.createElement("img");
    imgObj.src = coverUrl;
    imgObj.onerror = () => { imgObj.style.backgroundColor = "var(--gallery-err-bg)"; };

    // 若為 R18 限制級，加入模糊虛化效果
    if (String(item.Adult) === "1") {
      imgObj.classList.add("adult-blurred-img");
      imgObj.style.filter = "blur(10px)";
      imgObj.style.transition = "filter 0.3s ease";
    }

    imgWrapper.appendChild(imgObj);

    if (item.view && item.view.length > 1) {
      const folderTag = document.createElement("div");
      folderTag.className = "thumb-folder-tag";
      folderTag.innerHTML = "🗂️";
      imgWrapper.appendChild(folderTag);
    }

    const typesInItem = new Set();
    if (item.view && item.view.length > 0) {
      item.view.forEach(v => {
        if (v.type) typesInItem.add(v.type);
      });
    } else {
      typesInItem.add("img");
    }

    const labelParts = [];
    if (typesInItem.has("img")) labelParts.push("圖");
    if (typesInItem.has("txt")) labelParts.push("文");
    if (typesInItem.has("vid")) labelParts.push("影");
    if (typesInItem.has("aud")) labelParts.push("音");
    if (typesInItem.has("iframe")) labelParts.push("嵌");

    if (labelParts.length > 0) {
      const typeTag = document.createElement("div");
      typeTag.className = "thumb-type-tag";
      typeTag.innerHTML = labelParts.join("/");
      imgWrapper.appendChild(typeTag);
    }

    if (typesInItem.has("vid") || typesInItem.has("aud")) {
      const playIcon = document.createElement("div");
      playIcon.className = "play-icon-overlay";
      imgWrapper.appendChild(playIcon);
    }
    card.appendChild(titleDiv);
    card.appendChild(imgWrapper);
    thumbsGrid.appendChild(card);

    // =================【更新：卡片點擊事件非同步改寫】=================
    card.onclick = async function () {
      const openExhibit = () => {
        thumbsGrid.querySelectorAll(".thumb-card-item").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        displayMainBox.style.display = "flex";
        renderDisplayBox(item, displayMainBox);
      };

      if (String(item.Adult) === "1") {
        // 使用 async/await 搭配最新的 checkAgeVerification Promise 介面
        const isPassed = await checkAgeVerification();
        if (isPassed) {
          openExhibit();
        }
      } else {
        openExhibit();
      }
    };
  });
  
  //展示內頁
  function renderDisplayBox(item, container) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    container.innerHTML = "";

    const primaryPanel = document.createElement("div");
    primaryPanel.className = "exhibit-primary-panel";

    const exTitle = document.createElement("h3");
    exTitle.className = "exhibit-title";

    const exImgWrapper = document.createElement("div");
    exImgWrapper.className = "exhibit-image-wrapper";

    const exNotes = document.createElement("p");
    exNotes.className = "exhibit-notes";

    primaryPanel.appendChild(exTitle);
    primaryPanel.appendChild(exImgWrapper);
    primaryPanel.appendChild(exNotes);

    const sidePanel = document.createElement("div");
    sidePanel.className = "exhibit-side-panel";
    const sideTitle = document.createElement("h3");
    sideTitle.innerHTML = "內容列表";
    sidePanel.appendChild(sideTitle);

    const itemsList = [];
    if (item.view && item.view.length > 0) {
      /* [修改開始]：保留 view 裡所有的自訂欄位（如 audioFreqColor、audioWaveColor 等） */
      item.view.forEach(v => itemsList.push({ ...v }));
      /* [修改結束] */
    } else {
      itemsList.push({ title: item.title, type: "img", url: item.url, notes: item.notes });
    }

    itemsList.forEach((subItem, subIndex) => {
      const sideCard = document.createElement("div");
      sideCard.className = "thumb-card-item PanelLeft";
      if (subIndex === 0) sideCard.classList.add("selected");

      const sTitle = document.createElement("div");
      sTitle.className = "thumb-card-title";
      sTitle.innerHTML = subItem.title;

      const sImg = document.createElement("img");
      sImg.className = "thumb-card-img";
      sImg.src = subItem.url;

      sideCard.appendChild(sTitle);
      sideCard.appendChild(sImg);
      sidePanel.appendChild(sideCard);

      sideCard.onclick = function () {
        sidePanel.querySelectorAll(".thumb-card-item").forEach(c => c.classList.remove("selected"));
        sideCard.classList.add("selected");
        updatePrimaryContent(subItem);
      };
    });

    function updatePrimaryContent(subItem) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      exTitle.innerHTML = subItem.title || "未命名";
      exNotes.innerHTML = subItem.notes || "暫無說明。";
      exImgWrapper.innerHTML = "";

      const type = subItem.type || "img";

      if (type === "img") {
        const img = document.createElement("img");
        img.className = "exhibit-large-img bigImg";
        img.src = subItem.url || "";
        exImgWrapper.appendChild(img);

      } else if (type === "txt") {
        const textContainer = document.createElement("div");
        textContainer.className = "exhibit-text-container";
        textContainer.innerHTML = "讀取中...";

        if (!subItem.url) {
          textContainer.innerText = "未提供檔案路徑。";
        } else {
          fetch(subItem.url)
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.text();
            })
            .then(text => { textContainer.innerText = text; })
            .catch(err => {
              console.error("TXT 載入失敗:", err);
              textContainer.innerText = "文字檔案載入失敗。";
            });
        }

        exImgWrapper.appendChild(textContainer);

      } else if (type === "vid") {
        const vidWrapper = document.createElement("div");
        vidWrapper.className = "exhibit-video-wrapper";

        let player;
        const vidUrl = subItem.url || "";
        if (vidUrl.includes("youtube") || vidUrl.includes("bilibili") || vidUrl.startsWith("http")) {
          player = document.createElement("iframe");
          player.className = "exhibit-video-player";
          player.src = vidUrl;
          player.allow = "fullscreen";
        } else {
          player = document.createElement("video");
          player.className = "exhibit-video-player";
          player.src = vidUrl;
          player.controls = true;
        }

        const popBtn = document.createElement("button");
        popBtn.className = "tab-btn";
        popBtn.innerText = "🔍 彈出原始尺寸影片觀看";
        popBtn.onclick = () => openModal(vidUrl, "vid");

        vidWrapper.appendChild(player);
        vidWrapper.appendChild(popBtn);
        exImgWrapper.appendChild(vidWrapper);

      } else if (type === "aud") {
        const audWrapper = document.createElement("div");
        audWrapper.className = "exhibit-audio-wrapper";

        const coverBox = document.createElement("div");
        coverBox.className = "audio-cover-box";

        const coverImg = document.createElement("img");
        coverImg.src = item.url || subItem.url || "";
        coverImg.onerror = () => { coverImg.style.backgroundColor = "var(--gallery-err-bg)"; };

        const canvas = document.createElement("canvas");
        canvas.className = "audio-canvas-overlay";
        canvas.width = 600;
        canvas.height = 100;

        coverBox.appendChild(coverImg);
        coverBox.appendChild(canvas);

        const controlsBar = document.createElement("div");
        controlsBar.className = "audio-controls-bar";

        const audioEl = document.createElement("audio");
        audioEl.controls = true;
        audioEl.src = subItem.url || "";

        const selectEl = document.createElement("select");
        selectEl.className = "audio-mode-select";
        selectEl.innerHTML = `
          <option value="freq">柱狀圖</option>
          <option value="wave">波形線</option>
        `;

        controlsBar.appendChild(audioEl);
        controlsBar.appendChild(selectEl);

        audWrapper.appendChild(coverBox);
        audWrapper.appendChild(controlsBar);
        exImgWrapper.appendChild(audWrapper);

        /* [修改開始]：傳遞完整的 subItem 給 initAudioVisualizer 讀取自訂顏色資訊 */
        initAudioVisualizer(audioEl, canvas, selectEl, subItem);
        /* [修改結束] */

      } else if (type === "iframe") {
        const iframeBox = document.createElement("div");
        iframeBox.className = "exhibit-iframe-wrapper";
        iframeBox.innerHTML = subItem.url || "";
        exImgWrapper.appendChild(iframeBox);
      }
    }

    if (itemsList.length > 0) updatePrimaryContent(itemsList[0]);

    container.appendChild(primaryPanel);
    container.appendChild(sidePanel);
  }

  // === 3. Web Audio API 聲波波形繪製 logic ===
  /* [修改開始]：為 initAudioVisualizer 增加 subItem 參數 */
  function initAudioVisualizer(audioEl, canvas, selectEl, subItem = {}) {
  /* [修改結束] */
    const ctx = canvas.getContext("2d");
    let audioCtx, analyser, source;

    audioEl.onplay = () => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
      renderWave();
    };
    let globalGradient = null;

    // 在主題變更或 resize 時呼叫此函式更新 Gradient
    function updateGradient() {
      globalGradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      
      /* [修改開始]：優先判斷 subItem.audioFreqColor，若無值或為空字串才改讀取 CSS 變數 */
      const customFreqColor = subItem.audioFreqColor && subItem.audioFreqColor.trim() !== "";
      const rawColors = customFreqColor
        ? subItem.audioFreqColor.trim()
        : getComputedStyle(document.documentElement).getPropertyValue('--audioFreq-color').trim();
      /* [修改結束] */
      
      if (rawColors) {
        const colors = rawColors.split(',').map(c => c.trim());
        const step = colors.length > 1 ? 1 / (colors.length - 1) : 1;
        colors.forEach((color, i) => globalGradient.addColorStop(i * step, color));
      }
    }

    function renderWave() {
      animationFrameId = requestAnimationFrame(renderWave);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (selectEl.value === "freq") {
        analyser.getByteFrequencyData(dataArray);
        const gap = 3;
        const barWidth = Math.max(1, (canvas.width / bufferLength) * 2);
        let x = 0;

        if (!globalGradient) updateGradient();
        ctx.fillStyle = globalGradient;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + gap;

          if (x > canvas.width) break;
        }
      } else {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2;
        
        /* [修改開始]：優先判斷 subItem.audioWaveColor，若無值或為空字串才改讀取 CSS 變數 */
        const customWaveColor = subItem.audioWaveColor && subItem.audioWaveColor.trim() !== "";
        const strokeStyle = customWaveColor
          ? subItem.audioWaveColor.trim()
          : getComputedStyle(document.documentElement).getPropertyValue('--audioWave-color').trim();
        /* [修改結束] */

        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        const scale = 1.8;
        const centerY = canvas.height / 2;

        for (let i = 0; i < bufferLength; i++) {
          const offset = (dataArray[i] - 128) / 128.0;
          const y = centerY + offset * centerY * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
    }
  }

  // === 4. 全域 Modal 放大查看彈窗 ===
  function openModal(url, mode) {
    const overlay = document.createElement("div");
    overlay.className = "gallery-modal-overlay";

    if (mode === "vid") {
      let vid;
      if (url.includes("youtube") || url.includes("bilibili") || url.startsWith("http")) {
        vid = document.createElement("iframe");
        vid.className = "gallery-modal-content gallery-modal-video";
        vid.src = url;
        vid.allow = "fullscreen";
      } else {
        vid = document.createElement("video");
        vid.className = "gallery-modal-content gallery-modal-video";
        vid.src = url;
        vid.controls = true;
      }
      overlay.appendChild(vid);
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    };
    document.body.appendChild(overlay);
  }
}