/* ==========【修改開始】Toast 提示訊息輔助函式 ========== */
function showToast(message) {
    let toast = document.getElementById("toast-notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-notification";
        toast.className = "toast-notification";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}
/* ==========【修改結束】Toast 提示訊息輔助函式 ========== */

/* ==========【修改開始】書籤讀寫邏輯 (手動觸發) ========== */
function getBookmark(storyId) {
    const raw = localStorage.getItem(`bookmark_story_${storyId}`);
    return raw ? JSON.parse(raw) : null;
}

function saveBookmark(storyId, state) {
    localStorage.setItem(`bookmark_story_${storyId}`, JSON.stringify({
        mode: state.mode,
        chapterNum: state.chapterNum,
        pageNum: state.pageNum
    }));
    showToast("儲存成功");
}
/* ==========【修改結束】書籤讀寫邏輯 (手動觸發) ========== */

function renderTabs() {
    const tabsContainer = document.getElementById("comic-tabs");
    if(!tabsContainer) return;
    tabsContainer.innerHTML = "";

    window.Story.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "tab-btn" + (s.id === activeStoryId ? " active" : "");
        btn.textContent = s.title || `作品 ${s.id}`;
        btn.onclick = function() {
            document.querySelectorAll("#comic-tabs .tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeStoryId = s.id;
            if (storyStates[s.id]) {
                storyStates[s.id].mode = 'home';
                storyStates[s.id].chapterNum = 0;
                storyStates[s.id].pageNum = 0;
            }
            renderActiveContent();
        };
        tabsContainer.appendChild(btn);
    });
}

function renderActiveContent() {
    const contentContainer = document.getElementById("comic-content");
    if(!contentContainer) return;
    contentContainer.innerHTML = "";
    contentContainer.classList.add("active");

    const s = Story.find(item => item.id === activeStoryId);
    if(!s) return;
    const state = storyStates[s.id];

    const viewerSection = document.createElement("div");
    viewerSection.className = "viewer-section";

    //1. 先處理【年齡分級/警告畫面】(維持最優先阻擋)
    const rData = rating.find(r => r.title === s.Rating);
    const cData = Categories.find(c => c.title === s.Category);

    if (state.mode === 'home') {
        // A. 【標籤區】
        const tagsSection = document.createElement("div");
        tagsSection.className = "tags-section";
        
        let tagsHTML = `<div class="tag-content">`;
        if (s.Chapter && s.Chapter.length > 0) {
            const authorsSet = new Set();
            s.Chapter.forEach(ch => {
                if (ch.author && typeof ch.author === "string") {
                    ch.author.split(",").forEach(a => {
                        const trimmed = a.trim();
                        if (trimmed) authorsSet.add(trimmed);
                    });
                }
            });
            if (authorsSet.size > 0) {
                const authorsStr = Array.from(authorsSet).join(", ");
                tagsHTML += '<div class="tag-row"><span class="tag-label">作者</span><span>' + authorsStr + '</span></div>';
            }
        }
        if(s.Rating) {
            const bColor = rData ? rData.color : "var(--tagBadgeDefault-bg)";
            const bLogo = rData ? rData.logo : "?";
            tagsHTML += '<div class="tag-row"><span class="tag-label">分級</span><span class="tag-badge" style="background:' + bColor + '">' + bLogo + '</span><span>' + s.Rating + '</span></div>';
        }
        if(s.Archive_Warning) {
            tagsHTML += '<div class="tag-row"><span class="tag-label">預警</span><span class="warning-text">' + s.Archive_Warning + '</span></div>';
        }
        if(s.Category) {
            const bColor = cData ? cData.color : "var(--tagBadgeDefault-bg)";
            const bLogo = cData ? cData.logo : "?";
            tagsHTML += '<div class="tag-row"><span class="tag-label">類別</span><span class="tag-badge" style="background:' + bColor + '">' + bLogo + '</span><span>' + s.Category + '</span></div>';
        }
        if(s.Fandom) tagsHTML += '<div class="tag-row"><span class="tag-label">原作</span><span>' + s.Fandom + '</span></div>';
        if(s.Relationship) tagsHTML += '<div class="tag-row"><span class="tag-label">配對</span><span>' + s.Relationship + '</span></div>';
        if(s.Characters) tagsHTML += '<div class="tag-row"><span class="tag-label">角色</span><span>' + s.Characters + '</span></div>';
        if(s.Additional_Tags) tagsHTML += '<div class="tag-row"><span class="tag-label">標籤</span><span>' + s.Additional_Tags + '</span></div>';
        if(s.Language) tagsHTML += '<div class="tag-row"><span class="tag-label">語言</span><span>' + s.Language + '</span></div>';
        
        if(s.Chapter && s.Chapter.length > 0) {
            const firstPub = s.Chapter[0].Published || "未知";
            const lastPub = s.Chapter[s.Chapter.length - 1].Published || "未知";
            const chCount = s.Chapter.length;
            const isEnd = s.Chapter.some(ch => ch.End === true);
            const endSuffix = isEnd ? "" : "/?，未完";
            tagsHTML += '<div class="tag-row"><span class="tag-label">狀態</span><span>發布日：' + firstPub + ' ｜ 更新日：' + lastPub + ' ｜ 章節：' + chCount + endSuffix + '</span></div>';
        }
        tagsHTML += `</div>`
        tagsSection.innerHTML = tagsHTML;
        contentContainer.appendChild(tagsSection);
        contentContainer.appendChild(viewerSection);
        
        // B. 【閱覽與驗證判斷區】
        const todayStr = new Date().toISOString().split('T')[0];
        const isVerifiedToday = sessionStorage.getItem("adult_verified_date") === todayStr;
        if(rData && rData.alarm && !state.unlocked && !isVerifiedToday) {
            const alarmDiv = document.createElement("div");
            alarmDiv.className = "alarm-screen";

            alarmDiv.innerHTML = 
               `<div class="alarm-title">
                <span class="tag-badge" style="background:${rData.color}; width:36px; height:36px; font-size:16px;">${rData.logo}</span>
                <span>${s.Rating}</span>
                </div>
            <div class="alarm-content">${rData.alarmcontent || "本作品內含限制級成分，請斟酌觀看。"}</div>`
            const acceptBtn = document.createElement("button");
            acceptBtn.className = "alarm-btn";
            acceptBtn.textContent = "進行成人驗證並觀看";
            acceptBtn.onclick = async function() {
                const isPassed = await checkAgeVerification();

                if (isPassed) {
                    state.unlocked = true;
                    renderStoryHome(s, viewerSection);
                    renderActiveContent();
                }
            };
            alarmDiv.appendChild(acceptBtn);
            viewerSection.appendChild(alarmDiv);
        } else {
            renderStoryHome(s, viewerSection);
        }
    } else {
        contentContainer.appendChild(viewerSection);
        renderChapterViewer(s, viewerSection);
    }
}

