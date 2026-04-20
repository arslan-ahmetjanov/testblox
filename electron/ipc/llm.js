const path = require('path');
const { ipcMain } = require('electron');
const llmConfig = require('../store/llmConfig');
const { getCurrentPath } = require('./workspace');
const { readBuildConfig } = require('../config/buildConfig');

function registerLlmIpc() {
  ipcMain.handle('llm:getConfig', (_, scope) => {
    const userData = require('electron').app.getPath('userData');
    const workspacePath = getCurrentPath();
    const buildConfig = readBuildConfig();
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
      apiBaseUrlLocked: true,
      buildFlavor: buildConfig.flavor,
    };
  });

  ipcMain.handle('llm:saveConfig', (_, { scope, apiKey, modelName }) => {
    const userData = require('electron').app.getPath('userData');
    if (scope === 'workspace') {
      const workspacePath = getCurrentPath();
      if (!workspacePath) throw new Error('No workspace opened');
      const current = llmConfig.getWorkspaceConfig(workspacePath) || {};
      return llmConfig.saveWorkspaceConfig(workspacePath, {
        apiKey: apiKey === '***' ? current.apiKey : apiKey,
        modelName: modelName ?? current.modelName,
        apiBaseUrl: current.apiBaseUrl,
      });
    }
    const current = llmConfig.getGlobalConfig(userData);
    return llmConfig.saveGlobalConfig(userData, {
      apiKey: apiKey === '***' ? current.apiKey : apiKey,
      modelName: modelName ?? current.modelName,
      apiBaseUrl: current.apiBaseUrl,
    });
  });

  ipcMain.handle('llm:getEffectiveForAPI', () => {
    const userData = require('electron').app.getPath('userData');
    const workspacePath = getCurrentPath();
    return llmConfig.getEffectiveConfig(userData, workspacePath);
  });
}

module.exports = registerLlmIpc;
