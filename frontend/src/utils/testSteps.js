export const BODY_PREVIEW_LEN = 100;

export const AUTH_STEP_OPTIONS = [
  { value: '', label: 'Use endpoint default' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
];

export function queryRows(step) {
  const q = step.query && typeof step.query === 'object' ? step.query : {};
  const arr = Object.entries(q).map(([k, v]) => ({ key: k, value: v != null ? String(v) : '' }));
  return arr.length ? arr : [{ key: '', value: '' }];
}

export function headerRows(step) {
  const h = step.headers && typeof step.headers === 'object' ? step.headers : {};
  const arr = Object.entries(h).map(([k, v]) => ({ key: k, value: v != null ? String(v) : '' }));
  return arr.length ? arr : [{ key: '', value: '' }];
}

export function elementOptionValue(pageId, webElementId) {
  return pageId && webElementId ? `${pageId}|${webElementId}` : webElementId || '';
}

export function isStepApi(step) {
  return step.type === 'api' || ['request', 'assertStatus', 'assertBody'].includes(step.type);
}

export function getStepApiAction(step) {
  return step.type === 'api' ? step.actionId || 'request' : step.type;
}

export function bodyStringForPreview(step) {
  if (typeof step.body === 'string') return step.body || '{}';
  if (step.body) return JSON.stringify(step.body, null, 2);
  return '{}';
}

/**
 * Short label for step card header (test or shared editor).
 */
export function getStepSummaryLine(step, ctx) {
  const { sharedCatalog = [], elementsWithPage = [], actions = [], endpoints = [], defaultPageId, pages = [] } = ctx;

  if (step.sharedStepId) {
    const s = sharedCatalog.find((x) => x.id === step.sharedStepId);
    return s?.title ? `Shared: ${s.title}` : `Shared: ${step.sharedStepId}`;
  }
  if (isStepApi(step)) {
    const apiAction = getStepApiAction(step);
    if (apiAction === 'request') {
      const ep = endpoints.find((e) => e.id === (step.endpointId ?? step.targetId));
      if (ep) return `${ep.method} ${ep.path}`;
      return 'HTTP request';
    }
    if (apiAction === 'assertStatus') return `Assert status ${step.value ?? '200'}`;
    if (apiAction === 'assertBody') return `Assert body ${step.jsonPath || '…'}`;
    return 'API step';
  }
  const pageId = step.pageId || defaultPageId;
  const el =
    elementsWithPage.find((e) => e.id === step.webElementId && (!pageId || e.pageId === pageId)) ||
    elementsWithPage.find((e) => e.id === step.webElementId);
  const act = actions.find((a) => a.id === step.actionId);
  const target = el ? el.title || el.selector : 'Element';
  const verb = act?.name || 'Action';
  const pageMeta = pageId ? pages.find((p) => p.id === pageId) : null;
  const pageLabel = pageMeta ? pageMeta.title || pageMeta.url || pageMeta.id : null;
  if (pageLabel && pages.length > 1) return `${verb} — ${pageLabel} — ${target}`;
  return `${verb} — ${target}`;
}
