/**
 * Neon Space Defender - Modern Space Shooter Game
 * Features: Particle effects, power-ups, levels, sound effects
 */

// Game Configuration
const CONFIG = {
    playerSpeed: 7,
    bulletSpeed: 12,
    enemyBaseSpeed: 2,
    fireRate: 150, // ms between shots
    particleCount: 15,
    starCount: 100,
    colors: {
        player: '#00ffff',
        bullet: '#00ffff',
        enemy1: '#ff0055',
        enemy2: '#ffaa00',
        enemy3: '#aa00ff',
        powerup: '#00ff00',
        boss: '#ff00ff'
    },
    powerupSpawnRate: 5000, // ms between powerup spawns
    comboDecay: 2000, // ms before combo resets
    comboMultiplier: 1.5 // bonus score multiplier
};

// Game State
const state = {
    isPlaying: false,
    isPaused: false,
    score: 0,
    highScore: localStorage.getItem('neonSpaceHighScore') || 0,
    level: 1,
    health: 100,
    lastShot: 0,
    gameTime: 0, // Game time in seconds
    keys: {},
    touchControls: {
        left: false,
        right: false,
        fire: false
    }
};

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize Canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Audio System (Web Audio API)
class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
    }

    playTone(freq, type, duration, vol = 1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playShoot() {
        this.playTone(800, 'sawtooth', 0.15, 0.5);
        setTimeout(() => this.playTone(600, 'square', 0.1, 0.3), 50);
    }

    playExplosion() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        
        noise.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start();
    }

    playPowerup() {
        this.playTone(400, 'sine', 0.1, 0.5);
        setTimeout(() => this.playTone(600, 'sine', 0.1, 0.5), 100);
        setTimeout(() => this.playTone(800, 'sine', 0.2, 0.5), 200);
    }

    playHit() {
        this.playTone(200, 'sawtooth', 0.1, 0.4);
    }
}

// Particle System
class Particle {
    constructor(x, y, color, speed, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.01;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Starfield Background
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2;
        this.speed = Math.random() * 3 + 0.5;
        this.brightness = Math.random();
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.reset();
            this.y = -5;
        }
        this.brightness = 0.5 + 0.5 * Math.sin(Date.now() * 0.002 + this.x);
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Bullet Class
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 15;
        this.speed = CONFIG.bulletSpeed;
        this.color = CONFIG.colors.bullet;
        this.markedForDeletion = false;
    }

    update() {
        // Enemy bullets move downward, player bullets move upward
        if (this.isEnemy) {
            this.y += this.vy || 6;
            // Horizontal movement for enemy bullets
            if (this.vx) {
                this.x += this.vx;
            }
        } else {
            this.y -= this.speed;
        }
        if (this.y < -this.height || this.y > canvas.height + this.height) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        ctx.restore();
    }
}

// Enemy Class
class Enemy {
    constructor(level) {
        this.width = 40;
        this.height = 40;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = CONFIG.enemyBaseSpeed + (level * 0.3) + Math.random() * 1.5;
        this.markedForDeletion = false;
        
        // Enemy types based on level
        const typeChance = Math.random();
        if (level >= 2 && typeChance > 0.7) {
            this.type = 'fast';
            this.color = CONFIG.colors.enemy2;
            this.speed *= 1.2;
            this.width = 30;
            this.height = 30;
            this.hp = 1;
        } else if (level >= 3 && typeChance > 0.9) {
            this.type = 'tank';
            this.color = CONFIG.colors.enemy3;
            this.speed *= 0.6;
            this.width = 60;
            this.height = 60;
            this.hp = 3;
        } else {
            this.type = 'basic';
            this.color = CONFIG.colors.enemy1;
            this.hp = 1;
        }
        
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        
        if (this.y > canvas.height) {
            this.markedForDeletion = true;
            // Enemy passes through without damaging player
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        
        // Draw enemy shape based on type
        ctx.beginPath();
        if (this.type === 'basic') {
            // Triangle
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(this.width / 2, this.height / 2);
            ctx.lineTo(-this.width / 2, this.height / 2);
            ctx.closePath();
        } else if (this.type === 'fast') {
            // Diamond
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(this.width / 2, 0);
            ctx.lineTo(0, this.height / 2);
            ctx.lineTo(-this.width / 2, 0);
            ctx.closePath();
        } else {
            // Square (tank)
            ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        ctx.stroke();
        
        // Inner glow
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        
        ctx.restore();
    }
}

// Power-up Class
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.speed = 2;
        this.markedForDeletion = false;
        this.color = CONFIG.colors.powerup;
        this.type = Math.random() > 0.5 ? 'health' : 'rapid';
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Icon
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'health' ? '+' : '⚡', this.x, this.y);
        ctx.restore();
    }
}

