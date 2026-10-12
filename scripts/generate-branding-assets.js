'use strict';

const fs = require('fs');
const path = require('path');

const buildDir = path.resolve(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

/**
 * Creates an uncompressed 24-bit BMP buffer
 * @param {number} width 
 * @param {number} height 
 * @param {(x: number, y: number) => [number, number, number]} pixelFn returns [R, G, B]
 */
function createBmp(width, height, pixelFn) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buf = Buffer.alloc(fileSize);

  // --- BMP FILE HEADER (14 bytes) ---
  buf.write('BM', 0); // Signature
  buf.writeUInt32LE(fileSize, 2); // File size
  buf.writeUInt16LE(0, 6); // Reserved
  buf.writeUInt16LE(0, 8); // Reserved
  buf.writeUInt32LE(54, 10); // Offset to pixel array

  // --- DIB HEADER (BITMAPINFOHEADER - 40 bytes) ---
  buf.writeUInt32LE(40, 14); // Header size
  buf.writeInt32LE(width, 18); // Width
  buf.writeInt32LE(height, 22); // Height (positive: bottom-to-top)
  buf.writeUInt16LE(1, 26); // Color planes
  buf.writeUInt16LE(24, 28); // Bits per pixel
  buf.writeUInt32LE(0, 30); // Compression (0 = BI_RGB)
  buf.writeUInt32LE(pixelArraySize, 34); // Image size
  buf.writeInt32LE(2835, 38); // Horizontal resolution (72 DPI)
  buf.writeInt32LE(2835, 42); // Vertical resolution (72 DPI)
  buf.writeUInt32LE(0, 46); // Colors in palette
  buf.writeUInt32LE(0, 50); // Important colors

  // --- PIXEL ARRAY (Bottom to Top) ---
  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      const pixelOffset = rowOffset + x * 3;
      buf[pixelOffset] = Math.min(255, Math.max(0, b));     // Blue
      buf[pixelOffset + 1] = Math.min(255, Math.max(0, g)); // Green
      buf[pixelOffset + 2] = Math.min(255, Math.max(0, r)); // Red
    }
  }

  return buf;
}

// 1. Generate installerSidebar.bmp (164x314)
console.log('Generating build/installerSidebar.bmp (164x314)...');
const sidebarBmp = createBmp(164, 314, (x, y) => {
  // Cyberpunk dark gradient: #050805 to #0d150d
  const grad = Math.sin((y / 314) * Math.PI * 0.5) * 15;
  let r = 5 + Math.floor(grad * 0.3);
  let g = 8 + Math.floor(grad);
  let b = 5 + Math.floor(grad * 0.3);

  // Subtle matrix grid
  if (x % 16 === 0 || y % 16 === 0) {
    g += 10;
    r += 2;
  }

  // Vertical neon accent line
  if (x === 150) {
    return [0, 255, 102];
  }
  if (x === 149 || x === 151) {
    return [0, 160, 60];
  }

  // Worldcraft 'W' Cyber Glyph in the upper section (center ~ x: 82, y: 90, radius ~ 38)
  const dx = x - 82;
  const dy = y - 90;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Outer glowing ring
  if (dist >= 35 && dist <= 38) {
    return [0, 255, 102];
  }
  if (dist >= 33 && dist < 35) {
    return [0, 180, 70];
  }

  // W symbol strokes inside the circle
  if (dist < 32 && y >= 70 && y <= 110) {
    // Check W lines: (x=66, y=75) -> (x=74, y=105) -> (x=82, y=85) -> (x=90, y=105) -> (x=98, y=75)
    const isW1 = Math.abs((y - 75) - (x - 66) * 3.75) < 3 && x >= 64 && x <= 75;
    const isW2 = Math.abs((y - 85) + (x - 82) * 2.5) < 3 && x >= 73 && x <= 83;
    const isW3 = Math.abs((y - 85) - (x - 82) * 2.5) < 3 && x >= 81 && x <= 91;
    const isW4 = Math.abs((y - 75) + (x - 98) * 3.75) < 3 && x >= 89 && x <= 100;
    if (isW1 || isW2 || isW3 || isW4) {
      return [0, 255, 102];
    }
  }

  // Tech data block decoration in bottom area
  if (y > 220 && y < 290 && x > 20 && x < 130) {
    if ((y % 12 === 0 || y % 12 === 1) && x < 110) {
      return [0, 120, 50]; // Cyber text bars
    }
  }

  return [r, g, b];
});
fs.writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), sidebarBmp);

// 2. Generate installerHeader.bmp (150x57)
console.log('Generating build/installerHeader.bmp (150x57)...');
const headerBmp = createBmp(150, 57, (x, y) => {
  let r = 8;
  let g = 14;
  let b = 8;

  // Grid
  if (x % 14 === 0 || y % 14 === 0) {
    g += 8;
  }

  // Bottom neon line
  if (y === 55) {
    return [0, 255, 102];
  }
  if (y === 54 || y === 56) {
    return [0, 140, 50];
  }

  // Right-side cyber globe glyph (center x: 120, y: 28)
  const dx = x - 120;
  const dy = y - 28;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= 18 && dist <= 20) {
    return [0, 255, 102];
  }
  if (dist < 18) {
    if (Math.abs(dx) < 2 || Math.abs(dy) < 2) {
      return [0, 200, 80];
    }
  }

  return [r, g, b];
});
fs.writeFileSync(path.join(buildDir, 'installerHeader.bmp'), headerBmp);

