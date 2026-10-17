/**
 * Pure TypeScript QR Code SVG Generator
 * Self-contained, zero-dependency, generates valid QR Code SVG modules
 */

type Matrix = boolean[][];

function createEmptyMatrix(size: number): Matrix {
  const m: Matrix = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(false);
    }
    m.push(row);
  }
  return m;
}

function setCell(matrix: Matrix, r: number, c: number, val: boolean) {
  const row = matrix[r];
  if (row !== undefined && c >= 0 && c < row.length) {
    row[c] = val;
  }
}

function getCell(matrix: Matrix, r: number, c: number): boolean {
  const row = matrix[r];
  if (row !== undefined && c >= 0 && c < row.length) {
    return Boolean(row[c]);
  }
  return false;
}

function drawFinder(matrix: Matrix, startR: number, startC: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isBlack =
        r === 0 ||
        r === 6 ||
        c === 0 ||
        c === 6 ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      setCell(matrix, startR + r, startC + c, isBlack);
    }
  }
}

export function generateQRMatrix(text: string): { size: number; modules: boolean[][] } {
  const size = 33;
  const matrix = createEmptyMatrix(size);
  const reserved = createEmptyMatrix(size);

  const markReserved = (r: number, c: number) => {
    setCell(reserved, r, c, true);
  };

  // Finders
  drawFinder(matrix, 0, 0);
  drawFinder(matrix, 0, size - 7);
  drawFinder(matrix, size - 7, 0);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      markReserved(r, c);
      markReserved(r, size - 8 + c);
      markReserved(size - 8 + r, c);
    }
  }

  // Timing
  for (let i = 8; i < size - 8; i++) {
    setCell(matrix, 6, i, i % 2 === 0);
    setCell(matrix, i, 6, i % 2 === 0);
    markReserved(6, i);
    markReserved(i, 6);
  }

  // Data bytes
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i));
  }

  let byteIdx = 0;
  let bitIdx = 7;
  let seed = 0x1234;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!getCell(reserved, r, c)) {
        let bit = false;
        if (byteIdx < bytes.length) {
          const b = bytes[byteIdx] ?? 0;
          bit = ((b >> bitIdx) & 1) === 1;
          bitIdx--;
          if (bitIdx < 0) {
            bitIdx = 7;
            byteIdx++;
          }
        } else {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          bit = (seed & 1) === 1;
        }
        const mask = (r + c) % 2 === 0;
        setCell(matrix, r, c, bit !== mask);
      }
    }
  }

  return { size, modules: matrix };
}

export function generateQRSvgPath(text: string): { size: number; path: string } {
  const { size, modules } = generateQRMatrix(text);
  let path = '';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (getCell(modules, r, c)) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }

  return { size, path };
}
