const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG generator without external dependencies
function createPNG(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // Compression method
  ihdr.writeUInt8(0, 11); // Filter method
  ihdr.writeUInt8(0, 12); // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createICO(images) {
  // images is array of { width, height, pngBuffer }
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirSize = 16 * count;
  let currentOffset = 6 + dirSize;
  const dirBuffers = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.pngBuffer.length, 8); // Image data size
    entry.writeUInt32LE(currentOffset, 12); // Offset

    dirBuffers.push(entry);
    imageBuffers.push(img.pngBuffer);
    currentOffset += img.pngBuffer.length;
  }

  return Buffer.concat([header, ...dirBuffers, ...imageBuffers]);
}

// Icon drawer: Smooth circular badge with energy / usage gauge
function drawAppIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = (w * 0.44);
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > r) return [0, 0, 0, 0]; // Transparent outside

  const normX = x / w;
  const normY = y / h;
  const border = dist > (r - 2);

  if (border) {
    return [255, 255, 255, 220]; // White border
  }

  // Inner fill gradient: Claude Amber to Antigravity Blue
  const rCol = Math.floor(217 * (1 - normX) + 37 * normX);
  const gCol = Math.floor(119 * (1 - normY) + 99 * normY);
  const bCol = Math.floor(6 * (1 - normX) + 235 * normX);

  return [rCol, gCol, bCol, 255];
}

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const icoImages = [];
const sizes = [16, 32, 48, 64, 128, 256];

for (const size of sizes) {
  const png = createPNG(size, size, drawAppIcon);
  icoImages.push({ width: size, height: size, pngBuffer: png });

  if (size === 32) fs.writeFileSync(path.join(iconsDir, '32x32.png'), png);
  if (size === 128) {
    fs.writeFileSync(path.join(iconsDir, '128x128.png'), png);
    fs.writeFileSync(path.join(iconsDir, 'icon.png'), png);
  }
  if (size === 256) fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png);
}

// Write valid Windows ICO
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), createICO(icoImages));

// Write macOS ICNS placeholder
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), createPNG(128, 128, drawAppIcon));

console.log('Proper Windows .ico and PNG icons generated in', iconsDir);
