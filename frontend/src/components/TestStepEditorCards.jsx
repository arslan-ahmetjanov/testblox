import { useState } from 'react';
import {
  Autocomplete,
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
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  buildApiStepEditorInitial,
  getApiRequestDetailPreview,
  getStepApiAction,
  getStepSummaryLine,
  isStepApi,
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
  onOpenApiEditor,
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
                            Request preview
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
                            {getApiRequestDetailPreview(
                              endpoints.find((ep) => ep.id === endpointId),
                              step
                            )}
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => {
                            const endpoint = endpoints.find((ep) => ep.id === endpointId);
                            onOpenApiEditor(index, buildApiStepEditorInitial(endpoint, step, apiBases));
                          }}
                          sx={{ color: 'primary.main', alignSelf: 'flex-end' }}
                        >
                          Open request editor
                        </Button>
                      </Box>
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
        const selectedElement = elementsOnPage.find((el) => el.id === step.webElementId) || null;
        const selectedAction = actions.find((a) => a.id === step.actionId) || null;

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
                    <Autocomplete
                      size="small"
                      options={elementsOnPage}
                      value={selectedElement}
                      onChange={(_, option) => onStepChange(index, 'webElementId', option?.id || '')}
                      getOptionLabel={(option) => option?.title || option?.selector || option?.id || ''}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      filterOptions={(options, state) => {
                        const query = state.inputValue.trim().toLowerCase();
                        if (!query) return options;
                        return options.filter((option) => {
                          const title = (option.title || '').toLowerCase();
                          const selector = (option.selector || '').toLowerCase();
                          return title.includes(query) || selector.includes(query);
                        });
                      }}
                      noOptionsText="No elements on this page"
                      disabled={!resolvedPageId}
                      sx={{ minWidth: variant === 'shared' ? 200 : 220 }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={variant === 'shared' ? 'Element' : 'Target (Element)'}
                          placeholder="Search element by name..."
                          sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                        />
                      )}
                    />
                    <Autocomplete
                      size="small"
                      options={actions}
                      value={selectedAction}
                      onChange={(_, option) => onStepChange(index, 'actionId', option?.id || '')}
                      getOptionLabel={(option) => option?.name || option?.id || ''}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      filterOptions={(options, state) => {
                        const query = state.inputValue.trim().toLowerCase();
                        if (!query) return options;
                        return options.filter((option) => (option.name || '').toLowerCase().includes(query));
                      }}
                      noOptionsText="No actions"
                      sx={{ minWidth: 140 }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Action"
                          placeholder="Search action..."
                          sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
                        />
                      )}
                    />
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
