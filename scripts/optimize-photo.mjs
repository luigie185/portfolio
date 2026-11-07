// Make a small, web-friendly square crop of the profile photo for the hero crest.
// Usage: put your photo in public/ as Profile.(png|jpg|jpeg|webp) and run `npm run photo`.
// Writes public/profile.webp (320×320), which the site prefers over the original.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(process.cwd(), 'public');
const source = fs
  .readdirSync(dir)
  .find((f) => /^profile\.(png|jpe?g|webp|avif)$/i.test(f) && f !== 'profile.webp');

if (!source) {
  console.error('No public/Profile.(png|jpg|jpeg|webp|avif) found.');
  process.exit(1);
}

const input = path.join(dir, source);
const { width, height } = await sharp(input).metadata();
// square around the upper-middle of a portrait, where the face usually is
const side = Math.min(width, Math.round(height * 0.66));
const left = Math.round((width - side) / 2);
const top = Math.max(0, Math.min(height - side, Math.round(height * 0.31 - side / 2)));

await sharp(input)
  .extract({ left, top, width: side, height: side })
  .resize(320, 320)
  .webp({ quality: 82 })
  .toFile(path.join(dir, 'profile.webp'));

const kb = (f) => Math.round(fs.statSync(f).size / 1024);
console.log(`${source} (${kb(input)} KB) -> profile.webp (${kb(path.join(dir, 'profile.webp'))} KB)`);
