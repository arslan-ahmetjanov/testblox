import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Collapse,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ScreenshotGallery from '../components/ScreenshotGallery';

function StepScreenshot({ reportId, filename, alt, onOpenGallery }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!reportId || !filename || !window.electronAPI) return;
    window.electronAPI.reportsGetScreenshot(reportId, filename).then((base64) => {
      if (base64) setSrc(`data:image/png;base64,${base64}`);
    }).catch(() => {});
  }, [reportId, filename]);
  if (!src) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="img"
        alt={alt}
        src={src}
        sx={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
      />
      {onOpenGallery && (
        <Button size="small" onClick={onOpenGallery} sx={{ color: 'success.main' }}>
          Open screenshot
        </Button>
      )}
    </Box>
  );
}

function ApiStepRequestResponse({ step }) {
  const [requestOpen, setRequestOpen] = useState(true);
  const [responseOpen, setResponseOpen] = useState(true);
  const req = step.request;
  const res = step.response;
  if (!req && !res) return null;
  const formatBody = (body) => {
    if (body == null || body === '') return '—';
    if (typeof body === 'object') return JSON.stringify(body, null, 2);
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return String(body);
    }
  };
  return (
    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {req && (
        <Paper variant="outlined" sx={{ bgcolor: 'action.hover', p: 1 }}>
          <Button size="small" onClick={() => setRequestOpen((o) => !o)} sx={{ color: 'primary.main', textTransform: 'none' }}>
            Request: {req.method} {req.url}
          </Button>
          <Collapse in={requestOpen}>
            <Box component="pre" sx={{ fontSize: '0.75rem', color: 'text.primary', overflow: 'auto', maxHeight: 200, mt: 0.5 }}>
              {req.headers && Object.keys(req.headers).length > 0 && (
                <Box sx={{ mb: 0.5 }}>Headers: {JSON.stringify(req.headers, null, 2)}</Box>
              )}
              {req.body != null && <Box>Body: {formatBody(req.body)}</Box>}
            </Box>
          </Collapse>
        </Paper>
      )}
      {res && (
        <Paper variant="outlined" sx={{ bgcolor: 'action.hover', p: 1 }}>
          <Button size="small" onClick={() => setResponseOpen((o) => !o)} sx={{ color: 'primary.main', textTransform: 'none' }}>
            Response: {res.status}
          </Button>
          <Collapse in={responseOpen}>
            <Box component="pre" sx={{ fontSize: '0.75rem', color: 'text.primary', overflow: 'auto', maxHeight: 200, mt: 0.5 }}>
              {res.headers && Object.keys(res.headers).length > 0 && (
                <Box sx={{ mb: 0.5 }}>Headers: {JSON.stringify(res.headers, null, 2)}</Box>
              )}
              {res.body != null && <Box>Body: {formatBody(res.body)}</Box>}
            </Box>
          </Collapse>
        </Paper>
      )}
    </Box>
  );
}

export default function ReportView({ reportId: initialReportId, onBack, onRefresh }) {
  const [reportId, setReportId] = useState(initialReportId || null);
  const [report, setReport] = useState(null);
  const [reportsList, setReportsList] = useState([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  useEffect(() => {
    if (initialReportId) setReportId(initialReportId);
  }, [initialReportId]);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.reportsList(null).then(setReportsList).catch(() => setReportsList([]));
  }, []);

  useEffect(() => {
    if (reportsList.length > 0 && !reportId) setReportId(reportsList[0].id);
  }, [reportsList, reportId]);

  useEffect(() => {
    if (!reportId || !window.electronAPI) return;
    window.electronAPI.reportsGet(reportId).then(setReport).catch(() => setReport(null));
  }, [reportId]);

  const handleSelectReport = (id) => {
    setReportId(id);
    window.electronAPI?.reportsGet(id).then(setReport).catch(() => setReport(null));
  };

  const openScreenshotGallery = useCallback(async (stepIndex) => {
    if (!reportId || !report?.steps || !window.electronAPI) return;
    const stepsWithScreenshots = report.steps
      .map((s, i) => (s.screenshotPath ? i : null))
      .filter((i) => i != null);
    const galleryIndex = stepsWithScreenshots.indexOf(stepIndex);
    if (galleryIndex < 0) return;
    const filenames = stepsWithScreenshots.map((i) => report.steps[i].screenshotPath);
    const urls = await Promise.all(
      filenames.map((f) =>
        window.electronAPI.reportsGetScreenshot(reportId, f).then((b64) => (b64 ? `data:image/png;base64,${b64}` : null))
      )
    );
    setGalleryImages(urls.filter(Boolean));
    setGalleryInitialIndex(galleryIndex);
    setGalleryOpen(true);
  }, [reportId, report?.steps]);

  const reportStatus = report && (report.status === true || report.status === 'passed' ? 'passed' : 'failed');
  const stepStatus = (s) => (s.status === true || s.status === 'passed' ? 'passed' : 'failed');

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'primary.main' }}>Back</Button>
        <Typography variant="h6" sx={{ color: 'text.primary', flex: 1 }}>Reports</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        <Paper sx={{ width: 280, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="overline" sx={{ color: 'primary.main' }}>Recent</Typography>
          <List dense>
            {reportsList.length === 0 && <ListItem><ListItemText primary="No reports" sx={{ color: 'text.secondary' }} /></ListItem>}
            {reportsList.map((r) => (
              <ListItem key={r.id} button selected={r.id === reportId} onClick={() => handleSelectReport(r.id)}>
                <ListItemText
                  primary={r.testTitle || r.testId}
                  secondary={r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                  primaryTypographyProps={{ sx: { color: 'text.primary', fontSize: '0.9rem' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary', fontSize: '0.75rem' } }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
        <Paper sx={{ flex: 1, p: 2, overflow: 'auto', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          {!report && <Typography sx={{ color: 'text.secondary' }}>Select a report</Typography>}
          {report && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'text.primary' }}>{report.testTitle || report.testId}</Typography>
                <Chip
                  size="small"
                  icon={reportStatus === 'passed' ? <CheckCircleIcon /> : <ErrorIcon />}
                  label={reportStatus}
                  sx={{
                    bgcolor: reportStatus === 'passed' ? 'action.hover' : 'action.hover',
                    color: reportStatus === 'passed' ? 'success.main' : 'error.main',
                  }}
                />
                {report.executionTime != null && (
                  <Chip size="small" icon={<ScheduleIcon />} label={`${report.executionTime}ms`} sx={{ color: 'text.secondary' }} />
                )}
              </Box>
              <Typography variant="overline" sx={{ color: 'primary.main' }}>Steps</Typography>
              <List dense>
                {(report.steps || []).map((step, i) => (
                  <ListItem key={i} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <ListItemText
                        primary={step.value != null ? step.value : `Step ${i + 1}`}
                        secondary={step.error || (stepStatus(step) === 'passed' ? 'OK' : stepStatus(step))}
                        primaryTypographyProps={{ sx: { color: 'text.primary' } }}
                        secondaryTypographyProps={{ sx: { color: step.error ? 'error.main' : 'text.secondary' } }}
                      />
                      {(step.request || step.response) && <ApiStepRequestResponse step={step} />}
                    </Box>
                    {step.screenshotPath && reportId && (
                      <StepScreenshot
                        reportId={reportId}
                        filename={step.screenshotPath}
                        alt={`Step ${i + 1}`}
                        onOpenGallery={() => openScreenshotGallery(i)}
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Paper>
      </Box>
      {galleryOpen && galleryImages.length > 0 && (
        <ScreenshotGallery
          images={galleryImages}
          initialIndex={galleryInitialIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </Box>
  );
}
