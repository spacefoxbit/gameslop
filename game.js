const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
// Double the speed for browser
const SPEED_MULTIPLIER = 2.5; // Only apply to tree speed and spawn interval
const GRAVITY = 0.13;
const FLAP = -3.5; // Reduced from -7.0 for a softer bounce
const UFO_RADIUS = 20;
const TREE_WIDTH = 60;
const GAP_HEIGHT = 300;
const TREE_SPEED = 2.6 * SPEED_MULTIPLIER;
const SPAWN_INTERVAL = (90 / 60) / SPEED_MULTIPLIER; // was 180/60, spawn pipes even more often

// UFO
let ufoY = canvas.height / 2;
let ufoVY = 0;
let trees = [];
let stars = [];
let pipesPassed = 0;
let nextStarPipeIndex = 9; // 0-based, so 10th pipe
let frame = 0;
let score = 0;
let gameOver = false;
let waiting = true; // waiting for first space
let lastTime = performance.now();
let spawnTimer = 0;
let spawnInterval = SPAWN_INTERVAL;
let lastScoreForSpeedup = 0;
let bgHue = 200; // Start with sky blue

function resetGame() {
    ufoY = canvas.height / 2;
    ufoVY = 0;
    trees = [];
    stars = [];
    pipesPassed = 0;
    nextStarPipeIndex = 9;
    frame = 0;
    score = 0;
    gameOver = false;
    waiting = true;
    spawnTimer = 0;
    spawnInterval = SPAWN_INTERVAL;
    lastScoreForSpeedup = 0;
    bgHue = 200;
}

function drawUFO(x, y) {
    // Calculate rotation based on vertical velocity
    let angle = Math.max(Math.min(ufoVY / 12, 0.5), -0.5); // Clamp between -0.5 and 0.5 radians
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
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

// Adjust UFO hitbox for more accurate collision (smaller than full ellipse)
const UFO_HITBOX_RADIUS_X = UFO_RADIUS * 0.7;
const UFO_HITBOX_RADIUS_Y = UFO_RADIUS * 0.5;

function checkCollision(ufoX, ufoY, tree) {
    // Check if UFO's hitbox overlaps with tree rectangles
    // Top tree
    if (
        ufoX + UFO_HITBOX_RADIUS_X > tree.x &&
        ufoX - UFO_HITBOX_RADIUS_X < tree.x + TREE_WIDTH &&
        ufoY - UFO_HITBOX_RADIUS_Y < tree.gapY
    ) return true;
    // Bottom tree
    if (
        ufoX + UFO_HITBOX_RADIUS_X > tree.x &&
        ufoX - UFO_HITBOX_RADIUS_X < tree.x + TREE_WIDTH &&
        ufoY + UFO_HITBOX_RADIUS_Y > tree.gapY + GAP_HEIGHT
    ) return true;
    return false;
}

// Helper to draw a crescent moon
function drawMoon(cx, cy, radius, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0.5 * Math.PI, 1.5 * Math.PI, false);
    ctx.arc(cx + radius * 0.5, cy, radius, 1.5 * Math.PI, 0.5 * Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
}

function drawTree(x, gapY) {
    // Pipe-like tree (classic Flappy Bird style)
    ctx.save();
    // Top pipe
    ctx.fillStyle = '#228B22';
    ctx.fillRect(x, 0, TREE_WIDTH, gapY);
    ctx.fillStyle = '#1a5e1a';
    ctx.fillRect(x - 4, gapY - 16, TREE_WIDTH + 8, 16); // pipe lip
    // Bottom pipe
    ctx.fillStyle = '#228B22';
    ctx.fillRect(x, gapY + GAP_HEIGHT, TREE_WIDTH, canvas.height - (gapY + GAP_HEIGHT));
    ctx.fillStyle = '#1a5e1a';
    ctx.fillRect(x - 4, gapY + GAP_HEIGHT, TREE_WIDTH + 8, 16); // pipe lip
    ctx.restore();
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

// Helper to draw a fireball
function drawFireball(cx, cy, r) {
    // Outer glow
    let grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
    grad.addColorStop(0, '#fffbe7');
    grad.addColorStop(0.5, '#ffb347');
    grad.addColorStop(1, '#ff4500');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.restore();
    // Inner core
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbe7';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();
}

function update(dt) {
    if (gameOver || waiting) return;
    ufoVY += GRAVITY * dt * 60;
    ufoY += ufoVY * dt * 60;

    // Speed up spawn interval every 20 points
    if (score - lastScoreForSpeedup >= 20) {
        spawnInterval *= 0.9; // 10% faster
        lastScoreForSpeedup = score;
    }

    // Add new trees based on time
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
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
            pipesPassed++;
            // If this is the pipe before the next star pipe
            if ((pipesPassed - 1) === nextStarPipeIndex) {
                // Shoot a star up from the next pipe's gap
                let nextPipe = trees.find(tp => !tp.passed && tp !== t);
                if (nextPipe) {
                    stars.push({
                        x: nextPipe.x + TREE_WIDTH / 2,
                        y: nextPipe.gapY + GAP_HEIGHT,
                        vx: 0,
                        vy: -1.2, // slow upward
                        r: 14
                    });
                }
                nextStarPipeIndex += 10;
            }
        }
        if (checkCollision(80, ufoY, t)) {
            gameOver = true;
        }
    }
    // Move stars
    for (let s of stars) {
        s.x += s.vx;
        s.y += s.vy;
    }
    // Remove off-screen stars
    stars = stars.filter(s => s.y + s.r > 0);
    // Star collision
    for (let s of stars) {
        let dx = 80 - s.x;
        let dy = ufoY - s.y;
        if (Math.sqrt(dx*dx + dy*dy) < s.r + UFO_HITBOX_RADIUS_X) {
            gameOver = true;
        }
    }
    if (ufoY + UFO_RADIUS > canvas.height || ufoY - UFO_RADIUS < 0) {
        gameOver = true;
    }
}

function updateBackgroundColor() {
    // Change hue every 20 points
    bgHue = 200 + ((Math.floor(score / 20) * 30) % 120); // Cycle through blue, purple, greenish
}

function draw() {
    updateBackgroundColor();
    // Draw vertical gradient background
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `hsl(${bgHue}, 60%, 85%)`); // lighter at top
    gradient.addColorStop(1, `hsl(${bgHue}, 60%, 55%)`); // darker at bottom
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    for (let t of trees) {
        drawTree(t.x, t.gapY);
    }
    drawUFO(80, ufoY);
    drawScore();
    if (waiting) drawWaiting();
    if (gameOver) drawGameOver();
    // Draw stars
    for (let s of stars) {
        drawFireball(s.x, s.y, s.r);
    }
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
