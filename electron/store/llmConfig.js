const fs = require('fs');
const path = require('path');
const { readBuildConfig } = require('../config/buildConfig');

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
  const buildConfig = readBuildConfig();
  const filePath = getGlobalConfigPath(userDataPath);
  const raw = readJsonSafe(filePath);
  if (!raw) return { apiKey: null, modelName: null, apiBaseUrl: buildConfig.llmApiBaseUrl };
  return {
    apiKey: raw.apiKey ?? null,
    modelName: raw.modelName ?? null,
    apiBaseUrl: buildConfig.llmApiBaseUrl,
  };
}

function getWorkspaceConfig(workspaceRoot) {
  const buildConfig = readBuildConfig();
  const filePath = getWorkspaceConfigPath(workspaceRoot);
  if (!filePath) return null;
  const raw = readJsonSafe(filePath);
  if (!raw) return null;
  return {
    apiKey: raw.apiKey ?? null,
    modelName: raw.modelName ?? null,
    apiBaseUrl: buildConfig.llmApiBaseUrl,
  };
}

function chooseValueWithSource({ envValue, workspaceValue, globalValue, defaultValue = null }) {
  if (envValue !== undefined && envValue !== null) {
    return { value: envValue, source: 'env' };
  }
  if (workspaceValue !== undefined && workspaceValue !== null) {
    return { value: workspaceValue, source: 'workspace' };
  }
  if (globalValue !== undefined && globalValue !== null) {
    return { value: globalValue, source: 'global' };
  }
  return { value: defaultValue, source: 'default' };
}

function getEffectiveConfigDetails(userDataPath, workspaceRoot) {
  const buildConfig = readBuildConfig();
  const workspace = workspaceRoot ? getWorkspaceConfig(workspaceRoot) : null;
  const globalConfig = getGlobalConfig(userDataPath);

  const apiKeyResolved = chooseValueWithSource({
    envValue: process.env.TESTBLOX_LLM_API_KEY,
    workspaceValue: workspace?.apiKey,
    globalValue: globalConfig.apiKey,
    defaultValue: null,
  });
  const modelNameResolved = chooseValueWithSource({
    envValue: process.env.TESTBLOX_LLM_MODEL,
    workspaceValue: workspace?.modelName,
    globalValue: globalConfig.modelName,
    defaultValue: null,
  });

  return {
    values: {
      apiKey: apiKeyResolved.value,
      modelName: modelNameResolved.value,
      apiBaseUrl: buildConfig.llmApiBaseUrl,
    },
    sources: {
      apiKey: apiKeyResolved.source,
      modelName: modelNameResolved.source,
      apiBaseUrl: 'buildConfig',
    },
  };
}

/**
 * Effective config: workspace override first, then global, then env. For API calls (e.g. OpenRouter).
 * Env: TESTBLOX_LLM_API_KEY, TESTBLOX_LLM_MODEL, TESTBLOX_LLM_API_BASE_URL.
 */
function getEffectiveConfig(userDataPath, workspaceRoot) {
  return getEffectiveConfigDetails(userDataPath, workspaceRoot).values;
}

function saveGlobalConfig(userDataPath, config) {
  const buildConfig = readBuildConfig();
  const filePath = getGlobalConfigPath(userDataPath);
  writeJsonAtomic(filePath, {
    apiKey: config.apiKey ?? null,
    modelName: config.modelName ?? null,
    apiBaseUrl: buildConfig.llmApiBaseUrl,
  });
  return getGlobalConfig(userDataPath);
}

function saveWorkspaceConfig(workspaceRoot, config) {
  const buildConfig = readBuildConfig();
  const filePath = getWorkspaceConfigPath(workspaceRoot);
  if (!filePath) return null;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  writeJsonAtomic(filePath, {
    apiKey: config.apiKey ?? null,
    modelName: config.modelName ?? null,
    apiBaseUrl: buildConfig.llmApiBaseUrl,
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
  getEffectiveConfigDetails,
  saveGlobalConfig,
  saveWorkspaceConfig,
  isConfigValid,
  getGlobalConfigPath,
  getWorkspaceConfigPath,
};
