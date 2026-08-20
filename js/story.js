

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

    //1. 先處理【年齡分級/警告畫面】(這部分保持不變，維持最優先阻擋)
    const rData = rating.find(r => r.title === s.Rating);
    const cData = Categories.find(c => c.title === s.Category);

    

    if (state.mode === 'home') {
        // A. 【標籤區】
        const tagsSection = document.createElement("div");
        tagsSection.className = "tags-section";
        
        let tagsHTML = `<div class="tag-content">`;
        if(s.Rating) {
            const bColor = rData ? rData.color : "var(--dark-gray3)";
            const bLogo = rData ? rData.logo : "?";
            tagsHTML += '<div class="tag-row"><span class="tag-label">分級</span><span class="tag-badge" style="background-color:' + bColor + '">' + bLogo + '</span><span>' + s.Rating + '</span></div>';
        }
        if(s.Archive_Warning) {
            tagsHTML += '<div class="tag-row"><span class="tag-label">預警</span><span class="warning-text">' + s.Archive_Warning + '</span></div>';
        }
        if(s.Category) {
            const bColor = cData ? cData.color : "var(--dark-gray3)";
            const bLogo = cData ? cData.logo : "?";
            tagsHTML += '<div class="tag-row"><span class="tag-label">類別</span><span class="tag-badge" style="background-color:' + bColor + '">' + bLogo + '</span><span>' + s.Category + '</span></div>';
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
        // B. 【漫畫閱覽區】
        if(rData && rData.alarm && !state.unlocked) {
            const alarmDiv = document.createElement("div");
            alarmDiv.className = "alarm-screen";
            alarmDiv.innerHTML = '<div class="alarm-title"><span class="tag-badge" style="background-color:' + rData.color + '; width:36px; height:36px; font-size:16px;">' + rData.logo + '</span><span>' + s.Rating + '</span></div><div class="alarm-content">' + (rData.alarmcontent || "本作品內含限制級成分，請斟酌觀看。") + '</div>';
            const acceptBtn = document.createElement("button");
            acceptBtn.className = "alarm-btn";
            acceptBtn.textContent = "已成年，繼續觀看";
            acceptBtn.onclick = function() {
                state.unlocked = true;
                renderStoryHome(s, viewerSection);
                renderActiveContent();
            };
            alarmDiv.appendChild(acceptBtn);
            viewerSection.appendChild(alarmDiv);
            }else {
            // 🔓 如果沒鎖、或是點擊確認了，閱覽區渲染「故事首頁封面」
            renderStoryHome(s, viewerSection);
            }
        } else {
            contentContainer.appendChild(viewerSection);
            renderChapterViewer(s, viewerSection);
        }
}

// 3. 故事首頁模式
function renderStoryHome(s, container) {
    clearHistoryRecord(s.id); 

    const homeLayout = document.createElement("div");
    homeLayout.className = "story-home-layout";

    if(s.Intro) {
        const introBox = document.createElement("div");
        introBox.className = "intro-box";
        introBox.innerHTML = "<strong>簡介：</strong><br>" + s.Intro;
        homeLayout.appendChild(introBox);
    }

    const mainFlex = document.createElement("div");
    mainFlex.className = "home-main-flex";

    //封面改為直接讀取 s.cover 欄位
    if(s.cover) {
        const coverWrapper = document.createElement("div");
        coverWrapper.className = "cover-wrapper img-scroll-x";
        const coverImg = document.createElement("img");
        coverImg.className = "comic-large-img";
        coverImg.src = s.cover;
        coverImg.alt = "故事封面";
        coverImg.onload = function() {
            if(coverImg.clientWidth > coverWrapper.clientWidth) coverWrapper.classList.add("overflowing");
        };
        coverWrapper.appendChild(coverImg);
        mainFlex.appendChild(coverWrapper);
    }

    // 章節列表
    if(s.Chapter && s.Chapter.length > 0) {
        const listBox = document.createElement("div");
        listBox.className = "chapter-list-box";

        s.Chapter.forEach(ch => {
            const item = document.createElement("div");
            item.className = "nav_btn chapter-item";
            item.onclick = function() {
                storyStates[s.id].mode = 'chapter_cover';
                storyStates[s.id].chapterNum = ch.num;
                storyStates[s.id].pageNum = 0;
                renderActiveContent();
            };

            const thumb = document.createElement("img");
            thumb.className = "thumb-square";
            //縮圖直接使用章節封面 ch.cover
            thumb.src = ch.cover || "";
            thumb.onerror = function() { 
                thumb.style.backgroundColor = "var(--bright-gray1)";
            };

            const titleDiv = document.createElement("div");
            titleDiv.className = "chapter-item-title";
            titleDiv.innerHTML = "第"+ch.num+"章<br>"+ch.title || `第 ${ch.num} 章`;
            titleDiv.title = ch.title;

            item.appendChild(thumb);
            item.appendChild(titleDiv);
            listBox.appendChild(item);
        });
        mainFlex.appendChild(listBox);
    }

    homeLayout.appendChild(mainFlex);
    container.appendChild(homeLayout);
}

