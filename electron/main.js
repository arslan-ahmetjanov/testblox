const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const isDev = require('electron-is-dev');

if (app.isPackaged) {
  const browsersPath = path.join(process.resourcesPath, 'playwright-browsers');
  if (fs.existsSync(browsersPath)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  }
}
const filestore = require('./store/filestore');
const lastOpenedWorkspaces = require('./store/lastOpenedWorkspaces');
const { registerWorkspaceIpc, setCurrentPath } = require('./ipc/workspace');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  const prodPath = path.join(__dirname, '../renderer/index.html');

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(devUrl).catch((err) => console.error('Load URL error:', err));
  } else {
    mainWindow.loadFile(prodPath).catch((err) => console.error('Load file error:', err));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  const registerTestsRunIpc = require('./ipc/testsRun');
  registerTestsRunIpc(mainWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Register file-store workspace IPC (pages, tests, meta)
registerWorkspaceIpc();

// --- IPC: dialog open folder; open folder and init workspace if needed ---
ipcMain.handle('dialog:openFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Open workspace folder',
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
});

ipcMain.handle('dialog:openZip', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select workspace ZIP file',
    filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
});

ipcMain.handle('dialog:selectBrowserExecutable', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select browser executable',
    filters: [
      { name: 'Executables', extensions: ['exe', 'app'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
});

ipcMain.handle('workspace:openFolder', async (_, folderPath) => {
  if (!folderPath) return null;
  if (!filestore.isWorkspace(folderPath)) {
    filestore.initWorkspace(folderPath, 'My Workspace');
  }
  setCurrentPath(folderPath);
  lastOpenedWorkspaces.add(folderPath);
  const meta = filestore.readWorkspaceMeta(folderPath);
  const pages = filestore.listPages(folderPath);
  return { path: folderPath, workspace: meta, pages };
});

ipcMain.handle('workspace:getLastOpened', () => {
  return lastOpenedWorkspaces.getValid(filestore.isWorkspace);
});

// --- Export workspace to ZIP ---
ipcMain.handle('workspace:exportZip', async (_, workspacePath) => {
  if (!workspacePath || !filestore.isWorkspace(workspacePath)) {
    throw new Error('Invalid workspace path');
  }
  const meta = filestore.readWorkspaceMeta(workspacePath);
  const defaultName = (meta?.title || path.basename(workspacePath)).replace(/[<>:"/\\|?*]/g, '_') + '.zip';
  const { canceled, filePath: savePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export workspace as ZIP',
    defaultPath: defaultName,
    filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
  });
  if (canceled || !savePath) return { success: false, canceled: true };
  const archiver = require('archiver');
  const ignoreDirs = filestore.getWorkspaceIgnore(workspacePath);
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(savePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    const addDir = (dirPath, archivePrefix) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const entryPath = archivePrefix ? path.join(archivePrefix, entry.name) : entry.name;
        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            addDir(fullPath, entryPath);
          }
        } else {
          archive.file(fullPath, { name: entryPath });
        }
      }
    };
    addDir(workspacePath, '');
    archive.finalize();
  });
  return { success: true, filePath: savePath };
});

// --- Clone workspace ---
ipcMain.handle('workspace:clone', async (_, sourcePath, targetParentPath, newFolderName) => {
  if (!sourcePath || !filestore.isWorkspace(sourcePath)) throw new Error('Invalid source workspace');
  const safeName = (newFolderName || 'Workspace copy').replace(/[<>:"/\\|?*]/g, '_').trim() || 'Workspace copy';
  const targetPath = path.join(targetParentPath, safeName);
  if (path.resolve(sourcePath) === path.resolve(targetPath)) {
    throw new Error('Source and target cannot be the same');
  }
  if (fs.existsSync(targetPath)) {
    throw new Error(`Folder already exists: ${targetPath}`);
  }
  fs.mkdirSync(targetPath, { recursive: true });
  const meta = filestore.readWorkspaceMeta(sourcePath);
  const p = filestore.getPaths(sourcePath);
  const pt = filestore.getPaths(targetPath);
  function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcFull = path.join(src, entry.name);
      const destFull = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcFull, destFull);
      } else {
        fs.copyFileSync(srcFull, destFull);
      }
    }
  }
  [p.base, p.pagesDir, p.testsDir, p.endpointsDir, p.apiBasesDir].forEach((srcDir, i) => {
    const destDir = [pt.base, pt.pagesDir, pt.testsDir, pt.endpointsDir, pt.apiBasesDir][i];
    if (fs.existsSync(srcDir)) copyDir(srcDir, destDir);
  });
  const workspaceCopy = filestore.readWorkspaceMeta(targetPath);
  if (workspaceCopy) {
    workspaceCopy.title = (meta?.title || 'Workspace') + ' (copy)';
    filestore.writeWorkspaceMeta(targetPath, workspaceCopy);
  }
  const pages = filestore.listPages(targetPath);
  return { path: targetPath, workspace: filestore.readWorkspaceMeta(targetPath), pages };
});

