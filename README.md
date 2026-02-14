# Neon Space Game

Defend the universe from the neon wave! A neon-themed space shooter game.

This game was created by **Qwen3-Coder-Next-8bit**. All code was written by this AI model.

## 🎮 Overview

Neon Space Game is a modern space shooter game with a neon color theme. It provides an immersive gaming experience with smooth rendering using Canvas API and sound effects using Web Audio API.

## ✨ Features

- **Neon Theme**: Beautiful visuals with gradients and glowing effects
- **Particle Effects**: Explosion effects when enemies are destroyed
- **Power-ups**: Health recovery and rapid fire
- **Boss Battle**: Boss appears at 3000 points
- **Combo System**: Combo accumulates when enemies are destroyed quickly
- **Screen Shake**: Screen shake effects on damage and explosions
- **Responsive Design**: Compatible with PC and mobile devices

## 🎯 Gameplay

### Controls

| Action | Key |
|--------|-----|
| Move Up | ⬆️ Arrow Up or W |
| Move Down | ⬇️ Arrow Down or S |
| Move Left | ⬅️ Arrow Left or A |
| Move Right | ➡️ Arrow Right or D |
| Shoot | SPACE or Fire Button |
| Pause | ESC |

## 🏆 Scoring System

| Enemy Type | Score | Combo Bonus |
|------------|-------|-------------|
| Basic Enemy | 100 | +50/combo |
| Fast Enemy | 200 | +50/combo |
| Tank Enemy | 300 | +50/combo |
| Boss | 5000 | +50/combo |

- **Level Up**: Level increases every 1000 points
- **Combo**: Combo accumulates when enemies are destroyed within 2 seconds (max 10 combos)

## 🛠 Technical Specifications

### Technologies Used

- **HTML5 Canvas**: Game rendering
- **Web Audio API**: Sound effects
- **CSS3 Animations**: Neon effects
- **Vanilla JavaScript**: Game logic

### File Structure

```
neon-space-game/
├── index.html      # HTML structure and UI
├── style.css       # Styling and animations
├── script.js       # Game logic
└── README.md       # Documentation
```

### Class Structure

| Class | Description |
|-------|-------------|
| `AudioSystem` | Sound effect playback |
| `Particle` | Particle effects |
| `Star` | Starfield background |
| `Bullet` | Bullets |
| `Enemy` | Enemy characters |
| `PowerUp` | Power-up items |
| `Player` | Player character |
| `Trail` | Bullet trails |

## 🎨 Styling

### Neon Effects

The game title and buttons use neon effects with CSS `text-shadow` and `box-shadow`.

```css
.neon-title {
    text-shadow: 
        0 0 5px #fff,
        0 0 10px #fff,
        0 0 20px #0ff,
        0 0 40px #0ff,
        0 0 80px #0ff;
}
```

### Game Over Screen

The game over screen features an overlay effect that darkens the game screen with 95% opacity.

```css
#game-over-screen {
    z-index: 100;
    background: rgba(0, 0, 0, 0.95);
}

#game-over-screen::before {
    background: rgba(0, 0, 0, 0.95);
    z-index: -1;
    backdrop-filter: blur(4px);
}
```

## 🚀 Getting Started

Simply open `index.html` in your browser to start the game.

```bash
open index.html
```

## 📝 Local Storage

The game saves high scores to `localStorage`.

- **Key**: `neonSpaceHighScore`
- **Data Format**: Number (score)

## 🎵 Sound Effects

Synthesized sounds using Web Audio API.

| Effect | Waveform | Frequency |
|--------|----------|-----------|
| Shoot | Sawtooth | 800Hz → 600Hz |
| Explosion | White Noise | - |
| Power-up | Sine | 400Hz → 600Hz → 800Hz |
| Hit | Sawtooth | 200Hz |
| Boss Spawn | Sawtooth | 150Hz |

## 🌟 Enemy Types

### Basic Enemy
- Color: Red (#ff0055)
- Shape: Triangle
- HP: 1

### Fast Enemy
- Color: Orange (#ffaa00)
- Shape: Diamond
- Speed: 1.2x
- HP: 1

### Tank Enemy
- Color: Purple (#aa00ff)
- Shape: Square
- Speed: 0.6x
- HP: 3

### Boss
- Color: Magenta (#ff00ff)
- Appears at 3000 points
- HP: 50 + (level × 10)
- Spread shot

## 📱 Responsive Design

| Screen Size | Adaptation |
|-------------|------------|
| 768px and below | Font size adjustment |
| 480px and below | Additional font scaling |

## 🎮 Game Configuration

```javascript
const CONFIG = {
    playerSpeed: 7,           // Player movement speed
    bulletSpeed: 12,          // Bullet speed
    enemyBaseSpeed: 2,        // Base enemy speed
    fireRate: 150,            // Fire interval (ms)
    particleCount: 15,        // Explosion particle count
    starCount: 100,           // Star count
    powerupSpawnRate: 5000,   // Power-up spawn interval (ms)
    comboDecay: 2000,         // Combo decay time (ms)
    comboMultiplier: 1.5      // Combo bonus multiplier
};
```

---

**Author**: Qwen3-Coder-Next-8bit  
**Version**: 1.1.0  
**License**: MIT