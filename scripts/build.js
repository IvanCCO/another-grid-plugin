/**
 * Build script for Grid Systems Overlay.
 *
 * Steps:
 *  1. Bundle src/content.ts  → dist/content.js
 *  2. Bundle src/background.ts → dist/background.js
 *  3. Copy manifest.json, public/content.css, and icons/ into dist/
 *
 * Usage:
 *   node scripts/build.js          # one-shot build
 *   node scripts/build.js --watch  # watch mode (rebuilds on file change)
 */

'use strict';

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const isWatch = process.argv.includes('--watch');

/** Copy a file, creating the destination directory if needed. */
function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Copy static assets (manifest, CSS, HTML, icons) into dist/. */
function copyAssets() {
  copyFile(path.join(ROOT, 'manifest.json'),          path.join(DIST, 'manifest.json'));
  copyFile(path.join(ROOT, 'public', 'content.css'),  path.join(DIST, 'content.css'));
  copyFile(path.join(ROOT, 'public', 'popup.html'),   path.join(DIST, 'popup.html'));

  const iconsDir = path.join(ROOT, 'icons');
  if (fs.existsSync(iconsDir)) {
    fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true });
    for (const file of fs.readdirSync(iconsDir)) {
      copyFile(
        path.join(iconsDir, file),
        path.join(DIST, 'icons', file),
      );
    }
  }

  console.log('Static assets copied to dist/.');
}

/** Shared esbuild options for both entry points. */
const sharedOptions = {
  bundle: true,
  target: 'chrome120',
  logLevel: 'info',
};

async function build() {
  fs.mkdirSync(DIST, { recursive: true });
  copyAssets();

  if (isWatch) {
    const contentCtx = await esbuild.context({
      ...sharedOptions,
      entryPoints: [path.join(ROOT, 'src', 'content.ts')],
      outfile: path.join(DIST, 'content.js'),
    });

    const backgroundCtx = await esbuild.context({
      ...sharedOptions,
      entryPoints: [path.join(ROOT, 'src', 'background.ts')],
      outfile: path.join(DIST, 'background.js'),
    });

    const popupCtx = await esbuild.context({
      ...sharedOptions,
      entryPoints: [path.join(ROOT, 'src', 'popup.ts')],
      outfile: path.join(DIST, 'popup.js'),
    });

    await Promise.all([contentCtx.watch(), backgroundCtx.watch(), popupCtx.watch()]);
    console.log('Watching for changes…');
  } else {
    await Promise.all([
      esbuild.build({
        ...sharedOptions,
        entryPoints: [path.join(ROOT, 'src', 'content.ts')],
        outfile: path.join(DIST, 'content.js'),
      }),
      esbuild.build({
        ...sharedOptions,
        entryPoints: [path.join(ROOT, 'src', 'background.ts')],
        outfile: path.join(DIST, 'background.js'),
      }),
      esbuild.build({
        ...sharedOptions,
        entryPoints: [path.join(ROOT, 'src', 'popup.ts')],
        outfile: path.join(DIST, 'popup.js'),
      }),
    ]);

    console.log('Build complete. Load the dist/ folder in chrome://extensions.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
