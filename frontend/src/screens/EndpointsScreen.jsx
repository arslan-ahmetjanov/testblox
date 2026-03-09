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
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function EndpointsScreen({ onBack, onRefresh }) {
  const [endpoints, setEndpoints] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', method: 'GET', path: '/', summary: '', baseUrl: '' });
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const load = () => {
    if (!window.electronAPI) return;
    window.electronAPI.listEndpoints().then(setEndpoints).catch(() => setEndpoints([]));
  };

  useEffect(() => load(), []);

  const handleAdd = () => {
    setEditingId(null);
    setForm({ title: 'New Endpoint', method: 'GET', path: '/', summary: '', baseUrl: '' });
    setEditOpen(true);
  };

  const handleEdit = (ep) => {
    setEditingId(ep.id);
    setForm({
      title: ep.title || '',
      method: ep.method || 'GET',
      path: ep.path || '/',
      summary: ep.summary || '',
      baseUrl: ep.baseUrl || '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await window.electronAPI.updateEndpoint(editingId, form);
      } else {
        await window.electronAPI.createEndpoint(form);
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
      await window.electronAPI.deleteEndpoint(id);
      load();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setImporting(true);
    setImportError(null);
    try {
      await window.electronAPI.importSwagger(url);
      setImportOpen(false);
      setImportUrl('');
      load();
      onRefresh?.();
    } catch (e) {
      setImportError(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'primary.main' }}>Back</Button>
        <Typography variant="h6" sx={{ color: 'text.primary', flex: 1 }}>API Endpoints</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAdd} sx={{ color: 'primary.main' }}>Add</Button>
        <Button size="small" startIcon={<CloudDownloadIcon />} onClick={() => { setImportOpen(true); setImportError(null); }} sx={{ color: 'primary.main' }}>Import from Swagger</Button>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Endpoints can be used in API tests and in AI-generated scenarios. Import from a Swagger/OpenAPI URL to add many at once.
      </Typography>
      <Paper sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <List dense>
          {endpoints.length === 0 && (
            <ListItem><ListItemText primary="No endpoints" secondary="Add manually or import from Swagger URL" sx={{ color: 'text.secondary' }} /></ListItem>
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
          <TextField
            fullWidth
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            sx={{ mb: 2, mt: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <FormControl fullWidth sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}>
            <InputLabel>Method</InputLabel>
            <Select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} label="Method">
              {METHODS.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Path"
            value={form.path}
            onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
            placeholder="/api/users"
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <TextField
            fullWidth
            label="Base URL"
            value={form.baseUrl}
            onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
            placeholder="https://api.example.com"
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <TextField
            fullWidth
            label="Summary"
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            multiline
            rows={2}
            sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={() => !importing && setImportOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'text.primary' }}>Import from Swagger / OpenAPI</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Spec URL"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://api.example.com/swagger.json"
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          {importError && <Typography sx={{ color: 'error.main', mt: 2 }}>{importError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleImport} disabled={!importUrl.trim() || importing} variant="contained" color="primary">Import</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
