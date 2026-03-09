const { ipcMain, app } = require('electron');
const playwrightRunner = require('../services/playwrightRunner');
const reportsStore = require('../store/reports');
const filestore = require('../store/filestore');
const { getCurrentPath } = require('./workspace');

function registerTestsRunIpc(mainWindow) {
  const sendProgress = (data) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('main:test-run-progress', data);
    }
  };

  ipcMain.handle('tests:run', async (_, testId, options = {}) => {
    const workspacePath = getCurrentPath();
    if (!workspacePath) throw new Error('No workspace opened');
    const test = filestore.readTest(workspacePath, testId);
    const report = await playwrightRunner.runTest(workspacePath, testId, {
      onProgress: (stepIndex, total, message) => {
        sendProgress({ testId, stepIndex, total, message });
      },
      saveReportToFile: true,
      screenshotOnFailureOnly: options.screenshotOnFailureOnly === true,
      userDataPath: app.getPath('userData'),
    });
    return report;
  });

  ipcMain.handle('tests:runMany', async (_, { testIds, concurrency = 1, screenshotOnFailureOnly = false }) => {
    const workspacePath = getCurrentPath();
    if (!workspacePath) throw new Error('No workspace opened');
    if (!Array.isArray(testIds) || testIds.length === 0) return { results: [] };
    const limit = Math.max(1, Math.min(Number(concurrency) || 1, 8));
    const results = [];
    let nextIndex = 0;

    const runOne = async (testId) => {
      try {
        const report = await playwrightRunner.runTest(workspacePath, testId, {
          onProgress: (stepIndex, total, message) => {
            sendProgress({ testId, stepIndex, total, message });
          },
          saveReportToFile: true,
          screenshotOnFailureOnly,
          userDataPath: app.getPath('userData'),
        });
        return { testId, report, error: null };
      } catch (err) {
        return { testId, report: null, error: err.message || String(err) };
      }
    };

    const worker = async () => {
      while (nextIndex < testIds.length) {
        const testId = testIds[nextIndex++];
        const result = await runOne(testId);
        results.push(result);
      }
    };

    await Promise.all(Array.from({ length: Math.min(limit, testIds.length) }, () => worker()));
    return { results };
  });

  ipcMain.handle('reports:list', (_, testId) => {
    const workspacePath = getCurrentPath();
    if (!workspacePath) return [];
    return reportsStore.listReports(workspacePath, testId || null);
  });

  ipcMain.handle('reports:get', (_, reportId) => {
    const workspacePath = getCurrentPath();
    if (!workspacePath) return null;
    return reportsStore.readReport(workspacePath, reportId);
  });

  ipcMain.handle('reports:getScreenshot', (_, reportId, filename) => {
    const workspacePath = getCurrentPath();
    if (!workspacePath) return null;
    const fs = require('fs');
    const filePath = reportsStore.getScreenshotPath(workspacePath, reportId, filename);
    try {
      if (!fs.existsSync(filePath)) return null;
      const buf = fs.readFileSync(filePath);
      return buf.toString('base64');
    } catch {
      return null;
    }
  });
}

module.exports = registerTestsRunIpc;
