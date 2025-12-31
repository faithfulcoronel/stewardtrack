/**
 * Icon Generation Script
 * Generates PWA icons from the base SVG icon
 *
 * Usage: npx tsx tools/generate-icons.ts
 *
 * Note: This script requires sharp to be installed.
 * If sharp is not available, icons should be generated manually
 * using a tool like Figma, Sketch, or an online SVG-to-PNG converter.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Icon sizes needed for PWA
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
];

async function generateIcons() {
  const iconsDir = join(__dirname, '../public/icons');
  const svgPath = join(iconsDir, 'icon.svg');

  if (!existsSync(svgPath)) {
    console.error('SVG icon not found at:', svgPath);
    process.exit(1);
  }

  // Try to use sharp if available
  try {
    const sharp = await import('sharp');
    const svgBuffer = readFileSync(svgPath);

    console.log('Generating icons using sharp...');

    for (const { size, name } of ICON_SIZES) {
      const outputPath = join(iconsDir, name);
      await sharp.default(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${name} (${size}x${size})`);
    }

    console.log('\n✓ All icons generated successfully!');
  } catch (error) {
    console.log('Sharp not available. Please generate icons manually.');
    console.log('\nRequired icon sizes:');
    ICON_SIZES.forEach(({ size, name }) => {
      console.log(`  - ${name}: ${size}x${size}px`);
    });
    console.log('\nYou can use online tools like:');
    console.log('  - https://realfavicongenerator.net/');
    console.log('  - https://www.pwabuilder.com/imageGenerator');
    console.log('  - https://maskable.app/editor');
  }
}

generateIcons();
