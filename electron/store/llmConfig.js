const fs = require('fs');
const path = require('path');

const LLM_FILENAME = 'llm.json';
const WORKSPACE_LLM = '.testblox/llm.json';

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

/**
 * Global config path: app userData / llm.json (e.g. %APPDATA%/TestBlox/llm.json)
 */
function getGlobalConfigPath(userDataPath) {
  return path.join(userDataPath, LLM_FILENAME);
}

/**
 * Workspace override: workspaceRoot /.testblox/llm.json
 */
function getWorkspaceConfigPath(workspaceRoot) {
  return workspaceRoot ? path.join(workspaceRoot, WORKSPACE_LLM) : null;
}

function getGlobalConfig(userDataPath) {
  const filePath = getGlobalConfigPath(userDataPath);
  const raw = readJsonSafe(filePath);
  if (!raw) return { apiKey: null, modelName: null, apiBaseUrl: null };
  return {
    apiKey: raw.apiKey ?? null,
    modelName: raw.modelName ?? null,
    apiBaseUrl: raw.apiBaseUrl ?? null,
  };
}

function getWorkspaceConfig(workspaceRoot) {
  const filePath = getWorkspaceConfigPath(workspaceRoot);
  if (!filePath) return null;
  const raw = readJsonSafe(filePath);
  if (!raw) return null;
  return {
    apiKey: raw.apiKey ?? null,
    modelName: raw.modelName ?? null,
    apiBaseUrl: raw.apiBaseUrl ?? null,
  };
}

/**
 * Effective config: workspace override first, then global. For API calls (e.g. OpenRouter).
 */
function getEffectiveConfig(userDataPath, workspaceRoot) {
  const workspace = workspaceRoot ? getWorkspaceConfig(workspaceRoot) : null;
  const globalConfig = getGlobalConfig(userDataPath);
  if (workspace && (workspace.apiKey || workspace.modelName || workspace.apiBaseUrl)) {
    return {
      apiKey: workspace.apiKey ?? globalConfig.apiKey,
      modelName: workspace.modelName ?? globalConfig.modelName,
      apiBaseUrl: workspace.apiBaseUrl ?? globalConfig.apiBaseUrl,
    };
  }
  return globalConfig;
}

function saveGlobalConfig(userDataPath, config) {
  const filePath = getGlobalConfigPath(userDataPath);
  writeJsonAtomic(filePath, {
    apiKey: config.apiKey ?? null,
    modelName: config.modelName ?? null,
    apiBaseUrl: config.apiBaseUrl ?? null,
  });
  return getGlobalConfig(userDataPath);
}

function saveWorkspaceConfig(workspaceRoot, config) {
  const filePath = getWorkspaceConfigPath(workspaceRoot);
  if (!filePath) return null;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  writeJsonAtomic(filePath, {
    apiKey: config.apiKey ?? null,
    modelName: config.modelName ?? null,
    apiBaseUrl: config.apiBaseUrl ?? null,
  });
  return getWorkspaceConfig(workspaceRoot);
}

function isConfigValid(config) {
  return !!(config && config.apiKey && config.modelName && config.apiBaseUrl);
}

module.exports = {
  getGlobalConfig,
  getWorkspaceConfig,
  getEffectiveConfig,
  saveGlobalConfig,
  saveWorkspaceConfig,
  isConfigValid,
  getGlobalConfigPath,
  getWorkspaceConfigPath,
};
