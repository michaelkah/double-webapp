import './style.css';
import { Game } from './game';
import { Renderer } from './renderer';
import { MobileControls } from './mobileControls';


const game = new Game();
const renderer = new Renderer('gameCanvas');

function renderBoard() {
  renderer.clear();
  renderer.drawBoard(game.state.board);
  if (game.state.currentPiece) {
    renderer.drawPiece(game.state.currentPiece, game.state.board);
  }
  // Draw score inside the board (top-left with padding)
  renderer.drawScoreInside(game.state.board, game.state.score);
  // Draw HUD (timer, game over)
  renderer.drawHUD(game.state);
}

// Fit canvas to viewport so the full logical layout is visible
window.addEventListener('resize', () => renderer.fitToViewport(game.state.board));

function gameLoop() {
  renderBoard();
  // update game animation state (pass timestamp)
  game.update(performance.now());
  if (game.state.isRunning) {
    requestAnimationFrame(gameLoop);
  }

  // Keep rendering while game is running or when game-over overlay should be visible
  if (game.state.isGameOver && !game.state.isRunning) {
    requestAnimationFrame(gameLoop);
  }
}

function startGame() {
  game.start();
  // initial fit
  renderer.fitToViewport(game.state.board);
  gameLoop();
}

// Example mobile controls integration
new MobileControls({
  canvasId: 'gameCanvas',
  getLayout: () => {
    const board = game.state.board;
    const cellSize = (renderer as any).lastCellSize || Math.max(8, Math.floor(window.innerHeight / board.height));
    const boardW = board.width * cellSize;
    const boardH = board.height * cellSize;
    const offsetX = Math.floor((window.innerWidth - boardW) / 2);
    const offsetY = Math.max(0, window.innerHeight - boardH);
    return { board, cellSize, offsetX, offsetY };
  },
  getCurrentPiece: () => game.state.currentPiece,
  onPlace: () => {
    game.placePiece();
    renderBoard();
  },
  onRotateLeft: () => {
    if (game.state.currentPiece) {
      // rotate left = 3x rotate right
      for (let i = 0; i < 3; i++) game.rotatePiece();
      renderBoard();
    }
  },
  onRotateRight: () => {
    if (game.state.currentPiece) {
      game.rotatePiece();
      renderBoard();
    }
  },
  onUpdate: () => renderBoard(),
});

// Keyboard controls for desktop
window.addEventListener('keydown', (e) => {
  // If game over, allow Space/Enter to restart
  if (game.state.isGameOver && (e.key === ' ' || e.key.toLowerCase() === 'enter')) {
    if (game.state.canRestart === false) return;
    startGame();
    return;
  }
  if (!game.state.currentPiece || !game.state.isRunning) return;
  let moved = false;
  switch (e.key.toLowerCase()) {
    case 'arrowleft':
    case 'a':
      game.movePiece(-1, 0);
      moved = true;
      break;
    case 'arrowright':
    case 'd':
      game.movePiece(1, 0);
      moved = true;
      break;
    case 'arrowdown':
    case 's':
      game.movePiece(0, 1);
      moved = true;
      break;
    case 'arrowup':
    case 'w':
      game.movePiece(0, -1);
      moved = true;
      break;
    case 'z':
    case 'y':
    case 'n':
      // Rotate left
      if (game.state.currentPiece) {
        for (let i = 0; i < 3; i++) game.rotatePiece();
      }
      moved = true;
      break;
    case 'x':
    case 'm':
      // Rotate right
      game.rotatePiece();
      moved = true;
      break;
    case ' ': // Space
    case 'enter':
      game.placePiece();
      moved = true;
      break;
  }
  if (moved) {
    if (game.state.currentPiece) {
    }
    renderBoard();
  }
});

// Start game automatically
startGame();
