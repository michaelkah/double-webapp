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
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawText(text: string, x: number, y: number, color = 'black', font = '20px monospace') {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  }

  drawBoard(board: import('./board').Board) {
    const cellSize = 20;
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const cell = board.grid[y][x];
        const img = this.boardImages[cell];
        if (img && img.complete && img.naturalWidth !== 0) {
          this.ctx.drawImage(img, x * cellSize, y * cellSize, cellSize, cellSize);
        } else {
          // If image not loaded yet, fill with a placeholder color
          this.ctx.fillStyle = '#eee';
          this.ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  drawPiece(piece: import('./piece').Piece) {
    const cellSize = 20;
    // piece.shape is [x][y]
    const s = piece.shape;
    const w = s.length;
    const h = s[0].length;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cellType = s[x][y];
        if (cellType !== CELL_EMPTY) {
          const img = this.cellImages[cellType];
          const px = (piece.x + x) * cellSize;
          const py = (piece.y + y) * cellSize;
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
