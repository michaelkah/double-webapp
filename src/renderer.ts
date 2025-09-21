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
  private logoImage: HTMLImageElement;
  private authorImage: HTMLImageElement;
  private imageGap = 8;

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
    // Load logo and author images (drawn below the board)
    this.logoImage = new window.Image();
    this.logoImage.src = '/double.gif';
    this.authorImage = new window.Image();
    this.authorImage.src = '/autoren.gif';
    // Refit canvas when images load
    this.logoImage.onload = () => {
      if ((this as any)._lastBoard) this.fitToViewport((this as any)._lastBoard);
    };
    this.authorImage.onload = () => {
      if ((this as any)._lastBoard) this.fitToViewport((this as any)._lastBoard);
    };
  }

  clear() {
    // Fill background black
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawText(text: string, x: number, y: number, color = 'black', font = '20px monospace') {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  }

  drawBoard(board: import('./board').Board, score?: number) {
    // remember last board for responsive fitting
    (this as any)._lastBoard = board;
  const cellSize = 40; // scale factor 2 (was 20)
    const boardW = board.width * cellSize;
    const boardH = board.height * cellSize;
    const offsetX = Math.floor((this.canvas.width - boardW) / 2);
    // Compute image displayed sizes
    let logoH = 0;
    let logoW = 0;
    if (this.logoImage && this.logoImage.complete && this.logoImage.naturalWidth) {
      logoW = Math.min(boardW, this.logoImage.naturalWidth);
      const scale = logoW / this.logoImage.naturalWidth;
      logoH = Math.floor(this.logoImage.naturalHeight * scale);
    }
    let authorH = 0;
    let authorW = 0;
    if (this.authorImage && this.authorImage.complete && this.authorImage.naturalWidth) {
      authorW = Math.min(boardW, this.authorImage.naturalWidth);
      const scale = authorW / this.authorImage.naturalWidth;
      authorH = Math.floor(this.authorImage.naturalHeight * scale);
    }
    const imagesHeight = (logoH > 0 ? logoH + this.imageGap : 0) + (authorH > 0 ? authorH : 0);
    const offsetY = Math.floor((this.canvas.height - (boardH + imagesHeight)) / 2);

    // Draw score centered above the board
    if (typeof score === 'number') {
      const text = `Score: ${score}`;
      this.ctx.fillStyle = 'white';
      this.ctx.font = '20px monospace';
      const m = this.ctx.measureText(text);
      const tx = Math.floor((this.canvas.width - m.width) / 2);
      // Place text a bit above the board; ensure it's not off-canvas
      const ty = Math.max(22, offsetY - 8);
      this.ctx.fillText(text, tx, ty);
    }

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
            this.ctx.fillStyle = '#eee';
            this.ctx.fillRect(px, py, cellSize, cellSize);
        }
      }
    }

    // Draw logo and author images below the board, centered
    let imgY = offsetY + boardH + this.imageGap;
    if (logoH > 0) {
      const drawLogoW = logoW;
      const drawLogoH = logoH;
      const logoX = Math.floor((this.canvas.width - drawLogoW) / 2);
      this.ctx.drawImage(this.logoImage, 0, 0, this.logoImage.naturalWidth, this.logoImage.naturalHeight, logoX, imgY, drawLogoW, drawLogoH);
      imgY += drawLogoH + this.imageGap;
    }
    if (authorH > 0) {
      const drawAuthorW = authorW;
      const drawAuthorH = authorH;
      const authorX = Math.floor((this.canvas.width - drawAuthorW) / 2);
      this.ctx.drawImage(this.authorImage, 0, 0, this.authorImage.naturalWidth, this.authorImage.naturalHeight, authorX, imgY, drawAuthorW, drawAuthorH);
    }
  }

  // Compute logical pixel size for the whole canvas based on board and images
  computeLayout(board: import('./board').Board) {
    const cellSize = 40;
    const boardW = board.width * cellSize;
    const boardH = board.height * cellSize;
    let logoH = 0;
    let logoW = 0;
    if (this.logoImage && this.logoImage.complete && this.logoImage.naturalWidth) {
      logoW = Math.min(boardW, this.logoImage.naturalWidth * 2);
      const scale = logoW / this.logoImage.naturalWidth;
      logoH = Math.floor(this.logoImage.naturalHeight * scale);
    }
    let authorH = 0;
    let authorW = 0;
    if (this.authorImage && this.authorImage.complete && this.authorImage.naturalWidth) {
      authorW = Math.min(boardW, this.authorImage.naturalWidth * 2);
      const scale = authorW / this.authorImage.naturalWidth;
      authorH = Math.floor(this.authorImage.naturalHeight * scale);
    }
    const imagesHeight = (logoH > 0 ? logoH + this.imageGap : 0) + (authorH > 0 ? authorH : 0);
    const scoreArea = 32; // space for score above board
    const totalH = boardH + imagesHeight + scoreArea + this.imageGap;
    return { width: boardW, height: totalH };
  }

  // Scale the canvas (via CSS size) so the full logical canvas fits in viewport/container
  fitToViewport(board: import('./board').Board) {
    const layout = this.computeLayout(board);
    const logicalW = layout.width;
    const logicalH = layout.height;
    // Keep canvas drawing coordinates at logical size
    this.canvas.width = logicalW;
    this.canvas.height = logicalH;
    // find container width
    const container = this.canvas.parentElement || document.body;
    const maxCssW = Math.max(320, Math.min(container.clientWidth, window.innerWidth));
    const maxCssH = Math.max(200, window.innerHeight - 20);
    const scale = Math.min(maxCssW / logicalW, maxCssH / logicalH, 1);
    this.canvas.style.width = Math.floor(logicalW * scale) + 'px';
    this.canvas.style.height = Math.floor(logicalH * scale) + 'px';
  }

  drawPiece(piece: import('./piece').Piece, board: import('./board').Board) {
  const cellSize = 40; // scale factor 2
    // Compute offsets in the same way drawBoard does
  const boardW = board.width * cellSize;
  const boardH = board.height * cellSize;
    const offsetX = Math.floor((this.canvas.width - boardW) / 2);
    // Compute image heights to reserve vertical space like drawBoard
    let logoH = 0;
    if (this.logoImage && this.logoImage.complete && this.logoImage.naturalWidth) {
      const logoW = Math.min(boardW, this.logoImage.naturalWidth);
      const scale = logoW / this.logoImage.naturalWidth;
      logoH = Math.floor(this.logoImage.naturalHeight * scale);
    }
    let authorH = 0;
    if (this.authorImage && this.authorImage.complete && this.authorImage.naturalWidth) {
      const authorW = Math.min(boardW, this.authorImage.naturalWidth);
      const scale = authorW / this.authorImage.naturalWidth;
      authorH = Math.floor(this.authorImage.naturalHeight * scale);
    }
    const imagesHeight = (logoH > 0 ? logoH + this.imageGap : 0) + (authorH > 0 ? authorH : 0);
    const offsetY = Math.floor((this.canvas.height - (boardH + imagesHeight)) / 2);
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
