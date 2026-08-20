/**
 * 外部共用分頁邏輯與渲染套件
 * 支援內嵌網頁，核心資料由外部傳入，完全防範全域變數污染
 */

// 內部狀態管理（封裝在區域或全域環境，防止重複宣告噴錯）
if (!window.nodes) window.nodes = [];
if (!window.currentStep) window.currentStep = 0;

// 提供給全域的共用參數暫存器，確保 showDetail 或其他點擊事件隨時能抓到最新的變數
var _sharedOrgColor = [];
var _sharedCharRelL = [];

// ==========================================
// 總入口初始化函式
// ==========================================
function initGlobalTabs(orgColorData, charRelData) {
    // 緩存資料供內部的工具函式（如 showDetail、findNameById）使用
    _sharedOrgColor = orgColorData;
    _sharedCharRelL = charRelData;

    // 執行第一個頁籤：關係網物理圖
    initRelationshipChart(orgColorData, charRelData);
    
    // 執行第二個頁籤：角色檔案資料庫
    initCharacterDatabase(charRelData);
}

// ==========================================
// 核心工具函式
// ==========================================
function getPlayerOrgNames(nodeData) {
    if (!nodeData || !Array.isArray(nodeData.org)) return [];
    return nodeData.org.map(o => o.orgName).filter(name => name);
}

function findNameById(id) {
    const char = _sharedCharRelL.find(c => c.id === Number(id));
    return char ? char.name : `未知目標(ID:${id})`;
}

function switchTab(id) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    const targetContent = document.getElementById(id);
    if (targetContent) targetContent.classList.add('active');
}

