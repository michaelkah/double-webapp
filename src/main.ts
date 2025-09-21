import './style.css';
import { Game } from './game';
import { Renderer } from './renderer';
import { MobileControls } from './mobileControls';


const game = new Game();
const renderer = new Renderer('gameCanvas');

function renderBoard() {
  renderer.clear();
  renderer.drawBoard(game.state.board, game.state.score);
  if (game.state.currentPiece) {
    renderer.drawPiece(game.state.currentPiece, game.state.board);
  }
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
}

function startGame() {
  game.start();
  // initial fit
  renderer.fitToViewport(game.state.board);
  gameLoop();
}

// Example mobile controls integration
new MobileControls('gameCanvas', (direction) => {
  if (!game.state.currentPiece) return;
  if (direction === 'left') game.movePiece(-1, 0);
  else if (direction === 'right') game.movePiece(1, 0);
  else if (direction === 'down') game.movePiece(0, 1);
  renderBoard();
}, () => {
  if (!game.state.currentPiece) return;
  game.rotatePiece();
  renderBoard();
});

// Keyboard controls for desktop
window.addEventListener('keydown', (e) => {
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
