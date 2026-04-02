const llmConfig = require('../store/llmConfig');
const filestore = require('../store/filestore');
const { assertHttpsRequestUrl } = require('../utils/requireHttpsUrl');

/**
 * Call OpenRouter (or compatible) chat API with streaming, accumulate content, return full text.
 */
async function streamChatCompletion(apiUrl, config, messages, options = {}) {
  const body = {
    model: config.modelName,
    messages,
    temperature: options.temperature ?? 0.3,
    stream: true,
    ...(options.response_format && { response_format: options.response_format }),
  };
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM request failed: ${res.status} ${res.statusText}${errText ? ` - ${errText}` : ''}`);
  }
  let content = '';
  const decoder = new TextDecoder();
  const reader = res.body;
  if (!reader) throw new Error('No response body');
  let buffer = '';
  for await (const chunk of reader) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const obj = JSON.parse(data);
          const delta = obj.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') content += delta;
        } catch (_) {}
      }
    }
  }
  if (buffer.trim().startsWith('data: ')) {
    const data = buffer.trim().slice(6);
    if (data !== '[DONE]') {
      try {
        const obj = JSON.parse(data);
        const delta = obj.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') content += delta;
      } catch (_) {}
    }
  }
  return content;
}

const SYSTEM_PROMPT = `
You are a senior QA automation engineer. Generate 3-10 comprehensive test scenarios that simulate real user flows.

IMPORTANT: Respond ONLY with valid JSON without any additional text, comments, or markdown formatting.

1. Scenario requirements:
- Each test must contain at least 2 logically connected steps
- Simulate real user behavior

2. Strict JSON response schema:
{
  "test_cases": [
    {
      "title": "Scenario description",
      "steps": [
        {
          "value": "specific value for withValue=true, otherwise empty string",
          "webElementId": "element ID from the elements list",
          "actionId": "action ID from the actions list"
        }
      ]
    }
  ]
}

3. Use only the element IDs and action IDs provided. Do not add markdown or text outside JSON.
`.trim();

const SYSTEM_PROMPT_SELECTION = `
You are a senior QA automation engineer. Generate test scenarios from the given pages (UI elements) and/or API endpoints.

IMPORTANT: Respond ONLY with valid JSON without any additional text, comments, or markdown.

1. You may receive:
   - pages: array of { pageId, title, elements: [ { id, title, selector } ] }
   - endpoints: array of { id, method, path, summary }
   - actions: array of { id, name, withValue }

2. Response schema (use only the IDs provided):
{
  "ui_tests": [
    {
      "title": "Scenario name",
      "pageId": "page ID from the pages list",
      "steps": [
        { "webElementId": "element ID", "actionId": "action ID", "pageId": "optional, from same page", "value": "" }
      ]
    }
  ],
  "api_tests": [
    {
      "title": "API scenario name",
      "steps": [
        { "type": "request", "endpointId": "endpoint ID", "body": "{}" },
        { "type": "assertStatus", "value": "200" },
        { "type": "assertBody", "jsonPath": "data.id", "value": "expected" }
      ]
    }
  ]
}

3. Generate 2-6 scenarios total (any mix of ui_tests and api_tests). Omit ui_tests or api_tests if no pages or endpoints provided. Use only provided IDs.
`.trim();

async function generateTestsWithAI(userDataPath, workspacePath, pageId, customPrompt = null) {
  require('dotenv').config({ path: require('path').join(workspacePath, '.env') });
  const config = llmConfig.getEffectiveConfig(userDataPath, workspacePath);
  if (!llmConfig.isConfigValid(config)) {
    throw new Error('LLM configuration is not set. Configure in Settings (OpenRouter API key, model, URL).');
  }
  const page = filestore.readPage(workspacePath, pageId);
  if (!page) throw new Error('Page not found');
  const elements = (page.webElements || []).map((el) => ({
    id: el.id,
    title: el.title,
    selector: el.selector,
    type: el.type || 'element',
  }));
  const actions = filestore.readActions(workspacePath);
  const actionsPayload = actions.map((a) => ({ id: a.id, name: a.name, withValue: a.withValue }));

  let systemPrompt = SYSTEM_PROMPT;
  if (customPrompt && customPrompt.trim()) {
    systemPrompt += `\n\nAdditional instructions:\n${customPrompt.trim()}`;
  }
  const userPrompt = `Elements: ${JSON.stringify(elements)}\nActions: ${JSON.stringify(actionsPayload)}`;
  const apiUrl = config.apiBaseUrl.endsWith('/chat/completions')
    ? config.apiBaseUrl
    : `${config.apiBaseUrl.replace(/\/$/, '')}/chat/completions`;
  assertHttpsRequestUrl(apiUrl, 'LLM API URL');

  let content = await streamChatCompletion(
    apiUrl,
    config,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { response_format: { type: 'json_object' } }
  );
  if (!content) throw new Error('Empty response from LLM');
  content = content.trim();
  if (content.startsWith('```json')) content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  if (content.startsWith('```')) content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(content);
  if (!parsed.test_cases) throw new Error('Invalid response: missing test_cases');
  return parsed.test_cases;
}

async function generateFromSelection(userDataPath, workspacePath, options = {}) {
  require('dotenv').config({ path: require('path').join(workspacePath, '.env') });
  const { pageIds = [], endpointIds = [], customPrompt = '' } = options;
  const config = llmConfig.getEffectiveConfig(userDataPath, workspacePath);
  if (!llmConfig.isConfigValid(config)) {
    throw new Error('LLM configuration is not set. Configure in Settings (OpenRouter API key, model, URL).');
  }
  const pages = (pageIds || []).map((id) => {
    const p = filestore.readPage(workspacePath, id);
    return p ? { pageId: p.id, title: p.title, elements: (p.webElements || []).map((el) => ({ id: el.id, title: el.title, selector: el.selector })) } : null;
  }).filter(Boolean);
  const endpoints = (endpointIds || []).map((id) => {
    const ep = filestore.readEndpoint(workspacePath, id);
    return ep ? { id: ep.id, method: ep.method, path: ep.path, summary: ep.summary || ep.title } : null;
  }).filter(Boolean);
  const actions = filestore.readActions(workspacePath);
  const actionsPayload = actions.map((a) => ({ id: a.id, name: a.name, withValue: a.withValue }));

  if (pages.length === 0 && endpoints.length === 0) {
    throw new Error('Select at least one page or endpoint.');
  }

  let systemPrompt = SYSTEM_PROMPT_SELECTION;
  if (customPrompt && customPrompt.trim()) {
    systemPrompt += `\n\nAdditional instructions:\n${customPrompt.trim()}`;
  }
  const userPrompt = `Pages: ${JSON.stringify(pages)}\nEndpoints: ${JSON.stringify(endpoints)}\nActions: ${JSON.stringify(actionsPayload)}`;
  const apiUrl = config.apiBaseUrl.endsWith('/chat/completions')
    ? config.apiBaseUrl
    : `${config.apiBaseUrl.replace(/\/$/, '')}/chat/completions`;
  assertHttpsRequestUrl(apiUrl, 'LLM API URL');

  let content = await streamChatCompletion(
    apiUrl,
    config,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { response_format: { type: 'json_object' } }
  );
  if (!content) throw new Error('Empty response from LLM');
  content = content.trim();
  if (content.startsWith('```json')) content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  if (content.startsWith('```')) content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(content);
  const uiTests = Array.isArray(parsed.ui_tests) ? parsed.ui_tests : [];
  const apiTests = Array.isArray(parsed.api_tests) ? parsed.api_tests : [];
  const created = [];
  for (const t of uiTests) {
    const test = filestore.createTest(workspacePath, { title: t.title || 'UI Test', type: 'ui', pageId: t.pageId || pages[0]?.pageId });
    const steps = (t.steps || []).map((s) => ({ pageId: s.pageId || t.pageId, webElementId: s.webElementId, actionId: s.actionId, value: s.value ?? '' }));
    filestore.updateTest(workspacePath, test.id, { steps });
    created.push({ id: test.id, title: test.title, type: 'ui' });
  }
  for (const t of apiTests) {
    const test = filestore.createTest(workspacePath, { title: t.title || 'API Test', type: 'api', pageId: null });
    filestore.updateTest(workspacePath, test.id, { steps: t.steps || [] });
    created.push({ id: test.id, title: test.title, type: 'api' });
  }
  return created;
}

module.exports = { generateTestsWithAI, generateFromSelection };