// Player Class
class Player {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 100;
        this.speed = CONFIG.playerSpeed;
        this.color = CONFIG.colors.player;
        this.rapidFire = false;
        this.rapidFireTimer = 0;
    }

    update() {
        // Keyboard movement
        if (state.keys['ArrowLeft'] || state.keys['a'] || state.touchControls.left) {
            this.x -= this.speed;
        }
        if (state.keys['ArrowRight'] || state.keys['d'] || state.touchControls.right) {
            this.x += this.speed;
        }
        if (state.keys['ArrowUp'] || state.keys['w'] || state.touchControls.up) {
            this.y -= this.speed;
        }
        if (state.keys['ArrowDown'] || state.keys['s'] || state.touchControls.down) {
            this.y += this.speed;
        }

        // Boundaries
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));

        // Rapid fire timer
        if (this.rapidFire) {
            this.rapidFireTimer -= 16;
            if (this.rapidFireTimer <= 0) {
                this.rapidFire = false;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        
        // Draw ship
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 15);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.stroke();
        
        // Engine glow
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.02);
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2 - 10, this.y + this.height - 10);
        ctx.lineTo(this.x + this.width / 2 + 10, this.y + this.height - 10);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height + 20 + Math.random() * 10);
        ctx.fill();
        
        ctx.restore();
    }

    shoot() {
        const now = Date.now();
        const fireRate = this.rapidFire ? 80 : CONFIG.fireRate;
        
        // Check if we can spawn more bullets
        if (now - state.lastShot > fireRate && bullets.length < MAX_BULLETS) {
            bullets.push(new Bullet(this.x + this.width / 2, this.y));
            state.lastShot = now;
            audioSystem.playShoot();
            
            // Recoil effect
            this.y += 3;
            setTimeout(() => {
                this.y -= 3;
            }, 50);
        }
    }

    activateRapidFire() {
        this.rapidFire = true;
        this.rapidFireTimer = 5000; // 5 seconds
    }

    heal(amount) {
        state.health = Math.min(100, state.health + amount);
        updateHealthUI();
    }
}

// Game Variables
const MAX_BULLETS = 50;
const MAX_ENEMIES = Infinity; // No limit on enemies
const MAX_PARTICLES = 100;
const MAX_POWERUPS = 5;
const MAX_TRAILS = 30;

let player;
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];
let powerups = [];
let enemySpawnTimer = 0;
let enemySpawnRate = 1000;
let audioSystem;

// Combo System
let comboCount = 0;
let lastKillTime = 0;
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };

