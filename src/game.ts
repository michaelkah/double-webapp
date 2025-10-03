import { Board, CELL_EMPTY } from './board';
import { Piece, PIECE_SHAPES } from './piece';

export type GameState = {
  score: number;
  highScores: number[];
  isRunning: boolean;
  isGameOver?: boolean;
  board: Board;
  currentPiece: Piece | null;
  // timer in milliseconds remaining
  timerRemaining?: number;
  timerDuration?: number;
};

// ...existing code...

export class Game {
  state: GameState;
  board: Board;
  currentPiece: Piece | null;
  // Timer settings
  private timerDuration = 10000; // 10 seconds
  private lastTimerTick = 0; // ms
  // loop removal animation state
  private loopRemoval: {
    active: boolean;
    cells: { x: number; y: number }[];
    index: number;
    lastTime: number; // ms
    interval: number; // ms per tile
    pointsPerTile?: number;
  };

  constructor() {
    this.board = new Board();
    this.currentPiece = null;
  this.loopRemoval = { active: false, cells: [], index: 0, lastTime: 0, interval: 150, pointsPerTile: 1 };
    this.state = {
      score: 0,
      highScores: [],
      isRunning: false,
      board: this.board,
      currentPiece: this.currentPiece,
      isGameOver: false,
      timerRemaining: this.timerDuration,
      timerDuration: this.timerDuration,
    };
  // Do not spawn a piece here; startGame will handle it
  }

  start() {
    this.state.isRunning = true;
    this.state.score = 0;
    this.board.reset();
    this.state.isGameOver = false;
    this.state.timerRemaining = this.timerDuration;
    this.state.timerDuration = this.timerDuration;
    this.lastTimerTick = performance.now();
    this.spawnPiece();
  }

