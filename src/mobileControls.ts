// mobileControls.ts
// Handles mobile touch controls for the game
// Features implemented:
// - Drag (touchmove) moves the current piece 1:1 with finger movement (pixel-accurate -> cell fractional positions)
// - Tap on the current piece: placePiece()
// - Tap left half of board (not on piece): rotate left
// - Tap right half of board (not on piece): rotate right

import type { Board } from './board';
import type { Piece } from './piece';

type Layout = { board: Board; cellSize: number; offsetX: number; offsetY: number };

export class MobileControls {
  private getLayout: () => Layout;
  private getCurrentPiece: () => Piece | null;
  private onPlace: () => void;
  private onRotateLeft: () => void;
  private onRotateRight: () => void;
  private onUpdate: () => void;

  constructor(opts: {
    canvasId: string;
    getLayout: () => Layout;
    getCurrentPiece: () => Piece | null;
    onPlace: () => void;
    onRotateLeft: () => void;
    onRotateRight: () => void;
    onUpdate: () => void; // redraw callback
  }) {
  const canvas = document.getElementById(opts.canvasId) as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element not found');
    this.getLayout = opts.getLayout;
    this.getCurrentPiece = opts.getCurrentPiece;
    this.onPlace = opts.onPlace;
    this.onRotateLeft = opts.onRotateLeft;
    this.onRotateRight = opts.onRotateRight;
    this.onUpdate = opts.onUpdate;

    let startX = 0;
    let startY = 0;
    let startPieceX = 0;
    let startPieceY = 0;
    let dragging = false;
    let moved = false;

    const touchstart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
      dragging = false;
      const p = this.getCurrentPiece();
      if (p) {
        startPieceX = p.x;
        startPieceY = p.y;
      } else {
        startPieceX = 0;
        startPieceY = 0;
      }
    };

    const touchmove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const distSq = dx * dx + dy * dy;
      // If user moved more than a few pixels, consider it a drag
      if (distSq > 9) {
        dragging = true;
      }
      if (!dragging) return;
      moved = true;
      e.preventDefault();

      const layout = this.getLayout();
      const piece = this.getCurrentPiece();
      if (!piece) return;

      // compute piece bounds (occupied columns/rows) to clamp movement
      const s = piece.shape;
      let minCol = Number.POSITIVE_INFINITY;
      let maxCol = Number.NEGATIVE_INFINITY;
      let minRow = Number.POSITIVE_INFINITY;
      let maxRow = Number.NEGATIVE_INFINITY;
      for (let cx = 0; cx < s.length; cx++) {
        for (let cy = 0; cy < s[cx].length; cy++) {
          if (s[cx][cy] !== 0) {
            if (cx < minCol) minCol = cx;
            if (cx > maxCol) maxCol = cx;
            if (cy < minRow) minRow = cy;
            if (cy > maxRow) maxRow = cy;
          }
        }
      }
      if (minCol === Number.POSITIVE_INFINITY) return;
      const minXAllowed = -minCol;
      const maxXAllowed = layout.board.width - 1 - maxCol;
      const minYAllowed = -minRow;
      const maxYAllowed = layout.board.height - 1 - maxRow;

      // Finger movement in pixels maps directly to fractional cell movement
      const desiredX = startPieceX + dx / layout.cellSize;
      const desiredY = startPieceY + dy / layout.cellSize;
      // Clamp to allowed range but keep fractional value for smooth 1:1 feel
      piece.x = Math.min(maxXAllowed, Math.max(minXAllowed, desiredX));
      piece.y = Math.min(maxYAllowed, Math.max(minYAllowed, desiredY));
      // notify for redraw
      this.onUpdate();
    };

    const touchend = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // Treat small movements as taps
      if (!moved || (Math.abs(dx) < 8 && Math.abs(dy) < 8)) {
        // it's a tap
        const layout = this.getLayout();
        const boardCenterX = layout.offsetX + (layout.board.width * layout.cellSize) / 2;
        const tapX = t.clientX;
        const tapY = t.clientY;
        const piece = this.getCurrentPiece();
        // If tap was on the current piece bounding box, place it
        if (piece) {
          const pieceLeft = layout.offsetX + piece.x * layout.cellSize;
          const pieceTop = layout.offsetY + piece.y * layout.cellSize;
          const pieceW = piece.shape.length * layout.cellSize;
          const pieceH = piece.shape[0].length * layout.cellSize;
          if (tapX >= pieceLeft && tapX <= pieceLeft + pieceW && tapY >= pieceTop && tapY <= pieceTop + pieceH) {
            this.onPlace();
            return;
          }
        }
        // Not on piece -> rotate left/right depending on which half of the board
        if (tapX < boardCenterX) this.onRotateLeft();
        else this.onRotateRight();
        return;
      }

      // End of drag: snap to nearest integer cell positions
      const piece = this.getCurrentPiece();
      if (piece) {
        piece.x = Math.round(piece.x);
        piece.y = Math.round(piece.y);
        // ensure still in bounds
        const s = piece.shape;
        let minCol = Number.POSITIVE_INFINITY;
        let maxCol = Number.NEGATIVE_INFINITY;
        let minRow = Number.POSITIVE_INFINITY;
        let maxRow = Number.NEGATIVE_INFINITY;
        for (let cx = 0; cx < s.length; cx++) {
          for (let cy = 0; cy < s[cx].length; cy++) {
            if (s[cx][cy] !== 0) {
              if (cx < minCol) minCol = cx;
              if (cx > maxCol) maxCol = cx;
              if (cy < minRow) minRow = cy;
              if (cy > maxRow) maxRow = cy;
            }
          }
        }
        if (minCol !== Number.POSITIVE_INFINITY) {
          const minXAllowed = -minCol;
          const maxXAllowed = this.getLayout().board.width - 1 - maxCol;
          const minYAllowed = -minRow;
          const maxYAllowed = this.getLayout().board.height - 1 - maxRow;
          piece.x = Math.min(maxXAllowed, Math.max(minXAllowed, piece.x));
          piece.y = Math.min(maxYAllowed, Math.max(minYAllowed, piece.y));
        }
        this.onUpdate();
      }
    };

    canvas.addEventListener('touchstart', touchstart, { passive: true });
    canvas.addEventListener('touchmove', touchmove, { passive: false });
    canvas.addEventListener('touchend', touchend, { passive: true });
  }
}
