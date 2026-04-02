const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Path to Yandex Browser executable shipped in extraResources (packaged app only).
 */
function getBundledYandexExecutablePath() {
  if (!app.isPackaged) return null;
  const exe = path.join(process.resourcesPath, 'bundled-browser', 'browser.exe');
  return fs.existsSync(exe) ? exe : null;
}

module.exports = getBundledYandexExecutablePath;
