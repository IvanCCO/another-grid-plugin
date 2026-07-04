/**
 * Packages the contents of dist/ into artifacts/grid-systems-overlay.zip.
 * The zip is attached to GitHub releases as a downloadable asset.
 */

'use strict';

const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts');
const OUTPUT_PATH = path.join(ARTIFACTS_DIR, 'grid-systems-overlay.zip');

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const output = fs.createWriteStream(OUTPUT_PATH);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const kb = (archive.pointer() / 1024).toFixed(1);
  console.log(`Packaged: artifacts/grid-systems-overlay.zip (${kb} KB)`);
});

output.on('error', (err) => { throw err; });
archive.on('error', (err) => { throw err; });

archive.pipe(output);

// Add every file from dist/ directly into the zip root (no dist/ prefix)
archive.directory(DIST, false);

archive.finalize();
