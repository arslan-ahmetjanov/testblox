const { ipcMain } = require('electron');
const { app } = require('electron');
const llmGenerateTests = require('../services/llmGenerateTests');
const { getCurrentPath } = require('./workspace');

function registerGenerateTestsIpc() {
  ipcMain.handle('tests:generateWithAI', async (_, pageId, customPrompt) => {
    const workspacePath = getCurrentPath();
    if (!workspacePath) throw new Error('No workspace opened');
    const userData = app.getPath('userData');
    const testCases = await llmGenerateTests.generateTestsWithAI(
      userData,
      workspacePath,
      pageId,
      customPrompt || null
    );
    return testCases;
  });

  ipcMain.handle('tests:generateFromSelection', async (_, options) => {
    const workspacePath = getCurrentPath();
    if (!workspacePath) throw new Error('No workspace opened');
    const userData = app.getPath('userData');
    return llmGenerateTests.generateFromSelection(userData, workspacePath, options || {});
  });
}

module.exports = registerGenerateTestsIpc;
