// board.ts
// Game board and piece logic for the TypeScript/HTML5 webapp

// Cell types (matching Java constants)
export const CELL_EMPTY = 0;
export const CELL_LU = 1;
export const CELL_LO = 2;
export const CELL_RO = 3;
export const CELL_RU = 4;
export const CELL_WG = 5;
export const CELL_SK = 6;

// Directions
export const DIR_UP = 0;
export const DIR_DOWN = 1;
export const DIR_LEFT = 2;
export const DIR_RIGHT = 3;

export type Cell = number; // Use constants above

export class Board {
  width: number;
  height: number;
  grid: Cell[][];

  constructor(width = 10, height = 20) {
    // Use provided dimensions (default 10x20)
    this.width = width;
    this.height = height;
    this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(CELL_EMPTY));
  }

  reset() {
    this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(CELL_EMPTY));
  }

  isCellEmpty(x: number, y: number): boolean {
    return this.grid[y][x] === CELL_EMPTY;
  }

  setCell(x: number, y: number, value: number) {
    this.grid[y][x] = value;
  }

  // Loop detection: returns an array of coordinates that form a cycle (loop)
  // starting from (x, y), or null if no loop is found.
  detectLoop(x: number, y: number): { x: number; y: number }[] | null {
    const startCell = this.grid[y][x];
    const DEBUG_LOOP = true;
    if (DEBUG_LOOP) console.log(`[detectLoop] start at (${x},${y}) cell=${startCell}`);
    if (startCell === CELL_EMPTY) {
      if (DEBUG_LOOP) console.log('[detectLoop] start cell empty -> no loop');
      return null;
    }

    function portsFor(cell: number): boolean[] {
      // Adjusted mapping so the numeric cell values match the expected in-game
      // connectivity (observed from board examples). Directions: UP,DOWN,LEFT,RIGHT
      const ports = [false, false, false, false];
      switch (cell) {
        case CELL_LU:
          // value 1 -> connects RIGHT + UP
          ports[DIR_RIGHT] = true;
          ports[DIR_UP] = true;
          break;
        case CELL_LO:
          // value 2 -> connects RIGHT + DOWN
          ports[DIR_RIGHT] = true;
          ports[DIR_DOWN] = true;
          break;
        case CELL_RO:
          // value 3 -> connects LEFT + DOWN
          ports[DIR_LEFT] = true;
          ports[DIR_DOWN] = true;
          break;
        case CELL_RU:
          // value 4 -> connects LEFT + UP
          ports[DIR_LEFT] = true;
          ports[DIR_UP] = true;
          break;
        case CELL_WG:
          ports[DIR_LEFT] = true;
          ports[DIR_RIGHT] = true;
          break;
        case CELL_SK:
          ports[DIR_UP] = true;
          ports[DIR_DOWN] = true;
          break;
        default:
          break;
      }
      return ports;
    }

    const dirToDelta = [
      { dx: 0, dy: -1 }, // UP
      { dx: 0, dy: 1 }, // DOWN
      { dx: -1, dy: 0 }, // LEFT
      { dx: 1, dy: 0 }, // RIGHT
    ];
    const opposite = (d: number) => (d === DIR_UP ? DIR_DOWN : d === DIR_DOWN ? DIR_UP : d === DIR_LEFT ? DIR_RIGHT : DIR_LEFT);

    const startPorts = portsFor(startCell);
    // For each neighbor that is port-connected to start, run BFS to find a path back to start
    for (let d = 0; d < 4; d++) {
      if (!startPorts[d]) continue;
      const delta = dirToDelta[d];
      const nx = x + delta.dx;
      const ny = y + delta.dy;
      if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
      const neighborCell = this.grid[ny][nx];
      if (neighborCell === CELL_EMPTY) continue;
      const neighborPorts = portsFor(neighborCell);
      if (!neighborPorts[opposite(d)]) continue; // neighbor doesn't connect back
      if (DEBUG_LOOP) console.log(`[detectLoop] neighbor at (${nx},${ny}) cell=${neighborCell} connects back`);

      // BFS from neighbor to see if we can reach start without immediately using the back-edge
      const q: { x: number; y: number }[] = [];
      const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false));
      const parent: ({ x: number; y: number } | null)[][] = Array.from({ length: this.height }, () =>
        Array(this.width).fill(null)
      );
      q.push({ x: nx, y: ny });
      parent[ny][nx] = { x, y }; // parent indicates came from start initially
      visited[ny][nx] = true;

      let found = false;
      let predecessor: { x: number; y: number } | null = null; // node that reaches start
      while (q.length > 0 && !found) {
        const cur = q.shift()!;
        const cx = cur.x;
        const cy = cur.y;
        if (DEBUG_LOOP) console.log(`[detectLoop][BFS] visiting (${cx},${cy})`);
        const cell = this.grid[cy][cx];
        const ports = portsFor(cell);
        for (let dd = 0; dd < 4; dd++) {
          if (!ports[dd]) continue;
          const ddelta = dirToDelta[dd];
          const mx = cx + ddelta.dx;
          const my = cy + ddelta.dy;
          if (mx < 0 || mx >= this.width || my < 0 || my >= this.height) continue;
          const mcell = this.grid[my][mx];
          if (mcell === CELL_EMPTY) continue;
          const mports = portsFor(mcell);
          if (!mports[opposite(dd)]) continue;
          // Disallow the immediate back-edge from neighbor to start at first step
          if (cx === nx && cy === ny && mx === x && my === y) continue;
          if (DEBUG_LOOP) console.log(`  [BFS] neighbor candidate (${mx},${my}) cell=${mcell}`);
          if (!visited[my][mx]) {
            visited[my][mx] = true;
            parent[my][mx] = { x: cx, y: cy };
            if (mx === x && my === y) {
              // found a path back to start; record predecessor (cx,cy)
              found = true;
              predecessor = { x: cx, y: cy };
              break;
            }
            q.push({ x: mx, y: my });
          }
        }
      }

      if (found && predecessor) {
        if (DEBUG_LOOP) console.log(`[detectLoop] found path back to start via predecessor (${predecessor.x},${predecessor.y})`);
        // Reconstruct chain from predecessor back to neighbor (nx,ny)
        const chain: { x: number; y: number }[] = [];
        let cur2: { x: number; y: number } | null = { x: predecessor.x, y: predecessor.y };
        while (cur2) {
          chain.push({ x: cur2.x, y: cur2.y });
          if (cur2.x === nx && cur2.y === ny) break;
          cur2 = parent[cur2.y][cur2.x];
          if (!cur2) break;
        }
        if (DEBUG_LOOP) console.log(`[detectLoop] cycle path: ${JSON.stringify([{ x, y }].concat(chain))}`);
        // return start + chain (chain goes from predecessor -> ... -> neighbor)
        return [{ x, y }].concat(chain);
      }
    }

    return null;
  }
}
