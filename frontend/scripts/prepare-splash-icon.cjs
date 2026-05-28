/**
 * Build splash-icon.png: true transparent PNG (no checkerboard / white / light-blue box).
 * Run: node scripts/prepare-splash-icon.cjs
 */
const { Jimp } = require('jimp');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'assets', 'images', 'icon-transparent.png');
const outPath = path.join(__dirname, '..', 'assets', 'images', 'splash-icon.png');

/** Keep blue logo pixels; strip neutral backgrounds only. */
function isBackgroundPixel(r, g, b, a) {
  if (a < 12) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;

  if (saturation > 32 && b >= r && b >= g && b > 80) return false;

  if (r >= 248 && g >= 248 && b >= 248) return true;
  if (r <= 35 && g <= 35 && b <= 35) return true;
  if (saturation < 22 && max > 140) return true;
  if (b > r + 8 && b > g + 8 && saturation < 45 && r > 175 && g > 190) return true;
  return false;
}

function trimTransparent(image) {
  const { width, height } = image.bitmap;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  image.scan(0, 0, width, height, function (x, y, idx) {
    if (this.bitmap.data[idx + 3] > 12) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  });

  if (maxX <= minX || maxY <= minY) return image;
  return image.crop({
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  });
}

function padSquare(image, paddingRatio = 0.12) {
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const inner = Math.max(w, h);
  const pad = Math.round(inner * paddingRatio);
  const size = inner + pad * 2;
  const canvas = new Jimp({ width: size, height: size, color: 0x00000000 });
  canvas.composite(image, Math.round((size - w) / 2), Math.round((size - h) / 2));
  return canvas;
}

async function main() {
  let image = await Jimp.read(srcPath);
  const { width, height } = image.bitmap;

  image.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];
    if (isBackgroundPixel(r, g, b, a)) {
      this.bitmap.data[idx + 3] = 0;
    }
  });

  image = trimTransparent(image);
  image = padSquare(image, 0.1);
  await image.write(outPath);
  console.log('Wrote', outPath, `(${image.bitmap.width}x${image.bitmap.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
