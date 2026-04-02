const path = require('path');
const { ipcMain } = require('electron');
const llmConfig = require('../store/llmConfig');
const { getCurrentPath } = require('./workspace');
const { assertHttpsWebUrl } = require('../utils/requireHttpsUrl');

function assertLlmApiBaseUrlIfSet(url) {
  if (url == null) return;
  const s = String(url).trim();
  if (s === '') return;
  assertHttpsWebUrl(s, { allowEmpty: false, fieldName: 'LLM API base URL' });
}

function registerLlmIpc() {
  ipcMain.handle('llm:getConfig', (_, scope) => {
    const userData = require('electron').app.getPath('userData');
    const workspacePath = getCurrentPath();
    if (workspacePath) {
      try {
        require('dotenv').config({ path: path.join(workspacePath, '.env') });
      } catch (_) {}
    }
    const globalConfig = llmConfig.getGlobalConfig(userData);
    const workspaceConfig = workspacePath ? llmConfig.getWorkspaceConfig(workspacePath) : null;
    const effective = llmConfig.getEffectiveConfig(userData, workspacePath);
    return {
      global: { ...globalConfig, apiKey: globalConfig.apiKey ? '***' : null },
      workspace: workspaceConfig ? { ...workspaceConfig, apiKey: workspaceConfig.apiKey ? '***' : null } : null,
      effective: { ...effective, apiKey: effective.apiKey ? '***' : null },
      isValid: llmConfig.isConfigValid(effective),
    };
  });

  ipcMain.handle('llm:saveConfig', (_, { scope, apiKey, modelName, apiBaseUrl }) => {
    const userData = require('electron').app.getPath('userData');
    if (scope === 'workspace') {
      const workspacePath = getCurrentPath();
      if (!workspacePath) throw new Error('No workspace opened');
      const current = llmConfig.getWorkspaceConfig(workspacePath) || {};
      const nextBase = apiBaseUrl ?? current.apiBaseUrl;
      assertLlmApiBaseUrlIfSet(nextBase);
      return llmConfig.saveWorkspaceConfig(workspacePath, {
        apiKey: apiKey === '***' ? current.apiKey : apiKey,
        modelName: modelName ?? current.modelName,
        apiBaseUrl: nextBase,
      });
    }
    const current = llmConfig.getGlobalConfig(userData);
    const nextBaseGlobal = apiBaseUrl ?? current.apiBaseUrl;
    assertLlmApiBaseUrlIfSet(nextBaseGlobal);
    return llmConfig.saveGlobalConfig(userData, {
      apiKey: apiKey === '***' ? current.apiKey : apiKey,
      modelName: modelName ?? current.modelName,
      apiBaseUrl: nextBaseGlobal,
    });
  });

  ipcMain.handle('llm:getEffectiveForAPI', () => {
    const userData = require('electron').app.getPath('userData');
    const workspacePath = getCurrentPath();
    return llmConfig.getEffectiveConfig(userData, workspacePath);
  });
}

module.exports = registerLlmIpc;