// Trail System
class Trail {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1.0;
        this.size = Math.random() * 5 + 2;
    }
    
    update() {
        this.y += 2;
        this.life -= 0.05;
        this.size *= 0.9;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let trails = [];

// Boss System
let boss = null;
let bossSpawnScore = 3000;

// Initialize Game
function initGame() {
    player = new Player();
    bullets = [];
    enemies = [];
    particles = [];
    powerups = [];
    trails = [];
    state.score = 0;
    state.health = 100;
    state.level = 1;
    state.lastShot = 0;
    state.gameTime = 0;
    enemySpawnTimer = 0;
    enemySpawnRate = 1000;
    
    // Reset boss
    boss = null;
    bossSpawnScore = 3000;
    
    // Initialize stars
    stars = [];
    for (let i = 0; i < CONFIG.starCount; i++) {
        stars.push(new Star());
    }
    
    updateUI();
    
    if (!audioSystem) {
        audioSystem = new AudioSystem();
    }
}

// Create Explosion
function createExplosion(x, y, color, count = CONFIG.particleCount) {
    // Limit particles to avoid memory issues
    const actualCount = Math.min(count, MAX_PARTICLES - particles.length);
    for (let i = 0; i < actualCount; i++) {
        particles.push(new Particle(x, y, color, 5, Math.random() * 4 + 2));
    }
}

// Check Collision
function checkCollision(rect1, rect2) {
    // Add null checks to prevent errors
    if (!rect1 || !rect2) return false;
    // Add property checks to prevent errors
    if (typeof rect1.x !== 'number' || typeof rect1.y !== 'number' || typeof rect1.width !== 'number' || typeof rect1.height !== 'number') return false;
    if (typeof rect2.x !== 'number' || typeof rect2.y !== 'number' || typeof rect2.width !== 'number' || typeof rect2.height !== 'number') return false;
    // Add a small margin for better hit detection
    const margin = 5;
    return (
        rect1.x + margin < rect2.x + rect2.width - margin &&
        rect1.x + rect1.width - margin > rect2.x + margin &&
        rect1.y + margin < rect2.y + rect2.height - margin &&
        rect1.y + rect1.height - margin > rect2.y + margin
    );
}

// Level Up
function checkLevelUp() {
    const newLevel = Math.floor(state.score / 1000) + 1;
    if (newLevel > state.level) {
        state.level = newLevel;
        enemySpawnRate = Math.max(200, 1000 - (state.level * 100));
        createLevelUpEffect();
    }
}

function createLevelUpEffect() {
    // Limit particles to avoid memory issues
    const particleCount = Math.min(50, MAX_PARTICLES - particles.length);
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(
            canvas.width / 2,
            canvas.height / 2,
            '#00ff00',
            8,
            Math.random() * 6 + 3
        ));
    }
    audioSystem.playPowerup();
}

// Update UI
function updateUI() {
    document.getElementById('score-display').textContent = state.score;
    document.getElementById('level-display').textContent = state.level;
    updateHealthUI();
}

function updateHealthUI() {
    const healthFill = document.getElementById('health-fill');
    healthFill.style.width = `${state.health}%`;
    
    // Change color based on health
    if (state.health > 50) {
        healthFill.style.background = 'linear-gradient(90deg, #00ff00, #00aa00)';
    } else if (state.health > 25) {
        healthFill.style.background = 'linear-gradient(90deg, #ffaa00, #ff5500)';
    } else {
        healthFill.style.background = 'linear-gradient(90deg, #ff0055, #aa0000)';
    }
}