  end() {
    this.state.isRunning = false;
    this.state.isGameOver = true;
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
  // Select a random piece from all available shapes
  const idx = Math.floor(Math.random() * PIECE_SHAPES.length);
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
    // Reset timer when a new piece appears
    this.state.timerRemaining = this.timerDuration;
    this.lastTimerTick = performance.now();
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
    // remember old state so we can revert if needed
    const oldRotation = this.currentPiece.rotation;
    const oldX = this.currentPiece.x;
    const oldY = this.currentPiece.y;

    // perform rotation
    this.currentPiece.rotate();

    // After rotation, compute occupied bounding box (ignore CELL_EMPTY)
    const s = this.currentPiece.shape;
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = Number.NEGATIVE_INFINITY;
    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    for (let cx = 0; cx < s.length; cx++) {
      for (let cy = 0; cy < s[cx].length; cy++) {
        if (s[cx][cy] !== CELL_EMPTY) {
          if (cx < minCol) minCol = cx;
          if (cx > maxCol) maxCol = cx;
          if (cy < minRow) minRow = cy;
          if (cy > maxRow) maxRow = cy;
        }
      }
    }
    // If no occupied cells (shouldn't happen), revert
    if (minCol === Number.POSITIVE_INFINITY) {
      this.currentPiece.rotation = oldRotation;
      return;
    }

    // Allowed range for piece.x so occupied cols are inside [0, board.width-1]
    const minXAllowed = -minCol;
    const maxXAllowed = this.board.width - 1 - maxCol;
    const minYAllowed = -minRow;
    const maxYAllowed = this.board.height - 1 - maxRow;

    // Clamp current position into allowed bounds
    let baseX = Math.min(Math.max(this.currentPiece.x, minXAllowed), maxXAllowed);
    let baseY = Math.min(Math.max(this.currentPiece.y, minYAllowed), maxYAllowed);

    // Try small kicks around clamped position (only enforce boundaries, no board collision checks)
    const kicks = [0, -1, 1, -2, 2];
    let placed = false;
    for (let dx of kicks) {
      for (let dy of kicks) {
        const nx = baseX + dx;
        const ny = baseY + dy;
        if (nx < minXAllowed || ny < minYAllowed || nx > maxXAllowed || ny > maxYAllowed) continue;
        // Accept this position as it keeps occupied tiles inside the board
        this.currentPiece.x = nx;
        this.currentPiece.y = ny;
        placed = true;
        break;
      }
      if (placed) break;
    }

    if (!placed) {
      // revert rotation and position
      this.currentPiece.rotation = oldRotation;
      this.currentPiece.x = oldX;
      this.currentPiece.y = oldY;
    }
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
    // Note: don't early-return on collision here — exact-match removals
    // should be detected first. We'll check collisions before the normal placement.
  let loopDetected = false;
  const loopCells: { x: number; y: number }[] = [];
    // First, check for exact-match removal possibility: piece's non-empty tiles must
    // match the board's tiles exactly at the same positions (same cell types).
    const s = this.currentPiece.shape;
    const w = s.length;
    const h = s[0].length;
    let nonEmptyCount = 0;
    let exactMatch = true;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const cellType = s[x][y];
        if (cellType) {
          nonEmptyCount++;
          const boardX = this.currentPiece.x + x;
          const boardY = this.currentPiece.y + y;
          if (
            boardY < 0 ||
            boardY >= this.board.height ||
            boardX < 0 ||
            boardX >= this.board.width
          ) {
            exactMatch = false;
            break;
          }
          if (this.board.grid[boardY][boardX] !== cellType) {
            exactMatch = false;
            break;
          }
        }
      }
      if (!exactMatch) break;
    }

    if (exactMatch && nonEmptyCount > 0) {
      // We can remove these tiles instead of placing, but only if player has enough score
      const cost = 2 * nonEmptyCount;
      if (this.state.score >= cost) {
        // Schedule removal animation for these tiles with negative points per tile
        const cellsToRemove: { x: number; y: number }[] = [];
        for (let x = 0; x < w; x++) {
          for (let y = 0; y < h; y++) {
            if (s[x][y]) {
              cellsToRemove.push({ x: this.currentPiece.x + x, y: this.currentPiece.y + y });
            }
          }
        }
        this.loopRemoval.cells = cellsToRemove;
        this.loopRemoval.index = 0;
        this.loopRemoval.active = true;
        this.loopRemoval.lastTime = performance.now();
        this.loopRemoval.pointsPerTile = -2; // cost per tile
        // Hide hovering piece
        this.currentPiece = null;
        this.state.currentPiece = null;
        return;
      } else {
        // Not enough score, fall through to normal placement
      }
    }
    // For normal placement (not exact-match removal), ensure there's no collision
    if (this.checkPlacementCollision(this.currentPiece)) {
      // Invalid placement, do not place
      return;
    }
    // place using shape [x][y]
    {
      const s2 = this.currentPiece.shape;
      const w2 = s2.length;
      const h2 = s2[0].length;
      for (let x = 0; x < w2; x++) {
        for (let y = 0; y < h2; y++) {
          const cellType = s2[x][y];
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
    // Hide the hovering piece immediately after placement so the loop
    // is visible as a whole during the removal animation.
    this.currentPiece = null;
    this.state.currentPiece = null;
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
  this.loopRemoval.pointsPerTile = 1; // normal loop rewards 1 per tile
      // Score will be awarded when animation completes
      // Loop detected — start removal animation
    } else {
      // No loop detected on placement
      // Only spawn a new piece immediately if no loop animation is running
      this.spawnPiece();
    }
  }

  // Called from the render loop with current timestamp (ms)
  update(now: number) {
    // Update timer (only when running). Pause the timer while a loop removal
    // animation is active so players don't lose time during animations.
    if (this.state.isRunning && !this.state.isGameOver) {
      if (!this.loopRemoval.active) {
        const last = this.lastTimerTick || now;
        const dt = now - last;
        this.lastTimerTick = now;
        if (typeof this.state.timerRemaining === 'number') {
          this.state.timerRemaining = Math.max(0, this.state.timerRemaining - dt);
          if (this.state.timerRemaining <= 0) {
            // Time's up -> try to auto-place the current piece. If placement
            // collides, it's game over. If no current piece exists, also game over.
            if (this.currentPiece) {
              // First, check for exact-match removal possibility (auto-removal):
              // piece's non-empty tiles must match the board's tiles exactly.
              const s = this.currentPiece.shape;
              const w = s.length;
              const h = s[0].length;
              let nonEmptyCount = 0;
              let exactMatch = true;
              for (let x = 0; x < w; x++) {
                for (let y = 0; y < h; y++) {
                  const cellType = s[x][y];
                  if (cellType) {
                    nonEmptyCount++;
                    const boardX = this.currentPiece.x + x;
                    const boardY = this.currentPiece.y + y;
                    if (
                      boardY < 0 ||
                      boardY >= this.board.height ||
                      boardX < 0 ||
                      boardX >= this.board.width
                    ) {
                      exactMatch = false;
                      break;
                    }
                    if (this.board.grid[boardY][boardX] !== cellType) {
                      exactMatch = false;
                      break;
                    }
                  }
                }
                if (!exactMatch) break;
              }

              if (exactMatch && nonEmptyCount > 0) {
                // Attempt costly removal if the player has enough score
                const cost = 2 * nonEmptyCount;
                if (this.state.score >= cost) {
                  const cellsToRemove: { x: number; y: number }[] = [];
                  for (let x = 0; x < w; x++) {
                    for (let y = 0; y < h; y++) {
                      if (s[x][y]) {
                        cellsToRemove.push({ x: this.currentPiece.x + x, y: this.currentPiece.y + y });
                      }
                    }
                  }
                  this.loopRemoval.cells = cellsToRemove;
                  this.loopRemoval.index = 0;
                  this.loopRemoval.active = true;
                  this.loopRemoval.lastTime = performance.now();
                  this.loopRemoval.pointsPerTile = -2; // costly removal
                  // Hide hovering piece
                  this.currentPiece = null;
                  this.state.currentPiece = null;
                  // timer will be reset when spawnPiece runs after removal
                } else {
                  // Not enough score to perform the costly removal -> game over
                  this.end();
                }
              } else {
                // Not an exact-match removal; fall back to normal auto-place
                if (this.checkPlacementCollision(this.currentPiece)) {
                  this.end();
                } else {
                  this.placePiece();
                  this.state.timerRemaining = this.timerDuration;
                  this.lastTimerTick = now;
                }
              }
            } else {
              this.end();
            }
          }
        }
      } else {
        // While removal animation runs, do not advance lastTimerTick so the
        // timer resumes correctly after the animation finishes.
      }
    }

    // Process loop removal animation if active
    if (!this.loopRemoval.active) return;
    const lr = this.loopRemoval;
    if (now - lr.lastTime >= lr.interval) {
      // remove next cell
      const c = lr.cells[lr.index];
      if (c && c.y >= 0 && c.y < this.board.height && c.x >= 0 && c.x < this.board.width) {
        this.board.setCell(c.x, c.y, CELL_EMPTY);
        // Each removed tile modifies score by pointsPerTile (can be negative)
        const ppt = lr.pointsPerTile ?? 1;
        this.addScore(ppt);
      }
      lr.index++;
      lr.lastTime = now;
      // If finished
      if (lr.index >= lr.cells.length) {
        lr.active = false;
        // reset pointsPerTile back to default for future removals
        lr.pointsPerTile = 1;
        // If the board is completely empty after removal, double the score
        let boardEmpty = true;
        for (let yy = 0; yy < this.board.height && boardEmpty; yy++) {
          for (let xx = 0; xx < this.board.width; xx++) {
            if (this.board.grid[yy][xx] !== CELL_EMPTY) {
              boardEmpty = false;
              break;
            }
          }
        }
        if (boardEmpty) {
          this.state.score = this.state.score * 2;
        }
        // After animation completes, spawn next hovering piece
        this.spawnPiece();
      }
    }
  }
}