// ==========================================
// 【第一個頁籤】關係圖獨立 Function
// ==========================================
function initRelationshipChart(orgColor, charRelL) {
    window.currentStep = 0; // 重置步數
    let stageWidth = 0;
    let stageHeight = 0;
    const maxSteps = 150;

    const stage = document.getElementById("char_Rel");
    if (!stage) return;
    stageWidth = stage.clientWidth || 900;
    stageHeight = stage.clientHeight || 700;

    // 初始節點座標
    window.nodes = charRelL.map(char => {
        return {
            id: char.id,
            data: char,
            x: Math.random() * (stageWidth - 300) + 150,
            y: Math.random() * (stageHeight - 300) + 150,
            vx: 0,
            vy: 0
        };
    });

    const relationStage = document.getElementById("relation-stage");
    if (!relationStage) return;

    // 清除舊頭像節點
    document.querySelectorAll('.char-node').forEach(el => el.remove());

    // 建立新的 DOM 節點
    window.nodes.forEach(node => {
        const div = document.createElement("div");
        div.className = "char-node";
        div.id = "node-" + node.id;
        div.style.left = (node.x - 40) + "px";
        div.style.top = (node.y - 40) + "px";
        
        const img = document.createElement("img");
        img.className = "char-avatar";
        img.src = node.data.url;
        img.alt = node.data.name;
        img.style.borderColor = node.data.borderColer || "var(--white)";
        
        const nameDiv = document.createElement("div");
        nameDiv.className = "char-name";
        nameDiv.textContent = node.data.name;
        
        div.appendChild(img);
        div.appendChild(nameDiv);
        relationStage.appendChild(div);
    });

    // 物理力學演算引擎
    function updatePhysics() {
        const repelForce = 5500;  
        const linkForce = 0.07;   
        const orgForce = 0.05;    
        const centerForce = 0.01; 
        const friction = 0.72;    
        const minDistance = 360;  

        const centerX = stageWidth / 2;
        const centerY = stageHeight / 2;

        for (let i = 0; i < window.nodes.length; i++) {
            let nodeA = window.nodes[i];
            nodeA.vx += (centerX - nodeA.x) * centerForce;
            nodeA.vy += (centerY - nodeA.y) * centerForce;

            for (let j = 0; j < window.nodes.length; j++) {
                if (i === j) continue;
                let nodeB = window.nodes[j];

                let dx = nodeB.x - nodeA.x;
                let dy = nodeB.y - nodeA.y;
                let distance = Math.sqrt(dx * dx + dy * dy) || 1;

                if (distance < minDistance) {
                    nodeA.vx -= (dx / distance) * (repelForce / distance);
                    nodeA.vy -= (dy / distance) * (repelForce / distance);
                }

                let hasRelation = (nodeA.data.Rel && nodeA.data.Rel.some(r => r.id === nodeB.id)) || 
                                  (nodeB.data.Rel && nodeB.data.Rel.some(r => r.id === nodeA.id));
                if (hasRelation && distance > 200) { 
                    nodeA.vx += dx * linkForce;
                    nodeA.vy += dy * linkForce;
                }

                let orgsA = getPlayerOrgNames(nodeA.data);
                let orgsB = getPlayerOrgNames(nodeB.data);
                let hasCommonOrg = orgsA.some(o => orgsB.includes(o) && o !== "未知勢力");
                
                if (hasCommonOrg && distance > 220) {
                    nodeA.vx += dx * orgForce;
                    nodeA.vy += dy * orgForce;
                }
            }
        }

        window.nodes.forEach(node => {
            node.vx *= friction;
            node.vy *= friction;
            node.x += node.vx;
            node.y += node.vy;
        });
    }

    // 當演算完成後自適應視窗調整
    function resizeStageToFitNodes() {
        if (window.nodes.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        window.nodes.forEach(node => {
            if (node.x - 40 < minX) minX = node.x - 40;
            if (node.y - 40 < minY) minY = node.y - 40;
            if (node.x + 40 > maxX) maxX = node.x + 40;
            if (node.y + 60 > maxY) maxY = node.y + 60;
        });

        const padding = 90; 
        let requiredWidth = (maxX - minX) + (padding * 2);
        let requiredHeight = (maxY - minY) + (padding * 2);

        const container = document.getElementById("char_Rel");
        if (requiredWidth < container.clientWidth) requiredWidth = container.clientWidth;
        if (requiredHeight < container.clientHeight) requiredHeight = container.clientHeight;

        const offsetX = padding - minX;
        const offsetY = padding - minY;
        
        window.nodes.forEach(node => {
            node.x += offsetX;
            node.y += offsetY;
        });

        relationStage.style.width = requiredWidth + "px";
        relationStage.style.height = requiredHeight + "px";

        drawFrame();
    }

    // 核心重繪畫布邏輯
    function drawFrame() {
        const svgLines = document.getElementById("svg-lines");
        const svgDefs = document.getElementById("svg-defs");
        if (!svgLines || !relationStage) return;
        
        svgLines.innerHTML = ""; 

        // 1. 更新頭像 DOM 位置
        window.nodes.forEach(node => {
            const el = document.getElementById("node-" + node.id);
            if (el) {
                el.style.left = (node.x - 40) + "px";
                el.style.top = (node.y - 40) + "px";
            }
        });

        // 2. 重繪洋蔥組織框
        document.querySelectorAll('.org-box').forEach(el => el.remove());
        const drawnOrgs = [];

        orgColor.forEach((orgData, orgIndex) => {
            const members = window.nodes.filter(n => getPlayerOrgNames(n.data).includes(orgData.org));
            if (members.length === 0) return;

            let baseMinX = Infinity, baseMinY = Infinity, baseMaxX = -Infinity, baseMaxY = -Infinity;
            members.forEach(n => {
                if (n.x < baseMinX) baseMinX = n.x;
                if (n.y < baseMinY) baseMinY = n.y;
                if (n.x > baseMaxX) baseMaxX = n.x;
                if (n.y > baseMaxY) baseMaxY = n.y;
            });

            let currentPadding = 65 + (orgIndex * 6); 
            let maxLoop = 5; 
            for (let k = 0; k < maxLoop; k++) {
                let needExpand = false;
                let currentLeft = baseMinX - currentPadding;
                let currentTop = baseMinY - currentPadding;
                let currentRight = baseMaxX + currentPadding;
                let currentBottom = baseMaxY + currentPadding;

                for (let i = 0; i < drawnOrgs.length; i++) {
                    const drawn = drawnOrgs[i];
                    const hasCommonMember = members.some(m => drawn.memberIds.includes(m.id));
                    const isSameMembers = drawn.memberIds.length === members.length && 
                                          members.every(m => drawn.memberIds.includes(m.id));

                    if (isSameMembers) {
                        if (currentPadding <= drawn.usedPadding) {
                            currentPadding = drawn.usedPadding + 24;
                            needExpand = true;
                        }
                    } else if (!hasCommonMember) {
                        const gap = 5; 
                        const isColliding = !(
                            currentRight + gap < drawn.finalLeft ||
                            currentLeft - gap > drawn.finalRight ||
                            currentBottom + gap < drawn.finalTop ||
                            currentTop - gap > drawn.finalBottom
                        );
                        if (isColliding) {
                            currentPadding += 15; 
                            needExpand = true;
                            break; 
                        }
                    } else {
                        const gap = 6;
                        const isBorderTooClose = (
                            Math.abs(currentLeft - drawn.finalLeft) < gap ||
                            Math.abs(currentTop - drawn.finalTop) < gap ||
                            Math.abs(currentRight - drawn.finalRight) < gap ||
                            Math.abs(currentBottom - drawn.finalBottom) < gap
                        );
                        if (isBorderTooClose) {
                            currentPadding += 8; 
                            needExpand = true;
                            break;
                        }
                    }
                }
                if (!needExpand) break; 
            }

            let finalLeft = baseMinX - currentPadding;
            let finalTop = baseMinY - currentPadding;
            let finalRight = baseMaxX + currentPadding;
            let finalBottom = baseMaxY + currentPadding;

            drawnOrgs.push({
                orgName: orgData.org,
                memberIds: members.map(m => m.id),
                minX: baseMinX, minY: baseMinY,
                usedPadding: currentPadding,
                finalLeft: finalLeft, finalTop: finalTop,
                finalRight: finalRight, finalBottom: finalBottom
            });

            const orgBox = document.createElement("div");
            orgBox.className = "org-box";
            orgBox.style.left = finalLeft + "px";
            orgBox.style.top = finalTop + "px";
            orgBox.style.width = (finalRight - finalLeft) + "px";
            orgBox.style.height = (finalBottom - finalTop) + "px";
            orgBox.style.borderColor = orgData.borderColer;
            orgBox.style.backgroundColor = orgData.bgcolor;

            const label = document.createElement("div");
            label.className = "org-label";
            label.style.backgroundColor = orgData.borderColer;
            label.textContent = orgData.org;
            label.style.color = orgData.color || "var(--white)";
            
            if (orgIndex === 0) {
                label.style.left = "15px"; label.style.top = "-12px"; label.style.right = "auto";
            } else if (orgIndex === 1) {
                label.style.right = "15px"; label.style.top = "-12px"; label.style.left = "auto";  
            } else if (orgIndex === 2) {
                label.style.left = "15px"; label.style.bottom = "-12px"; label.style.top = "auto";
            } else {
                label.style.right = "15px"; label.style.bottom = "-12px"; label.style.top = "auto";
            }
            
            orgBox.appendChild(label);
            relationStage.appendChild(orgBox);
        });

        // 3. 重繪關係連線
        const renderedPairs = new Set();
        window.nodes.forEach(nodeA => {
            if (!nodeA.data.Rel) return;
            nodeA.data.Rel.forEach(relation => {
                const nodeB = window.nodes.find(n => n.id === relation.id);
                if (!nodeB) return;

                const reverseRel = nodeB.data.Rel ? nodeB.data.Rel.find(r => r.id === nodeA.id) : null;
                const isTwoWay = !!reverseRel;
                const relNamesA = relation.rel.map(r => r.name).join('/');
                const isPublicA = relation.rel[0]?.is_public === "O";

                const markerIdA = "marker-id-" + nodeA.id;
                createMarker(svgDefs, markerIdA, nodeA.data.borderColer);

                if (!isTwoWay) {
                    const angle = Math.atan2(nodeB.y - nodeA.y, nodeB.x - nodeA.x);
                    const startX = nodeA.x + Math.cos(angle) * 36;
                    const startY = nodeA.y + Math.sin(angle) * 36;
                    const endX = nodeB.x - Math.cos(angle) * 46;
                    const endY = nodeB.y - Math.sin(angle) * 46;

                    const path = createSvgPath(startX, startY, endX, endY, nodeA.data.borderColer, isPublicA, markerIdA);
                    const text = createSvgText((startX+endX)/2, (startY+endY)/2 - 8, relNamesA, nodeA.data.borderColer);
                    svgLines.appendChild(path);
                    svgLines.appendChild(text);
                } else {
                    const pairKey = [nodeA.id, nodeB.id].sort().join('-');
                    if (renderedPairs.has(pairKey)) return;
                    renderedPairs.add(pairKey);

                    const markerIdB = "marker-id-" + nodeB.id;
                    createMarker(svgDefs, markerIdB, nodeB.data.borderColer);
                    const relNamesB = reverseRel.rel.map(r => r.name).join('/');
                    const isPublicB = reverseRel.rel[0]?.is_public === "O";

                    const midX = (nodeA.x + nodeB.x) / 2;
                    const midY = (nodeA.y + nodeB.y) / 2;
                    const angle = Math.atan2(nodeB.y - nodeA.y, nodeB.x - nodeA.x);

                    const startXA = nodeA.x + Math.cos(angle) * 36;
                    const startYA = nodeA.y + Math.sin(angle) * 36;
                    const endXA = midX - Math.cos(angle) * 6;
                    const endYA = midY - Math.sin(angle) * 6;
                    const pathA = createSvgPath(startXA, startYA, endXA, endYA, nodeA.data.borderColer, isPublicA, markerIdA);

                    const startXB = nodeB.x - Math.cos(angle) * 36;
                    const startYB = nodeB.y - Math.sin(angle) * 36;
                    const endXB = midX + Math.cos(angle) * 6;
                    const endYB = midY + Math.sin(angle) * 6;
                    const pathB = createSvgPath(startXB, startYB, endXB, endYB, nodeB.data.borderColer, isPublicB, markerIdB);

                    const textA = createSvgText((startXA + endXA) / 2, (startYA + endYA) / 2 - 8, relNamesA, nodeA.data.borderColer);
                    const textB = createSvgText((startXB + endXB) / 2, (startYB + endYB) / 2 - 8, relNamesB, nodeB.data.borderColer);

                    svgLines.appendChild(pathA);
                    svgLines.appendChild(pathB);
                    svgLines.appendChild(textA);
                    svgLines.appendChild(textB);
                }
            });
        });
    }

    // SVG 繪圖內部輔助工具
    function createSvgPath(sx, sy, ex, ey, color, isPublic, markerId) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M " + sx + " " + sy + " L " + ex + " " + ey);
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        path.setAttribute("marker-end", "url(#" + markerId + ")");
        if (!isPublic) path.setAttribute("stroke-dasharray", "5,5");
        return path;
    }

    function createMarker(defs, id, color) {
        if (!defs || document.getElementById(id)) return;
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", id);
        marker.setAttribute("viewBox", "0 0 10 10");
        marker.setAttribute("refX", "6");
        marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "6");
        marker.setAttribute("markerHeight", "6");
        marker.setAttribute("orient", "auto-start-reverse");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M 0 1 L 10 5 L 0 9 z");
        path.setAttribute("fill", color);
        marker.appendChild(path);
        defs.appendChild(marker);
    }

    function createSvgText(x, y, txt, color) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y);
        text.setAttribute("fill", color);
        text.setAttribute("font-size", "11px");
        text.setAttribute("font-weight", "bold");
        text.setAttribute("text-anchor", "middle");
        text.textContent = txt;
        return text;
    }

    // 啟動動畫迴圈
    function animate() {
        if (window.currentStep < maxSteps) {
            updatePhysics(); 
            drawFrame();     
            window.currentStep++;
            requestAnimationFrame(animate);
        } else {
            resizeStageToFitNodes();
        }
    }
    
    animate();
}