// Game Loop
function gameLoop() {
    if (!state.isPlaying || state.isPaused) return;

    // Update game time (no time limit)
    state.gameTime += 0.016; // 16ms per frame

    // Screen shake effect
    let shakeX = 0, shakeY = 0;
    if (screenShake.duration > 0) {
        shakeX = (Math.random() - 0.5) * screenShake.intensity;
        shakeY = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.duration--;
        if (screenShake.duration <= 0) {
            screenShake.intensity = 0;
        }
    }
    
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    stars.forEach(star => {
        star.update();
        star.draw(ctx);
    });

    // Update player
    player.update();
    player.draw(ctx);

    // Spawn enemies
    enemySpawnTimer += 16;
    if (enemySpawnTimer > enemySpawnRate) {
        enemies.push(new Enemy(state.level));
        enemySpawnTimer = 0;
    }

    // Spawn boss
    if (state.score >= bossSpawnScore && !boss) {
        spawnBoss();
    }
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update();
        bullet.draw(ctx);
        
        // Trail effect for player bullets
        if (!bullet.isEnemy) {
            trails.push(new Trail(bullet.x, bullet.y + bullet.height, bullet.color));
        }
        
        // Enemy bullet collision with player
        if (bullet.isEnemy) {
            if (checkCollision(
                {x: bullet.x - bullet.width/2, y: bullet.y, width: bullet.width, height: bullet.height},
                {x: player.x + 10, y: player.y + 10, width: player.width - 20, height: player.height - 20}
            )) {
                state.health -= 10;
                updateHealthUI();
                createExplosion(bullet.x, bullet.y, '#ff00ff', 10);
                bullet.markedForDeletion = true;
                audioSystem.playHit();
                screenShake = { x: 0, y: 0, intensity: 10, duration: 10 };
                
                if (state.health <= 0) {
                    gameOver();
                }
            }
        }
        
        if (bullet.markedForDeletion) {
            bullets.splice(i, 1);
        }
    }
    
    // Update trails
    for (let i = trails.length - 1; i >= 0; i--) {
        trails[i].update();
        trails[i].draw(ctx);
        if (trails[i].life <= 0) {
            trails.splice(i, 1);
        }
    }

    // Update boss
    if (boss) {
        updateBoss();
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update();
        enemy.draw(ctx);

        // Collision with player
        if (checkCollision(player, enemy)) {
            state.health -= 20;
            updateHealthUI();
            createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
            enemies.splice(i, 1);
            audioSystem.playHit();
            
            if (state.health <= 0) {
                gameOver();
            }
        }

        // Collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if (checkCollision(bullet, enemy)) {
                enemy.hp--;
                bullet.markedForDeletion = true;
                
                if (enemy.hp <= 0) {
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                    enemies.splice(i, 1);
                    state.score += enemy.type === 'tank' ? 300 : enemy.type === 'fast' ? 200 : 100;
                    updateUI();
                    checkLevelUp();
                    audioSystem.playExplosion();
                    
                    // Combo system
                    handleCombo();
                    
                    // Chance to drop powerup
                    if (Math.random() < 0.15) {
                        powerups.push(new PowerUp(enemy.x + enemy.width/2, enemy.y + enemy.height/2));
                    }
                } else {
                    audioSystem.playHit();
                }
            }
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Update powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        powerup.update();
        powerup.draw(ctx);
        
        // Collision with player
        if (checkCollision(
            {x: player.x, y: player.y, width: player.width, height: player.height},
            {x: powerup.x - powerup.size, y: powerup.y - powerup.size, width: powerup.size * 2, height: powerup.size * 2}
        )) {
            if (powerup.type === 'health') {
                player.heal(25);
            } else {
                player.activateRapidFire();
            }
            powerups.splice(i, 1);
            audioSystem.playPowerup();
        }
        
        if (powerup.markedForDeletion) {
            powerups.splice(i, 1);
        }
    }

    // Draw combo text
    if (comboCount > 1) {
        drawComboText();
    }

    ctx.restore();

    // Draw timer after all updates (outside ctx.save/restore block)
    drawTimer();

    requestAnimationFrame(gameLoop);
}