// 4. 章節檢視核心 (包含導覽控制、章節封面、章節內頁)
function renderChapterViewer(s, container) {
    const state = storyStates[s.id];
    const currentChIdx = s.Chapter.findIndex(c => c.num === state.chapterNum);
    const ch = s.Chapter[currentChIdx] || s.Chapter[0];
    if(!ch) {
        state.mode = 'home';
        renderStoryHome(s, container);
        return;
    }

    if(state.mode === 'page') {
        saveHistoryRecord(s.id, state);
    } else if(state.mode === 'chapter_cover') {
        clearHistoryRecord(s.id); 
    }

    //計算當前章節總頁數 (1頁封面 + 實際內頁數)
    const isNovel = ch.type === 'novel';
    const totalPagesCount = isNovel ? 1 : (ch.img ? ch.img.length : 0); 
    const totalPagesIncludingCover = 1 + totalPagesCount; 

    // ---- 建立上方導覽列 (共用元件) ----
    const navBar = document.createElement("div");
    navBar.className = "nav-bar";

    // [上一章]
    if(currentChIdx > 0) {
        const btnPrevCh = document.createElement("button");
        btnPrevCh.className = "nav-btn";
        btnPrevCh.textContent = "上一章";
        btnPrevCh.onclick = function() {
            state.mode = 'chapter_cover';
            state.chapterNum = s.Chapter[currentChIdx - 1].num;
            state.pageNum = 0;
            renderActiveContent();
        };
        navBar.appendChild(btnPrevCh);
    }

    // [章節選單]
    const chSelect = document.createElement("select");
    chSelect.className = "nav-select";
    s.Chapter.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.num;
        opt.textContent = c.num+"."+c.title || `第 ${c.num} 章`;
        if(c.num === state.chapterNum) {
            opt.selected = true;
            opt.style.backgroundColor = "var(--bright-blue-trans)";
        }
        chSelect.appendChild(opt);
    });
    chSelect.onchange = function() {
        state.mode = 'chapter_cover';
        state.chapterNum = parseInt(chSelect.value);
        state.pageNum = 0;
        renderActiveContent();
    };
    navBar.appendChild(chSelect);

    // [下一章]
    if(currentChIdx !== -1 && currentChIdx < s.Chapter.length - 1) {
        const btnNextCh = document.createElement("button");
        btnNextCh.className = "nav-btn";
        btnNextCh.textContent = "下一章";
        btnNextCh.onclick = function() {
            state.mode = 'chapter_cover';
            state.chapterNum = s.Chapter[currentChIdx + 1].num;
            state.pageNum = 0;
            renderActiveContent();
        };
        navBar.appendChild(btnNextCh);
    }

    // [回到故事封面]
    const btnGoHome = document.createElement("button");
    btnGoHome.className = "nav-btn";
    btnGoHome.style.backgroundColor = "var(--border-brown-trans)"; 
    btnGoHome.textContent = "故事封面";
    btnGoHome.onclick = function() {
        state.mode = 'home';
        state.pageNum = 0;
        renderActiveContent(); 
    };
    navBar.appendChild(btnGoHome);

    // [上一頁]
    if (!(state.mode === 'chapter_cover')) {
        const btnPrevPg = document.createElement("button");
        btnPrevPg.className = "nav-btn";
        btnPrevPg.textContent = "上一頁";
        btnPrevPg.onclick = function() {
            handlePrevPageLogic();
        };
        navBar.appendChild(btnPrevPg);
    }

    // [頁選單]
    const pgSelect = document.createElement("select");
    pgSelect.className = "nav-select";
    for(let p = 0; p < totalPagesIncludingCover; p++) {
        const opt = document.createElement("option");
        opt.value = p;
        if(p === 0) {
            opt.textContent = "章節封面";
            if(state.mode === 'chapter_cover') { opt.selected = true; opt.style.backgroundColor = "var(--bright-gray1)"; }
        } else {
            opt.textContent = isNovel ? "小說內文" : `第 ${p} 頁`; 
            if(state.mode === 'page' && state.pageNum === p) { opt.selected = true; opt.style.backgroundColor = "var(--bright-gray1)"; }
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
    if (!(state.mode === 'page' && state.pageNum === totalPagesIncludingCover - 1 && currentChIdx === s.Chapter.length - 1)) {
        const btnNextPg = document.createElement("button");
        btnNextPg.className = "nav-btn";
        btnNextPg.textContent = "下一頁";
        btnNextPg.onclick = function() {
            handleNextPageLogic();
        };
        navBar.appendChild(btnNextPg);
    }

    container.appendChild(navBar);

    // ---- 標題與更新日期列 ----
    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = '<div class="space-holder"></div><h2 class="sub-title">' + (ch.num+"."+ch.title || '未命名章節') + '</h2><span class="update-date">更新日期：' + (ch.Published || '未知') + '</span>';
    container.appendChild(titleRow);

    //共用導覽核心邏輯：上一頁 / 上一章
    function handlePrevPageLogic() {
        if (state.mode === 'chapter_cover') {
            // 在封面點擊左邊：切換到上一章的尾頁
            if (currentChIdx > 0) {
                const prevCh = s.Chapter[currentChIdx - 1];
                const prevChIsNovel = prevCh.type === 'novel';
                const prevChPages = prevChIsNovel ? 1 : (prevCh.img ? prevCh.img.length : 0);
                
                state.mode = 'page';
                state.chapterNum = prevCh.num;
                state.pageNum = prevChPages; // 跳到最後一頁
                renderActiveContent();
            }
        } else if (state.mode === 'page') {
            if (state.pageNum === 1) {
                state.mode = 'chapter_cover';
                state.pageNum = 0;
            } else {
                state.pageNum--;
            }
            renderActiveContent();
        }
    }

    //共用導覽核心邏輯：下一頁 / 下一章
    function handleNextPageLogic() {
        if (state.mode === 'chapter_cover') {
            // 在封面點擊右邊：進入本章第一頁
            state.mode = 'page';
            state.pageNum = 1;
            renderActiveContent();
        } else if (state.mode === 'page') {
            if (state.pageNum === totalPagesIncludingCover - 1) {
                // 已在當前章節尾頁，點擊右邊：切換到下一章的封面
                if (currentChIdx < s.Chapter.length - 1) {
                    state.mode = 'chapter_cover';
                    state.chapterNum = s.Chapter[currentChIdx + 1].num;
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
    if(state.mode === 'chapter_cover') {
        // 1. 概要
        if(ch.Summary) {
            const sumBox = document.createElement("div");
            sumBox.className = "intro-box";
            sumBox.innerHTML = "<strong>概要：</strong><br>" + ch.Summary;
            container.appendChild(sumBox);
        }

        // 2. 章節大封面
        const imgWrapper = document.createElement("div");
        imgWrapper.className = "cover-wrapper img-scroll-x";
        
        //讓封面也包裹在 page-click-wrapper 中，以便點擊左右切章節/頁面
        const coverClickWrapper = document.createElement("div");
        coverClickWrapper.className = "page-click-wrapper";

        if(ch.cover) {
            const cCover = document.createElement("img");
            cCover.className = "comic-large-img";
            cCover.src = ch.cover;
            cCover.onload = function() {
                if(cCover.clientWidth > imgWrapper.clientWidth) imgWrapper.classList.add("overflowing");
            };
            coverClickWrapper.appendChild(cCover);
        } else {
            // 若無封面，做一個佔位空盒讓點擊機制正常運作
            const placeholder = document.createElement("div");
            placeholder.style.cssText = "width:700px; height:920px; background:#222;";
            coverClickWrapper.appendChild(placeholder);
        }

        //為封面綁定左右點擊區
        const leftZone = document.createElement("div");
        leftZone.className = "click-zone-left";
        leftZone.title = currentChIdx > 0 ? "回上一章尾頁" : "這是第一章";
        leftZone.onclick = function(e) { e.stopPropagation(); handlePrevPageLogic(); };

        const rightZone = document.createElement("div");
        rightZone.className = "click-zone-right";
        rightZone.title = "進入內文";
        rightZone.onclick = function(e) { e.stopPropagation(); handleNextPageLogic(); };

        coverClickWrapper.appendChild(leftZone);
        coverClickWrapper.appendChild(rightZone);
        imgWrapper.appendChild(coverClickWrapper);
        container.appendChild(imgWrapper);

        // 3. 各頁縮圖展示區 (小說不顯示)
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
                gThumb.onerror = function() { gThumb.style.backgroundColor = "var(--bright-gray1)"; };
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
        // 【章節內頁模式】
        const pageWrapper = document.createElement("div");
        pageWrapper.className = "center-wrapper img-scroll-x";

        const clickWrapper = document.createElement("div");
        clickWrapper.className = "page-click-wrapper" + (isNovel ? " type-novel" : ""); //小說模式加上特殊 class

        if (isNovel) {
            // ---- 小說讀取模式 ----
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
            // ---- 傳統漫畫模式 ----
            const pageObj = ch.img[state.pageNum - 1];
            const pageSrc = pageObj ? pageObj.url : "";

            const pageImg = document.createElement("img");
            pageImg.className = "comic-large-img";
            pageImg.src = pageSrc;
            
            pageImg.onerror = function() { 
                pageImg.style.display = "none";
                const errorDiv = document.createElement("div");
                errorDiv.style.cssText = "width: 700px; height: 920px; background-color: var(--dark-gray1); color: var(--white); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;";
                errorDiv.textContent = "[ 第 " + state.pageNum + " 頁圖片載入失敗 ]";
                clickWrapper.appendChild(errorDiv);
            };

            pageImg.onload = function() {
                if(pageImg.clientWidth > pageWrapper.clientWidth) pageWrapper.classList.add("overflowing");
            };

            clickWrapper.appendChild(pageImg);
        }

        //左右側點擊區 (統一調用新邏輯)
        const leftZone = document.createElement("div");
        leftZone.className = "click-zone-left";
        leftZone.title = state.pageNum === 1 ? "回章節封面" : "上一頁";
        leftZone.onclick = function(e) { e.stopPropagation(); handlePrevPageLogic(); };

        const rightZone = document.createElement("div");
        rightZone.className = "click-zone-right";
        rightZone.title = state.pageNum === totalPagesIncludingCover - 1 ? (currentChIdx < s.Chapter.length - 1 ? "切換至下一章封面" : "本作品結束") : "下一頁";
        rightZone.onclick = function(e) { e.stopPropagation(); handleNextPageLogic(); };

        clickWrapper.appendChild(leftZone);
        clickWrapper.appendChild(rightZone);
        pageWrapper.appendChild(clickWrapper);
        container.appendChild(pageWrapper);

        // 4. 後記 (只出現在最後一頁)
        if(state.pageNum === totalPagesIncludingCover - 1 && ch.Notes) {
            const notesBox = document.createElement("div");
            notesBox.className = "notes-box";
            notesBox.innerHTML = "<strong>作者後記：</strong>" + ch.Notes;
            container.appendChild(notesBox);
        }
    }
}

function saveHistoryRecord(storyId, state) {
    localStorage.setItem(`comic_history_story_${storyId}`, JSON.stringify({
        mode: state.mode,
        chapterNum: state.chapterNum,
        pageNum: state.pageNum
    }));
}

function clearHistoryRecord(storyId) {
    localStorage.removeItem(`comic_history_story_${storyId}`);
}
