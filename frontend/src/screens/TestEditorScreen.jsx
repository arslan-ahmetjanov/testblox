import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Typography,
  Paper,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const BODY_PREVIEW_LEN = 100;
const AUTH_STEP_OPTIONS = [{ value: '', label: 'Use endpoint default' }, { value: 'bearer', label: 'Bearer Token' }, { value: 'basic', label: 'Basic Auth' }];

function queryRows(step) {
  const q = step.query && typeof step.query === 'object' ? step.query : {};
  const arr = Object.entries(q).map(([k, v]) => ({ key: k, value: v != null ? String(v) : '' }));
  return arr.length ? arr : [{ key: '', value: '' }];
}
function headerRows(step) {
  const h = step.headers && typeof step.headers === 'object' ? step.headers : {};
  const arr = Object.entries(h).map(([k, v]) => ({ key: k, value: v != null ? String(v) : '' }));
  return arr.length ? arr : [{ key: '', value: '' }];
}

export default function TestEditorScreen({ testId, onBack, onRefresh, onOpenRun, onViewReport }) {
  const [test, setTest] = useState(null);
  const [page, setPage] = useState(null);
  const [allPages, setAllPages] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [apiBases, setApiBases] = useState([]);
  const [sharedSteps, setSharedSteps] = useState([]);
  const [actions, setActions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [runInProgress, setRunInProgress] = useState(false);
  const [runProgressMessage, setRunProgressMessage] = useState('');
  const [runResultModalOpen, setRunResultModalOpen] = useState(false);
  const [runReport, setRunReport] = useState(null);
  const [runError, setRunError] = useState(null);
  const [bodyModalOpen, setBodyModalOpen] = useState(false);
  const [bodyModalStepIndex, setBodyModalStepIndex] = useState(null);
  const [bodyModalValue, setBodyModalValue] = useState('');

  useEffect(() => {
    if (!testId || !window.electronAPI) return;
    window.electronAPI.getTest(testId).then(setTest).catch(() => setTest(null));
  }, [testId]);

  useEffect(() => {
    if (!test?.pageId || !window.electronAPI) return;
    window.electronAPI.getPage(test.pageId).then(setPage).catch(() => setPage(null));
  }, [test?.pageId]);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.listPages().then(setAllPages).catch(() => setAllPages([]));
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.listEndpoints().then(setEndpoints).catch(() => setEndpoints([]));
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.listApiBases?.().then(setApiBases).catch(() => setApiBases([]));
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.listSharedSteps().then(setSharedSteps).catch(() => setSharedSteps([]));
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getActions().then((list) => setActions(list || [])).catch(() => setActions([]));
  }, []);

  useEffect(() => {
    if (!runInProgress || !window.electronAPI?.onTestRunProgress) return;
    const unsub = window.electronAPI.onTestRunProgress((e) => setRunProgressMessage(e?.message || 'Running...'));
    return () => unsub?.();
  }, [runInProgress]);

  const steps = test?.steps || [];
  const elements = page?.webElements || [];
  const elementsWithPage =
    (allPages || []).length > 0
      ? (allPages || []).flatMap((p) =>
          (p.webElements || []).map((el) => ({ ...el, pageId: p.id, pageTitle: p.title || p.url || p.id }))
        )
      : (page ? (page.webElements || []).map((el) => ({ ...el, pageId: page.id, pageTitle: page.title || page.url || page.id })) : []);
  const elementOptionValue = (pageId, webElementId) => (pageId && webElementId ? `${pageId}|${webElementId}` : webElementId || '');
  const parseElementValue = (v) => {
    if (!v || typeof v !== 'string') return { pageId: test?.pageId, webElementId: '' };
    const idx = v.indexOf('|');
    if (idx > 0) return { pageId: v.slice(0, idx), webElementId: v.slice(idx + 1) };
    return { pageId: test?.pageId, webElementId: v };
  };

  const handleTitleChange = (title) => {
    setTest((t) => (t ? { ...t, title } : null));
  };

  const handleSaveTitle = async () => {
    if (!testId || !test) return;
    setSaving(true);
    try {
      await window.electronAPI.updateTest(testId, { title: test.title });
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const isApiTest = test?.type === 'api';

  /** Step is API if type is 'api' or legacy request/assertStatus/assertBody */
  const isStepApi = (step) =>
    step.type === 'api' || ['request', 'assertStatus', 'assertBody'].includes(step.type);
  const getStepApiAction = (step) =>
    step.type === 'api' ? (step.actionId || 'request') : step.type;

  const handleAddUiStep = () => {
    const defaultPageId = test?.pageId || allPages[0]?.id;
    const firstEl = elements[0] || elementsWithPage[0];
    const newStep = {
      type: 'ui',
      pageId: defaultPageId,
      webElementId: firstEl?.id || '',
      actionId: actions[0]?.id || '',
      value: '',
    };
    setTest((t) => (t ? { ...t, steps: [...(t.steps || []), newStep] } : null));
  };

  const handleAddApiStep = (action) => {
    const newStep =
      action === 'request'
        ? { type: 'api', actionId: 'request', endpointId: endpoints[0]?.id || '', body: '{}' }
        : action === 'assertStatus'
          ? { type: 'api', actionId: 'assertStatus', value: '200' }
          : { type: 'api', actionId: 'assertBody', jsonPath: '', value: '' };
    setTest((t) => (t ? { ...t, steps: [...(t.steps || []), newStep] } : null));
  };

  const handleAddSharedStep = (sharedStepId) => {
    if (!sharedStepId) return;
    setTest((t) => (t ? { ...t, steps: [...(t.steps || []), { sharedStepId }] } : null));
  };

  const handleStepChange = (index, field, value) => {
    setTest((t) => {
      if (!t) return null;
      const s = [...(t.steps || [])];
      if (!s[index]) return t;
      if (field === 'element') {
        const { pageId, webElementId } = parseElementValue(value);
        s[index] = { ...s[index], pageId, webElementId };
      } else {
        s[index] = { ...s[index], [field]: value };
      }
      return { ...t, steps: s };
    });
  };

  const handleApiStepChange = (index, field, value) => {
    setTest((t) => {
      if (!t) return null;
      const s = [...(t.steps || [])];
      if (!s[index]) return t;
      s[index] = { ...s[index], [field]: value };
      return { ...t, steps: s };
    });
  };

  const handleRemoveStep = (index) => {
    setTest((t) => {
      if (!t) return null;
      const s = (t.steps || []).filter((_, i) => i !== index);
      return { ...t, steps: s };
    });
  };

  const handleMoveStep = (index, direction) => {
    setTest((t) => {
      if (!t) return null;
      const s = [...(t.steps || [])];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= s.length) return t;
      const [item] = s.splice(index, 1);
      s.splice(newIndex, 0, item);
      return { ...t, steps: s };
    });
  };

  const handleSaveSteps = async () => {
    if (!testId || !test) return;
    setSaving(true);
    try {
      const stepsToSave = (test.steps || []).map((s) => {
        if (s.sharedStepId) return s;
        if (isStepApi(s)) return s;
        return { ...s, type: 'ui', pageId: s.pageId || test.pageId };
      });
      await window.electronAPI.updateTest(testId, { steps: stepsToSave });
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunInProgress(true);
    setRunProgressMessage('Starting...');
    setRunReport(null);
    setRunError(null);
    try {
      const report = await window.electronAPI.runTest(testId);
      setRunReport(report || null);
      setRunResultModalOpen(true);
    } catch (e) {
      setRunError(e.message || 'Run failed');
      setRunResultModalOpen(true);
    } finally {
      setRunInProgress(false);
    }
  };

  const handleDeleteTest = async () => {
    setDeleteLoading(true);
    try {
      await window.electronAPI.deleteTest(testId);
      setDeleteConfirmOpen(false);
      onBack?.();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!test) {
    return (
      <Box sx={{ p: 2, color: 'text.secondary' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'primary.main', mb: 2 }}>Back</Button>
        <Typography>Test not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'primary.main' }}>Back</Button>
        <TextField
          size="small"
          value={test.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={handleSaveTitle}
          sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
        />
        <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={handleRun} disabled={runInProgress} sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>
          {runInProgress ? 'Running…' : 'Run'}
        </Button>
        <Button size="small" startIcon={<DeleteOutlineIcon />} onClick={() => setDeleteConfirmOpen(true)} sx={{ color: 'error.main' }}>
          Delete test
        </Button>
      </Box>
      {runInProgress && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{runProgressMessage}</Typography>
          <LinearProgress />
        </Box>
      )}

      <Dialog open={runResultModalOpen} onClose={() => setRunResultModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'text.primary' }}>{runError ? 'Run failed' : (runReport?.testTitle || test.title)}</DialogTitle>
        <DialogContent>
          {runError && <Typography sx={{ color: 'error.main' }}>{runError}</Typography>}
          {runReport && !runError && (
            <>
              <Typography sx={{ color: runReport.status === 'passed' ? 'success.main' : 'error.main', mb: 2 }}>
                Status: {runReport.status || '—'} {runReport.executionTime != null && `(${runReport.executionTime}ms)`}
              </Typography>
              <Typography variant="overline" sx={{ color: 'primary.main' }}>Steps</Typography>
              <List dense>
                {(runReport.steps || []).map((step, i) => (
                  <ListItem key={i}>
                    <ListItemText primary={step.value != null ? step.value : `Step ${i + 1}`} secondary={step.error || step.status} primaryTypographyProps={{ sx: { color: 'text.primary' } }} secondaryTypographyProps={{ sx: { color: step.error ? 'error.main' : 'text.secondary' } }} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunResultModalOpen(false)} sx={{ color: 'text.secondary' }}>Close</Button>
          {runReport?.id && onViewReport && <Button onClick={() => { onViewReport(runReport.id); setRunResultModalOpen(false); }} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>View full report</Button>}
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => !deleteLoading && setDeleteConfirmOpen(false)} PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'text.primary' }}>Delete test</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary' }}>Delete test &quot;{test.title}&quot;?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleDeleteTest} disabled={deleteLoading} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bodyModalOpen} onClose={() => setBodyModalOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'text.primary' }}>Edit request body</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={16}
            maxRows={32}
            value={bodyModalValue}
            onChange={(e) => setBodyModalValue(e.target.value)}
            placeholder='{"key": "value"}'
            sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.875rem', '& .MuiOutlinedInput-root': { color: 'text.primary', alignItems: 'flex-start' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBodyModalOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (bodyModalStepIndex != null && test?.steps?.[bodyModalStepIndex]) {
                handleApiStepChange(bodyModalStepIndex, 'body', bodyModalValue);
              }
              setBodyModalOpen(false);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {!isApiTest && <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Page: {page?.title || test.pageId}</Typography>}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="overline" sx={{ color: 'primary.main' }}>Steps</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddUiStep} sx={{ color: 'primary.main' }}>Add UI step</Button>
            <Select
              size="small"
              displayEmpty
              value=""
              onChange={(e) => { const v = e.target.value; if (v) handleAddApiStep(v); e.target.value = ''; }}
              sx={{ minWidth: 160, color: 'text.primary', '.MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
              renderValue={() => 'Add API step…'}
            >
              <MenuItem value="request">Request</MenuItem>
              <MenuItem value="assertStatus">Assert status</MenuItem>
              <MenuItem value="assertBody">Assert body</MenuItem>
            </Select>
            {sharedSteps.length > 0 && (
              <Select
                size="small"
                displayEmpty
                value=""
                onChange={(e) => { handleAddSharedStep(e.target.value); e.target.value = ''; }}
                sx={{ minWidth: 160, color: 'text.primary', '.MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
              >
                <MenuItem value="" disabled>Add shared step…</MenuItem>
                {sharedSteps.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>
                ))}
              </Select>
            )}
            <Button size="small" variant="outlined" onClick={handleSaveSteps} disabled={saving} sx={{ color: 'primary.main' }}>Save</Button>
          </Box>
        </Box>
        <List dense>
          {steps.length === 0 && (
            <ListItem>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No steps. Add a step and save.</Typography>
            </ListItem>
          )}
          {steps.map((step, index) => {
            if (step.sharedStepId) {
              const shared = sharedSteps.find((s) => s.id === step.sharedStepId);
              return (
                <ListItem key={index} sx={{ alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 24 }}>{index + 1}.</Typography>
                  <Chip size="small" label="Shared" color="primary" />
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>{shared?.title || step.sharedStepId}</Typography>
                  <IconButton size="small" onClick={() => handleMoveStep(index, -1)} sx={{ color: 'text.secondary' }}><ArrowUpwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleMoveStep(index, 1)} sx={{ color: 'text.secondary' }}><ArrowDownwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleRemoveStep(index)} sx={{ color: 'text.secondary' }}><DeleteIcon /></IconButton>
                </ListItem>
              );
            }
            if (isStepApi(step)) {
              const apiAction = getStepApiAction(step);
              const endpointId = step.endpointId ?? step.targetId ?? '';
              const stepBaseId = step.baseId ?? '';
              return (
                <ListItem key={index} sx={{ alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 24 }}>{index + 1}.</Typography>
                  <Chip size="small" label="API" color="primary" />
                  {apiAction === 'request' && (
                    <>
                      <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel sx={{ color: 'text.secondary' }}>Target (Endpoint)</InputLabel>
                        <Select
                          value={endpointId}
                          onChange={(e) => handleApiStepChange(index, 'endpointId', e.target.value)}
                          label="Target (Endpoint)"
                          sx={{ color: 'text.primary' }}
                        >
                          {endpoints.map((ep) => (
                            <MenuItem key={ep.id} value={ep.id}>{ep.method} {ep.path}</MenuItem>
                          ))}
                          {endpoints.length === 0 && <MenuItem value="">— No endpoints —</MenuItem>}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel sx={{ color: 'text.secondary' }}>Base</InputLabel>
                        <Select
                          value={stepBaseId}
                          onChange={(e) => handleApiStepChange(index, 'baseId', e.target.value || null)}
                          label="Base"
                          sx={{ color: 'text.primary' }}
                        >
                          <MenuItem value="">— Use endpoint default —</MenuItem>
                          {apiBases.map((b) => (
                            <MenuItem key={b.id} value={b.id}>{b.title || b.baseUrl || b.id}</MenuItem>
                          ))}
                          {apiBases.length === 0 && <MenuItem value="" disabled>— No bases —</MenuItem>}
                        </Select>
                      </FormControl>
                    </>
                  )}
                  {apiAction !== 'request' && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', alignSelf: 'center' }}>Target: previous response</Typography>
                  )}
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel sx={{ color: 'text.secondary' }}>Action</InputLabel>
                    <Select
                      value={apiAction}
                      onChange={(e) => handleApiStepChange(index, 'actionId', e.target.value)}
                      label="Action"
                      sx={{ color: 'text.primary' }}
                    >
                      <MenuItem value="request">Request</MenuItem>
                      <MenuItem value="assertStatus">Assert status</MenuItem>
                      <MenuItem value="assertBody">Assert body</MenuItem>
                    </Select>
                  </FormControl>
                  {apiAction === 'request' && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 200, flex: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 120 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Body (JSON)</Typography>
                          <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 48, overflow: 'hidden', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'action.hover' }}>
                            {(typeof step.body === 'string' ? step.body : (step.body ? JSON.stringify(step.body, null, 2) : '{}')).slice(0, BODY_PREVIEW_LEN)}
                            {((typeof step.body === 'string' ? step.body : (step.body ? JSON.stringify(step.body) : '{}')).length > BODY_PREVIEW_LEN) ? '…' : ''}
                          </Box>
                        </Box>
                        <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => { setBodyModalStepIndex(index); setBodyModalValue(typeof step.body === 'string' ? step.body : (step.body ? JSON.stringify(step.body, null, 2) : '{}')); setBodyModalOpen(true); }} sx={{ color: 'primary.main', alignSelf: 'flex-end' }}>Open in window</Button>
                      </Box>
                      <Accordion disableGutters sx={{ width: '100%', bgcolor: 'transparent', boxShadow: 'none', '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { color: 'text.primary' } }}><Typography variant="caption">Query, Headers, Auth</Typography></AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Query parameters</Typography>
                          {queryRows(step).map((row, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                              <TextField size="small" placeholder="Key" value={row.key} onChange={(e) => { const v = e.target.value; const rows = queryRows(step); const next = {}; rows.forEach((r, j) => { const k = j === i ? v : r.key; const val = j === i ? row.value : r.value; if (k != null && String(k).trim() !== '') next[String(k).trim()] = val; }); handleApiStepChange(index, 'query', next); }} sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
                              <TextField size="small" placeholder="Value" value={row.value} onChange={(e) => { const v = e.target.value; const rows = queryRows(step); const next = {}; rows.forEach((r, j) => { const k = r.key; const val = j === i ? v : r.value; if (k != null && String(k).trim() !== '') next[String(k).trim()] = val; }); handleApiStepChange(index, 'query', next); }} sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
                              <IconButton size="small" onClick={() => { const rows = queryRows(step).filter((_, j) => j !== i); const next = rows.length ? rows.reduce((o, r) => ({ ...o, [r.key]: r.value }), {}) : {}; handleApiStepChange(index, 'query', next); }} sx={{ color: 'text.secondary' }}><DeleteIcon fontSize="small" /></IconButton>
                            </Box>
                          ))}
                          <Button size="small" startIcon={<AddIcon />} onClick={() => handleApiStepChange(index, 'query', { ...(step.query || {}), '': '' })} sx={{ color: 'primary.main', mt: 0.5 }}>Add query param</Button>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1, mb: 0.5 }}>Headers</Typography>
                          {headerRows(step).map((row, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                              <TextField size="small" placeholder="Header" value={row.key} onChange={(e) => { const v = e.target.value; const rows = headerRows(step); const next = {}; rows.forEach((r, j) => { const k = j === i ? v : r.key; const val = j === i ? row.value : r.value; if (k != null && String(k).trim() !== '') next[String(k).trim()] = val; }); handleApiStepChange(index, 'headers', next); }} sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
                              <TextField size="small" placeholder="Value" value={row.value} onChange={(e) => { const v = e.target.value; const rows = headerRows(step); const next = {}; rows.forEach((r, j) => { const k = r.key; const val = j === i ? v : r.value; if (k != null && String(k).trim() !== '') next[String(k).trim()] = val; }); handleApiStepChange(index, 'headers', next); }} sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
                              <IconButton size="small" onClick={() => { const rows = headerRows(step).filter((_, j) => j !== i); const next = rows.length ? rows.reduce((o, r) => ({ ...o, [r.key]: r.value }), {}) : {}; handleApiStepChange(index, 'headers', next); }} sx={{ color: 'text.secondary' }}><DeleteIcon fontSize="small" /></IconButton>
                            </Box>
                          ))}
                          <Button size="small" startIcon={<AddIcon />} onClick={() => handleApiStepChange(index, 'headers', { ...(step.headers || {}), '': '' })} sx={{ color: 'primary.main', mt: 0.5 }}>Add header</Button>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1, mb: 0.5 }}>Auth override</Typography>
                          <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}>
                            <Select value={(step.auth && (step.auth.type === 'bearer' || step.auth.type === 'basic')) ? step.auth.type : ''} onChange={(e) => { const v = e.target.value; handleApiStepChange(index, 'auth', v ? (v === 'bearer' ? { type: 'bearer', token: '' } : { type: 'basic', username: '', password: '' }) : null); }} displayEmpty sx={{ color: 'text.primary' }}>
                              {AUTH_STEP_OPTIONS.map((o) => (<MenuItem key={o.value || 'default'} value={o.value}>{o.label}</MenuItem>))}
                            </Select>
                          </FormControl>
                          {step.auth?.type === 'bearer' && (
                            <TextField size="small" fullWidth placeholder="Token (use {{var}})" type="password" value={step.auth.token ?? ''} onChange={(e) => handleApiStepChange(index, 'auth', { type: 'bearer', token: e.target.value })} sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
                          )}
                          {step.auth?.type === 'basic' && (
                            <Box sx={{ mt: 0.5 }}>
                              <TextField size="small" fullWidth placeholder="Username" value={step.auth.username ?? ''} onChange={(e) => handleApiStepChange(index, 'auth', { ...step.auth, username: e.target.value })} sx={{ mb: 0.5, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
                              <TextField size="small" fullWidth placeholder="Password" type="password" value={step.auth.password ?? ''} onChange={(e) => handleApiStepChange(index, 'auth', { ...step.auth, password: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    </>
                  )}
                  {apiAction === 'assertStatus' && (
                    <TextField
                      size="small"
                      label="Value (expected status)"
                      value={step.value ?? '200'}
                      onChange={(e) => handleApiStepChange(index, 'value', e.target.value)}
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
                        onChange={(e) => handleApiStepChange(index, 'jsonPath', e.target.value)}
                        sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                      />
                      <TextField
                        size="small"
                        label="Expected value"
                        value={step.value ?? ''}
                        onChange={(e) => handleApiStepChange(index, 'value', e.target.value)}
                        sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                      />
                    </>
                  )}
                  <IconButton size="small" onClick={() => handleMoveStep(index, -1)} sx={{ color: 'text.secondary' }}><ArrowUpwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleMoveStep(index, 1)} sx={{ color: 'text.secondary' }}><ArrowDownwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleRemoveStep(index)} sx={{ color: 'text.secondary' }}><DeleteIcon /></IconButton>
                </ListItem>
              );
            }
            const action = actions.find((a) => a.id === step.actionId);
            const needsValue = action?.withValue;
            return (
              <ListItem key={index} sx={{ alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 24 }}>{index + 1}.</Typography>
                <Chip size="small" label="UI" color="success" />
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel sx={{ color: 'text.secondary' }}>Target (Element)</InputLabel>
                  <Select
                    value={elementOptionValue(step.pageId || test.pageId, step.webElementId)}
                    onChange={(e) => handleStepChange(index, 'element', e.target.value)}
                    label="Target (Element)"
                    sx={{ color: 'text.primary' }}
                  >
                    {elementsWithPage.map((el) => (
                      <MenuItem key={`${el.pageId}-${el.id}`} value={elementOptionValue(el.pageId, el.id)}>
                        {el.pageTitle} — {el.title || el.selector}
                      </MenuItem>
                    ))}
                    {elementsWithPage.length === 0 && <MenuItem value="">— No elements —</MenuItem>}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel sx={{ color: 'text.secondary' }}>Action</InputLabel>
                  <Select
                    value={step.actionId || ''}
                    onChange={(e) => handleStepChange(index, 'actionId', e.target.value)}
                    label="Action"
                    sx={{ color: 'text.primary' }}
                  >
                    {actions.map((a) => (
                      <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {needsValue && (
                  <TextField
                    size="small"
                    placeholder="Value (use {{var}})"
                    value={step.value ?? ''}
                    onChange={(e) => handleStepChange(index, 'value', e.target.value)}
                    sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                  />
                )}
                <IconButton size="small" onClick={() => handleMoveStep(index, -1)} sx={{ color: 'text.secondary' }}><ArrowUpwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => handleMoveStep(index, 1)} sx={{ color: 'text.secondary' }}><ArrowDownwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => handleRemoveStep(index)} sx={{ color: 'text.secondary' }}><DeleteIcon /></IconButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
}
