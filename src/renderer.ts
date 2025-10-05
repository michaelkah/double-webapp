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
  private gameOverImg: HTMLImageElement;
  private pausedImg: HTMLImageElement;
  private doubleImg: HTMLImageElement;
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
    // Load game-over image (transparent PNG)
    this.gameOverImg = new window.Image();
    this.gameOverImg.src = '/gameover.png';
  this.pausedImg = new window.Image();
  this.pausedImg.src = '/paused.png';
    this.doubleImg = new window.Image();
    this.doubleImg.src = '/double.gif';
    // No logo/author images anymore
  }

  // Preload all images used by the renderer and return a Promise that
  // resolves when all have finished loading (or errored).
  preload(): Promise<void> {
    const imgs: HTMLImageElement[] = [];
    for (const k of Object.keys(this.cellImages)) imgs.push(this.cellImages[Number(k)]);
    for (const k of Object.keys(this.boardImages)) imgs.push(this.boardImages[Number(k)]);
    imgs.push(this.gameOverImg);
    imgs.push(this.pausedImg);
    imgs.push(this.doubleImg);

    const promises = imgs.map((img) => {
      return new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth) return resolve();
        const onLoad = () => {
          cleanup();
          resolve();
        };
        const onErr = () => {
          cleanup();
          // Resolve even on error to avoid blocking the app; fallback drawing handles missing images
          resolve();
        };
        const cleanup = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onErr);
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onErr);
      });
    });
    return Promise.all(promises).then(() => undefined);
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
    // Compute double-flash on/off state if active (state.doubleFlashStart)
    let doubleOpacity = 0;
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    if (state.doubleFlashStart && typeof state.doubleFlashDuration === 'number' && typeof state.doubleFlashCount === 'number') {
      const elapsed = now - state.doubleFlashStart;
      const duration = state.doubleFlashDuration;
      const flashes = Math.max(1, state.doubleFlashCount);
      // Only consider the flash active for elapsed strictly less than duration.
      // Using '<' prevents a final micro-flash when elapsed == duration.
      if (elapsed < duration) {
        const flashDur = duration / flashes;
        const within = elapsed % flashDur;
        const pct = within / flashDur; // 0..1
        // Hard flash: on for first half of each flash period, off for second half.
        doubleOpacity = pct < 0.5 ? 1 : 0;
      } else {
        // Do not mutate game state here; simply treat as finished (doubleOpacity remains 0).
      }
    }
    const fontSize = Math.max(12, Math.floor(cellSize));
    this.ctx.save();
    this.ctx.fillStyle = beige;
    this.ctx.globalAlpha = alpha;
    this.ctx.font = `bold ${fontSize}px monospace`;
    this.ctx.textBaseline = 'top';
  const hi = (state.highScores && state.highScores[0]) ? state.highScores[0] : 0;
  this.ctx.textAlign = 'left';
  const pad = Math.floor(cellSize / 2);
  // Use lowercase 'hi' prefix without a trailing space as requested
  this.ctx.fillText(`hi${hi}`, offsetX + pad, offsetY + pad);
    this.ctx.textAlign = 'right';
    // If double flash is active, show/hide the score (hard flash). Otherwise draw normally.
    if (state.doubleFlashStart && doubleOpacity > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = doubleOpacity; // 1 or 0
      this.ctx.fillText(String(state.score ?? 0), offsetX + boardW - pad, offsetY + pad);
      this.ctx.restore();
    } else {
      this.ctx.fillText(String(state.score ?? 0), offsetX + boardW - pad, offsetY + pad);
    }
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

    // If paused, draw paused overlay
    if (state.paused) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.ctx.fillRect(offsetX, offsetY, boardW, board.height * cellSize);
      const img = this.pausedImg;
      if (img && img.complete && img.naturalWidth) {
        let iw = img.naturalWidth;
        let ih = img.naturalHeight;
        // Target width: 90% of board width
        let drawW = Math.floor(boardW * 0.9);
        let drawH = Math.floor((ih * drawW) / iw);
        // If the computed height exceeds the board height, clamp by height
        if (drawH > boardH) {
          drawH = boardH;
          drawW = Math.floor((iw * drawH) / ih);
        }
        const dx = offsetX + Math.floor((boardW - drawW) / 2);
        const dy = offsetY + Math.floor((boardH - drawH) / 2);
        this.ctx.drawImage(img, dx, dy, drawW, drawH);
      }
      this.ctx.restore();
    }

    // If game over, overlay centered text inside the board area
    if (state.isGameOver) {
      // Darken the whole board area so the overlay stands out
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.ctx.fillRect(offsetX, offsetY, boardW, board.height * cellSize);
      // Draw centered gameover image if available, otherwise fall back to text
      const img = this.gameOverImg;
      if (img && img.complete && img.naturalWidth) {
        // Target width: 90% of board width; scale down as needed and clamp by height
        let iw = img.naturalWidth;
        let ih = img.naturalHeight;
        let drawW = Math.floor(boardW * 0.9);
        let drawH = Math.floor((ih * drawW) / iw);
        if (drawH > boardH) {
          drawH = boardH;
          drawW = Math.floor((iw * drawH) / ih);
        }
        const dx = offsetX + Math.floor((boardW - drawW) / 2);
        const dy = offsetY + Math.floor((boardH - drawH) / 2);
        this.ctx.drawImage(img, dx, dy, drawW, drawH);
      } else {
        const cx = offsetX + Math.floor(boardW / 2);
        const cy = offsetY + Math.floor((board.height * cellSize) / 2);
        // Draw large outlined text in beige as fallback
        const fontSizeGO = Math.max(18, Math.floor(cellSize * 1.6));
        this.ctx.font = `bold ${fontSizeGO}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.lineWidth = Math.max(2, Math.floor(cellSize * 0.08));
        this.ctx.strokeStyle = 'black';
        this.ctx.fillStyle = beige;
        this.ctx.strokeText('GAME OVER', cx, cy);
        this.ctx.fillText('GAME OVER', cx, cy);
      }
      this.ctx.restore();
    }

    // Render HUD popups if present (global and tile-attached)
    if (state.popups && Array.isArray(state.popups) && state.popups.length > 0) {
      const now2 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      // Draw tile popups first (they are positioned over the board tiles)
      for (const p of state.popups.slice()) {
        const elapsed = now2 - p.start;
        if (elapsed >= p.duration) continue;
        if (p.kind === 'tile' && typeof p.boardX === 'number' && typeof p.boardY === 'number') {
          const cellSize = this.lastCellSize || Math.max(8, Math.floor(this.canvas.height / state.board.height));
          const boardW2 = state.board.width * cellSize;
          const boardH2 = state.board.height * cellSize;
          const ox = Math.floor((this.canvas.width - boardW2) / 2);
          const oy = Math.floor((this.canvas.height - boardH2) / 2);
          const px = ox + p.boardX * cellSize + Math.floor(cellSize / 2);
          const pyBase = oy + p.boardY * cellSize + Math.floor(cellSize / 2);
          // Float upward: move up by upDist * t where upDist ~ 1.2 * cellSize
          const upDist = Math.floor(cellSize * 1.2);
          const dy = -Math.floor(upDist * (elapsed / p.duration));
          this.ctx.save();
          // soft fade: alpha decreases over time
          this.ctx.globalAlpha = Math.max(0, 1 - (elapsed / p.duration));
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.6))}px monospace`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(p.text, px, pyBase + dy - Math.floor(cellSize * 0.2));
          this.ctx.restore();
        }
      }
      // Draw global popups stacked below the HI/score (right side)
      const pad = Math.floor(this.lastCellSize / 2);
      let stackY = Math.floor(this.lastCellSize / 2) + pad;
      for (const p of state.popups.slice()) {
        const elapsed = now2 - p.start;
        if (elapsed >= p.duration) continue;
        if (p.kind !== 'global') continue;
        const t = Math.max(0, Math.min(1, elapsed / p.duration));
        const alphaP = 1 - t;
        this.ctx.save();
        this.ctx.globalAlpha = alphaP;
        this.ctx.fillStyle = p.text && p.text.startsWith('+') ? '#cfe8c6' : '#f2b3b3';
        this.ctx.font = `bold ${Math.max(12, Math.floor(this.lastCellSize * 0.6))}px monospace`;
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(p.text, offsetX + boardW - pad, offsetY + stackY);
        this.ctx.restore();
        stackY += Math.floor(this.lastCellSize * 0.9);
      }
      // Remove expired popups in-place (mutable) to keep state small
      state.popups = state.popups.filter((p: any) => (now2 - p.start) < p.duration);
    }

    // Draw double.gif flash if requested (draw after overlays so it appears on top)
    if (state.doubleFlashStart && doubleOpacity > 0) {
      const img = this.doubleImg;
      if (img && img.complete && img.naturalWidth) {
        let iw = img.naturalWidth;
        let ih = img.naturalHeight;
        // Target width: 90% of board width
        let drawW = Math.floor(boardW * 0.9);
        let drawH = Math.floor((ih * drawW) / iw);
        // If the computed height exceeds the board height, clamp by height
        if (drawH > boardH) {
          drawH = boardH;
          drawW = Math.floor((iw * drawH) / ih);
        }
        const dx = offsetX + Math.floor((boardW - drawW) / 2);
        const dy = offsetY + Math.floor((boardH - drawH) / 2);
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0.05, doubleOpacity);
        // Draw the image centered and scaled
        this.ctx.drawImage(img, dx, dy, drawW, drawH);
        this.ctx.restore();
      }
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