/* ==========【修改開始】故事首頁模式重構（封面+簡介並排、閱讀/書籤按鈕列） ========== */
function renderStoryHome(s, container) {
    const homeLayout = document.createElement("div");
    homeLayout.className = "story-home-layout";

    // 1. 封面等比縮圖 + 簡介 (一列，並排)
    const topFlex = document.createElement("div");
    topFlex.className = "story-info-row";

    // 封面 200x200 容器
    const coverBox = document.createElement("div");
    coverBox.className = "story-cover-thumb-box";
    const coverImg = document.createElement("img");
    coverImg.src = s.cover || "";
    coverImg.alt = "故事封面";
    coverBox.appendChild(coverImg);

    // 簡介 600x200 容器
    const introBox = document.createElement("div");
    introBox.className = "story-intro-scroll-box";
    introBox.innerHTML = "<h1>"+s.title+"</h1><strong>簡介：</strong><br>" + (s.Intro || "無簡介內容");

    topFlex.appendChild(coverBox);
    topFlex.appendChild(introBox);
    homeLayout.appendChild(topFlex);

    // 2. 按鈕列：【開始閱讀】+【跳轉書籤】
    const actionRow = document.createElement("div");
    actionRow.className = "story-action-row";

    // [開始閱讀] 按鈕 -> 進入故事大封面 (story_cover)
    const btnStart = document.createElement("button");
    btnStart.className = "btn-action btn-start-read";
    btnStart.textContent = "開始閱讀";
    btnStart.onclick = function() {
        storyStates[s.id].mode = 'story_cover';
        storyStates[s.id].chapterNum = 0;
        storyStates[s.id].pageNum = 0;
        renderActiveContent();
    };

    // [跳轉書籤] 按鈕
    const btnBookmark = document.createElement("button");
    btnBookmark.className = "btn-action btn-jump-bookmark";
    btnBookmark.textContent = "跳轉書籤";

    const savedBM = getBookmark(s.id);
    if (!savedBM) {
        btnBookmark.classList.add("disabled");
        btnBookmark.onclick = function() {
            showToast("尚無儲存的書籤");
        };
    } else {
        btnBookmark.onclick = function() {
            storyStates[s.id].mode = savedBM.mode;
            storyStates[s.id].chapterNum = savedBM.chapterNum;
            storyStates[s.id].pageNum = savedBM.pageNum;
            renderActiveContent();
        };
    }

    actionRow.appendChild(btnStart);
    actionRow.appendChild(btnBookmark);
    homeLayout.appendChild(actionRow);

    // 3. 章節列表
    if (s.Chapter && s.Chapter.length > 0) {
        const listBox = document.createElement("div");
        listBox.className = "chapter-list-box";

        s.Chapter.forEach(ch => {
            const item = document.createElement("div");
            item.className = "nav_btn chapter-item";
            
            item.onclick = function() {
                const hasChCover = Boolean(ch.cover && ch.cover.trim() !== "");
                storyStates[s.id].mode = hasChCover ? 'chapter_cover' : 'page';
                storyStates[s.id].chapterNum = ch.num;
                storyStates[s.id].pageNum = hasChCover ? 0 : 1;
                renderActiveContent();
            };

            const thumb = document.createElement("img");
            thumb.className = "thumb-square";
            thumb.src = ch.cover || "";
            thumb.onerror = function() { 
                thumb.style.backgroundColor = "var(--tagBadgeDefault-bg)";
            };

            const titleDiv = document.createElement("div");
            titleDiv.className = "chapter-item-title";
            titleDiv.innerHTML = "第"+ch.num+"章<br>"+(ch.title || `第 ${ch.num} 章`);
            titleDiv.title = ch.title;

            item.appendChild(thumb);
            item.appendChild(titleDiv);
            listBox.appendChild(item);
        });
        homeLayout.appendChild(listBox);
    }

    container.appendChild(homeLayout);
}
/* ==========【修改結束】故事首頁模式重構 ========== */