// ==========================================
// 【第二個頁籤】檔案資料庫獨立 Function
// ==========================================
function initCharacterDatabase(charRelL) {
    const container = document.getElementById("database-container");
    if (!container) return;
    container.innerHTML = "";

    charRelL.forEach(char => {
        const row = document.createElement("div");
        row.className = "character-row";

        // --- 左區塊 ---
        const bLeft = document.createElement("div");
        bLeft.className = "block-common block-left";
        
        const img = document.createElement("img");
        img.src = char.url;
        img.style.borderColor = char.borderColer || "var(--white)";
        
        const txtInfo = document.createElement("div");
        txtInfo.style = "width:90%;";
        txtInfo.innerHTML = `
            <strong>${char.name}</strong>
            <div><span class="info-lbl">定位 </span>${char.role}</div>
            <div><span class="info-lbl">立場 </span>${char.POS}</div>
        `;
        bLeft.appendChild(img);
        bLeft.appendChild(txtInfo);

        // --- 中區塊 ---
        const bMid = document.createElement("div");
        bMid.className = "block-common block-mid";
        
        let orgHtml = `<div class="block-title">隸屬組織</div>`;
        if (char.org && char.org.length > 0) {
            char.org.forEach((o, oIdx) => {
                orgHtml += `<span class="click-link" onclick="showDetail(${char.id}, 'org', ${oIdx})">🏚️ ${o.orgName}</span>`;
            });
        } else {
            orgHtml += `<div>暫無隸屬組織</div>`;
        }

        let relHtml = `<div class="block-title">關聯角色</div>`;
        if (char.Rel && char.Rel.length > 0) {
            char.Rel.forEach((r, rIdx) => {
                const targetName = findNameById(r.id);
                relHtml += `<span class="click-link" onclick="showDetail(${char.id}, 'rel', ${rIdx})">👤 ${targetName}</span>`;
            });
        } else {
            relHtml += `<div>邊緣人，無關連角色</div>`;
        }
        
        bMid.innerHTML = orgHtml + relHtml;

        // --- 右區塊 ---
        const bRight = document.createElement("div");
        bRight.className = "block-common block-right";
        bRight.id = `detail-${char.id}`;
        bRight.innerHTML = `<div class="detail-placeholder">請點擊中間的組織或關係檢視詳細檔案</div>`;

        row.appendChild(bLeft);
        row.appendChild(bMid);
        row.appendChild(bRight);
        container.appendChild(row);
    });
}

