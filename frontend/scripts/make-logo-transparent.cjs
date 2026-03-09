/**
 * Make header-logo.png background transparent (white or black).
 * Run: node scripts/make-logo-transparent.cjs
 * Place your logo at frontend/assets/images/header-logo.png first.
 */
const { Jimp } = require('jimp');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'assets', 'images', 'header-logo.png');

async function main() {
  const image = await Jimp.read(logoPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;

  // Make white (>= 250) OR black (<= 45) background transparent
  const whiteThreshold = 250;
  const blackThreshold = 45;
  image.scan(0, 0, w, h, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const isWhite = r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold;
    const isBlack = r <= blackThreshold && g <= blackThreshold && b <= blackThreshold;
    if (isWhite || isBlack) {
      this.bitmap.data[idx + 3] = 0;
    }
  });

  await image.write(logoPath);
  console.log('Updated', logoPath, '- white/black background made transparent.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
