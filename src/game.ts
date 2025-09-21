import { Board, CELL_EMPTY } from './board';
import { Piece, PIECE_SHAPES } from './piece';

export type GameState = {
  score: number;
  highScores: number[];
  isRunning: boolean;
  board: Board;
  currentPiece: Piece | null;
};

// ...existing code...

export class Game {
  state: GameState;
  board: Board;
  currentPiece: Piece | null;
  // loop removal animation state
  private loopRemoval: {
    active: boolean;
    cells: { x: number; y: number }[];
    index: number;
    lastTime: number; // ms
    interval: number; // ms per tile
  };

  constructor() {
    this.board = new Board();
    this.currentPiece = null;
    this.loopRemoval = { active: false, cells: [], index: 0, lastTime: 0, interval: 150 };
    this.state = {
      score: 0,
      highScores: [],
      isRunning: false,
      board: this.board,
      currentPiece: this.currentPiece,
    };
  // Do not spawn a piece here; startGame will handle it
  }

  start() {
    this.state.isRunning = true;
    this.state.score = 0;
    this.board.reset();
    this.spawnPiece();
  }

  end() {
    this.state.isRunning = false;
    this.saveHighScore();
  }

  addScore(points: number) {
    this.state.score += points;
  }

  saveHighScore() {
    this.state.highScores.push(this.state.score);
    this.state.highScores.sort((a, b) => b - a);
    this.state.highScores = this.state.highScores.slice(0, 10);
  }

  spawnPiece() {
  // For debugging: only select from first 2 pieces
  const idx = Math.floor(Math.random() * 2);
    const shape = PIECE_SHAPES[idx];
  // Determine piece dimensions (shape is [rotation][x][y])
  const pieceWidth = shape[0].length; // number of columns (x)
  const pieceHeight = shape[0][0].length; // number of rows (y)
    // Random position within board boundaries
    const maxX = this.board.width - pieceWidth;
    const maxY = this.board.height - pieceHeight;
    const randX = Math.floor(Math.random() * (maxX + 1));
    const randY = Math.floor(Math.random() * (maxY + 1));
  // Choose a random rotation
  const rotation = Math.floor(Math.random() * shape.length);
  this.currentPiece = new Piece(shape, randX, randY);
  this.currentPiece.rotation = rotation;
  this.state.currentPiece = this.currentPiece;
    // Debug logging removed: new piece
  }

  movePiece(dx: number, dy: number) {
    if (!this.currentPiece) return;
    // Check if move would go out of bounds (shape is [x][y])
    {
      const s = this.currentPiece.shape;
      const w = s.length;
      const h = s[0].length;
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          const cellType = s[x][y];
          if (cellType) {
            const newX = this.currentPiece.x + x + dx;
            const newY = this.currentPiece.y + y + dy;
            if (
              newX < 0 ||
              newX >= this.board.width ||
              newY < 0 ||
              newY >= this.board.height
            ) {
              return; // Don't move if any part would go out of bounds
            }
          }
        }
      }
    }
    this.currentPiece.move(dx, dy);
  }

  rotatePiece() {
    if (!this.currentPiece) return;
    this.currentPiece.rotate();
    // Debug logging removed: rotate
  }

  // Only used for placement now
  checkPlacementCollision(piece: Piece): boolean {
    // piece.shape is [x][y]
    const s = piece.shape;
    const w = s.length;
    const h = s[0].length;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const cellType = s[x][y];
        if (cellType) {
          const boardX = piece.x + x;
          const boardY = piece.y + y;
          if (
            boardX < 0 ||
            boardX >= this.board.width ||
            boardY < 0 ||
            boardY >= this.board.height ||
            this.board.grid[boardY][boardX] !== 0
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  placePiece() {
    if (!this.currentPiece) return;
    // Only place if no collision
    if (this.checkPlacementCollision(this.currentPiece)) {
      // Invalid placement, do not place
      return;
    }
  let loopDetected = false;
  const loopCells: { x: number; y: number }[] = [];
    // place using shape [x][y]
    {
      const s = this.currentPiece.shape;
      const w = s.length;
      const h = s[0].length;
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          const cellType = s[x][y];
          if (cellType) {
            const boardX = this.currentPiece.x + x;
            const boardY = this.currentPiece.y + y;
            if (
              boardY >= 0 &&
              boardY < this.board.height &&
              boardX >= 0 &&
              boardX < this.board.width
            ) {
              this.board.setCell(boardX, boardY, cellType); // Use correct cell type
              // Check for loop at this cell
              const loop = this.board.detectLoop(boardX, boardY);
              if (loop) {
                loopDetected = true;
                for (const c of loop) loopCells.push(c);
              }
            }
          }
        }
      }
    }
    if (loopDetected) {
      // Deduplicate loop cells and start removal animation
      const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;
      const seen = new Set<string>();
      const unique: { x: number; y: number }[] = [];
      for (const c of loopCells) {
        const k = key(c);
        if (!seen.has(k)) {
          seen.add(k);
          unique.push(c);
        }
      }
      this.loopRemoval.cells = unique;
      this.loopRemoval.index = 0;
      this.loopRemoval.active = true;
      this.loopRemoval.lastTime = performance.now();
      // Score will be awarded when animation completes
      console.log(`Loop detected on placement (${unique.length} cells will be removed)`);
    } else {
      console.log('No loop detected on placement');
      // Also log full board state (rows)
      console.log('Board state:');
      for (let yy = 0; yy < this.board.height; yy++) {
        console.log(this.board.grid[yy].join(' '));
      }
      // Only spawn a new piece immediately if no loop animation is running
      this.spawnPiece();
    }
  }

  // Called from the render loop with current timestamp (ms)
  update(now: number) {
    if (!this.loopRemoval.active) return;
    const lr = this.loopRemoval;
    if (now - lr.lastTime >= lr.interval) {
      // remove next cell
      const c = lr.cells[lr.index];
      if (c && c.y >= 0 && c.y < this.board.height && c.x >= 0 && c.x < this.board.width) {
        this.board.setCell(c.x, c.y, CELL_EMPTY);
      }
      lr.index++;
      lr.lastTime = now;
      // If finished
      if (lr.index >= lr.cells.length) {
        lr.active = false;
        // Award score and then spawn next piece
        this.addScore(1000);
        this.spawnPiece();
      }
    }
  }
}
