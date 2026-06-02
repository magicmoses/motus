#!/usr/bin/env node
/**
 * Download myology.glb from Google Drive before build
 * Runs before `npm run build`
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GOOGLE_DRIVE_ID = '1bev8A_BhVqUmYZjuDeUlI8A-5Por7j7j';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'models');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'myology.glb');

// Create directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check if file already exists
if (fs.existsSync(OUTPUT_FILE)) {
  console.log('✓ myology.glb already exists, skipping download');
  process.exit(0);
}

console.log('📥 Downloading myology.glb from Google Drive...');

const url = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_ID}`;

https.get(url, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    https.get(response.headers.location, downloadFile);
  } else {
    downloadFile(response);
  }
}).on('error', (err) => {
  console.error('❌ Download failed:', err.message);
  process.exit(1);
});

function downloadFile(response) {
  const file = fs.createWriteStream(OUTPUT_FILE);
  let downloaded = 0;
  const contentLength = parseInt(response.headers['content-length'], 10);

  response.on('data', (chunk) => {
    downloaded += chunk.length;
    const percent = ((downloaded / contentLength) * 100).toFixed(1);
    process.stdout.write(`\r  ${percent}% (${Math.round(downloaded / 1024 / 1024)}MB)`);
  });

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    const sizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`\n✓ Downloaded successfully (${sizeMB}MB)`);
    process.exit(0);
  });

  file.on('error', (err) => {
    fs.unlink(OUTPUT_FILE, () => {});
    console.error('❌ File write failed:', err.message);
    process.exit(1);
  });
}