// Draw Combo Text
function drawComboText() {
    ctx.save();
    ctx.font = 'bold 2rem Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 10;
    ctx.fillText(`COMBO x${comboCount}!`, canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

function spawnBoss() {
    boss = {
        x: canvas.width / 2 - 80,
        y: -100,
        width: 160,
        height: 100,
        hp: 50 + state.level * 10,
        maxHp: 50 + state.level * 10,
        speed: 2,
        color: CONFIG.colors.boss,
        phase: 0,
        lastShot: 0,
        markedForDeletion: false
    };
    audioSystem.playTone(150, 'sawtooth', 1.0, 0.5);
}

function updateBoss() {
    if (!boss) return;
    
    // Boss movement
    if (boss.y < 50) {
        boss.y += 1;
    } else {
        boss.x += boss.speed;
        if (boss.x <= 0 || boss.x + boss.width >= canvas.width) {
            boss.speed *= -1;
        }
    }
    
    // Boss shooting (with max bullet limit)
    const now = Date.now();
    if (now - boss.lastShot > 800 && bullets.length < MAX_BULLETS) {
        // Shoot 3 bullets in a spread
        for (let i = -1; i <= 1; i++) {
            const enemyBullet = new Bullet(boss.x + boss.width / 2, boss.y + boss.height);
            enemyBullet.speed = 6;
            enemyBullet.color = '#ff00ff';
            enemyBullet.vx = i * 2;
            enemyBullet.vy = 6;
            enemyBullet.isEnemy = true;
            enemyBullet.markedForDeletion = false;
            bullets.push(enemyBullet);
        }
        boss.lastShot = now;
        audioSystem.playTone(300, 'square', 0.2, 0.3);
    }
    
    // Boss draw
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = boss.color;
    ctx.strokeStyle = boss.color;
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width / 2, boss.y + boss.height);
    ctx.lineTo(boss.x + boss.width, boss.y);
    ctx.lineTo(boss.x, boss.y);
    ctx.closePath();
    ctx.stroke();
    
    // Boss health bar
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(boss.x, boss.y - 20, boss.width * (boss.hp / boss.maxHp), 5);
    
    ctx.restore();
    
    // Boss collision with player
    if (checkCollision(player, boss)) {
        state.health -= 30;
        updateHealthUI();
        createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, boss.color, 30);
        screenShake = { x: 0, y: 0, intensity: 20, duration: 20 };
        audioSystem.playExplosion();
        
        if (state.health <= 0) {
            gameOver();
        }
    }
    
    // Boss collision with bullets
    if (boss) {
        bullets.forEach((bullet, bulletIndex) => {
            if (bullet.isEnemy) return; // Skip enemy bullets
            
            if (checkCollision(bullet, boss)) {
                boss.hp--;
                bullet.markedForDeletion = true;
                
                if (boss.hp <= 0) {
                    createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, boss.color, 100);
                    state.score += 5000;
                    boss = null;
                    bossSpawnScore += 5000;
                    updateUI();
                    audioSystem.playExplosion();
                    screenShake = { x: 0, y: 0, intensity: 30, duration: 40 };
                    createLevelUpEffect();
                } else {
                    audioSystem.playHit();
                }
            }
        });
    }
}

function handleCombo() {
    const now = Date.now();
    
    if (now - lastKillTime < CONFIG.comboDecay) {
        comboCount++;
    } else {
        comboCount = 1;
    }
    
    lastKillTime = now;
    
    // Add combo bonus score
    const comboBonus = Math.min(comboCount, 10) * 50;
    state.score += comboBonus;
    updateUI();
}

function drawTimer() {
    // Timer display removed
}

function endGame() {
    state.isPlaying = false;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('neonSpaceHighScore', state.highScore);
    }
    
    document.getElementById('final-score-display').textContent = state.score;
    document.getElementById('high-score-display').textContent = state.highScore;
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('active');
}

// Game Functions
function startGame() {
    console.log('Starting game...');
    
    // Hide all screens
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('active');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.remove('active');
    document.getElementById('pause-screen').classList.add('hidden');
    
    // Show game UI
    document.getElementById('game-ui').classList.remove('hidden');
    
    state.isPlaying = true;
    state.isPaused = false;
    initGame();
    gameLoop();
    console.log('Game started!');
}

function gameOver() {
    state.isPlaying = false;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('neonSpaceHighScore', state.highScore);
    }
    
    document.getElementById('final-score-display').textContent = state.score;
    document.getElementById('high-score-display').textContent = state.highScore;
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('active');
}

function togglePause() {
    if (!state.isPlaying) return;
    
    state.isPaused = !state.isPaused;
    
    if (state.isPaused) {
        document.getElementById('pause-screen').classList.remove('hidden');
    } else {
        document.getElementById('pause-screen').classList.add('hidden');
        gameLoop();
    }
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    state.keys[e.key] = true;
    
    if (e.code === 'Space') {
        if (state.isPlaying && !state.isPaused) {
            player.shoot();
        }
    }
    
    if (e.code === 'Escape') {
        togglePause();
    }
});

window.addEventListener('keyup', (e) => {
    state.keys[e.key] = false;
});

// Button Listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('resume-btn').addEventListener('click', togglePause);

// Initialize stars for background
for (let i = 0; i < CONFIG.starCount; i++) {
    stars.push(new Star());
}

// Draw initial background
function drawBackground() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(star => {
        star.update();
        star.draw(ctx);
    });
    
    if (!state.isPlaying) {
        requestAnimationFrame(drawBackground);
    }
}

drawBackground();