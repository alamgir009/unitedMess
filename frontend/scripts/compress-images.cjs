const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DIST_ASSETS = path.resolve(__dirname, '..', 'dist', 'assets');

async function compressImages(dir) {
  let totalSaved = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      totalSaved += await compressImages(fullPath);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) continue;

    const sizeBefore = fs.statSync(fullPath).size;
    if (sizeBefore < 100 * 1024) continue;

    try {
      const buf = fs.readFileSync(fullPath);
      const pipeline = sharp(buf).resize({ width: 1200, withoutEnlargement: true });
      let compressed;
      if (ext === '.png') {
        compressed = await pipeline.png({ quality: 70, palette: true }).toBuffer();
      } else {
        compressed = await pipeline.jpeg({ quality: 75, mozjpeg: true }).toBuffer();
      }
      if (compressed.length < sizeBefore) {
        fs.writeFileSync(fullPath, compressed);
        const saved = ((1 - compressed.length / sizeBefore) * 100).toFixed(1);
        totalSaved += sizeBefore - compressed.length;
        console.log(`  ${entry.name}  ${(sizeBefore / 1024 / 1024).toFixed(1)}MB => ${(compressed.length / 1024 / 1024).toFixed(1)}MB  (${saved}% saved)`);
      } else {
        console.log(`  ${entry.name}  skipped (already optimal)`);
      }
    } catch (err) {
      console.error(`  Failed to compress ${entry.name}: ${err.message}`);
    }
  }
  return totalSaved;
}

console.log('Compressing images in dist/assets/...');
compressImages(DIST_ASSETS).then(totalSaved => {
  console.log(`Done. Total saved: ${(totalSaved / 1024 / 1024).toFixed(1)}MB`);
});
