const axios = require('axios');
const filestore = require('../store/filestore');
const reportsStore = require('../store/reports');
const { substitute } = require('./playwrightRunner');

/**
 * Run an API test and return report.
 */
async function runApiTest(workspacePath, testId, options = {}) {
  const { onProgress = () => {}, saveReportToFile = true } = options;
  const test = filestore.readTest(workspacePath, testId);
  if (!test) throw new Error(`Test ${testId} not found`);
  if ((test.type || 'ui') !== 'api') throw new Error('Test is not an API test');
  const steps = test.steps || [];
  const variablesList = filestore.readVariables(workspacePath) || [];
  const varsMap = Object.fromEntries((variablesList || []).map((v) => [v.name, v.value]).filter(([k]) => k != null));
  const reportId = require('crypto').randomUUID();
  const reportSteps = [];
  const startTime = Date.now();
  let success = false;
  let lastResponse = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    onProgress(i + 1, steps.length, step.type === 'request' ? `Request: ${step.endpointId}` : step.type);
    let stepSuccess = false;
    let stepError = null;
    let stepValue = '';

    try {
      if (step.type === 'request') {
        const endpoint = filestore.readEndpoint(workspacePath, step.endpointId);
        if (!endpoint) throw new Error(`Endpoint ${step.endpointId} not found`);
        let baseUrlStr = endpoint.baseUrl || '';
        // Step-level baseId overrides endpoint base (like pageId for UI steps)
        const effectiveBaseId = step.baseId ?? endpoint.baseId;
        if (effectiveBaseId) {
          const base = filestore.readBase(workspacePath, effectiveBaseId);
          if (base) baseUrlStr = base.baseUrl || baseUrlStr;
        }
        const baseUrl = substitute(baseUrlStr, varsMap).trim() || '';
        const path = substitute(endpoint.path || '/', varsMap);
        const url = (baseUrl + path).replace(/([^:]\/)\/+/g, '$1');
        const method = (endpoint.method || 'GET').toUpperCase();
        let body = step.body;
        if (typeof body === 'string') {
          body = substitute(body, varsMap);
          try { body = body ? JSON.parse(body) : undefined; } catch (_) { /* send as string */ }
        }
        const headers = step.headers && typeof step.headers === 'object' ? step.headers : {};
        const res = await axios.request({
          url,
          method,
          data: method !== 'GET' ? body : undefined,
          params: step.query,
          headers: { 'Content-Type': 'application/json', ...headers },
          timeout: 30000,
          validateStatus: () => true,
        });
        lastResponse = res;
        stepValue = `${method} ${path} → ${res.status}`;
        stepSuccess = true;
      } else if (step.type === 'assertStatus') {
        const expected = substitute(String(step.value ?? ''), varsMap).trim();
        const actual = lastResponse ? lastResponse.status : null;
        if (actual === null) throw new Error('No previous response');
        const expectedNum = parseInt(expected, 10);
        if (String(actual) !== expected && actual !== expectedNum) {
          throw new Error(`Expected status ${expected}, got ${actual}`);
        }
        stepValue = `Status ${actual}`;
        stepSuccess = true;
      } else if (step.type === 'assertBody') {
        if (!lastResponse) throw new Error('No previous response');
        const data = lastResponse.data;
        const path = step.jsonPath || step.path;
        const expected = substitute(String(step.value ?? ''), varsMap);
        let actual;
        if (path) {
          const parts = path.replace(/^\./, '').split('.');
          actual = parts.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
        } else {
          actual = data;
        }
        const actualStr = typeof actual === 'object' ? JSON.stringify(actual) : String(actual);
        if (actualStr !== expected && actual !== expected) {
          throw new Error(`Expected: ${expected}, got: ${actualStr}`);
        }
        stepValue = path ? `Body ${path}` : 'Body';
        stepSuccess = true;
      } else {
        stepError = `Unknown step type: ${step.type}`;
      }
    } catch (err) {
      stepError = err.message || String(err);
    }

    reportSteps.push({
      value: stepValue || step.type,
      status: stepSuccess ? 'passed' : 'failed',
      error: stepError,
    });
    if (!stepSuccess) break;
  }

  success = reportSteps.every((s) => s.status === 'passed');
  const executionTime = Date.now() - startTime;
  const report = {
    id: reportId,
    testId,
    testTitle: test.title,
    testType: 'api',
    status: success ? 'passed' : 'failed',
    executionTime,
    steps: reportSteps,
    createdAt: new Date().toISOString(),
  };
  if (saveReportToFile) reportsStore.saveReport(workspacePath, report);
  return report;
}

module.exports = { runApiTest };
