const fs = require('fs');
const path = require('path');
const { PREDEFINED_ACTIONS, DEFAULT_VIEWPORTS } = require('./constants');

const TESTBLOX_DIR = '.testblox';
const WORKSPACE_FILE = 'workspace.json';
const ACTIONS_FILE = 'actions.json';
const DEFAULT_IGNORE = ['node_modules', '.git', 'reports'];
const VARIABLES_FILE = 'variables.json';
const SHARED_STEPS_FILE = 'sharedSteps.json';
const PAGES_DIR = 'pages';
const TESTS_DIR = 'tests';
const ENDPOINTS_DIR = 'endpoints';
const API_BASES_DIR = 'apiBases';

function genId() {
  return require('crypto').randomUUID();
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonSafe(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('readJsonSafe', filePath, e);
    return defaultValue;
  }
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tmpPath = filePath + '.' + Date.now() + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function getPaths(rootPath) {
  const base = path.join(rootPath, TESTBLOX_DIR);
  return {
    base,
    workspace: path.join(base, WORKSPACE_FILE),
    actions: path.join(base, ACTIONS_FILE),
    variables: path.join(base, VARIABLES_FILE),
    sharedSteps: path.join(base, SHARED_STEPS_FILE),
    pagesDir: path.join(rootPath, PAGES_DIR),
    testsDir: path.join(rootPath, TESTS_DIR),
    endpointsDir: path.join(rootPath, ENDPOINTS_DIR),
    apiBasesDir: path.join(rootPath, API_BASES_DIR),
  };
}

function initWorkspace(rootPath, title = 'My Workspace') {
  const p = getPaths(rootPath);
  ensureDir(p.base);
  ensureDir(p.pagesDir);
  ensureDir(p.testsDir);
  ensureDir(p.endpointsDir);
  ensureDir(p.apiBasesDir);

  const viewports = DEFAULT_VIEWPORTS.map((v, i) => ({
    id: genId(),
    title: v.title,
    width: v.width,
    height: v.height,
    createdAt: new Date().toISOString(),
  }));

  const workspace = {
    id: genId(),
    title,
    description: null,
    viewports,
    defaultViewportId: viewports[0]?.id || null,
    ignore: DEFAULT_IGNORE.slice(),
    createdAt: new Date().toISOString(),
  };
  writeJsonAtomic(p.workspace, workspace);

  const actions = PREDEFINED_ACTIONS.map((a, i) => ({
    id: genId(),
    name: a.name,
    withValue: a.withValue,
  }));
  writeJsonAtomic(p.actions, { actions });
  writeJsonAtomic(p.variables, { variables: [] });
  writeJsonAtomic(p.sharedSteps, { sharedSteps: [] });

  const gitignorePath = path.join(rootPath, '.gitignore');
  try {
    let content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
    if (content && !content.includes('reports/')) content += '\nreports/\n';
    else if (!content.trim()) content = 'reports/\n';
    if (content.trim()) fs.writeFileSync(gitignorePath, content, 'utf8');
  } catch (_) {}

  return workspace;
}

function readWorkspaceMeta(rootPath) {
  const p = getPaths(rootPath);
  const workspace = readJsonSafe(p.workspace);
  if (!workspace) return null;
  return workspace;
}

/**
 * Return list of directory names to ignore when traversing the workspace (e.g. clone, export).
 * @param {string} rootPath
 * @returns {string[]}
 */
function getWorkspaceIgnore(rootPath) {
  const workspace = readWorkspaceMeta(rootPath);
  if (!workspace || !Array.isArray(workspace.ignore)) return DEFAULT_IGNORE.slice();
  return workspace.ignore;
}

function writeWorkspaceMeta(rootPath, data) {
  const p = getPaths(rootPath);
  ensureDir(p.base);
  writeJsonAtomic(p.workspace, data);
}

function readActions(rootPath) {
  const p = getPaths(rootPath);
  const obj = readJsonSafe(p.actions, { actions: [] });
  if (obj.actions && obj.actions.length > 0) return obj.actions;
  return PREDEFINED_ACTIONS.map((a) => ({
    id: genId(),
    name: a.name,
    withValue: a.withValue,
  }));
}

function readVariables(rootPath) {
  const p = getPaths(rootPath);
  const obj = readJsonSafe(p.variables, { variables: [] });
  return Array.isArray(obj.variables) ? obj.variables : [];
}

function writeVariables(rootPath, variables) {
  const p = getPaths(rootPath);
  ensureDir(p.base);
  writeJsonAtomic(p.variables, { variables: Array.isArray(variables) ? variables : [] });
  return variables;
}

function listSharedSteps(rootPath) {
  const p = getPaths(rootPath);
  const obj = readJsonSafe(p.sharedSteps, { sharedSteps: [] });
  return Array.isArray(obj.sharedSteps) ? obj.sharedSteps : [];
}

function readSharedStep(rootPath, sharedStepId) {
  const list = listSharedSteps(rootPath);
  return list.find((s) => s.id === sharedStepId) || null;
}

function writeSharedSteps(rootPath, sharedSteps) {
  const p = getPaths(rootPath);
  ensureDir(p.base);
  writeJsonAtomic(p.sharedSteps, { sharedSteps: Array.isArray(sharedSteps) ? sharedSteps : [] });
  return sharedSteps;
}

function createSharedStep(rootPath, data) {
  const list = listSharedSteps(rootPath);
  const step = {
    id: genId(),
    title: data.title || 'New shared step',
    steps: Array.isArray(data.steps) ? data.steps : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(step);
  writeSharedSteps(rootPath, list);
  return step;
}

function updateSharedStep(rootPath, sharedStepId, data) {
  const list = listSharedSteps(rootPath);
  const idx = list.findIndex((s) => s.id === sharedStepId);
  if (idx < 0) return null;
  if (data.title !== undefined) list[idx].title = data.title;
  if (Array.isArray(data.steps)) list[idx].steps = data.steps;
  list[idx].updatedAt = new Date().toISOString();
  writeSharedSteps(rootPath, list);
  return list[idx];
}

function deleteSharedStep(rootPath, sharedStepId) {
  const list = listSharedSteps(rootPath).filter((s) => s.id !== sharedStepId);
  writeSharedSteps(rootPath, list);
  return true;
}

function listPages(rootPath) {
  const p = getPaths(rootPath);
  if (!fs.existsSync(p.pagesDir)) return [];
  const files = fs.readdirSync(p.pagesDir).filter((f) => f.endsWith('.json'));
  const pages = [];
  for (const f of files) {
    const page = readJsonSafe(path.join(p.pagesDir, f));
    if (page && !page.deleted) pages.push(page);
  }
  return pages;
}

function readPage(rootPath, pageId) {
  const p = getPaths(rootPath);
  const filePath = path.join(p.pagesDir, pageId + '.json');
  // #region agent log
  const exists = fs.existsSync(filePath);
  try {
    const logPath = path.join(rootPath, 'debug-b48e74.log');
    fs.appendFileSync(logPath, JSON.stringify({ sessionId: 'b48e74', location: 'filestore.readPage', message: 'readPage', data: { pageId, filePath, exists }, timestamp: Date.now(), hypothesisId: 'H2' }) + '\n', 'utf8');
  } catch (_) {}
  // #endregion
  return readJsonSafe(filePath);
}

function writePage(rootPath, page) {
  const p = getPaths(rootPath);
  ensureDir(p.pagesDir);
  const filePath = path.join(p.pagesDir, page.id + '.json');
  page.updatedAt = new Date().toISOString();
  writeJsonAtomic(filePath, page);
  return page;
}

function createPage(rootPath, data) {
  const workspace = readWorkspaceMeta(rootPath);
  if (!workspace) throw new Error('Workspace not initialized');
  const viewportId = data.viewportId || workspace.defaultViewportId || workspace.viewports?.[0]?.id;
  const viewport = workspace.viewports?.find((v) => v.id === viewportId) || workspace.viewports?.[0];
  const page = {
    id: genId(),
    title: data.title || 'New Page',
    url: data.url || '',
    viewportId: viewport?.id || viewportId,
    viewport: viewport || { id: viewportId, title: 'Desktop', width: 1920, height: 1080 },
    webElements: [],
    folders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  };
  writePage(rootPath, page);
  return page;
}

function updatePage(rootPath, pageId, data) {
  const page = readPage(rootPath, pageId);
  if (!page) return null;
  if (data.title !== undefined) page.title = data.title;
  if (data.url !== undefined) page.url = data.url;
  if (data.viewportId !== undefined) {
    const workspace = readWorkspaceMeta(rootPath);
    const v = workspace?.viewports?.find((x) => x.id === data.viewportId);
    page.viewportId = data.viewportId;
    if (v) page.viewport = v;
  }
  if (Array.isArray(data.webElements)) page.webElements = data.webElements;
  if (!Array.isArray(page.webElements)) page.webElements = [];
  writePage(rootPath, page);
  return page;
}

function deletePage(rootPath, pageId) {
  const page = readPage(rootPath, pageId);
  if (!page) return null;
  page.deleted = true;
  page.updatedAt = new Date().toISOString();
  writePage(rootPath, page);
  return page;
}

function listTests(rootPath, pageId = null) {
  const p = getPaths(rootPath);
  if (!fs.existsSync(p.testsDir)) return [];
  const files = fs.readdirSync(p.testsDir).filter((f) => f.endsWith('.json'));
  let pageWebElementIds = null;
  if (pageId != null) {
    const page = readPage(rootPath, pageId);
    if (!page) return [];
    pageWebElementIds = (page.webElements || []).map((e) => e.id);
  }
  const tests = [];
  for (const f of files) {
    const test = readJsonSafe(path.join(p.testsDir, f));
    if (!test || test.deleted) continue;
    if (pageId == null) {
      tests.push(test);
    } else {
      const stepElementIds = (test.steps || []).map((s) => s.webElementId).filter(Boolean);
      if (stepElementIds.some((id) => pageWebElementIds.includes(id))) tests.push(test);
    }
  }
  return tests;
}

function readTest(rootPath, testId) {
  const p = getPaths(rootPath);
  const filePath = path.join(p.testsDir, testId + '.json');
  return readJsonSafe(filePath);
}

function writeTest(rootPath, test) {
  const p = getPaths(rootPath);
  ensureDir(p.testsDir);
  const filePath = path.join(p.testsDir, test.id + '.json');
  test.updatedAt = new Date().toISOString();
  writeJsonAtomic(filePath, test);
  return test;
}

function createTest(rootPath, data) {
  const test = {
    id: genId(),
    title: data.title || 'New Test',
    type: data.type || 'ui',
    pageId: data.pageId ?? null,
    steps: [],
    folderId: data.folderId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
    isRunning: false,
  };
  writeTest(rootPath, test);
  return test;
}

function updateTest(rootPath, testId, data) {
  const test = readTest(rootPath, testId);
  if (!test) return null;
  if (data.title !== undefined) test.title = data.title;
  if (data.type !== undefined) test.type = data.type;
  if (data.pageId !== undefined) test.pageId = data.pageId;
  if (data.folderId !== undefined) test.folderId = data.folderId;
  if (Array.isArray(data.steps)) test.steps = data.steps;
  writeTest(rootPath, test);
  return test;
}

function deleteTest(rootPath, testId) {
  const test = readTest(rootPath, testId);
  if (!test) return null;
  test.deleted = true;
  test.updatedAt = new Date().toISOString();
  writeTest(rootPath, test);
  return test;
}

/**
 * Build a stable JSON string for a test (excluding id, createdAt, updatedAt) for duplicate detection.
 */
function testSignature(test) {
  const obj = {
    title: test.title || '',
    type: test.type || 'ui',
    pageId: test.pageId ?? null,
    folderId: test.folderId ?? null,
    steps: (test.steps || []).map((step) => {
      const keys = Object.keys(step).sort();
      const sorted = {};
      for (const k of keys) sorted[k] = step[k];
      return sorted;
    }),
  };
  return JSON.stringify(obj);
}

/**
 * Find groups of duplicate tests (same title, type, pageId, steps). Returns array of groups; each group is array of test objects.
 */
function findDuplicateTests(rootPath) {
  const tests = listTests(rootPath);
  const bySignature = new Map();
  for (const test of tests) {
    const sig = testSignature(test);
    if (!bySignature.has(sig)) bySignature.set(sig, []);
    bySignature.get(sig).push(test);
  }
  return [...bySignature.values()].filter((group) => group.length > 1);
}

function listBases(rootPath) {
  const p = getPaths(rootPath);
  if (!fs.existsSync(p.apiBasesDir)) return [];
  const files = fs.readdirSync(p.apiBasesDir).filter((f) => f.endsWith('.json'));
  const list = [];
  for (const f of files) {
    const base = readJsonSafe(path.join(p.apiBasesDir, f));
    if (base && !base.deleted) list.push(base);
  }
  return list;
}

function readBase(rootPath, baseId) {
  const p = getPaths(rootPath);
  const filePath = path.join(p.apiBasesDir, baseId + '.json');
  return readJsonSafe(filePath);
}

function writeBase(rootPath, base) {
  const p = getPaths(rootPath);
  ensureDir(p.apiBasesDir);
  const filePath = path.join(p.apiBasesDir, base.id + '.json');
  base.updatedAt = new Date().toISOString();
  writeJsonAtomic(filePath, base);
  return base;
}

function createBase(rootPath, data) {
  const base = {
    id: genId(),
    title: data.title || 'New API Base',
    baseUrl: data.baseUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  };
  writeBase(rootPath, base);
  return base;
}

function updateBase(rootPath, baseId, data) {
  const base = readBase(rootPath, baseId);
  if (!base) return null;
  if (data.title !== undefined) base.title = data.title;
  if (data.baseUrl !== undefined) base.baseUrl = data.baseUrl;
  writeBase(rootPath, base);
  return base;
}

function deleteBase(rootPath, baseId) {
  const base = readBase(rootPath, baseId);
  if (!base) return null;
  base.deleted = true;
  base.updatedAt = new Date().toISOString();
  writeBase(rootPath, base);
  return base;
}

function listEndpoints(rootPath, baseId = null) {
  const p = getPaths(rootPath);
  if (!fs.existsSync(p.endpointsDir)) return [];
  const files = fs.readdirSync(p.endpointsDir).filter((f) => f.endsWith('.json'));
  const list = [];
  for (const f of files) {
    const ep = readJsonSafe(path.join(p.endpointsDir, f));
    if (ep && !ep.deleted && (baseId == null || ep.baseId === baseId)) list.push(ep);
  }
  return list;
}

function readEndpoint(rootPath, endpointId) {
  const p = getPaths(rootPath);
  const filePath = path.join(p.endpointsDir, endpointId + '.json');
  return readJsonSafe(filePath);
}

function writeEndpoint(rootPath, endpoint) {
  const p = getPaths(rootPath);
  ensureDir(p.endpointsDir);
  const filePath = path.join(p.endpointsDir, endpoint.id + '.json');
  endpoint.updatedAt = new Date().toISOString();
  writeJsonAtomic(filePath, endpoint);
  return endpoint;
}

function createEndpoint(rootPath, data) {
  const endpoint = {
    id: genId(),
    title: data.title || 'New Endpoint',
    method: (data.method || 'GET').toUpperCase(),
    path: data.path || '/',
    summary: data.summary || '',
    baseId: data.baseId ?? null,
    baseUrl: data.baseUrl || '',
    requestBody: data.requestBody || null,
    parameters: data.parameters || [],
    responses: data.responses || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  };
  writeEndpoint(rootPath, endpoint);
  return endpoint;
}

function updateEndpoint(rootPath, endpointId, data) {
  const endpoint = readEndpoint(rootPath, endpointId);
  if (!endpoint) return null;
  if (data.title !== undefined) endpoint.title = data.title;
  if (data.method !== undefined) endpoint.method = (data.method || 'GET').toUpperCase();
  if (data.path !== undefined) endpoint.path = data.path;
  if (data.summary !== undefined) endpoint.summary = data.summary;
  if (data.baseId !== undefined) endpoint.baseId = data.baseId;
  if (data.baseUrl !== undefined) endpoint.baseUrl = data.baseUrl;
  if (data.requestBody !== undefined) endpoint.requestBody = data.requestBody;
  if (Array.isArray(data.parameters)) endpoint.parameters = data.parameters;
  if (data.responses !== undefined) endpoint.responses = data.responses;
  writeEndpoint(rootPath, endpoint);
  return endpoint;
}

function deleteEndpoint(rootPath, endpointId) {
  const endpoint = readEndpoint(rootPath, endpointId);
  if (!endpoint) return null;
  endpoint.deleted = true;
  endpoint.updatedAt = new Date().toISOString();
  writeEndpoint(rootPath, endpoint);
  return endpoint;
}

function isWorkspace(rootPath) {
  const p = getPaths(rootPath);
  return fs.existsSync(p.workspace);
}

module.exports = {
  getPaths,
  initWorkspace,
  readWorkspaceMeta,
  writeWorkspaceMeta,
  getWorkspaceIgnore,
  readActions,
  readVariables,
  writeVariables,
  listSharedSteps,
  readSharedStep,
  writeSharedSteps,
  createSharedStep,
  updateSharedStep,
  deleteSharedStep,
  listPages,
  readPage,
  writePage,
  createPage,
  updatePage,
  deletePage,
  listBases,
  readBase,
  writeBase,
  createBase,
  updateBase,
  deleteBase,
  listEndpoints,
  readEndpoint,
  writeEndpoint,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  listTests,
  readTest,
  writeTest,
  createTest,
  updateTest,
  deleteTest,
  findDuplicateTests,
  isWorkspace,
  genId,
};