/* ==========【修改開始】章節檢視核心 (包含故事大封面、封底支援、書籤按鈕) ========== */
function renderChapterViewer(s, container) {
    const state = storyStates[s.id];

    // --- 檢查封底 (cover_back) 條件 ---
    const hasEndChapter = s.Chapter.some(c => c.End === true);
    const hasCoverBack = Boolean(hasEndChapter && s.cover_back && s.cover_back.trim() !== "");

    // --- 處理【故事大封面】(點擊「開始閱讀」觸發) ---
    if (state.mode === 'story_cover') {
        renderStoryCoverView(s, container, hasCoverBack);
        return;
    }

    // --- 處理【故事大封底】 ---
    if (state.mode === 'story_cover_back') {
        renderStoryCoverBackView(s, container);
        return;
    }

    // 標準章節檢視
    const currentChIdx = s.Chapter.findIndex(c => c.num === state.chapterNum);
    const ch = s.Chapter[currentChIdx] || s.Chapter[0];
    if(!ch) {
        state.mode = 'home';
        renderActiveContent();
        return;
    }

    const hasCover = Boolean(ch.cover && ch.cover.trim() !== "");

    if (!hasCover && state.mode === 'chapter_cover') {
        state.mode = 'page';
        state.pageNum = 1;
    }

    const isNovel = ch.type === 'novel';
    const totalPagesCount = isNovel ? 1 : (ch.img ? ch.img.length : 0); 

    // ---- 建立上方導覽列 ----
    const navBar = document.createElement("div");
    navBar.className = "nav-bar";

    // [上一章]
    const btnPrevCh = document.createElement("button");
    btnPrevCh.className = "nav-btn";
    btnPrevCh.textContent = "上一章";
    if (currentChIdx <= 0) {
        btnPrevCh.onclick = function() {
            state.mode = 'story_cover';
            state.chapterNum = 0;
            state.pageNum = 0;
            renderActiveContent();
        };
    } else {
        btnPrevCh.onclick = function() {
            const prevCh = s.Chapter[currentChIdx - 1];
            const prevHasCover = Boolean(prevCh && prevCh.cover && prevCh.cover.trim() !== "");
            state.mode = prevHasCover ? 'chapter_cover' : 'page';
            state.chapterNum = prevCh.num;
            state.pageNum = prevHasCover ? 0 : 1;
            renderActiveContent();
        };
    }
    navBar.appendChild(btnPrevCh);

    // [章節選單]
    const chSelect = document.createElement("select");
    chSelect.className = "nav-select";
    
    // 將封面加入選單
    const optStoryCover = document.createElement("option");
    optStoryCover.value = "story_cover";
    optStoryCover.textContent = "封面";
    chSelect.appendChild(optStoryCover);

    s.Chapter.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.num;
        opt.textContent = c.num+"."+(c.title || `第 ${c.num} 章`);
        if(c.num === state.chapterNum && state.mode !== 'story_cover_back') {
            opt.selected = true;
            opt.style.background = "var(--navSelectOption-selected-bg)";
        }
        chSelect.appendChild(opt);
    });

    if (hasCoverBack) {
        const optCoverBack = document.createElement("option");
        optCoverBack.value = "story_cover_back";
        optCoverBack.textContent = "封底";
        if (state.mode === 'story_cover_back') optCoverBack.selected = true;
        chSelect.appendChild(optCoverBack);
    }

    chSelect.onchange = function() {
        const val = chSelect.value;
        if (val === "story_cover") {
            state.mode = 'story_cover';
            state.chapterNum = 0;
            state.pageNum = 0;
        } else if (val === "story_cover_back") {
            state.mode = 'story_cover_back';
            state.chapterNum = 9999;
            state.pageNum = 0;
        } else {
            const targetChNum = parseInt(val);
            const targetCh = s.Chapter.find(c => c.num === targetChNum);
            const targetHasCover = Boolean(targetCh && targetCh.cover && targetCh.cover.trim() !== "");
            state.mode = targetHasCover ? 'chapter_cover' : 'page';
            state.chapterNum = targetChNum;
            state.pageNum = targetHasCover ? 0 : 1;
        }
        renderActiveContent();
    };
    navBar.appendChild(chSelect);

    // [下一章]
    const btnNextCh = document.createElement("button");
    btnNextCh.className = "nav-btn";
    btnNextCh.textContent = "下一章";
    const isLastChapter = (currentChIdx === -1 || currentChIdx >= s.Chapter.length - 1);
    
    if (isLastChapter && !hasCoverBack) {
        btnNextCh.disabled = true;
    } else {
        btnNextCh.onclick = function() {
            if (isLastChapter && hasCoverBack) {
                state.mode = 'story_cover_back';
                state.chapterNum = 9999;
                state.pageNum = 0;
            } else {
                const nextCh = s.Chapter[currentChIdx + 1];
                const nextHasCover = Boolean(nextCh && nextCh.cover && nextCh.cover.trim() !== "");
                state.mode = nextHasCover ? 'chapter_cover' : 'page';
                state.chapterNum = nextCh.num;
                state.pageNum = nextHasCover ? 0 : 1;
            }
            renderActiveContent();
        };
    }
    navBar.appendChild(btnNextCh);

    // [回到故事封面 (目錄)]
    const btnGoHome = document.createElement("button");
    btnGoHome.className = "nav-btn home-btn";
    btnGoHome.textContent = "目錄";
    btnGoHome.onclick = function() {
        state.mode = 'home';
        state.pageNum = 0;
        renderActiveContent(); 
    };
    navBar.appendChild(btnGoHome);

    // [上一頁]
    const btnPrevPg = document.createElement("button");
    btnPrevPg.className = "nav-btn";
    btnPrevPg.textContent = "上一頁";
    btnPrevPg.onclick = function() {
        handlePrevPageLogic();
    };
    navBar.appendChild(btnPrevPg);

    // [頁選單]
    const pgSelect = document.createElement("select");
    pgSelect.className = "nav-select";
    
    if (hasCover) {
        const optCover = document.createElement("option");
        optCover.value = 0;
        optCover.textContent = "章節封面";
        if(state.mode === 'chapter_cover') { 
            optCover.selected = true; 
            optCover.style.backgroundColor = "var(--navSelectOption-selected-bg)"; 
        }
        pgSelect.appendChild(optCover);
    }

    for(let p = 1; p <= totalPagesCount; p++) {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = isNovel ? "小說內文" : `第 ${p} 頁`; 
        if(state.mode === 'page' && state.pageNum === p) { 
            opt.selected = true; 
            opt.style.backgroundColor = "var(--navSelectOption-selected-bg)"; 
        }
        pgSelect.appendChild(opt);
    }

    pgSelect.onchange = function() {
        const val = parseInt(pgSelect.value);
        if(val === 0) {
            state.mode = 'chapter_cover';
            state.pageNum = 0;
        } else {
            state.mode = 'page';
            state.pageNum = val;
        }
        renderActiveContent();
    };
    navBar.appendChild(pgSelect);

    // [下一頁]
    const isLastPageOfLastChapter = state.mode === 'page' && 
                                    state.pageNum === totalPagesCount && 
                                    currentChIdx === s.Chapter.length - 1;

    const btnNextPg = document.createElement("button");
    btnNextPg.className = "nav-btn";
    btnNextPg.textContent = "下一頁";
    if (isLastPageOfLastChapter && !hasCoverBack) {
        btnNextPg.disabled = true;
    } else {
        btnNextPg.onclick = function() {
            handleNextPageLogic();
        };
    }
    navBar.appendChild(btnNextPg);

    container.appendChild(navBar);

    // ---- 標題與更新日期列 ----
    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = '<div class="space-holder"></div><h2 class="sub-title">' + (ch.num+"."+(ch.title || '未命名章節')) + '</h2><span class="update-date">更新日期：' + (ch.Published || '未知') + '</span>';
    container.appendChild(titleRow);

    // ---- 作者列與【🔖 儲存書籤】按鈕 ----
    const authorRow = document.createElement("div");
    authorRow.className = "author-row";
    const authorText = (ch.author && ch.author.trim() !== "") ? ch.author : "未知";
    authorRow.innerHTML = `<span>作者：${authorText}</span>`;
    
    // 右側點擊才儲存進度的書籤按鈕
    const bmSaveBtn = document.createElement("button");
    bmSaveBtn.className = "bookmark-save-btn";
    bmSaveBtn.innerHTML = "🔖 儲存書籤";
    bmSaveBtn.onclick = function() {
        saveBookmark(s.id, state);
    };
    authorRow.appendChild(bmSaveBtn);

    container.appendChild(authorRow);

    // 共用導覽核心邏輯 (上一頁 / 上一章)
    function handlePrevPageLogic() {
        if (state.mode === 'chapter_cover') {
            if (currentChIdx > 0) {
                const prevCh = s.Chapter[currentChIdx - 1];
                const prevChIsNovel = prevCh.type === 'novel';
                const prevChPages = prevChIsNovel ? 1 : (prevCh.img ? prevCh.img.length : 0);
                
                state.mode = 'page';
                state.chapterNum = prevCh.num;
                state.pageNum = prevChPages;
                renderActiveContent();
            } else {
                state.mode = 'story_cover';
                state.chapterNum = 0;
                state.pageNum = 0;
                renderActiveContent();
            }
        } else if (state.mode === 'page') {
            if (state.pageNum === 1) {
                if (hasCover) {
                    state.mode = 'chapter_cover';
                    state.pageNum = 0;
                } else if (currentChIdx > 0) {
                    const prevCh = s.Chapter[currentChIdx - 1];
                    const prevChIsNovel = prevCh.type === 'novel';
                    const prevChPages = prevChIsNovel ? 1 : (prevCh.img ? prevCh.img.length : 0);

                    state.mode = 'page';
                    state.chapterNum = prevCh.num;
                    state.pageNum = prevChPages;
                } else {
                    state.mode = 'story_cover';
                    state.chapterNum = 0;
                    state.pageNum = 0;
                }
            } else {
                state.pageNum--;
            }
            renderActiveContent();
        }
    }

    // 共用導覽核心邏輯 (下一頁 / 下一章)
    function handleNextPageLogic() {
        if (state.mode === 'chapter_cover') {
            state.mode = 'page';
            state.pageNum = 1;
            renderActiveContent();
        } else if (state.mode === 'page') {
            if (state.pageNum === totalPagesCount) {
                if (currentChIdx < s.Chapter.length - 1) {
                    const nextCh = s.Chapter[currentChIdx + 1];
                    const nextHasCover = Boolean(nextCh && nextCh.cover && nextCh.cover.trim() !== "");
                    
                    state.mode = nextHasCover ? 'chapter_cover' : 'page';
                    state.chapterNum = nextCh.num;
                    state.pageNum = nextHasCover ? 0 : 1;
                    renderActiveContent();
                } else if (hasCoverBack) {
                    state.mode = 'story_cover_back';
                    state.chapterNum = 9999;
                    state.pageNum = 0;
                    renderActiveContent();
                }
            } else {
                state.pageNum++;
                renderActiveContent();
            }
        }
    }

    // ---- 模式分流：【章節封面】或【章節內頁】 ----
    if(state.mode === 'chapter_cover' && hasCover) {
        if(ch.Summary) {
            const sumBox = document.createElement("div");
            sumBox.className = "intro-box";
            sumBox.innerHTML = "<strong>概要：</strong><br>" + ch.Summary;
            container.appendChild(sumBox);
        }

        const imgWrapper = document.createElement("div");
        imgWrapper.className = "cover-wrapper img-scroll-x";
        
        const coverClickWrapper = document.createElement("div");
        coverClickWrapper.className = "page-click-wrapper";

        const cCover = document.createElement("img");
        cCover.className = "comic-large-img";
        cCover.src = ch.cover;
        cCover.onload = function() {
            if(cCover.clientWidth > imgWrapper.clientWidth) imgWrapper.classList.add("overflowing");
        };
        coverClickWrapper.appendChild(cCover);

        const leftZone = document.createElement("div");
        leftZone.className = "click-zone-left";
        leftZone.title = currentChIdx > 0 ? "回上一章尾頁" : "回故事封面";
        leftZone.onclick = function(e) { e.stopPropagation(); handlePrevPageLogic(); };

        const rightZone = document.createElement("div");
        rightZone.className = "click-zone-right";
        rightZone.title = "進入內文";
        rightZone.onclick = function(e) { e.stopPropagation(); handleNextPageLogic(); };

        coverClickWrapper.appendChild(leftZone);
        coverClickWrapper.appendChild(rightZone);
        imgWrapper.appendChild(coverClickWrapper);
        container.appendChild(imgWrapper);

        if(!isNovel && ch.img && ch.img.length > 0) {
            const gridTitle = document.createElement("div");
            gridTitle.style.cssText = "font-size:14px; font-weight:bold; margin-top:20px;";
            gridTitle.textContent = "快速頁面預覽：";
            container.appendChild(gridTitle);

            const thumbsGrid = document.createElement("div");
            thumbsGrid.className = "thumbs-grid";
            
            ch.img.forEach((pageData, index) => {
                const pNum = index + 1;
                const gThumb = document.createElement("img");
                gThumb.className = "grid-thumb-item";
                gThumb.src = pageData.url; 
                gThumb.onerror = function() { gThumb.style.backgroundColor = "var(--navSelectOption-selected-bg)"; };
                gThumb.onclick = function() {
                    state.mode = 'page';
                    state.pageNum = pNum;
                    renderActiveContent();
                };
                thumbsGrid.appendChild(gThumb);
            });
            container.appendChild(thumbsGrid);
        }

    } else if(state.mode === 'page') {
        if(!hasCover && state.pageNum === 1 && ch.Summary) {
            const sumBox = document.createElement("div");
            sumBox.className = "intro-box";
            sumBox.style.marginBottom = "15px";
            sumBox.innerHTML = "<strong>概要：</strong><br>" + ch.Summary;
            container.appendChild(sumBox);
        }

        const pageWrapper = document.createElement("div");
        pageWrapper.className = "center-wrapper img-scroll-x";

        const clickWrapper = document.createElement("div");
        clickWrapper.className = "page-click-wrapper" + (isNovel ? " type-novel" : "");

        if (isNovel) {
            const novelContainer = document.createElement("div");
            novelContainer.className = "novel-text-container"; 
            novelContainer.textContent = "小說內文載入中...";
            clickWrapper.appendChild(novelContainer);

            if (ch.url) {
                fetch(ch.url)
                    .then(response => {
                        if (!response.ok) throw new Error("讀取小說檔案失敗");
                        return response.text();
                    })
                    .then(text => { novelContainer.textContent = text; })
                    .catch(err => {
                        console.error(err);
                        novelContainer.textContent = "[ 小說內文載入失敗，請檢查檔案路徑 ]";
                    });
            } else {
                novelContainer.textContent = "[ 尚未設定小說 txt 檔案路徑 (url) ]";
            }

        } else {
            const pageObj = ch.img[state.pageNum - 1];
            const pageSrc = pageObj ? pageObj.url : "";

            const pageImg = document.createElement("img");
            pageImg.className = "comic-large-img";
            pageImg.src = pageSrc;
            
            // pageImg.onerror = function() { 
            //     pageImg.style.display = "none";
            //     const errorDiv = document.createElement("div");
            //     errorDiv.style.cssText = "width: 700px; height: 920px; background: var(--defaultFallback-img); color: var(--default-font); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;";
            //     errorDiv.textContent = "[ 第 " + state.pageNum + " 頁圖片載入失敗 ]";
            //     clickWrapper.appendChild(errorDiv);
            // };

            pageImg.onload = function() {
                if(pageImg.clientWidth > pageWrapper.clientWidth) pageWrapper.classList.add("overflowing");
            };

            clickWrapper.appendChild(pageImg);
        }

        const leftZone = document.createElement("div");
        leftZone.className = "click-zone-left";
        leftZone.title = (state.pageNum === 1 && hasCover) ? "回章節封面" : "上一頁";
        leftZone.onclick = function(e) { e.stopPropagation(); handlePrevPageLogic(); };

        const rightZone = document.createElement("div");
        rightZone.className = "click-zone-right";
        rightZone.title = (state.pageNum === totalPagesCount) ? (currentChIdx < s.Chapter.length - 1 ? "切換至下一章" : (hasCoverBack ? "前往封底" : "本作品結束")) : "下一頁";
        rightZone.onclick = function(e) { e.stopPropagation(); handleNextPageLogic(); };

        clickWrapper.appendChild(leftZone);
        clickWrapper.appendChild(rightZone);
        pageWrapper.appendChild(clickWrapper);
        container.appendChild(pageWrapper);

        // ---- 判斷是否為「最後一頁」：渲染 Notes 與 Google 表單 iframe ----
        const isLastPage = (state.pageNum === totalPagesCount);
        if (isLastPage) {
            // 1. 渲染 Notes (後記)
            if (ch.Notes && ch.Notes.trim() !== "") {
                const notesBox = document.createElement("div");
                notesBox.className = "intro-box notes-box";
                notesBox.style.marginTop = "20px";
                notesBox.innerHTML = "<strong>作者後記：</strong><br>" + ch.Notes;
                container.appendChild(notesBox);
            }

            // 2. 【核心新增】當 cmt_url 有值且該章節 cmt 為 true 時，在 Notes 下方產生 iframe
            if (s.cmt_url && s.cmt_url.trim() !== "" && ch.cmt === true) {
                const iframeWrapper = document.createElement("div");
                iframeWrapper.className = "cmt-iframe-wrapper";

                const cmtIframe = document.createElement("iframe");
                cmtIframe.className = "cmt-iframe";
                // 拼接 URL 傳入章節編號 (ch.num)
                cmtIframe.src = s.cmt_url + ch.num;
                cmtIframe.setAttribute("frameborder", "0");
                cmtIframe.setAttribute("marginheight", "0");
                cmtIframe.setAttribute("marginwidth", "0");
                cmtIframe.textContent = "載入中…";

                iframeWrapper.appendChild(cmtIframe);
                container.appendChild(iframeWrapper);
            }
        }
    }
}

