#!/usr/bin/env node
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const GOOGLE_DRIVE_ID = '1bev8A_BhVqUmYZjuDeUlI8A-5Por7j7j';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'models');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'myology.glb');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (fs.existsSync(OUTPUT_FILE)) {
  const stats = fs.statSync(OUTPUT_FILE);
  if (stats.size > 100 * 1024 * 1024) { // >100MB = valid file
    console.log('✓ myology.glb already exists');
    process.exit(0);
  }
}

console.log('📥 Downloading myology.glb...');

// Use Vercel-friendly download
const url = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_ID}&confirm=t`;

function download(urlString, retries = 3) {
  if (retries === 0) {
    console.error('❌ Download failed after 3 retries');
    process.exit(1);
  }

  const urlObj = new URL(urlString);
  const protocol = urlObj.protocol === 'https:' ? https : http;
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'GET',
    timeout: 60000,
  };

  const req = protocol.request(options, (res) => {
    // Handle redirects
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
      console.log(`  Following redirect (${res.statusCode})...`);
      download(res.headers.location, retries - 1);
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`❌ HTTP ${res.statusCode}`);
      process.exit(1);
    }

    const file = fs.createWriteStream(OUTPUT_FILE);
    const contentLength = parseInt(res.headers['content-length'], 10);
    let downloaded = 0;

    res.on('data', (chunk) => {
      downloaded += chunk.length;
      const pct = ((downloaded / contentLength) * 100).toFixed(1);
      process.stdout.write(`\r  ${pct}% (${Math.round(downloaded / 1024 / 1024)}MB)`);
    });

    res.pipe(file);

    file.on('finish', () => {
      file.close();
      const sizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
      console.log(`\n✓ Downloaded (${sizeMB}MB)`);
      process.exit(0);
    });

    file.on('error', (err) => {
      fs.unlink(OUTPUT_FILE, () => {});
      console.error('❌ Write error:', err.message);
      process.exit(1);
    });
  });

  req.on('error', (err) => {
    console.error(`❌ Network error: ${err.message}`);
    setTimeout(() => download(urlString, retries - 1), 1000);
  });

  req.on('timeout', () => {
    req.destroy();
    console.error('❌ Timeout');
    setTimeout(() => download(urlString, retries - 1), 1000);
  });

  req.end();
}

download(url);
