import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Typography,
  Paper,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import {
  AUTH_STEP_OPTIONS,
  BODY_PREVIEW_LEN,
  bodyStringForPreview,
  getStepApiAction,
  getStepSummaryLine,
  headerRows,
  isStepApi,
  queryRows,
} from '../utils/testSteps';

export default function TestStepEditorCards({
  variant = 'test',
  steps,
  sharedCatalog = [],
  pages = [],
  elementsWithPage,
  defaultPageId,
  testPageId,
  endpoints,
  apiBases,
  actions,
  onStepChange,
  onApiStepChange,
  onRemoveStep,
  onMoveStep,
  onOpenBodyModal,
}) {
  const [apiExpanded, setApiExpanded] = useState(() => ({}));
  const [uiExpanded, setUiExpanded] = useState(() => ({}));

  const toggleApiDetails = (index) => {
    setApiExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleUiDetails = (index) => {
    setUiExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const summaryCtx = {
    sharedCatalog,
    elementsWithPage,
    actions,
    endpoints,
    pages,
    defaultPageId: defaultPageId || testPageId,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {steps.map((step, index) => {
        if (step.sharedStepId) {
          const shared = sharedCatalog.find((s) => s.id === step.sharedStepId);
          return (
            <Paper
              key={`step-${index}`}
              variant="outlined"
              sx={{
                p: 1.5,
                borderColor: 'divider',
                borderLeftWidth: 4,
                borderLeftColor: 'primary.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Step {index + 1}
                </Typography>
                <Chip size="small" label="Shared" color="primary" />
                <Typography variant="body2" sx={{ color: 'text.primary', flex: 1, minWidth: 120 }}>
                  {shared?.title || step.sharedStepId}
                </Typography>
                <IconButton size="small" onClick={() => onMoveStep(index, -1)} sx={{ color: 'text.secondary' }}>
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onMoveStep(index, 1)} sx={{ color: 'text.secondary' }}>
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onRemoveStep(index)} sx={{ color: 'text.secondary' }}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          );
        }

        if (isStepApi(step)) {
          const apiAction = getStepApiAction(step);
          const endpointId = step.endpointId ?? step.targetId ?? '';
          const stepBaseId = step.baseId ?? '';
          const isRequest = apiAction === 'request';
          const expanded = apiExpanded[index] ?? false;
          const summary = getStepSummaryLine(step, summaryCtx);

          return (
            <Paper
              key={`step-${index}`}
              variant="outlined"
              sx={{
                p: 1.5,
                borderColor: 'divider',
                borderLeftWidth: 4,
                borderLeftColor: 'primary.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: isRequest ? 1 : 0 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Step {index + 1}
                    </Typography>
                    <Chip size="small" label="API" color="primary" />
                    <Typography variant="body2" sx={{ color: 'text.primary', flex: 1, minWidth: 160 }}>
                      {summary}
                    </Typography>
                    {isRequest && (
                      <Button
                        size="small"
                        endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
                        onClick={() => toggleApiDetails(index)}
                        sx={{ color: 'primary.main', textTransform: 'none' }}
                      >
                        {expanded ? 'Hide details' : 'Edit request'}
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => onMoveStep(index, -1)} sx={{ color: 'text.secondary' }}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => onMoveStep(index, 1)} sx={{ color: 'text.secondary' }}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => onRemoveStep(index)} sx={{ color: 'text.secondary' }}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  {!isRequest && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Target: previous response
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel sx={{ color: 'text.secondary' }}>Action</InputLabel>
                        <Select
                          value={apiAction}
                          onChange={(e) => onApiStepChange(index, 'actionId', e.target.value)}
                          label="Action"
                          sx={{ color: 'text.primary' }}
                        >
                          <MenuItem value="request">Request</MenuItem>
                          <MenuItem value="assertStatus">Assert status</MenuItem>
                          <MenuItem value="assertBody">Assert body</MenuItem>
                        </Select>
                      </FormControl>
                      {apiAction === 'assertStatus' && (
                        <TextField
                          size="small"
                          label="Value (expected status)"
                          value={step.value ?? '200'}
                          onChange={(e) => onApiStepChange(index, 'value', e.target.value)}
                          sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                        />
                      )}
                      {apiAction === 'assertBody' && (
                        <>
                          <TextField
                            size="small"
                            label="JSON path"
                            placeholder="data.id"
                            value={step.jsonPath ?? ''}
                            onChange={(e) => onApiStepChange(index, 'jsonPath', e.target.value)}
                            sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                          />
                          <TextField
                            size="small"
                            label="Expected value"
                            value={step.value ?? ''}
                            onChange={(e) => onApiStepChange(index, 'value', e.target.value)}
                            sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                          />
                        </>
                      )}
                    </Box>
                  )}

                  <Collapse in={isRequest && expanded} timeout="auto" unmountOnExit={false}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start' }}>
                        <FormControl size="small" sx={{ minWidth: variant === 'shared' ? 180 : 200 }}>
                          <InputLabel sx={{ color: 'text.secondary' }}>Base</InputLabel>
                          <Select
                            value={stepBaseId}
                            onChange={(e) => onApiStepChange(index, 'baseId', e.target.value || null)}
                            label="Base"
                            sx={{ color: 'text.primary' }}
                          >
                            <MenuItem value="">— Use endpoint default —</MenuItem>
                            {apiBases.map((b) => (
                              <MenuItem key={b.id} value={b.id}>
                                {b.title || b.baseUrl || b.id}
                              </MenuItem>
                            ))}
                            {apiBases.length === 0 && (
                              <MenuItem value="" disabled>
                                — No bases —
                              </MenuItem>
                            )}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: variant === 'shared' ? 200 : 220 }}>
                          <InputLabel sx={{ color: 'text.secondary' }}>
                            {variant === 'shared' ? 'Endpoint' : 'Target (Endpoint)'}
                          </InputLabel>
                          <Select
                            value={endpointId}
                            onChange={(e) => onApiStepChange(index, 'endpointId', e.target.value)}
                            label={variant === 'shared' ? 'Endpoint' : 'Target (Endpoint)'}
                            sx={{ color: 'text.primary' }}
                          >
                            {endpoints.map((ep) => (
                              <MenuItem key={ep.id} value={ep.id}>
                                {ep.method} {ep.path}
                              </MenuItem>
                            ))}
                            {endpoints.length === 0 && <MenuItem value="">— No endpoints —</MenuItem>}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel sx={{ color: 'text.secondary' }}>Action</InputLabel>
                          <Select
                            value={apiAction}
                            onChange={(e) => onApiStepChange(index, 'actionId', e.target.value)}
                            label="Action"
                            sx={{ color: 'text.primary' }}
                          >
                            <MenuItem value="request">Request</MenuItem>
                            <MenuItem value="assertStatus">Assert status</MenuItem>
                            <MenuItem value="assertBody">Assert body</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 120 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                            Body (JSON)
                          </Typography>
                          <Box
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              color: 'text.secondary',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              maxHeight: 48,
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              p: 1,
                              bgcolor: 'action.hover',
                            }}
                          >
                            {bodyStringForPreview(step).slice(0, BODY_PREVIEW_LEN)}
                            {bodyStringForPreview(step).length > BODY_PREVIEW_LEN ? '…' : ''}
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => onOpenBodyModal(index, bodyStringForPreview(step))}
                          sx={{ color: 'primary.main', alignSelf: 'flex-end' }}
                        >
                          Open in window
                        </Button>
                      </Box>
                      <Accordion
                        disableGutters
                        sx={{
                          bgcolor: 'transparent',
                          boxShadow: 'none',
                          '&:before': { display: 'none' },
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}>
                          <Typography variant="caption" sx={{ color: 'text.primary' }}>
                            Query, Headers, Auth
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                            Query parameters
                          </Typography>
                          {queryRows(step).map((row, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                              <TextField
                                size="small"
                                placeholder="Key"
                                value={row.key}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const rows = queryRows(step);
                                  const next = {};
                                  rows.forEach((r, j) => {
                                    const k = j === i ? v : r.key;
                                    const val = j === i ? row.value : r.value;
                                    if (k != null && String(k).trim() !== '') next[String(k).trim()] = val;
                                  });
                                  onApiStepChange(index, 'query', next);
                                }}
                                sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                              />
                              <TextField
                                size="small"
                                placeholder="Value"
                                value={row.value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const rows = queryRows(step);
                                  const next = {};
                                  rows.forEach((r, j) => {
                                    const k = r.key;
                                    const val = j === i ? v : r.value;
                                    if (k != null && String(k).trim() !== '') next[String(k).trim()] = val;
                                  });
                                  onApiStepChange(index, 'query', next);
                                }}
                                sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const rows = queryRows(step).filter((_, j) => j !== i);
                                  const next = rows.length ? rows.reduce((o, r) => ({ ...o, [r.key]: r.value }), {}) : {};
                                  onApiStepChange(index, 'query', next);
                                }}
                                sx={{ color: 'text.secondary' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => onApiStepChange(index, 'query', { ...(step.query || {}), '': '' })}
                            sx={{ color: 'primary.main', mt: 0.5 }}
                          >
                            Add query param
                          </Button>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1, mb: 0.5 }}>
                            Headers
                          </Typography>
                          {headerRows(step).map((row, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                              <TextField
                                size="small"
                                placeholder="Header"
                                value={row.key}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const rows = headerRows(step);
                                  const next = {};
                                  rows.forEach((r, j) => {
                                    const k = j === i ? v : r.key;
                                    const val = j === i ? row.value : r.value;
                                    if (k != null && String(k).trim() !== '') next[String(k).trim()] = val;
                                  });
                                  onApiStepChange(index, 'headers', next);
                                }}
                                sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                              />
                              <TextField
                                size="small"
                                placeholder="Value"
                                value={row.value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const rows = headerRows(step);
                                  const next = {};
                                  rows.forEach((r, j) => {
                                    const k = r.key;
                                    const val = j === i ? v : r.value;
                                    if (k != null && String(k).trim() !== '') next[String(k).trim()] = val;
                                  });
                                  onApiStepChange(index, 'headers', next);
                                }}
                                sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const rows = headerRows(step).filter((_, j) => j !== i);
                                  const next = rows.length ? rows.reduce((o, r) => ({ ...o, [r.key]: r.value }), {}) : {};
                                  onApiStepChange(index, 'headers', next);
                                }}
                                sx={{ color: 'text.secondary' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => onApiStepChange(index, 'headers', { ...(step.headers || {}), '': '' })}
                            sx={{ color: 'primary.main', mt: 0.5 }}
                          >
                            Add header
                          </Button>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1, mb: 0.5 }}>
                            Auth override
                          </Typography>
                          <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}>
                            <Select
                              value={step.auth && (step.auth.type === 'bearer' || step.auth.type === 'basic') ? step.auth.type : ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                onApiStepChange(
                                  index,
                                  'auth',
                                  v ? (v === 'bearer' ? { type: 'bearer', token: '' } : { type: 'basic', username: '', password: '' }) : null
                                );
                              }}
                              displayEmpty
                              sx={{ color: 'text.primary' }}
                            >
                              {AUTH_STEP_OPTIONS.map((o) => (
                                <MenuItem key={o.value || 'default'} value={o.value}>
                                  {o.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {step.auth?.type === 'bearer' && (
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Token (use {{var}})"
                              type="password"
                              value={step.auth.token ?? ''}
                              onChange={(e) => onApiStepChange(index, 'auth', { type: 'bearer', token: e.target.value })}
                              sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                            />
                          )}
                          {step.auth?.type === 'basic' && (
                            <Box sx={{ mt: 0.5 }}>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="Username"
                                value={step.auth.username ?? ''}
                                onChange={(e) => onApiStepChange(index, 'auth', { ...step.auth, username: e.target.value })}
                                sx={{ mb: 0.5, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                              />
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="Password"
                                type="password"
                                value={step.auth.password ?? ''}
                                onChange={(e) => onApiStepChange(index, 'auth', { ...step.auth, password: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                              />
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  </Collapse>
                </Box>
              </Box>
            </Paper>
          );
        }

        const action = actions.find((a) => a.id === step.actionId);
        const needsValue = action?.withValue;
        const uiSummary = getStepSummaryLine(step, summaryCtx);
        const resolvedPageId = step.pageId || defaultPageId || testPageId || pages[0]?.id || '';
        const elementsOnPage = elementsWithPage.filter((el) => el.pageId === resolvedPageId);
        const uiDetailsOpen = uiExpanded[index] ?? false;

        return (
          <Paper
            key={`step-${index}`}
            variant="outlined"
            sx={{
              p: 1.5,
              borderColor: 'divider',
              borderLeftWidth: 4,
              borderLeftColor: 'success.main',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: uiDetailsOpen ? 1 : 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Step {index + 1}
                  </Typography>
                  <Chip size="small" label="UI" color="success" />
                  <Typography variant="body2" sx={{ color: 'text.primary', flex: 1, minWidth: 160 }}>
                    {uiSummary}
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ExpandMoreIcon sx={{ transform: uiDetailsOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
                    onClick={() => toggleUiDetails(index)}
                    sx={{ color: 'primary.main', textTransform: 'none' }}
                  >
                    {uiDetailsOpen ? 'Hide details' : 'Edit step'}
                  </Button>
                  <IconButton size="small" onClick={() => onMoveStep(index, -1)} sx={{ color: 'text.secondary' }}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onMoveStep(index, 1)} sx={{ color: 'text.secondary' }}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onRemoveStep(index)} sx={{ color: 'text.secondary' }}>
                    <DeleteIcon />
                  </IconButton>
                </Box>

                <Collapse in={uiDetailsOpen} timeout="auto" unmountOnExit={false}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start', pt: 0.5 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel sx={{ color: 'text.secondary' }}>Page</InputLabel>
                      <Select
                        value={resolvedPageId || ''}
                        onChange={(e) => onStepChange(index, 'pageId', e.target.value)}
                        label="Page"
                        sx={{ color: 'text.primary' }}
                      >
                        {pages.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.title || p.url || p.id}
                          </MenuItem>
                        ))}
                        {pages.length === 0 && <MenuItem value="">— No pages —</MenuItem>}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: variant === 'shared' ? 200 : 220 }}>
                      <InputLabel sx={{ color: 'text.secondary' }}>
                        {variant === 'shared' ? 'Element' : 'Target (Element)'}
                      </InputLabel>
                      <Select
                        value={step.webElementId || ''}
                        onChange={(e) => onStepChange(index, 'webElementId', e.target.value)}
                        label={variant === 'shared' ? 'Element' : 'Target (Element)'}
                        sx={{ color: 'text.primary' }}
                        disabled={!resolvedPageId}
                      >
                        {elementsOnPage.map((el) => (
                          <MenuItem key={el.id} value={el.id}>
                            {el.title || el.selector}
                          </MenuItem>
                        ))}
                        {elementsOnPage.length === 0 && <MenuItem value="">— No elements on this page —</MenuItem>}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel sx={{ color: 'text.secondary' }}>Action</InputLabel>
                      <Select
                        value={step.actionId || ''}
                        onChange={(e) => onStepChange(index, 'actionId', e.target.value)}
                        label="Action"
                        sx={{ color: 'text.primary' }}
                      >
                        {actions.map((a) => (
                          <MenuItem key={a.id} value={a.id}>
                            {a.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {needsValue && (
                      <TextField
                        size="small"
                        placeholder="Value (use {{var}})"
                        value={step.value ?? ''}
                        onChange={(e) => onStepChange(index, 'value', e.target.value)}
                        sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                      />
                    )}
                  </Box>
                </Collapse>
              </Box>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
