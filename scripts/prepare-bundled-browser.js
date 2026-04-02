const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');
const outDir = path.join(projectRoot, 'dist-bundled-browser');
const sourceDir =
  process.env.YANDEX_BROWSER_SOURCE ||
  'C:\\Program Files\\Yandex\\YandexBrowser\\Application';

if (!fs.existsSync(sourceDir)) {
  console.error(
    'Yandex Browser not found at:',
    sourceDir,
    '\nInstall Yandex Browser or set YANDEX_BROWSER_SOURCE to the Application folder.'
  );
  process.exit(1);
}

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });
fs.cpSync(sourceDir, outDir, { recursive: true });

const exe = path.join(outDir, 'browser.exe');
if (!fs.existsSync(exe)) {
  console.error('browser.exe not found after copy. Expected at:', exe);
  process.exit(1);
}

console.log('Copied Yandex Browser to', outDir);
