# Guess Masters

Guess Masters starter template — a React + Canvas project scaffold for building guessing games that integrate with the CloudArcade platform. Games built from this template are embedded via iframe, communicate through postMessage, and deploy as static sites on GitHub Pages.

## Features

- **React + TypeScript** - Modern component-based architecture with type safety
- **Canvas Game Rendering** - Performant 2D rendering with custom hooks
- **Platform Integration** - Complete CloudArcade postMessage protocol implementation
- **State Management** - Context API for global game state
- **Custom Hooks** - Reusable logic for canvas, input, and platform communication
- **CSS Modules** - Scoped styling for components
- **Asset Organization** - Structured folders for sprites, audio, and data
- **Responsive Design** - Adapts to any container size with touch support
- **GitHub Pages Deployment** - CI/CD workflow included for automatic deployment
- **Test Harness** - Local development tool simulating platform integration

## Quick Start

### 1. Create Your Repository

Click "Use this template" on GitHub or clone the repository:

```bash
git clone https://github.com/cloud-arcade/guess-masters.git my-game
cd my-game
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The game will open at http://localhost:3000

### 4. Test Platform Integration

In a separate terminal, run the test harness:

```bash
npm run test:harness
```

This opens a testing interface at http://localhost:3001 that simulates CloudArcade's parent window.

### 5. Build for Production

```bash
npm run build
```

Output is generated in the `dist/` folder.

## Project Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages deployment workflow
├── public/
│   ├── assets/
│   │   ├── audio/              # Sound effects and music
│   │   ├── data/               # JSON data files (levels, configs)
│   │   ├── fonts/              # Custom fonts
│   │   ├── images/             # Static images and backgrounds
│   │   └── sprites/            # Sprite sheets and animations
│   └── favicon.svg             # Game icon
├── src/
│   ├── components/
│   │   ├── screens/            # Screen components (Menu, Game, GameOver)
│   │   ├── ui/                 # Reusable UI components (Button, HUD)
│   │   └── GameContainer.tsx   # Main game container
│   ├── context/
│   │   └── GameContext.tsx     # Global state management
│   ├── hooks/
│   │   ├── useCloudArcade.ts   # Platform integration hook
│   │   ├── useGameCanvas.ts    # Canvas setup and game loop
│   │   └── useInput.ts         # Keyboard/mouse/touch input
│   ├── platform/
│   │   └── CloudArcade.ts      # Platform communication layer
│   ├── styles/
│   │   └── index.css           # Global CSS variables and reset
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── App.tsx                 # Main app component
│   └── main.tsx                # Entry point
├── test-harness/               # Local testing tools
├── index.html                  # HTML entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Platform Integration

### CloudArcade Communication

Use the `useCloudArcade` hook to communicate with the CloudArcade platform:

```tsx
import { useCloudArcade } from './hooks/useCloudArcade';
import { useGameContext } from './context/GameContext';

function GameComponent() {
  const { state, dispatch } = useGameContext();
  const { startSession, submitScore, endSession, gameOver } = useCloudArcade();

  const handleStartGame = () => {
    startSession();
    dispatch({ type: 'SET_STATE', payload: 'playing' });
  };

  const handleGameOver = () => {
    submitScore(state.score, { level: state.level });
    gameOver(state.score, state.score > state.highScore);
  };

  // ...
}
```

### Message Types

**Game → Platform:**
| Type | Purpose |
|------|---------|
| `GAME_READY` | Signal game has loaded |
| `START_SESSION` | Request a new game session |
| `END_SESSION` | End the current session |
| `SUBMIT_SCORE` | Submit a score |
| `GAME_OVER` | Signal game ended |
| `GAME_ERROR` | Report an error |

**Platform → Game:**
| Type | Purpose |
|------|---------|
| `USER_INFO` | User context after GAME_READY |
| `SESSION_STARTED` | Session created |
| `SESSION_ENDED` | Session ended |
| `SCORE_SUBMITTED` | Score saved with rank |
| `SCORE_ERROR` | Score submission failed |

## Building Your Game

### 1. Create Your Scenes

Extend the `Scene` class for each game screen:

```typescript
import { Scene } from '@/game/scenes/Scene';

export class MyGameScene extends Scene {
  protected onEnter(): void {
    // Initialize scene
  }

  public update(deltaTime: number): void {
    // Game logic (deltaTime in seconds)
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Draw to canvas
  }
}
```

### 2. Create Entities

Extend the `Entity` class for game objects:

```typescript
import { Entity, EntityConfig } from '@/game/entities/Entity';

export class Enemy extends Entity {
  constructor(config: EntityConfig) {
    super(config);
  }

  public update(deltaTime: number): void {
    // Update logic
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Draw entity
  }
}
```

### 3. Handle Input

Use the `InputManager` for keyboard, mouse, and touch:

```typescript
const input = this.game.input;

// Keyboard
if (input.isKeyDown('ArrowLeft')) { /* held */ }
if (input.isKeyPressed('Space')) { /* just pressed */ }

// Mouse
const pos = input.mousePosition;
if (input.isMousePressed(0)) { /* left click */ }

// Touch
if (input.isTouching) {
  const touches = input.touchPositions;
}
```

### 4. Load Assets

Use the `AssetLoader` for images, audio, and data:

```typescript
import { assetLoader } from '@/game/utils/AssetLoader';

await assetLoader.load({
  images: [
    { key: 'player', src: '/assets/player.png' },
  ],
  audio: [
    { key: 'jump', src: '/assets/sounds/jump.mp3' },
  ],
}, (progress) => {
  console.log(`Loading: ${progress.percent}%`);
});

// Use assets
const playerImg = assetLoader.getImage('player');
assetLoader.playSound('jump');
```

## Configuration

### Vite Config

Update `vite.config.ts` with your repository name for GitHub Pages:

```typescript
export default defineConfig({
  base: '/guess-masters/',
  // ...
});
```

### Game Settings

Modify `src/main.ts` to configure your game:

```typescript
const game = new Game({
  canvasId: 'game-canvas',
  targetFps: 60,
  debug: import.meta.env.DEV,
});

// Add your scenes
game.addScene('menu', new MyMenuScene());
game.addScene('play', new MyPlayScene());
```

## Deployment

### Automatic (GitHub Actions)

1. Push to the `main` branch
2. GitHub Actions builds and deploys automatically
3. Enable GitHub Pages in repository settings (from `gh-pages` branch)

### Manual

```bash
npm run build
# Deploy the dist/ folder to any static host
```

## Design Guidelines

### Color Palette

```css
/* Backgrounds */
--color-bg-deep: #0a0a1a;
--color-bg: #1f2235;
--color-bg-card: #252840;

/* Accents */
--color-primary: #f06530;    /* Orange */
--color-success: #22c55e;    /* Green */
--color-warning: #f59e0b;    /* Yellow */
--color-danger: #ef4444;     /* Red */

/* Text */
--color-text: #dfe3ea;
--color-text-muted: #7a8499;
```

### Typography

- Font: Inter, system-ui, sans-serif
- Minimum size: 14px

### UI Elements

- Border radius: 8-12px
- Transitions: 150-200ms

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test:harness` | Start test harness |

## Requirements

- Node.js 18+
- npm 9+

## License

MIT

---

## CloudArcade Registration

Once deployed, register your game in CloudArcade admin:

| Field | Value |
|-------|-------|
| URL | `https://[org].github.io/[repo]/` |
| Category | action, puzzle, arcade, etc. |
| Thumbnail | 400×300 preview image |
| Banner | 1200×400 banner image |
