const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.045;
const FLAP = -2.5;
const UFO_RADIUS = 20;
const TREE_WIDTH = 60;
const GAP_HEIGHT = 300;
const TREE_SPEED = 0.9;

// UFO
let ufoY = canvas.height / 2;
let ufoVY = 0;
let trees = [];
let frame = 0;
let score = 0;
let gameOver = false;
let waiting = true; // waiting for first space
let lastTime = performance.now();
let spawnTimer = 0;
const SPAWN_INTERVAL = 240 / 60; // 240 frames at 60fps = 4s

function resetGame() {
    ufoY = canvas.height / 2;
    ufoVY = 0;
    trees = [];
    frame = 0;
    score = 0;
    gameOver = false;
    waiting = true;
}

function drawUFO(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.ellipse(0, 0, UFO_RADIUS, UFO_RADIUS * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#b3f0ff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -7, UFO_RADIUS * 0.6, UFO_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 10, 10, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffeb3b';
        ctx.fill();
    }
    ctx.restore();
}

function drawTree(x, gapY) {
    ctx.fillStyle = '#228B22';
    ctx.fillRect(x, 0, TREE_WIDTH, gapY);
    ctx.fillRect(x, gapY + GAP_HEIGHT, TREE_WIDTH, canvas.height - (gapY + GAP_HEIGHT));
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(x + TREE_WIDTH/3, gapY - 20, TREE_WIDTH/3, 20);
    ctx.fillRect(x + TREE_WIDTH/3, gapY + GAP_HEIGHT, TREE_WIDTH/3, 20);
}

function drawScore() {
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(score, canvas.width / 2, 60);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Press Space, Click, or Tap to Restart', canvas.width / 2, canvas.height / 2 + 60);
}

function drawWaiting() {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Flappy UFO', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '24px Arial';
    ctx.fillText('Press Space, Click, or Tap to Start', canvas.width / 2, canvas.height / 2 + 20);
}

function update(dt) {
    if (gameOver || waiting) return;
    ufoVY += GRAVITY * dt * 60;
    ufoY += ufoVY * dt * 60;

    // Add new trees based on time
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer = 0;
        const minGapY = 20;
        const maxGapY = canvas.height - GAP_HEIGHT - 20;
        const gapY = Math.floor(Math.random() * (maxGapY - minGapY + 1)) + minGapY;
        trees.push({ x: canvas.width, gapY, passed: false });
    }

    // Move trees
    for (let t of trees) {
        t.x -= TREE_SPEED * dt * 60;
    }
    if (trees.length && trees[0].x + TREE_WIDTH < 0) {
        trees.shift();
    }

    // Collision detection & scoring
    for (let t of trees) {
        if (!t.passed && t.x + TREE_WIDTH < 80) {
            score++;
            t.passed = true;
        }
        if (
            80 + UFO_RADIUS > t.x && 80 - UFO_RADIUS < t.x + TREE_WIDTH &&
            (ufoY - UFO_RADIUS < t.gapY || ufoY + UFO_RADIUS > t.gapY + GAP_HEIGHT)
        ) {
            gameOver = true;
        }
    }
    if (ufoY + UFO_RADIUS > canvas.height || ufoY - UFO_RADIUS < 0) {
        gameOver = true;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let t of trees) {
        drawTree(t.x, t.gapY);
    }
    drawUFO(80, ufoY);
    drawScore();
    if (waiting) drawWaiting();
    if (gameOver) drawGameOver();
}

function gameLoop(now) {
    let dt = (now - lastTime) / 1000;
    if (dt > 0.05) dt = 0.05; // clamp for slow frames
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        if (waiting) {
            waiting = false;
            ufoVY = FLAP;
            return;
        }
        if (gameOver) {
            resetGame();
        } else {
            ufoVY = FLAP;
        }
    }
});

// Touch and mouse support for mobile and desktop
function handleFlapOrRestart() {
    if (waiting) {
        waiting = false;
        ufoVY = FLAP;
        return;
    }
    if (gameOver) {
        resetGame();
    } else {
        ufoVY = FLAP;
    }
}

canvas.addEventListener('touchstart', function(e) {
    handleFlapOrRestart();
}, { passive: true });

canvas.addEventListener('mousedown', function(e) {
    handleFlapOrRestart();
});

requestAnimationFrame(gameLoop);