// 3. Generate icon.ico
console.log('Generating build/icon.ico with valid Windows ICONDIR and DIB frames...');

/**
 * Creates an uncompressed 32-bit DIB (with alpha mask) for ICO format
 */
function createIcoFrame(size) {
  // DIB header (40 bytes) + XOR mask (size * size * 4) + AND mask (Math.ceil(size/8) * size)
  const xorSize = size * size * 4;
  const andRowSize = Math.floor((size + 31) / 32) * 4;
  const andSize = andRowSize * size;
  const dibSize = 40 + xorSize + andSize;

  const buf = Buffer.alloc(dibSize);

  // BITMAPINFOHEADER (height is 2 * size in ICO!)
  buf.writeUInt32LE(40, 0); // biSize
  buf.writeInt32LE(size, 4); // biWidth
  buf.writeInt32LE(size * 2, 8); // biHeight (doubled for XOR + AND masks)
  buf.writeUInt16LE(1, 12); // biPlanes
  buf.writeUInt16LE(32, 14); // biBitCount (32-bit RGBA)
  buf.writeUInt32LE(0, 16); // biCompression (BI_RGB)
  buf.writeUInt32LE(xorSize + andSize, 20); // biSizeImage
  buf.writeInt32LE(0, 24); // biXPelsPerMeter
  buf.writeInt32LE(0, 28); // biYPelsPerMeter
  buf.writeUInt32LE(0, 32); // biClrUsed
  buf.writeUInt32LE(0, 36); // biClrImportant

  const center = (size - 1) / 2;
  const radius = center * 0.9;

  // XOR Mask: Bottom-to-top, BGRA
  for (let y = 0; y < size; y++) {
    const rowY = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const offset = 40 + (rowY * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Outer cyber ring
        const isRing = dist >= radius * 0.75 && dist <= radius;
        // Inner W shape
        const normX = dx / radius;
        const normY = dy / radius;
        const isCenter = Math.abs(normX) < 0.6 && normY > -0.5 && normY < 0.6;

        if (isRing) {
          buf[offset] = 102;     // B
          buf[offset + 1] = 255; // G
          buf[offset + 2] = 0;   // R
          buf[offset + 3] = 255; // A
        } else if (isCenter && (Math.abs(normX * 1.5 - normY) < 0.3 || Math.abs(normX * 1.5 + normY) < 0.3)) {
          buf[offset] = 220;     // B
          buf[offset + 1] = 255; // G
          buf[offset + 2] = 200; // R
          buf[offset + 3] = 255; // A
        } else {
          // Dark background inside the icon disc
          buf[offset] = 5;       // B
          buf[offset + 1] = 12;  // G
          buf[offset + 2] = 5;   // R
          buf[offset + 3] = 255; // A
        }
      } else {
        // Transparent outside
        buf[offset] = 0;
        buf[offset + 1] = 0;
        buf[offset + 2] = 0;
        buf[offset + 3] = 0;
      }
    }
  }

  // AND Mask: all 0s (transparency handled by 32-bit alpha channel)
  // initialized to 0 by Buffer.alloc

  return buf;
}

const sizes = [16, 32, 48, 64, 128, 256];
const frames = sizes.map((s) => ({ size: s, data: createIcoFrame(s) }));

// Calculate total ICO file size
let headerSize = 6 + frames.length * 16;
let currentOffset = headerSize;
frames.forEach((f) => {
  f.offset = currentOffset;
  currentOffset += f.data.length;
});

const icoBuf = Buffer.alloc(currentOffset);

// ICONDIR (6 bytes)
icoBuf.writeUInt16LE(0, 0); // Reserved
icoBuf.writeUInt16LE(1, 2); // Type 1 (ICO)
icoBuf.writeUInt16LE(frames.length, 4); // Count

// ICONDIRENTRY (16 bytes each)
frames.forEach((f, idx) => {
  const entryOffset = 6 + idx * 16;
  icoBuf.writeUInt8(f.size >= 256 ? 0 : f.size, entryOffset); // Width
  icoBuf.writeUInt8(f.size >= 256 ? 0 : f.size, entryOffset + 1); // Height
  icoBuf.writeUInt8(0, entryOffset + 2); // Color count
  icoBuf.writeUInt8(0, entryOffset + 3); // Reserved
  icoBuf.writeUInt16LE(1, entryOffset + 4); // Planes
  icoBuf.writeUInt16LE(32, entryOffset + 6); // Bits per pixel
  icoBuf.writeUInt32LE(f.data.length, entryOffset + 8); // Bytes in res
  icoBuf.writeUInt32LE(f.offset, entryOffset + 12); // Offset
});

// Write pixel data
frames.forEach((f) => {
  f.data.copy(icoBuf, f.offset);
});

fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);
console.log('Successfully created genuine build/icon.ico with sizes:', sizes.join(', '));
