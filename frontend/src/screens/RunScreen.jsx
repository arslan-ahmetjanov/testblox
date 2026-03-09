import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  CircularProgress,
  LinearProgress,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export default function RunScreen({ tests: allTests, onBack, onRefresh, onViewReport }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [workers, setWorkers] = useState(1);
  const [screenshotOnFailureOnly, setScreenshotOnFailureOnly] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [lastReportId, setLastReportId] = useState(null);
  const [runError, setRunError] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.onTestRunProgress) return;
    const unsub = window.electronAPI.onTestRunProgress((e) => {
      setProgress(e);
    });
    return () => unsub?.();
  }, []);

  const toggleTest = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRun = async () => {
    if (selectedIds.length === 0) return;
    setRunning(true);
    setRunError(null);
    setProgress(null);
    setLastReportId(null);
    try {
      await window.electronAPI.runTests({
        testIds: selectedIds,
        concurrency: workers,
        screenshotOnFailureOnly,
      });
      setProgress(null);
      const list = await window.electronAPI.reportsList(null);
      if (list?.length > 0) setLastReportId(list[0].id);
      onRefresh?.();
    } catch (e) {
      setRunError(e.message || 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'primary.main' }}>Back</Button>
        <Typography variant="h6" sx={{ color: 'text.primary', flex: 1 }}>Run tests</Typography>
      </Box>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 1 }}>Select tests</Typography>
        <List dense>
          {(allTests || []).slice(0, 50).map((t) => (
            <ListItem key={t.id} disablePadding>
              <ListItemButton onClick={() => toggleTest(t.id)} dense>
                <Checkbox checked={selectedIds.includes(t.id)} sx={{ color: 'primary.main', p: 0.5, mr: 1 }} />
                <ListItemText primary={t.title} primaryTypographyProps={{ sx: { color: 'text.primary' } }} />
              </ListItemButton>
            </ListItem>
          ))}
          {(allTests || []).length === 0 && (
            <ListItem><ListItemText primary="No tests in workspace" sx={{ color: 'text.secondary' }} /></ListItem>
          )}
        </List>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="run-workers-label" sx={{ color: 'text.secondary' }}>Workers</InputLabel>
            <Select
              labelId="run-workers-label"
              value={workers}
              label="Workers"
              onChange={(e) => setWorkers(Number(e.target.value))}
              sx={{ color: 'text.primary', '.MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
            >
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={4}>4</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={screenshotOnFailureOnly}
                onChange={(e) => setScreenshotOnFailureOnly(e.target.checked)}
                sx={{ color: 'primary.main' }}
              />
            }
            label={<Typography sx={{ color: 'text.primary', fontSize: '0.875rem' }}>Screenshots only on failure</Typography>}
          />
        </Box>
        <Button
          variant="contained"
          startIcon={running ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
          disabled={running || selectedIds.length === 0}
          onClick={handleRun}
          sx={{ mt: 2, bgcolor: 'primary.main' }}
        >
          {running ? 'Running...' : 'Run selected'}
        </Button>
      </Paper>
      {progress && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{progress.message || `Test ${progress.testId}`}</Typography>
          {progress.total > 0 && <LinearProgress variant="determinate" value={(progress.stepIndex / progress.total) * 100} sx={{ mt: 1 }} />}
        </Paper>
      )}
      {runError && <Typography color="error" variant="body2" sx={{ mb: 2 }}>{runError}</Typography>}
      {lastReportId && !running && (
        <Button variant="outlined" onClick={() => onViewReport?.(lastReportId)} sx={{ color: 'primary.main', borderColor: 'primary.main' }}>
          View latest report
        </Button>
      )}
    </Box>
  );
}