/* ==========【新增】故事大封面閱覽 (單獨當成第一頁) ========== */
function renderStoryCoverView(s, container, hasCoverBack) {
    const state = storyStates[s.id];

    // 導覽列
    const navBar = document.createElement("div");
    navBar.className = "nav-bar";

    const btnPrevCh = document.createElement("button");
    btnPrevCh.className = "nav-btn";
    btnPrevCh.textContent = "上一章";
    btnPrevCh.disabled = true;
    navBar.appendChild(btnPrevCh);

    const chSelect = document.createElement("select");
    chSelect.className = "nav-select";
    
    const optCover = document.createElement("option");
    optCover.value = "story_cover";
    optCover.textContent = "封面";
    optCover.selected = true;
    chSelect.appendChild(optCover);

    s.Chapter.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.num;
        opt.textContent = c.num+"."+(c.title || `第 ${c.num} 章`);
        chSelect.appendChild(opt);
    });

    if (hasCoverBack) {
        const optCoverBack = document.createElement("option");
        optCoverBack.value = "story_cover_back";
        optCoverBack.textContent = "封底";
        chSelect.appendChild(optCoverBack);
    }

    chSelect.onchange = function() {
        const val = chSelect.value;
        if (val === "story_cover") {
            state.mode = 'story_cover';
        } else if (val === "story_cover_back") {
            state.mode = 'story_cover_back';
        } else {
            const targetChNum = parseInt(val);
            const targetCh = s.Chapter.find(c => c.num === targetChNum);
            const targetHasCover = Boolean(targetCh && targetCh.cover && targetCh.cover.trim() !== "");
            state.mode = targetHasCover ? 'chapter_cover' : 'page';
            state.chapterNum = targetChNum;
            state.pageNum = targetHasCover ? 0 : 1;
        }
        renderActiveContent();
    };
    navBar.appendChild(chSelect);

    const btnNextCh = document.createElement("button");
    btnNextCh.className = "nav-btn";
    btnNextCh.textContent = "下一章";
    btnNextCh.onclick = function() {
        const firstCh = s.Chapter[0];
        const firstHasCover = Boolean(firstCh && firstCh.cover && firstCh.cover.trim() !== "");
        state.mode = firstHasCover ? 'chapter_cover' : 'page';
        state.chapterNum = firstCh.num;
        state.pageNum = firstHasCover ? 0 : 1;
        renderActiveContent();
    };
    navBar.appendChild(btnNextCh);

    const btnGoHome = document.createElement("button");
    btnGoHome.className = "nav-btn home-btn";
    btnGoHome.textContent = "目錄";
    btnGoHome.onclick = function() {
        state.mode = 'home';
        renderActiveContent();
    };
    navBar.appendChild(btnGoHome);

    const btnPrevPg = document.createElement("button");
    btnPrevPg.className = "nav-btn";
    btnPrevPg.textContent = "上一頁";
    btnPrevPg.disabled = true;
    navBar.appendChild(btnPrevPg);

    const btnNextPg = document.createElement("button");
    btnNextPg.className = "nav-btn";
    btnNextPg.textContent = "下一頁";
    btnNextPg.onclick = function() {
        const firstCh = s.Chapter[0];
        const firstHasCover = Boolean(firstCh && firstCh.cover && firstCh.cover.trim() !== "");
        state.mode = firstHasCover ? 'chapter_cover' : 'page';
        state.chapterNum = firstCh.num;
        state.pageNum = firstHasCover ? 0 : 1;
        renderActiveContent();
    };
    navBar.appendChild(btnNextPg);

    container.appendChild(navBar);

    // 標題與作者列
    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = `<div class="space-holder"></div><h2 class="sub-title">${s.title} - 封面</h2><span class="update-date"></span>`;
    container.appendChild(titleRow);

    const authorRow = document.createElement("div");
    authorRow.className = "author-row";
    authorRow.innerHTML = `<span>封面</span>`;
    
    const bmSaveBtn = document.createElement("button");
    bmSaveBtn.className = "bookmark-save-btn";
    bmSaveBtn.innerHTML = "🔖 儲存書籤";
    bmSaveBtn.onclick = function() { saveBookmark(s.id, state); };
    authorRow.appendChild(bmSaveBtn);
    container.appendChild(authorRow);

    // 圖片展示區
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "cover-wrapper img-scroll-x";
    
    const coverClickWrapper = document.createElement("div");
    coverClickWrapper.className = "page-click-wrapper";

    const cImg = document.createElement("img");
    cImg.className = "comic-large-img";
    cImg.src = s.cover || "";
    coverClickWrapper.appendChild(cImg);

    const rightZone = document.createElement("div");
    rightZone.className = "click-zone-right";
    rightZone.title = "進入第 1 章";
    rightZone.onclick = function(e) {
        e.stopPropagation();
        const firstCh = s.Chapter[0];
        const firstHasCover = Boolean(firstCh && firstCh.cover && firstCh.cover.trim() !== "");
        state.mode = firstHasCover ? 'chapter_cover' : 'page';
        state.chapterNum = firstCh.num;
        state.pageNum = firstHasCover ? 0 : 1;
        renderActiveContent();
    };

    coverClickWrapper.appendChild(rightZone);
    imgWrapper.appendChild(coverClickWrapper);
    container.appendChild(imgWrapper);
}

