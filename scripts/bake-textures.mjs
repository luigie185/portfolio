// Bake the CSS paper-noise SVGs (feTurbulence) into small PNG tiles.
// Drawing a repeated PNG is far cheaper than rendering a turbulence filter,
// which matters most when the whole page repaints (e.g. the day/night change).
// Usage: npm run textures
import fs from 'node:fs';
import sharp from 'sharp';

const css = fs.readFileSync('src/styles/global.css', 'utf8');
const uris = [...css.matchAll(/url\("data:image\/svg\+xml,([^"]+)"\)/g)].map((m) => decodeURIComponent(m[1]));
const names = { 220: 'grain', 300: 'fibres' };
for (const svg of uris) {
  const w = Number(svg.match(/width='(\d+)'/)[1]);
  const name = names[w];
  if (!name) continue;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`public/textures/${name}.png`);
  console.log(`public/textures/${name}.png`, Math.round(fs.statSync(`public/textures/${name}.png`).size / 1024), 'KB');
}
