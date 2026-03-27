import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

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

function elementOptionValue(pageId, webElementId) {
  return pageId && webElementId ? `${pageId}|${webElementId}` : webElementId || '';
}

function isStepApi(step) {
  return step.type === 'api' || ['request', 'assertStatus', 'assertBody'].includes(step.type);
}
function getStepApiAction(step) {
  return step.type === 'api' ? (step.actionId || 'request') : step.type;
}

export default function SharedStepsScreen({ onBack, onRefresh }) {
  const [list, setList] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState([]);
  const [allPages, setAllPages] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [apiBases, setApiBases] = useState([]);
  const [actions, setActions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [bodyModalOpen, setBodyModalOpen] = useState(false);
  const [bodyModalStepIndex, setBodyModalStepIndex] = useState(null);
  const [bodyModalValue, setBodyModalValue] = useState('');

  const load = () => {
    if (!window.electronAPI) return;
    window.electronAPI.listSharedSteps().then(setList).catch(() => setList([]));
  };

  useEffect(() => load(), []);
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.listPages().then(setAllPages).catch(() => setAllPages([]));
    window.electronAPI.getActions().then((a) => setActions(a || [])).catch(() => setActions([]));
  }, []);
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.listEndpoints?.().then(setEndpoints).catch(() => setEndpoints([]));
    window.electronAPI.listApiBases?.().then(setApiBases).catch(() => setApiBases([]));
  }, []);

  const elementsWithPage = (allPages || []).flatMap((p) =>
    (p.webElements || []).map((el) => ({ ...el, pageId: p.id, pageTitle: p.title || p.url || p.id }))
  );

  const handleAdd = () => {
    setEditingId(null);
    setTitle('New shared step');
    setSteps([]);
    setEditOpen(true);
  };

  const handleEdit = async (item) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    const full = await window.electronAPI.getSharedStep(item.id).catch(() => null);
    setSteps((full && full.steps) ? full.steps : []);
    setEditOpen(true);
  };

  const handleAddUiStep = () => {
    const first = elementsWithPage[0];
    const pageId = first?.pageId || allPages[0]?.id;
    setSteps((s) => [...s, { pageId, webElementId: first?.id || '', actionId: actions[0]?.id || '', value: '' }]);
  };

  const handleAddApiStep = (apiType) => {
    const base = apiType === 'request' ? { type: apiType, endpointId: endpoints[0]?.id || '', baseId: null, body: '{}' } : { type: apiType, value: apiType === 'assertStatus' ? '200' : '' };
    if (apiType === 'assertBody') base.jsonPath = '';
    setSteps((s) => [...s, base]);
  };

  const handleStepChange = (index, field, value) => {
    if (field === 'element') {
      const idx = value.indexOf('|');
      const pageId = idx > 0 ? value.slice(0, idx) : allPages[0]?.id;
      const webElementId = idx > 0 ? value.slice(idx + 1) : value;
      setSteps((s) => {
        const n = [...s];
        if (n[index]) n[index] = { ...n[index], pageId, webElementId };
        return n;
      });
    } else {
      setSteps((s) => {
        const n = [...s];
        if (n[index]) n[index] = { ...n[index], [field]: value };
        return n;
      });
    }
  };

  const handleApiStepChange = (index, field, value) => {
    setSteps((s) => {
      const n = [...s];
      if (!n[index]) return s;
      if (field === 'actionId') {
        n[index] = { ...n[index], type: 'api', actionId: value };
        return n;
      }
      n[index] = { ...n[index], [field]: value };
      return n;
    });
  };

  const handleRemoveStep = (index) => {
    setSteps((s) => s.filter((_, i) => i !== index));
  };

  const handleMoveStep = (index, direction) => {
    setSteps((s) => {
      const n = [...s];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= n.length) return s;
      const [item] = n.splice(index, 1);
      n.splice(newIndex, 0, item);
      return n;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const stepsToSave = steps.map((s) =>
        isStepApi(s) ? s : { ...s, pageId: s.pageId || allPages[0]?.id }
      );
      if (editingId) {
        await window.electronAPI.updateSharedStep(editingId, { title: title.trim() || 'Untitled', steps: stepsToSave });
      } else {
        await window.electronAPI.createSharedStep({ title: title.trim() || 'Untitled', steps: stepsToSave });
      }
      setEditOpen(false);
      load();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await window.electronAPI.deleteSharedStep(id);
      load();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'primary.main' }}>Back</Button>
        <Typography variant="h6" sx={{ color: 'text.primary', flex: 1 }}>Shared steps</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAdd} sx={{ color: 'primary.main' }}>Add</Button>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Reusable step sequences. In a UI test, add a step and choose &quot;Shared step&quot; to insert one. Edit a shared step to define its inner steps (element + action + value per row).
      </Typography>
      <Paper sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <List dense>
          {list.length === 0 && (
            <ListItem><ListItemText primary="No shared steps" secondary="Add one to reuse in multiple tests" primaryTypographyProps={{ sx: { color: 'text.primary' } }} secondaryTypographyProps={{ sx: { color: 'text.secondary' } }} /></ListItem>
          )}
          {list.map((item) => (
            <ListItem key={item.id}>
              <ListItemText
                primary={item.title}
                secondary={`${(item.steps || []).length} step(s)`}
                primaryTypographyProps={{ sx: { color: 'text.primary' } }}
                secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
              />
              <ListItemSecondaryAction>
                <IconButton size="small" onClick={() => handleEdit(item)} sx={{ color: 'text.secondary' }}><EditIcon /></IconButton>
                <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: 'text.secondary' }}><DeleteIcon /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'text.primary' }}>{editingId ? 'Edit shared step' : 'Add shared step'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mt: 1, mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <Typography variant="overline" sx={{ color: 'primary.main' }}>Steps</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
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
          </Box>
          <List dense>
            {steps.map((step, index) => {
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
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                          <InputLabel sx={{ color: 'text.secondary' }}>Endpoint</InputLabel>
                          <Select
                            value={endpointId}
                            onChange={(e) => handleApiStepChange(index, 'endpointId', e.target.value)}
                            label="Endpoint"
                            sx={{ color: 'text.primary' }}
                          >
                            {endpoints.map((ep) => (
                              <MenuItem key={ep.id} value={ep.id}>{ep.method} {ep.path}</MenuItem>
                            ))}
                            {endpoints.length === 0 && <MenuItem value="">— No endpoints —</MenuItem>}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
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
                          </Select>
                        </FormControl>
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
                    {apiAction === 'assertStatus' && (
                      <TextField
                        size="small"
                        label="Value"
                        value={step.value ?? '200'}
                        onChange={(e) => handleApiStepChange(index, 'value', e.target.value)}
                        sx={{ minWidth: 100, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
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
                          label="Expected"
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
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel sx={{ color: 'text.secondary' }}>Element</InputLabel>
                    <Select
                      value={elementOptionValue(step.pageId, step.webElementId)}
                      onChange={(e) => handleStepChange(index, 'element', e.target.value)}
                      label="Element"
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
                      placeholder="Value"
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="contained" color="primary">Save</Button>
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
              if (bodyModalStepIndex != null && steps[bodyModalStepIndex]) {
                handleApiStepChange(bodyModalStepIndex, 'body', bodyModalValue);
              }
              setBodyModalOpen(false);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
