function setpwd(){//密碼驗證
    var testInput = localStorage.getItem('wctotg_APPLE');
    if(testInput=="654321"){
        document.getElementById("mima").style.display = "none";
        document.getElementsByClassName("page_article")[0].style.display = "";
        login();
        return;
        }
    testInput = document.getElementById("pwd").value;
    if(testInput=="654321"){
        localStorage.setItem('wctotg_APPLE',testInput);
        document.getElementById("mima").style.display = "none";
        document.getElementsByClassName("page_article")[0].style.display = "";
        login();
        return;
        }
    else{
        window.alert("請輸入正確密碼");
        document.getElementById("side-bar").innerHTML = "請登入";
        }
    }
function login(){//切換功能
    const pageData = [
        { title: "網站導引", path: "Intro",webtype: "html" },
        { title: "故事", path: "Story",webtype: "html" },
        { 
            title: "設定➤角色", 
            path: "Settings_Characters",
            webtype: "menu",
            children: [
                { title: "人際關係", path: "char_relationship_chart",webtype: "son-html" },
                { title: "角色檔案", path: "char_profiles",webtype: "son-html" }
                ]
            },
        { 
            title: "設定➤世界觀", 
            path: "Settings_World",
            webtype: "menu",
            children: [
                { title: "地圖與景點", path: "world_map",webtype: "son-html" },
                { title: "歷史年表", path: "world_timeline",webtype: "son-html" },
                { title: "超自然與技術設定", path: "world_special",webtype: "son-html" },
                { title: "文化百科", path: "world_lore",webtype: "son-html" }
                ]
            },
        { title: "塗鴉/雜圖", path: "Doodles",webtype: "html" },
        { title: "實體化周邊展示", path: "Goods",webtype: "html" },
        { title: "碎碎念", path: "Notes",webtype: "html" }
    ];
    var allPage = "<div class=\"menu-btn\" style = \"width:220px;height:30px;padding:5px;padding-right:10px;text-align: right;color:var(--fontcolor-dark2);font-size:14px \">收合</div>";
    for(let i = 0; i < pageData.length; i++){
        if(pageData[i].webtype=="html"){
            allPage = allPage +"<button class=\"nav_btn\" onclick=\"changepage1('"+pageData[i].path+"')\">☛ "+pageData[i].title+"</button>";
            }   
        if(pageData[i].webtype=="menu"){
            allPage = allPage +"<div class=\"nav_mnu\">"+pageData[i].title;
            for(let j = 0; j < pageData[i].children.length; j++){
                allPage = allPage +"<button class=\"nav_btn2\" onclick=\"changepage1('"+pageData[i].children[j].path+"')\">☛"+pageData[i].children[j].title+"</button>";
                }
            allPage = allPage +"</div>";
            } 
        }

    document.getElementById("side-bar").innerHTML = allPage;
    }
function changepage1(value) {
    const vw = window.innerWidth;
    if(vw<1000){
        document.getElementById("side-bar").classList.toggle("hide");
        }
    $("#content-box").load("./html/" + value + ".html");
}


(function() {
    // 將所有點擊事件統一交給最外層的 document 管理
    document.addEventListener("click", function(e) {
    // 1.檢查：點擊的是否包含.menu-btn
        if (e.target.closest(".menu-btn")) {
            const sidebar = document.getElementById("side-bar");
            if (sidebar) {
                sidebar.classList.toggle("hide"); 
                console.log("側邊欄狀態已切換（透過事件代理）");
            }
        }
        // 2.檢查：點擊的是 id="site-name" 的回到首頁按鈕
        if (e.target.closest("#site-name")) {
            $("#content-box").load("./html/home.html");
            console.log("已回到首頁");
        }
        
    });

})();