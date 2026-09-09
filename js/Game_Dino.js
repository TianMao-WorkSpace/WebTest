let currentDinoGameDestroy = null;

function initDinoGame(activeRole) {
    if (typeof currentDinoGameDestroy === "function") {
        currentDinoGameDestroy();
    }

    const dino = document.getElementById("dino");
    const container = document.getElementById("DinoGame-container");
    const gameOverText = document.getElementById("game-over-text");
    const currentScoreEl = document.getElementById("game-current-score");
    const highScoreEl = document.getElementById("game-high-score");

    if (!dino || !container) return;

    // 🌟 讀取與顯示歷史高分
    const storageKey = activeRole ? activeRole.LocalStorage : "dino_high_score";
    let highScore = Number(localStorage.getItem(storageKey)) || 0;
    if (highScoreEl) highScoreEl.innerText = highScore;

    let isJumping = false;
    let position = 0;
    let score = 0;
    let isGameOver = false;
    let obstacles = [];
    let gameSpeed = Number(activeRole.mechanism.speed);
    let scoreInterval = null;
    let spawnTimeout = null;
    let animationFrameId = null;

    function setDinoState(state) {
        dino.classList.remove("running", "jumping","dead");
        if (state) dino.classList.add(state);
    }

    function handleKeyDown(event) {
        if (event.code === "Space") {
            if (isGameOver) resetGame();
            else if (!isJumping) jump();
        }
    }

    function handleTouchStart() {
        if (isGameOver) resetGame();
        else if (!isJumping) jump();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchstart", handleTouchStart);

    function jump() {
        if (isJumping) return;
        isJumping = true;
        setDinoState("jumping");

        let jumpVelocity = Number(activeRole.mechanism.jump);
        const gravity = Number(activeRole.mechanism.gravity);

        function doJump() {
            position += jumpVelocity;
            jumpVelocity -= gravity;

            if (position <= 0) {
                position = 0;
                isJumping = false;
                dino.style.bottom = position + "px";
                if (!isGameOver) setDinoState("running");
            } else {
                dino.style.bottom = position + "px";
                requestAnimationFrame(doJump);
            }
        }
        doJump();
    }

    function generateObstacles() {
        if (isGameOver) return;
        const count = Math.floor(Math.random() * 3) + 1;
        let baseLeftPosition = 800;

        for (let i = 0; i < count; i++) {
            const cactus = document.createElement("div");
            cactus.classList.add("cactus");
            const randomType = Math.floor(Math.random() * 3) + 1;
            cactus.classList.add("type-" + randomType);
            container.appendChild(cactus);

            if (i > 0) baseLeftPosition += Math.floor(Math.random() * 30) + 30;
            cactus.style.left = baseLeftPosition + "px";

            let width = 20, height = 35;
            if (randomType === 2) { width = 22; height = 48; }
            else if (randomType === 3) { width = 35; height = 40; }

            obstacles.push({ element: cactus, position: baseLeftPosition, width, height });
        }

        let randomTime = Math.random() * 1500 + 2000;
        spawnTimeout = setTimeout(generateObstacles, randomTime);
    }

    function gameLoop() {
        if (isGameOver) return;
        gameSpeed += 0.001;

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.position -= gameSpeed;
            obs.element.style.left = obs.position + "px";

            if (obs.position < -50) {
                obs.element.remove();
                obstacles.splice(i, 1);
                continue;
            }

            const dinoLeft = 50, dinoWidth = 40;
            const isXOverlap = obs.position < (dinoLeft + dinoWidth) && (obs.position + obs.width) > dinoLeft;
            const isYOverlap = position < obs.height;

            if (isXOverlap && isYOverlap) {
                endGame();
                return;
            }
        }
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function startScore() {
        scoreInterval = setInterval(() => {
            score++;
            if (currentScoreEl) currentScoreEl.innerText = score;
        }, 100);
    }

    function endGame() {
        isGameOver = true;
        setDinoState("dead");
        gameOverText.style.display = "block";
        clearInterval(scoreInterval);
        clearTimeout(spawnTimeout);
        cancelAnimationFrame(animationFrameId);

        // 🌟 存入歷史高分
        if (score > highScore) {
            highScore = score;
            localStorage.setItem(storageKey, highScore);
            if (highScoreEl) highScoreEl.innerText = highScore;
        }
    }

    function resetGame() {
        isGameOver = false;
        score = 0;
        gameSpeed = 5;
        position = 0;
        isJumping = false;
        dino.style.bottom = "0px";
        if (currentScoreEl) currentScoreEl.innerText = "0";
        gameOverText.style.display = "none";

        setDinoState("running");
        obstacles.forEach(obs => obs.element.remove());
        obstacles = [];

        startScore();
        generateObstacles();
        gameLoop();
    }

    currentDinoGameDestroy = function() {
        clearInterval(scoreInterval);
        clearTimeout(spawnTimeout);
        cancelAnimationFrame(animationFrameId);
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("touchstart", handleTouchStart);
    };

    setDinoState("running");
    startScore();
    generateObstacles();
    gameLoop();
}