const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const imgDir   = path.join(__dirname, '..', 'assets', 'images');
const brainDir = 'C:\\Users\\nares\\.gemini\\antigravity\\brain\\b005a343-d911-4d27-8b65-8317b80340f2';

// Copy generated placeholder images to replace broken HEIC files
const copies = [
  { src: path.join(brainDir, 'product_pellets_1776014249006.png'), dest: path.join(imgDir, 'product-pellets.png') },
  { src: path.join(brainDir, 'product_stove_1776014265755.png'),   dest: path.join(imgDir, 'product-stove.png')   },
  { src: path.join(brainDir, 'product_burner_1776014283600.png'),  dest: path.join(imgDir, 'product-burner.png')  },
  { src: path.join(brainDir, 'hero_biomass_1776013963039.png'),    dest: path.join(imgDir, 'hero-biomass.png')    },
];

for (const { src, dest } of copies) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.basename(dest)}`);
  } else {
    console.log(`Source not found: ${path.basename(src)}`);
  }
}

// Resize using buffer (avoids file-lock issues)
async function resize(filename, maxW, maxH) {
  const filePath = path.join(imgDir, filename);
  if (!fs.existsSync(filePath)) { console.log(`SKIP (not found): ${filename}`); return; }

  try {
    const inputBuf = fs.readFileSync(filePath);   // read whole file into memory first
    const meta     = await sharp(inputBuf).metadata();
    const ratio    = Math.min(maxW / meta.width, maxH / meta.height);
    const newW     = Math.round(meta.width  * ratio);
    const newH     = Math.round(meta.height * ratio);
    const outBuf   = await sharp(inputBuf).resize(newW, newH).png().toBuffer();
    fs.writeFileSync(filePath, outBuf);
    console.log(`Resized: ${filename}  ${meta.width}x${meta.height}  →  ${newW}x${newH}`);
  } catch (err) {
    console.log(`ERROR: ${filename}: ${err.message}`);
  }
}

(async () => {
  await resize('product-pellets.png', 300, 300);
  await resize('product-stove.png',   300, 300);
  await resize('product-burner.png',  300, 300);
  await resize('logo.png',            400, 120);
  await resize('hero-biomass.png',    800, 300);
  console.log('\nAll done! Run: pnpm start');
})();
