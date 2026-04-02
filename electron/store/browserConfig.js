const fs = require('fs');
const path = require('path');

const BROWSER_FILENAME = 'browser.json';

const DEFAULT_CONFIG = {
  browser: 'yandex',
  executablePath: null,
};

function readJsonSafe(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = filePath + '.' + Date.now() + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function getConfigPath(userDataPath) {
  return path.join(userDataPath, BROWSER_FILENAME);
}

function normalizeBrowser(value) {
  if (value === 'custom') return 'custom';
  if (value === 'yandex') return 'yandex';
  // migrate older installs (chromium / firefox / webkit → bundled Yandex path in runner)
  return 'yandex';
}

function getBrowserConfig(userDataPath) {
  const filePath = getConfigPath(userDataPath);
  const raw = readJsonSafe(filePath);
  if (!raw) return { ...DEFAULT_CONFIG };
  return {
    browser: normalizeBrowser(raw.browser),
    executablePath: typeof raw.executablePath === 'string' ? raw.executablePath : null,
  };
}

function saveBrowserConfig(userDataPath, config) {
  const filePath = getConfigPath(userDataPath);
  const merged = getBrowserConfig(userDataPath);
  if (config.browser != null) merged.browser = normalizeBrowser(config.browser);
  if (config.executablePath !== undefined) merged.executablePath = config.executablePath;
  if (merged.browser !== 'yandex' && merged.browser !== 'custom') merged.browser = 'yandex';
  if (merged.browser === 'custom') {
    const p = merged.executablePath != null ? String(merged.executablePath).trim() : '';
    if (!p) throw new Error('Custom browser requires a path to the executable');
    merged.executablePath = p;
  } else {
    merged.executablePath = null;
  }
  writeJsonAtomic(filePath, merged);
  return getBrowserConfig(userDataPath);
}

module.exports = {
  getBrowserConfig,
  saveBrowserConfig,
  getConfigPath,
};
