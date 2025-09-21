// piece.ts
// Game piece logic for the TypeScript/HTML5 webapp
import { CELL_EMPTY, CELL_LU, CELL_LO, CELL_RO, CELL_RU, CELL_WG, CELL_SK } from './board';

export type PieceShape = number[][][]; // [rotation][x][y]

// PIECE_SHAPES: All pieces from the original Java game
export const PIECE_SHAPES: PieceShape[] = [
  // Small corner (lu)
  [
    [
      [CELL_LO],
      [CELL_EMPTY],
      [CELL_EMPTY]
    ],
    [
      [CELL_RO],
      [CELL_EMPTY],
      [CELL_EMPTY]
    ],
    [
      [CELL_RU],
      [CELL_EMPTY],
      [CELL_EMPTY]
    ],
    [
      [CELL_LU],
      [CELL_EMPTY],
      [CELL_EMPTY]
    ],
  ],
  // Short straight
  [
    [
      [CELL_SK],
      [CELL_EMPTY],
      [CELL_EMPTY]
    ],
    [
      [CELL_WG],
      [CELL_EMPTY],
      [CELL_EMPTY]
    ],
  ],
  // Long straight
  [
    [
      [CELL_SK, CELL_SK],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_WG, CELL_EMPTY],
      [CELL_WG, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
  // S-piece 1
  [
    [
      [CELL_LU, CELL_EMPTY],
      [CELL_RO, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_LO, CELL_RU],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
  // S-piece 2
  [
    [
      [CELL_LO, CELL_EMPTY],
      [CELL_RU, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_RO, CELL_LU],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
  // U-turn piece
  [
    [
      [CELL_LO, CELL_EMPTY],
      [CELL_RO, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_RO, CELL_RU],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_LU, CELL_EMPTY],
      [CELL_RU, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_LO, CELL_LU],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
  // Noname piece 1
  [
    [
      [CELL_LO, CELL_EMPTY],
      [CELL_WG, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_RO, CELL_SK],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_WG, CELL_RU],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_SK, CELL_LU],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
  // Noname piece 2
  [
    [
      [CELL_LU, CELL_EMPTY],
      [CELL_WG, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_LO, CELL_SK],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_WG, CELL_RO],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_SK, CELL_RU],
      [CELL_EMPTY, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
  // Honeynut Loop
  [
    [
      [CELL_LO, CELL_LU],
      [CELL_RO, CELL_RU],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
  // Wulst
  [
    [
      [CELL_LO, CELL_RU],
      [CELL_RO, CELL_LU],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_LU, CELL_LO],
      [CELL_RO, CELL_RU],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_RO, CELL_LU],
      [CELL_LO, CELL_RU],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_LO, CELL_LU],
      [CELL_RU, CELL_RO],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
  // Graffl
  [
    [
      [CELL_LO, CELL_SK, CELL_LU],
      [CELL_WG, CELL_EMPTY, CELL_EMPTY],
      [CELL_RO, CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_LO, CELL_EMPTY, CELL_EMPTY],
      [CELL_WG, CELL_EMPTY, CELL_EMPTY],
      [CELL_RO, CELL_SK, CELL_RU]
    ],
    [
      [CELL_EMPTY, CELL_EMPTY, CELL_LU],
      [CELL_EMPTY, CELL_EMPTY, CELL_WG],
      [CELL_RO, CELL_SK, CELL_RU]
    ],
    [
      [CELL_LO, CELL_SK, CELL_LU],
      [CELL_EMPTY, CELL_EMPTY, CELL_WG],
      [CELL_EMPTY, CELL_EMPTY, CELL_RU]
    ],
  ],
  // Large corner
  [
    [
      [CELL_LO, CELL_SK],
      [CELL_WG, CELL_EMPTY],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_WG, CELL_EMPTY],
      [CELL_RO, CELL_SK],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_EMPTY, CELL_WG],
      [CELL_SK, CELL_RU],
      [CELL_EMPTY, CELL_EMPTY]
    ],
    [
      [CELL_SK, CELL_LU],
      [CELL_EMPTY, CELL_WG],
      [CELL_EMPTY, CELL_EMPTY]
    ],
  ],
];

export class Piece {
  shapes: number[][][]; // [rotation][x][y]
  rotation: number;
  x: number;
  y: number;

  constructor(shapes: number[][][], x = 4, y = 0) {
    this.shapes = shapes;
    this.rotation = 0;
    this.x = x;
    this.y = y;
  }

  get shape(): number[][] {
    return this.shapes[this.rotation % this.shapes.length];
  }

  move(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  rotate() {
    // If there are multiple rotations defined, use them
    if (this.shapes.length > 1) {
      this.rotation = (this.rotation + 1) % this.shapes.length;
    } else {
      // Otherwise, rotate the shape matrix dynamically (clockwise)
      const shape = this.shapes[0];
      const sizeX = shape.length;
      const sizeY = shape[0].length;
      const rotated: number[][] = [];
      for (let y = 0; y < sizeY; y++) {
        const col: number[] = [];
        for (let x = sizeX - 1; x >= 0; x--) {
          col.push(shape[x][y]);
        }
        rotated.push(col);
      }
      this.shapes[0] = rotated;
    }
  }

  placeOnBoard(board: import('./board').Board) {
    for (let x = 0; x < this.shape.length; x++) {
      for (let y = 0; y < this.shape[x].length; y++) {
        if (this.shape[x][y] !== CELL_EMPTY) {
          const bx = this.x + x;
          const by = this.y + y;
          if (by >= 0 && by < board.height && bx >= 0 && bx < board.width) {
            board.setCell(bx, by, this.shape[x][y]);
          }
        }
      }
    }
  }
}
