import { useState, useEffect } from 'react';
import {
  Box,
  Button,
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
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function ApiBaseScreen({ baseId, onBack, onRefresh }) {
  const [base, setBase] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [editingBase, setEditingBase] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [baseSaveLoading, setBaseSaveLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', method: 'GET', path: '/', summary: '' });
  const [saving, setSaving] = useState(false);

  const loadBase = () => {
    if (!baseId || !window.electronAPI?.getApiBase) return;
    window.electronAPI.getApiBase(baseId).then((data) => {
      setBase(data);
      setEditTitle(data?.title ?? '');
      setEditBaseUrl(data?.baseUrl ?? '');
    }).catch(() => setBase(null));
  };

  const loadEndpoints = () => {
    if (!baseId || !window.electronAPI?.listEndpoints) return;
    window.electronAPI.listEndpoints(baseId).then(setEndpoints).catch(() => setEndpoints([]));
  };

  useEffect(() => {
    loadBase();
    loadEndpoints();
  }, [baseId]);

  const handleSaveBase = async () => {
    if (!baseId) return;
    setBaseSaveLoading(true);
    try {
      await window.electronAPI.updateApiBase(baseId, { title: editTitle.trim(), baseUrl: editBaseUrl.trim() });
      setEditingBase(false);
      loadBase();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setBaseSaveLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({ title: 'New Endpoint', method: 'GET', path: '/', summary: '' });
    setEditOpen(true);
  };

  const handleEdit = (ep) => {
    setEditingId(ep.id);
    setForm({
      title: ep.title || '',
      method: ep.method || 'GET',
      path: ep.path || '/',
      summary: ep.summary || '',
    });
    setEditOpen(true);
  };

  const handleSaveEndpoint = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await window.electronAPI.updateEndpoint(editingId, { ...form, baseId });
      } else {
        await window.electronAPI.createEndpoint({ ...form, baseId });
      }
      setEditOpen(false);
      loadEndpoints();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await window.electronAPI.deleteEndpoint(id);
      loadEndpoints();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  if (!base && baseId) {
    return (
      <Box sx={{ p: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'primary.main' }}>Back</Button>
        <Typography sx={{ color: 'text.secondary', mt: 2 }}>Base not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'primary.main' }}>Back</Button>
        {editingBase ? (
          <>
            <TextField size="small" placeholder="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} sx={{ flex: 1, minWidth: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
            <TextField size="small" placeholder="Base URL" value={editBaseUrl} onChange={(e) => setEditBaseUrl(e.target.value)} sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
            <Button size="small" onClick={handleSaveBase} disabled={baseSaveLoading} sx={{ color: 'primary.main' }}>Save</Button>
            <Button size="small" onClick={() => setEditingBase(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ color: 'text.primary', flex: 1 }}>{base?.title}</Typography>
            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingBase(true)} sx={{ color: 'primary.main' }}>Edit</Button>
          </>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <LinkIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>{base?.baseUrl || '—'}</Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
        <Typography variant="overline" sx={{ color: 'primary.main' }}>Endpoints ({endpoints.length})</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAdd} sx={{ color: 'primary.main' }}>Add endpoint</Button>
      </Box>
      <Paper sx={{ flex: 1, overflow: 'auto', minHeight: 120, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <List dense>
          {endpoints.length === 0 && (
            <ListItem><ListItemText primary="No endpoints" secondary="Add an endpoint for this base" sx={{ color: 'text.secondary' }} /></ListItem>
          )}
          {endpoints.map((ep) => (
            <ListItem key={ep.id}>
              <ListItemText
                primary={`${ep.method} ${ep.path}`}
                secondary={ep.summary || ep.title}
                primaryTypographyProps={{ sx: { color: 'text.primary', fontFamily: 'monospace' } }}
                secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
              />
              <ListItemSecondaryAction>
                <IconButton size="small" onClick={() => handleEdit(ep)} sx={{ color: 'text.secondary' }}><EditIcon /></IconButton>
                <IconButton size="small" onClick={() => handleDelete(ep.id)} sx={{ color: 'text.secondary' }}><DeleteIcon /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'text.primary' }}>{editingId ? 'Edit endpoint' : 'Add endpoint'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} sx={{ mb: 2, mt: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
          <FormControl fullWidth sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}>
            <InputLabel>Method</InputLabel>
            <Select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} label="Method">
              {METHODS.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth label="Path" value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))} placeholder="/api/users" sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
          <TextField fullWidth label="Summary" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} multiline rows={2} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleSaveEndpoint} disabled={saving} variant="contained" sx={{ bgcolor: 'primary.main' }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