// --- Import workspace from ZIP ---
ipcMain.handle('workspace:importZip', async (_, zipFilePath, targetParentPath, folderName) => {
  if (!zipFilePath || !fs.existsSync(zipFilePath)) throw new Error('ZIP file not found');
  if (!targetParentPath || !fs.existsSync(targetParentPath)) throw new Error('Target folder not found');
  const extractZip = require('extract-zip');
  const os = require('os');
  const tempDir = path.join(os.tmpdir(), `testblox-import-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  try {
    await extractZip(zipFilePath, { dir: tempDir });
    const entries = fs.readdirSync(tempDir, { withFileTypes: true });
    let sourceRoot = tempDir;
    let nameToUse = folderName || 'Imported workspace';
    if (entries.length === 1 && entries[0].isDirectory()) {
      sourceRoot = path.join(tempDir, entries[0].name);
      if (!folderName) nameToUse = entries[0].name;
    } else if (entries.some((e) => e.name === '.testblox')) {
      if (!folderName) nameToUse = 'Imported workspace';
    }
    const testbloxDir = path.join(sourceRoot, '.testblox');
    if (!fs.existsSync(testbloxDir) || !fs.existsSync(path.join(testbloxDir, 'workspace.json'))) {
      throw new Error('Invalid TestBlox workspace ZIP: missing .testblox/workspace.json');
    }
    const safeName = (nameToUse || 'Imported').replace(/[<>:"/\\|?*]/g, '_').trim() || 'Imported';
    const targetPath = path.join(targetParentPath, safeName);
    if (fs.existsSync(targetPath)) throw new Error(`Folder already exists: ${targetPath}`);
    fs.mkdirSync(targetPath, { recursive: true });
    const copyDir = (src, dest) => {
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcFull = path.join(src, entry.name);
        const destFull = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyDir(srcFull, destFull);
        } else {
          fs.copyFileSync(srcFull, destFull);
        }
      }
    };
    copyDir(sourceRoot, targetPath);
    return { path: targetPath };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

ipcMain.handle('workspace:createProject', async (_, parentPath, projectName) => {
  if (!parentPath || !projectName || typeof projectName !== 'string') throw new Error('Parent path and project name are required');
  const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'My Project';
  const projectPath = path.join(parentPath, safeName);
  if (fs.existsSync(projectPath)) {
    const stat = fs.statSync(projectPath);
    if (!stat.isDirectory()) throw new Error('A file with that name already exists');
    if (filestore.isWorkspace(projectPath)) {
      setCurrentPath(projectPath);
      lastOpenedWorkspaces.add(projectPath);
      return projectPath;
    }
    filestore.initWorkspace(projectPath, safeName);
  } else {
    fs.mkdirSync(projectPath, { recursive: true });
    filestore.initWorkspace(projectPath, safeName);
  }
  setCurrentPath(projectPath);
  lastOpenedWorkspaces.add(projectPath);
  return projectPath;
});

// --- IPC: get app paths ---
ipcMain.handle('app:getPath', (_, name) => app.getPath(name));

// --- Git (implemented in ipc/git.js) ---
const registerGitIpc = require('./ipc/git');
registerGitIpc(mainWindow);

// --- LLM config ---
const registerLlmIpc = require('./ipc/llm');
registerLlmIpc();

// --- Browser config (for test runner) ---
const registerBrowserIpc = require('./ipc/browser');
registerBrowserIpc();

// --- Generate tests with AI ---
const registerGenerateTestsIpc = require('./ipc/generateTests');
registerGenerateTestsIpc();

// --- Page parser ---
const registerParserIpc = require('./ipc/parser');
registerParserIpc();

// --- Tests run + reports (registered in whenReady after createWindow) ---
