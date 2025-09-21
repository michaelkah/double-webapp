// mobileControls.ts
// Handles mobile touch controls for the game

export class MobileControls {
  constructor(canvasId: string, onMove: (direction: string) => void, onTap: () => void) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    let startX = 0;
    let startY = 0;

    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    });

    canvas.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) onMove('right');
        else if (dx < -30) onMove('left');
      } else {
        if (dy > 30) onMove('down');
        else if (dy < -30) onMove('up');
        else onTap();
      }
    });
  }
}
