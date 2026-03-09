const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const outDir = path.join(projectRoot, 'dist-playwright-browsers');

function getPlaywrightCacheDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  }
  if (process.platform === 'darwin') {
    return path.join(process.env.HOME || '', 'Library', 'Caches', 'ms-playwright');
  }
  return path.join(process.env.HOME || '', '.cache', 'ms-playwright');
}

console.log('Installing Playwright Chromium...');
const install = spawnSync('npx', ['playwright', 'install', 'chromium'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});
if (install.status !== 0) {
  process.exit(install.status || 1);
}

const cacheDir = getPlaywrightCacheDir();
if (!fs.existsSync(cacheDir)) {
  console.error('Playwright cache not found at', cacheDir);
  process.exit(1);
}

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });
fs.cpSync(cacheDir, outDir, { recursive: true });
console.log('Copied Playwright browsers to', outDir);