/* ==========【新增】故事大封底閱覽 (cover_back) ========== */
function renderStoryCoverBackView(s, container) {
    const state = storyStates[s.id];

    // 導覽列
    const navBar = document.createElement("div");
    navBar.className = "nav-bar";

    const btnPrevCh = document.createElement("button");
    btnPrevCh.className = "nav-btn";
    btnPrevCh.textContent = "上一章";
    btnPrevCh.onclick = function() {
        const lastCh = s.Chapter[s.Chapter.length - 1];
        const isNovel = lastCh.type === 'novel';
        const lastPages = isNovel ? 1 : (lastCh.img ? lastCh.img.length : 0);
        state.mode = 'page';
        state.chapterNum = lastCh.num;
        state.pageNum = lastPages;
        renderActiveContent();
    };
    navBar.appendChild(btnPrevCh);

    const chSelect = document.createElement("select");
    chSelect.className = "nav-select";
    
    const optCover = document.createElement("option");
    optCover.value = "story_cover";
    optCover.textContent = "封面";
    chSelect.appendChild(optCover);

    s.Chapter.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.num;
        opt.textContent = c.num+"."+(c.title || `第 ${c.num} 章`);
        chSelect.appendChild(opt);
    });

    const optCoverBack = document.createElement("option");
    optCoverBack.value = "story_cover_back";
    optCoverBack.textContent = "封底";
    optCoverBack.selected = true;
    chSelect.appendChild(optCoverBack);

    chSelect.onchange = function() {
        const val = chSelect.value;
        if (val === "story_cover") {
            state.mode = 'story_cover';
        } else if (val === "story_cover_back") {
            state.mode = 'story_cover_back';
        } else {
            const targetChNum = parseInt(val);
            const targetCh = s.Chapter.find(c => c.num === targetChNum);
            const targetHasCover = Boolean(targetCh && targetCh.cover && targetCh.cover.trim() !== "");
            state.mode = targetHasCover ? 'chapter_cover' : 'page';
            state.chapterNum = targetChNum;
            state.pageNum = targetHasCover ? 0 : 1;
        }
        renderActiveContent();
    };
    navBar.appendChild(chSelect);

    const btnNextCh = document.createElement("button");
    btnNextCh.className = "nav-btn";
    btnNextCh.textContent = "下一章";
    btnNextCh.disabled = true;
    navBar.appendChild(btnNextCh);

    const btnGoHome = document.createElement("button");
    btnGoHome.className = "nav-btn home-btn";
    btnGoHome.textContent = "目錄";
    btnGoHome.onclick = function() {
        state.mode = 'home';
        renderActiveContent();
    };
    navBar.appendChild(btnGoHome);

    const btnPrevPg = document.createElement("button");
    btnPrevPg.className = "nav-btn";
    btnPrevPg.textContent = "上一頁";
    btnPrevPg.onclick = function() {
        const lastCh = s.Chapter[s.Chapter.length - 1];
        const isNovel = lastCh.type === 'novel';
        const lastPages = isNovel ? 1 : (lastCh.img ? lastCh.img.length : 0);
        state.mode = 'page';
        state.chapterNum = lastCh.num;
        state.pageNum = lastPages;
        renderActiveContent();
    };
    navBar.appendChild(btnPrevPg);

    const btnNextPg = document.createElement("button");
    btnNextPg.className = "nav-btn";
    btnNextPg.textContent = "下一頁";
    btnNextPg.disabled = true;
    navBar.appendChild(btnNextPg);

    container.appendChild(navBar);

    // 標題與作者列
    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = `<div class="space-holder"></div><h2 class="sub-title">${s.title} - 封底 (End)</h2><span class="update-date"></span>`;
    container.appendChild(titleRow);

    const authorRow = document.createElement("div");
    authorRow.className = "author-row";
    authorRow.innerHTML = `<span>封底</span>`;
    
    const bmSaveBtn = document.createElement("button");
    bmSaveBtn.className = "bookmark-save-btn";
    bmSaveBtn.innerHTML = "🔖書籤";
    bmSaveBtn.onclick = function() { saveBookmark(s.id, state); };
    authorRow.appendChild(bmSaveBtn);
    container.appendChild(authorRow);

    // 圖片展示區
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "cover-wrapper img-scroll-x";
    
    const coverClickWrapper = document.createElement("div");
    coverClickWrapper.className = "page-click-wrapper";

    const cImg = document.createElement("img");
    cImg.className = "comic-large-img";
    cImg.src = s.cover_back || "";
    coverClickWrapper.appendChild(cImg);

    const leftZone = document.createElement("div");
    leftZone.className = "click-zone-left";
    leftZone.title = "回上一頁";
    leftZone.onclick = function(e) {
        e.stopPropagation();
        const lastCh = s.Chapter[s.Chapter.length - 1];
        const isNovel = lastCh.type === 'novel';
        const lastPages = isNovel ? 1 : (lastCh.img ? lastCh.img.length : 0);
        state.mode = 'page';
        state.chapterNum = lastCh.num;
        state.pageNum = lastPages;
        renderActiveContent();
    };

    coverClickWrapper.appendChild(leftZone);
    imgWrapper.appendChild(coverClickWrapper);
    container.appendChild(imgWrapper);
}
/* ==========【修改結束】章節檢視核心 (封底與大封面) ========== */