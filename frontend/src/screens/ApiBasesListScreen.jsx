import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

export default function ApiBasesListScreen({ onBack, onRefresh, onOpenBase }) {
  const [bases, setBases] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const load = () => {
    if (!window.electronAPI?.listApiBases) return;
    window.electronAPI.listApiBases().then(setBases).catch(() => setBases([]));
  };

  useEffect(() => load(), []);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await window.electronAPI.createApiBase({ title: title.trim(), baseUrl: baseUrl.trim() });
      setAddOpen(false);
      setTitle('');
      setBaseUrl('');
      load();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
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
        <Typography variant="h6" sx={{ color: 'text.primary', flex: 1 }}>API Bases</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => { setAddOpen(true); setTitle(''); setBaseUrl(''); }} sx={{ color: 'primary.main' }}>Add base</Button>
        <Button size="small" startIcon={<CloudDownloadIcon />} onClick={() => { setImportOpen(true); setImportError(null); }} sx={{ color: 'primary.main' }}>Import from Swagger</Button>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        API bases define a base URL. Endpoints belong to a base and use its URL. Import Swagger to create a base and its endpoints.
      </Typography>
      <Paper sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <List dense>
          {bases.length === 0 && (
            <ListItem>
              <ListItemText primary="No API bases" secondary="Add a base or import from Swagger URL" sx={{ color: 'text.secondary' }} />
            </ListItem>
          )}
          {bases.map((b) => (
            <ListItem key={b.id} disablePadding>
              <ListItemButton onClick={() => onOpenBase?.(b.id)}>
                <ListItemText
                  primary={b.title}
                  secondary={b.baseUrl || '—'}
                  primaryTypographyProps={{ sx: { color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary', wordBreak: 'break-all' } }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={addOpen} onClose={() => !saving && setAddOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'text.primary' }}>Add API base</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My API" sx={{ mt: 1, mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
          <TextField fullWidth label="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || !title.trim()} variant="contained" sx={{ bgcolor: 'primary.main' }}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={() => !importing && setImportOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'text.primary' }}>Import from Swagger / OpenAPI</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Spec URL" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://api.example.com/swagger.json" sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
          {importError && <Typography sx={{ color: 'error.main', mt: 2 }}>{importError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleImport} disabled={!importUrl.trim() || importing} variant="contained" sx={{ bgcolor: 'primary.main' }}>Import</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
