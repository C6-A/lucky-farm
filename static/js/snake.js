(function () {
    "use strict";

    const canvas = document.getElementById("snake");
    const ctx = canvas.getContext("2d");
    const TILE = 20;
    const COLS = canvas.width / TILE;
    const ROWS = canvas.height / TILE;
    const overlay = document.getElementById("sOverlay");
    const ovTitle = document.getElementById("sTitle");
    const ovSub = document.getElementById("sSub");
    const startBtn = document.getElementById("sStart");
    const pauseBtn = document.getElementById("sPause");
    const restartBtn = document.getElementById("sRestart");
    const scoreEl = document.getElementById("sScore");
    const bestEl = document.getElementById("sBest");
    const speedEl = document.getElementById("sSpeed");

    const STEP_START = 120;
    const STEP_MIN = 40;
    const BEST_KEY = "lucky-farm-snake-best";

    let snake = [];
    let dir = { x: 1, y: 0 };
    let queue = [];
    let food = { x: 0, y: 0 };
    let score = 0;
    let step = STEP_START;
    let acc = 0;
    let state = "idle";
    let raf = 0;
    let last = 0;
    let best = 0;

    try {
        best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch (err) {
        best = 0;
    }
    bestEl.textContent = String(best);

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

    function spawnFood() {
        const free = [];
        for (let y = 0; y < ROWS; y += 1) {
            for (let x = 0; x < COLS; x += 1) {
                let taken = false;
                for (let i = 0; i < snake.length; i += 1) {
                    if (snake[i].x === x && snake[i].y === y) { taken = true; break; }
                }
                if (!taken) free.push({ x: x, y: y });
            }
        }
        const pick = free[Math.floor(Math.random() * free.length)];
        return pick || { x: 0, y: 0 };
    }

    function resetGame() {
        snake = [
            { x: 15, y: 15 },
            { x: 14, y: 15 },
            { x: 13, y: 15 },
        ];
        dir = { x: 1, y: 0 };
        queue = [];
        score = 0;
        step = STEP_START;
        acc = 0;
        food = spawnFood();
        scoreEl.textContent = "0";
        speedEl.textContent = "1";
        draw();
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
        showOverlay("已暂停", "按空格或点下面的按钮继续", "继续游戏");
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

    function gameOver() {
        setState("over");
        cancelAnimationFrame(raf);
        showOverlay(
            "游戏结束",
            "本局得分 " + score + " · 最高分 " + best + " · 按 Enter 再来一局",
            "再来一局"
        );
        draw();
    }

    function turn(x, y) {
        const base = queue.length ? queue[queue.length - 1] : dir;
        if (base.x === -x && base.y === -y) return;
        if (base.x === x && base.y === y) return;
        if (queue.length < 2) queue.push({ x: x, y: y });
    }

    function tick() {
        if (queue.length) dir = queue.shift();

        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
            gameOver();
            return;
        }
        for (let i = 0; i < snake.length; i += 1) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOver();
                return;
            }
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score += 10;
            scoreEl.textContent = String(score);
            if (score > best) {
                best = score;
                bestEl.textContent = String(best);
                try { localStorage.setItem(BEST_KEY, String(best)); } catch (err) { /* 忽略 */ }
            }
            if (score % 50 === 0 && step > STEP_MIN) {
                step = Math.max(STEP_MIN, step - 8);
            }
            speedEl.textContent = String(Math.min(9, 1 + Math.floor(score / 50)));
            food = spawnFood();
        } else {
            snake.pop();
        }
    }

    function drawApple(tileX, tileY) {
        const x = tileX * TILE, y = tileY * TILE;
        ctx.fillStyle = "rgba(0,0,0,.3)";
        ctx.fillRect(x + 5, y + 6, 14, 14);
        ctx.fillStyle = "#3d2717";
        ctx.fillRect(x + 3, y + 4, 14, 14);
        ctx.fillStyle = "#d9534f";
        ctx.fillRect(x + 5, y + 6, 10, 10);
        ctx.fillStyle = "#ff9a8a";
        ctx.fillRect(x + 6, y + 7, 3, 3);
        ctx.fillStyle = "#4f9d3a";
        ctx.fillRect(x + 12, y + 2, 4, 4);
        ctx.fillStyle = "#7a4a22";
        ctx.fillRect(x + 10, y + 2, 2, 4);
    }

    function drawSnake() {
        for (let i = snake.length - 1; i >= 0; i -= 1) {
            const seg = snake[i];
            const x = seg.x * TILE, y = seg.y * TILE;
            const head = i === 0;

            ctx.fillStyle = "#2f5f22";
            ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
            ctx.fillStyle = head ? "#d4f79a" : "#8fd35b";
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = "rgba(255,255,255,.35)";
            ctx.fillRect(x + 3, y + 3, 4, 4);

            if (head) {
                const cx = x + TILE / 2 + dir.x * 4;
                const cy = y + TILE / 2 + dir.y * 4;
                const px = -dir.y * 4;
                const py = dir.x * 4;
                ctx.fillStyle = "#3d2717";
                ctx.fillRect(cx + px - 1.5, cy + py - 1.5, 3, 3);
                ctx.fillRect(cx - px - 1.5, cy - py - 1.5, 3, 3);
            }
        }
    }

    function draw() {
        ctx.fillStyle = "#22331f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < ROWS; y += 1) {
            for (let x = 0; x < COLS; x += 1) {
                if ((x + y) % 2 === 0) {
                    ctx.fillStyle = "rgba(255,255,255,.025)";
                    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
                }
            }
        }

        drawApple(food.x, food.y);
        drawSnake();
    }

    function loop(now) {
        const dt = Math.min(now - last, 100);
        last = now;
        if (state !== "playing") return;

        acc += dt;
        let guard = 0;
        while (acc >= step && guard < 5) {
            acc -= step;
            guard += 1;
            tick();
            if (state !== "playing") break;
        }
        draw();
        if (state === "playing") raf = requestAnimationFrame(loop);
    }

    function turnByKey(key) {
        if (key === "ArrowUp" || key === "w" || key === "W") turn(0, -1);
        else if (key === "ArrowDown" || key === "s" || key === "S") turn(0, 1);
        else if (key === "ArrowLeft" || key === "a" || key === "A") turn(-1, 0);
        else if (key === "ArrowRight" || key === "d" || key === "D") turn(1, 0);
        else return false;
        return true;
    }

    window.addEventListener("keydown", function (event) {
        const key = event.key;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar"].indexOf(key) >= 0) {
            event.preventDefault();
        }
        if (state === "playing") turnByKey(key);
        if (key === " " || key === "Spacebar") {
            if (state === "playing" || state === "paused") togglePause();
            else if (state === "idle" || state === "over") startGame();
        }
        if (key === "Enter") startGame();
    });

    document.querySelectorAll(".dpad button").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (state === "idle" || state === "over") startGame();
            const map = {
                up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
            };
            const delta = map[btn.dataset.dir];
            if (delta) turn(delta[0], delta[1]);
        });
    });

    let touchX = 0;
    let touchY = 0;
    canvas.addEventListener("touchstart", function (event) {
        if (event.touches[0]) {
            touchX = event.touches[0].clientX;
            touchY = event.touches[0].clientY;
        }
    }, { passive: true });
    canvas.addEventListener("touchend", function (event) {
        if (!event.changedTouches[0]) return;
        const dx = event.changedTouches[0].clientX - touchX;
        const dy = event.changedTouches[0].clientY - touchY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
        if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
        else turn(0, dy > 0 ? 1 : -1);
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