//右側詳細資訊面板動態渲染
function showDetail(charId, type, index) {
    const rightBlock = document.getElementById(`detail-${charId}`);
    const char = _sharedCharRelL.find(c => c.id === charId);
    if (!rightBlock || !char) return;

    rightBlock.innerHTML = ""; 

    if (type === 'rel') {
        const relData = char.Rel[index];
        const targetName = findNameById(relData.id);
        
        const rawLiking = parseInt(relData.liking) || 0;
        const absLiking = Math.min(Math.abs(rawLiking), 100); 
        const barClass = rawLiking >= 0 ? "positive" : "negative";

        let html = `<div class="relTitle">${char.name} ⮕ ${targetName}</div>`;
        html += `<div style="margin:5px;">
                    <div class="liking-container">
                        <strong>好感 </strong>
                        <div class="liking-bar-bg">
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 2; font-size: 12px; color: var(--white); text-shadow: 1px 1px 2px var(--black-trans); pointer-events: none;">
                                ${rawLiking}</div>
                            <div class="liking-bar-fill ${barClass}" style="width: ${absLiking}%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; transition: width 0.3s ease;"></div>
                        </div>
                    </div>`;
        html += `<div class="text-hide-info"><strong>隱藏資訊 </strong>${relData.hide || "無"}</div>`;
        html += `<div><strong>評價 </strong>${relData.view || "無評價"}</div></div>`;

        if (relData.rel && relData.rel.length > 0) {
            relData.rel.forEach(rItem => {
                const isPublicText = rItem.is_public === "O" ? "公開" : "隱藏";
                const borderClass = rItem.is_public === "O" ? "public-O" : "public-X";
                
                html += `
                    <div class="rel-item-box ${borderClass}">
                        <div style="margin-top:4px;"><strong>關係 </strong>${rItem.name} (${isPublicText})</div>
                        <div><strong>事件 </strong>${rItem.key_event || "無"}</div>
                    </div>
                `;
            });
        }
        rightBlock.innerHTML = html;

    } else if (type === 'org') {
        const orgData = char.org[index];
        let html = `
            <div class="org-item-box">
                <div class="relTitle">隸屬 ${orgData.orgName}</div>
                <div style="margin:5px;">
                <div><strong>身分 </strong>${orgData.orgRole || "普通成員"}</div>
                <div><strong>等級 </strong>${orgData.level || "無"}</div>
                <div>${orgData.Status || "狀態"} ｜<strong>期間 </strong>${orgData.date || "未知"}</div>
                <div><strong>評價 </strong>${orgData.view || "無"}</div>
                </div>
            </div>
        `;
        rightBlock.innerHTML = html;
    }
}