(function () {
    "use strict";

    const canvas = document.getElementById("pong");
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const overlay = document.getElementById("pOverlay");
    const ovTitle = document.getElementById("pTitle");
    const ovSub = document.getElementById("pSub");
    const startBtn = document.getElementById("pStart");
    const pauseBtn = document.getElementById("pPause");
    const restartBtn = document.getElementById("pRestart");
    const playerEl = document.getElementById("pScore");
    const aiEl = document.getElementById("aScore");

    const WIN_SCORE = 7;
    const paddle = { w: 14, h: 100, speed: 380, x: 18, y: (H - 100) / 2 };
    const ai = { w: 14, h: 100, speed: 250, x: W - 32, y: (H - 100) / 2 };
    const ball = { size: 16, speed: 300, max: 720, x: W / 2, y: H / 2, vx: 0, vy: 0 };
    const keys = { up: false, down: false };

    let playerScore = 0;
    let aiScore = 0;
    let state = "idle";
    let raf = 0;
    let last = 0;
    let shake = 0;

    function setState(next) {
        state = next;
        canvas.dataset.state = next;
        pauseBtn.textContent = next === "paused" ? "继续" : "暂停";
    }

    function showOverlay(title, sub, button) {
        ovTitle.textContent = title;
        ovSub.textContent = sub;
        startBtn.textContent = button;
        overlay.classList.remove("hidden");
    }

    function hideOverlay() {
        overlay.classList.add("hidden");
    }

    function resetBall(direction) {
        ball.x = W / 2;
        ball.y = H / 2;
        ball.speed = 300;
        const angle = (Math.random() * 2 - 1) * Math.PI / 8;
        ball.vx = direction * ball.speed * Math.cos(angle);
        ball.vy = ball.speed * Math.sin(angle);
    }

    function resetGame() {
        playerScore = 0;
        aiScore = 0;
        playerEl.textContent = "0";
        aiEl.textContent = "0";
        paddle.y = (H - paddle.h) / 2;
        ai.y = (H - ai.h) / 2;
        shake = 0;
        resetBall(Math.random() < 0.5 ? 1 : -1);
    }

    function startGame() {
        resetGame();
        setState("playing");
        hideOverlay();
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
    }

    function pauseGame() {
        if (state !== "playing") return;
        setState("paused");
        cancelAnimationFrame(raf);
        showOverlay("已暂停", "按空格或点下面的按钮回到赛场", "继续游戏");
    }

    function resumeGame() {
        if (state !== "paused") return;
        setState("playing");
        hideOverlay();
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
    }

    function togglePause() {
        if (state === "playing") pauseGame();
        else if (state === "paused") resumeGame();
    }

    function endGame() {
        setState("over");
        cancelAnimationFrame(raf);
        const won = playerScore >= WIN_SCORE;
        showOverlay(
            won ? "你赢了！" : "电脑获胜",
            "最终比分 " + playerScore + " : " + aiScore + " · 按 R 或点按钮再来一局",
            "再来一局"
        );
        draw();
    }

    function bounce(pad, direction) {
        const relative = (ball.y - (pad.y + pad.h / 2)) / (pad.h / 2);
        const angle = Math.max(-1, Math.min(1, relative)) * (Math.PI / 3);
        ball.speed = Math.min(ball.speed + 20, ball.max);
        ball.vx = direction * ball.speed * Math.cos(angle);
        ball.vy = ball.speed * Math.sin(angle);
    }

    function update(dt) {
        if (keys.up) paddle.y -= paddle.speed * dt;
        if (keys.down) paddle.y += paddle.speed * dt;
        paddle.y = Math.max(0, Math.min(H - paddle.h, paddle.y));

        const aiTarget = ball.vx > 0 ? ball.y - ai.h / 2 : H / 2 - ai.h / 2;
        const diff = aiTarget - ai.y;
        const step = ai.speed * dt;
        ai.y += Math.max(-step, Math.min(step, diff));
        ai.y = Math.max(0, Math.min(H - ai.h, ai.y));

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.y < ball.size / 2) {
            ball.y = ball.size / 2;
            ball.vy = Math.abs(ball.vy);
        }
        if (ball.y > H - ball.size / 2) {
            ball.y = H - ball.size / 2;
            ball.vy = -Math.abs(ball.vy);
        }

        const half = ball.size / 2;
        if (ball.vx < 0 &&
            ball.x - half <= paddle.x + paddle.w && ball.x + half >= paddle.x &&
            ball.y + half >= paddle.y && ball.y - half <= paddle.y + paddle.h) {
            ball.x = paddle.x + paddle.w + half;
            bounce(paddle, 1);
        }
        if (ball.vx > 0 &&
            ball.x + half >= ai.x && ball.x - half <= ai.x + ai.w &&
            ball.y + half >= ai.y && ball.y - half <= ai.y + ai.h) {
            ball.x = ai.x - half;
            bounce(ai, -1);
        }

        if (ball.x < -ball.size) {
            aiScore += 1;
            aiEl.textContent = String(aiScore);
            shake = 9;
            resetBall(1);
            if (aiScore >= WIN_SCORE) endGame();
        } else if (ball.x > W + ball.size) {
            playerScore += 1;
            playerEl.textContent = String(playerScore);
            shake = 9;
            resetBall(-1);
            if (playerScore >= WIN_SCORE) endGame();
        }

        if (shake > 0) shake = Math.max(0, shake - 45 * dt);
    }

    function drawPaddle(pad, color) {
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.fillRect(pad.x + 4, pad.y + 5, pad.w, pad.h);
        ctx.fillStyle = "#3d2717";
        ctx.fillRect(pad.x - 3, pad.y - 3, pad.w + 6, pad.h + 6);
        ctx.fillStyle = color;
        ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
        ctx.fillStyle = "rgba(255,255,255,.5)";
        ctx.fillRect(pad.x + 2, pad.y + 5, 3, pad.h - 10);
    }

    function draw() {
        ctx.save();
        if (shake > 0) {
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        ctx.fillStyle = "#1b2a41";
        ctx.fillRect(-12, -12, W + 24, H + 24);

        ctx.fillStyle = "rgba(255,255,255,.035)";
        for (let y = 0; y < H; y += 50) {
            for (let x = 0; x < W; x += 50) {
                if (((x / 50) + (y / 50)) % 2 === 0) ctx.fillRect(x, y, 50, 50);
            }
        }

        ctx.fillStyle = "rgba(255,246,218,.35)";
        for (let y = 10; y < H - 10; y += 36) {
            ctx.fillRect(W / 2 - 3, y, 6, 20);
        }

        drawPaddle(paddle, "#fff6da");
        drawPaddle(ai, "#ffb35c");

        const half = ball.size / 2;
        ctx.fillStyle = "#3d2717";
        ctx.fillRect(ball.x - half - 2, ball.y - half - 2, ball.size + 4, ball.size + 4);
        ctx.fillStyle = "#fff6da";
        ctx.fillRect(ball.x - half, ball.y - half, ball.size, ball.size);
        ctx.fillStyle = "#ffd45e";
        ctx.fillRect(ball.x - half + 3, ball.y - half + 3, 5, 5);

        ctx.font = "900 54px 'Courier New', Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.fillText(String(playerScore), W / 2 - 92, 78);
        ctx.fillText(String(aiScore), W / 2 + 92, 78);
        ctx.fillStyle = "#fff6da";
        ctx.fillText(String(playerScore), W / 2 - 95, 75);
        ctx.fillText(String(aiScore), W / 2 + 89, 75);

        ctx.restore();
    }

    function loop(now) {
        const dt = Math.min((now - last) / 1000, 0.04);
        last = now;
        if (state !== "playing") return;
        update(dt);
        draw();
        raf = requestAnimationFrame(loop);
    }

    function movePaddle(clientY) {
        const rect = canvas.getBoundingClientRect();
        const y = (clientY - rect.top) * (H / rect.height);
        paddle.y = Math.max(0, Math.min(H - paddle.h, y - paddle.h / 2));
    }

    canvas.addEventListener("mousemove", function (event) {
        movePaddle(event.clientY);
    });
    canvas.addEventListener("touchstart", function (event) {
        if (event.touches[0]) {
            event.preventDefault();
            movePaddle(event.touches[0].clientY);
        }
    }, { passive: false });
    canvas.addEventListener("touchmove", function (event) {
        if (event.touches[0]) {
            event.preventDefault();
            movePaddle(event.touches[0].clientY);
        }
    }, { passive: false });

    window.addEventListener("keydown", function (event) {
        const key = event.key;
        if (["ArrowUp", "ArrowDown", " ", "Spacebar"].indexOf(key) >= 0) {
            event.preventDefault();
        }
        if (key === "ArrowUp" || key === "w" || key === "W") keys.up = true;
        if (key === "ArrowDown" || key === "s" || key === "S") keys.down = true;
        if (key === " " || key === "Spacebar") {
            if (state === "playing" || state === "paused") togglePause();
            else if (state === "idle" || state === "over") startGame();
        }
        if (key === "r" || key === "R") startGame();
    });

    window.addEventListener("keyup", function (event) {
        const key = event.key;
        if (key === "ArrowUp" || key === "w" || key === "W") keys.up = false;
        if (key === "ArrowDown" || key === "s" || key === "S") keys.down = false;
    });

    window.addEventListener("blur", function () {
        if (state === "playing") pauseGame();
    });

    startBtn.addEventListener("click", function () {
        if (state === "paused") resumeGame();
        else startGame();
    });
    pauseBtn.addEventListener("click", togglePause);
    restartBtn.addEventListener("click", startGame);

    resetGame();
    setState("idle");
    draw();
})();
