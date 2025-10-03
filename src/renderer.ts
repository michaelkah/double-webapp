// renderer.ts
// Handles HTML5 Canvas rendering for the game
import { CELL_EMPTY } from './board';
import { CELL_IMAGE_MAP } from './cellImages';
import { CELL_BOARD_IMAGE_MAP } from './cellBoardImages';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellImages: Record<number, HTMLImageElement>;
  private boardImages: Record<number, HTMLImageElement>;
  // last computed cell size in device pixels
  private lastCellSize = 40;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;
    // Load images for each cell type for pieces
    this.cellImages = {};
    for (const [cellType, filename] of Object.entries(CELL_IMAGE_MAP)) {
      const img = new window.Image();
      img.src = '/' + filename;
      this.cellImages[Number(cellType)] = img;
    }
    // Load images for each cell type for board
    this.boardImages = {};
    for (const [cellType, filename] of Object.entries(CELL_BOARD_IMAGE_MAP)) {
      const img = new window.Image();
      img.src = '/' + filename;
      this.boardImages[Number(cellType)] = img;
    }
    // No logo/author images anymore
  }

  clear() {
    // Fill background black
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Compute a responsive square cell size that ensures the board stays in
  // portrait orientation. If the device is in landscape, prioritize the
  // viewport height so the board remains taller than wide (portrait).
  computeCellSize(board: import('./board').Board) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // New sizing rule:
    // - board width should fill the screen width: board.width * s = vw  => s = vw / board.width
    // - board height should be screen height minus two cell heights: board.height * s = vh - 2*s
    //   => s * (board.height + 2) = vh => s = vh / (board.height + 2)
    // Choose the smaller s so both constraints are satisfied.
    const cellByWidth = Math.floor(vw / board.width);
    const cellByHeightWithPadding = Math.floor(vh / (board.height + 2));
    const cellSize = Math.max(8, Math.min(cellByWidth, cellByHeightWithPadding));
    return cellSize;
  }

  drawText(text: string, x: number, y: number, color = 'black', font = '20px monospace') {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  }

  drawBoard(board: import('./board').Board) {
    // remember last board for responsive fitting
    (this as any)._lastBoard = board;
    // compute a responsive, square cell size
    const cellSize = this.computeCellSize(board);
    this.lastCellSize = cellSize;

  // Compute board pixel size and center the board horizontally and vertically.
  const boardW = board.width * cellSize;
  const boardH = board.height * cellSize;
  const offsetX = Math.floor((this.canvas.width - boardW) / 2);
  const offsetY = Math.floor((this.canvas.height - boardH) / 2);

    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const cell = board.grid[y][x];
        const img = this.boardImages[cell];
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;
        if (img && img.complete && img.naturalWidth !== 0) {
          this.ctx.drawImage(img, px, py, cellSize, cellSize);
        } else {
          // If image not loaded yet, fill with a placeholder color
          this.ctx.fillStyle = '#111';
          this.ctx.fillRect(px, py, cellSize, cellSize);
        }
      }
    }
    // no logos
  }

  drawScoreInside(_board: import('./board').Board, _score: number) {
    // Old in-board score removed; HUD displays score now.
    return;
  }

  // Draw HUD elements like timer bar and game over text. Expects full game state
  drawHUD(state: any) {
  const board: import('./board').Board = state.board;
  const cellSize = this.lastCellSize || this.computeCellSize(board);
  const boardW = board.width * cellSize;
    const boardH = board.height * cellSize;
    const offsetX = Math.floor((this.canvas.width - boardW) / 2);
    const offsetY = Math.floor((this.canvas.height - boardH) / 2);

    // Highscore and score are relative to the board (drawn within the
    // top area of the board region). Both are bold, beige and semi-opaque.
    const beige = '#f5f0d7';
    const alpha = 0.5;
    const fontSize = Math.max(12, Math.floor(cellSize));
    this.ctx.save();
    this.ctx.fillStyle = beige;
    this.ctx.globalAlpha = alpha;
    this.ctx.font = `bold ${fontSize}px monospace`;
    this.ctx.textBaseline = 'top';
    const hi = (state.highScores && state.highScores[0]) ? state.highScores[0] : 0;
    this.ctx.textAlign = 'left';
    const pad = Math.floor(cellSize / 2);
    this.ctx.fillText(`HI ${hi}`, offsetX + pad, offsetY + pad);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(String(state.score ?? 0), offsetX + boardW - pad, offsetY + pad);
    this.ctx.restore();

    // Draw timer bar as a HUD on the board (50% opacity).
    // Position: x = cellSize/2 from left edge of board; width = 9 cells; y = 1.5 cells from bottom; height = 1 cell.
    if (typeof state.timerRemaining === 'number' && typeof state.timerDuration === 'number') {
      const pct = Math.max(0, Math.min(1, state.timerRemaining / state.timerDuration));
  const desiredX = offsetX + Math.floor(cellSize / 2);
      const desiredW = Math.floor(9 * cellSize);
      // Clamp width so it doesn't overflow the board area (leave at least half-cell padding on right)
      const maxW = Math.max(0, boardW - Math.floor(cellSize));
      const timerW = Math.min(desiredW, maxW);
      const timerX = desiredX;
      const timerH = Math.floor(cellSize);
  const timerY = offsetY + boardH - Math.floor(cellSize * 1.5);
      if (timerW > 0 && timerH > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.5; // 50% opacity per request
        const beigeColor = '#f5f0d7';
        // Background (empty) bar - draw a darker translucent background for contrast
        this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
        this.ctx.fillRect(timerX, timerY, timerW, timerH);
        // Filled portion
        this.ctx.fillStyle = beigeColor;
        const filledW = Math.floor(timerW * pct);
        if (filledW > 0) this.ctx.fillRect(timerX, timerY, filledW, timerH);
        this.ctx.restore();
      }
    }

    // If game over, overlay centered text inside the board area
    if (state.isGameOver) {
      const cx = offsetX + Math.floor(boardW / 2);
      const cy = offsetY + Math.floor((board.height * cellSize) / 2);
      this.ctx.save();
      // Darken the whole board area so the text stands out
      this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.ctx.fillRect(offsetX, offsetY, boardW, board.height * cellSize);
      // Draw large outlined text in beige
      const fontSizeGO = Math.max(18, Math.floor(cellSize * 1.6));
      this.ctx.font = `bold ${fontSizeGO}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      // Black stroke for contrast, then beige fill
      this.ctx.lineWidth = Math.max(2, Math.floor(cellSize * 0.08));
      this.ctx.strokeStyle = 'black';
      this.ctx.fillStyle = beige;
      this.ctx.strokeText('GAME OVER', cx, cy);
      this.ctx.fillText('GAME OVER', cx, cy);
      this.ctx.restore();
    }
  }

  // Compute logical pixel size for the whole canvas based on board and images
  computeLayout(board: import('./board').Board) {
    const cellSize = this.computeCellSize(board);
    const boardW = board.width * cellSize;
    const boardH = board.height * cellSize;
    // We reserve two cell heights of vertical space (one above and one below)
    // per the sizing rule; however computeLayout should report the actual
    // board pixel dimensions (used by fitToViewport/layout logic).
    return { width: boardW, height: boardH };
  }

  // Scale the canvas (via CSS size) so the full logical canvas fits in viewport/container
  fitToViewport(board: import('./board').Board) {
    // Set the canvas drawing buffer to viewport size so we can draw
    // letterbox areas (left/right) directly. Compute a cell size that
    // prefers filling the height (for portrait) and center horizontally.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Set canvas logical size to viewport so black areas act as letterbox
    this.canvas.width = vw;
    this.canvas.height = vh;
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    // Compute cell size prioritizing height (left/right letterbox if possible)
    const cellSize = this.computeCellSize(board);
    this.lastCellSize = cellSize;
  }

  drawPiece(piece: import('./piece').Piece, board: import('./board').Board) {
    const cellSize = this.lastCellSize || this.computeCellSize(board);
  // Compute offsets in the same way drawBoard does (centered)
  const boardW = board.width * cellSize;
  const boardH = board.height * cellSize;
  const offsetX = Math.floor((this.canvas.width - boardW) / 2);
  const offsetY = Math.floor((this.canvas.height - boardH) / 2);
    // piece.shape is [x][y]
    const s = piece.shape;
    const w = s.length;
    const h = s[0].length;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cellType = s[x][y];
        if (cellType !== CELL_EMPTY) {
          const img = this.cellImages[cellType];
          const px = offsetX + (piece.x + x) * cellSize;
          const py = offsetY + (piece.y + y) * cellSize;
          if (img && img.complete && img.naturalWidth !== 0) {
            this.ctx.drawImage(img, px, py, cellSize, cellSize);
          } else {
            this.ctx.fillStyle = 'blue';
            this.ctx.fillRect(px, py, cellSize, cellSize);
            this.ctx.strokeStyle = 'white';
            this.ctx.strokeRect(px, py, cellSize, cellSize);
          }
        }
      }
    }
  }
}
