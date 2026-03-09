const fs = require('fs');
const path = require('path');

const BROWSER_FILENAME = 'browser.json';

const DEFAULT_CONFIG = {
  browser: 'chromium',
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

function getBrowserConfig(userDataPath) {
  const filePath = getConfigPath(userDataPath);
  const raw = readJsonSafe(filePath);
  if (!raw) return { ...DEFAULT_CONFIG };
  return {
    browser: raw.browser === 'firefox' || raw.browser === 'webkit' || raw.browser === 'custom' ? raw.browser : 'chromium',
    executablePath: typeof raw.executablePath === 'string' ? raw.executablePath : null,
  };
}

function saveBrowserConfig(userDataPath, config) {
  const filePath = getConfigPath(userDataPath);
  const merged = getBrowserConfig(userDataPath);
  if (config.browser != null) merged.browser = config.browser;
  if (config.executablePath !== undefined) merged.executablePath = config.executablePath;
  writeJsonAtomic(filePath, merged);
  return getBrowserConfig(userDataPath);
}

module.exports = {
  getBrowserConfig,
  saveBrowserConfig,
  getConfigPath,
};
