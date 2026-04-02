import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ApiIcon from '@mui/icons-material/Api';
import DescriptionIcon from '@mui/icons-material/Description';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HomeIcon from '@mui/icons-material/Home';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SearchIcon from '@mui/icons-material/Search';
import PageScreen from './PageScreen';
import PagesListScreen from './PagesListScreen';
import TestEditorScreen from './TestEditorScreen';
import RunScreen from './RunScreen';
import ReportView from './ReportView';
import TestsScreen from './TestsScreen';
import VariablesScreen from './VariablesScreen';
import ApiBasesListScreen from './ApiBasesListScreen';
import ApiBaseScreen from './ApiBaseScreen';
import SharedStepsScreen from './SharedStepsScreen';
import MainLayout from '../components/MainLayout';

export default function WorkspaceView({ workspacePath, workspace, pages, themeMode, onToggleTheme, onRefresh, onOpenFolder, onCloseWorkspace }) {
  const [view, setView] = useState('list'); // 'list' | 'page' | 'test' | 'run' | 'report' | 'variables' | 'apiBases' | 'apiBase' | 'sharedSteps'
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [gitRoot, setGitRoot] = useState(null);
  const [branch, setBranch] = useState(null);
  const [status, setStatus] = useState(null);
  const [branches, setBranches] = useState([]);
  const [remoteBranches, setRemoteBranches] = useState([]);
  const [remotes, setRemotes] = useState([]);
  const [remotesOpen, setRemotesOpen] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [branchSelectOpen, setBranchSelectOpen] = useState(false);
  const [tests, setTests] = useState([]);
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [gitBusy, setGitBusy] = useState(false);
  const [initGitBusy, setInitGitBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState({ global: {}, effective: {}, isValid: false });
  const [llmForm, setLlmForm] = useState({ apiKey: '', modelName: '', apiBaseUrl: '', scope: 'global' });
  const [llmSaving, setLlmSaving] = useState(false);
  const [browserForm, setBrowserForm] = useState({ browser: 'yandex', executablePath: '' });
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageUrl, setNewPageUrl] = useState('');
  const [addPageSaving, setAddPageSaving] = useState(false);
  const [newTestDialogOpen, setNewTestDialogOpen] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestType, setNewTestType] = useState('hybrid');
  const [newTestSaving, setNewTestSaving] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatePageIds, setGeneratePageIds] = useState([]);
  const [generateBaseIds, setGenerateBaseIds] = useState([]);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generateApiBases, setGenerateApiBases] = useState([]);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [generateResult, setGenerateResult] = useState(null);
  const [workspaceTitleOpen, setWorkspaceTitleOpen] = useState(false);
  const [workspaceTitleValue, setWorkspaceTitleValue] = useState('');
  const [workspaceTitleSaving, setWorkspaceTitleSaving] = useState(false);
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneFolderName, setCloneFolderName] = useState('');
  const [cloneParentPath, setCloneParentPath] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneError, setCloneError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [importZipPath, setImportZipPath] = useState('');
  const [importTargetPath, setImportTargetPath] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadGit = async () => {
    if (!window.electronAPI) return;
    const root = await window.electronAPI.gitRootPath(workspacePath);
    setGitRoot(root);
    if (root) {
      const [b, s, branchList, remotesList] = await Promise.all([
        window.electronAPI.gitCurrentBranch(root),
        window.electronAPI.gitStatus(root),
        window.electronAPI.gitGetBranches(root).catch(() => []),
        window.electronAPI.gitGetRemotes(root).catch(() => []),
      ]);
      setBranch(b);
      setStatus(s);
      setBranches(branchList);
      setRemotes(remotesList);
    }
  };

  useEffect(() => {
    loadGit();
  }, [workspacePath]);

  useEffect(() => {
    if (branchSelectOpen && gitRoot && remoteBranches.length === 0) {
      window.electronAPI?.gitGetRemoteBranches(gitRoot, 'origin').then(setRemoteBranches).catch(() => {});
    }
  }, [branchSelectOpen, gitRoot]);

  useEffect(() => {
    if (!workspacePath) return;
    window.electronAPI.listTests(null).then(setTests).catch(() => setTests([]));
  }, [workspacePath, pages]);

  const handlePull = async () => {
    if (!gitRoot) return;
    setGitBusy(true);
    try {
      await window.electronAPI.gitPull(gitRoot);
      await loadGit();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setGitBusy(false);
    }
  };

  const handlePush = async () => {
    if (!gitRoot) return;
    setGitBusy(true);
    try {
      await window.electronAPI.gitPush(gitRoot);
      await loadGit();
    } catch (e) {
      console.error(e);
    } finally {
      setGitBusy(false);
    }
  };

  const handleFetch = async () => {
    if (!gitRoot) return;
    setGitBusy(true);
    try {
      await window.electronAPI.gitFetch(gitRoot, 'origin');
      const remoteList = await window.electronAPI.gitGetRemoteBranches(gitRoot, 'origin').catch(() => []);
      setRemoteBranches(remoteList);
      await loadGit();
    } catch (e) {
      console.error(e);
    } finally {
      setGitBusy(false);
    }
  };

  const handleBranchSelect = async (targetBranch, isRemote = false) => {
    if (!gitRoot || targetBranch === branch) return;
    setBranchSelectOpen(false);
    setGitBusy(true);
    try {
      if (isRemote) {
        await window.electronAPI.gitCheckoutRemoteBranch(gitRoot, 'origin', targetBranch, 'branch-checkout');
      } else {
        await window.electronAPI.gitCheckoutBranch(gitRoot, targetBranch);
      }
      await loadGit();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setGitBusy(false);
    }
  };

  const openRemotesDialog = async () => {
    setRemotesOpen(true);
    if (gitRoot) {
      const list = await window.electronAPI.gitGetRemotes(gitRoot).catch(() => []);
      setRemotes(list);
    }
  };

  const handleAddRemote = async () => {
    if (!gitRoot || !newRemoteName.trim() || !newRemoteUrl.trim()) return;
    setGitBusy(true);
    try {
      await window.electronAPI.gitAddRemote(gitRoot, newRemoteName.trim(), newRemoteUrl.trim());
      setNewRemoteName('');
      setNewRemoteUrl('');
      const list = await window.electronAPI.gitGetRemotes(gitRoot);
      setRemotes(list);
    } catch (e) {
      console.error(e);
    } finally {
      setGitBusy(false);
    }
  };

  const handleRemoveRemote = async (name) => {
    if (!gitRoot || !name) return;
    setGitBusy(true);
    try {
      await window.electronAPI.gitRemoveRemote(gitRoot, name);
      const list = await window.electronAPI.gitGetRemotes(gitRoot);
      setRemotes(list);
      await loadGit();
    } catch (e) {
      console.error(e);
    } finally {
      setGitBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!gitRoot || !commitMessage.trim()) return;
    setGitBusy(true);
    try {
      await window.electronAPI.gitStage(gitRoot, null);
      await window.electronAPI.gitCommit(gitRoot, commitMessage.trim());
      setCommitMessage('');
      setCommitOpen(false);
      await loadGit();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setGitBusy(false);
    }
  };

  const handleInitGit = async () => {
    if (!workspacePath || !window.electronAPI) return;
    setInitGitBusy(true);
    try {
      await window.electronAPI.gitInit(workspacePath);
      await loadGit();
      setSnackbar({ open: true, message: 'Repository initialized.', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: e?.message || 'Failed to initialize repository.', severity: 'error' });
    } finally {
      setInitGitBusy(false);
    }
  };

  const hasChanges = status && (status.files?.length > 0 || status.not_added?.length > 0);

  const handleAddPageOpen = () => {
    setNewPageTitle('');
    setNewPageUrl('');
    setAddPageOpen(true);
  };

  const handleAddPageSubmit = async () => {
    const title = newPageTitle.trim() || 'New Page';
    setAddPageSaving(true);
    try {
      const created = await window.electronAPI.createPage({ title, url: newPageUrl.trim() || '' });
      setAddPageOpen(false);
      onRefresh?.();
      if (created) {
        setView('page');
        setSelectedPageId(created.id);
        setSelectedTestId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddPageSaving(false);
    }
  };

  const handleOpenNewTestDialog = () => {
    setNewTestTitle('');
    setNewTestType('hybrid');
    setNewTestDialogOpen(true);
  };

  const openGenerateDialog = () => {
    setGeneratePageIds([]);
    setGenerateBaseIds([]);
    setGeneratePrompt('');
    setGenerateError(null);
    setGenerateResult(null);
    setGenerateDialogOpen(true);
    window.electronAPI?.listApiBases?.().then(setGenerateApiBases).catch(() => setGenerateApiBases([]));
  };

  const handleGenerateSubmit = async () => {
    if (generatePageIds.length === 0 && generateBaseIds.length === 0) {
      setGenerateError('Select at least one page or API base.');
      return;
    }
    setGenerateBusy(true);
    setGenerateError(null);
    try {
      const endpointIdArrays = await Promise.all(
        generateBaseIds.map((baseId) => window.electronAPI.listEndpoints(baseId).catch(() => []))
      );
      const endpointIds = endpointIdArrays.flat().map((ep) => ep.id);
      const created = await window.electronAPI.generateFromSelection({
        pageIds: generatePageIds,
        endpointIds,
        customPrompt: generatePrompt.trim() || null,
      });
      setGenerateResult(created);
      onRefresh?.();
    } catch (e) {
      setGenerateError(e.message || 'Generation failed');
    } finally {
      setGenerateBusy(false);
    }
  };

  const handleNewTestSubmit = async () => {
    const title = newTestTitle.trim() || 'New Test';
    setNewTestSaving(true);
    try {
      const created = await window.electronAPI.createTest({ title, type: newTestType, pageId: null });
      setNewTestDialogOpen(false);
      onRefresh?.();
      if (created) {
        setView('test');
        setSelectedTestId(created.id);
        setSelectedPageId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNewTestSaving(false);
    }
  };

  const openWorkspaceTitleEdit = () => {
    setWorkspaceTitleValue(workspace?.title || '');
    setWorkspaceTitleOpen(true);
  };

  const handleWorkspaceTitleSave = async () => {
    const title = workspaceTitleValue.trim() || workspace?.title || 'Untitled';
    setWorkspaceTitleSaving(true);
    try {
      await window.electronAPI.updateWorkspaceMeta({ title });
      setWorkspaceTitleOpen(false);
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setWorkspaceTitleSaving(false);
    }
  };

  const openSettings = async () => {
    setSettingsOpen(true);
    const c = await window.electronAPI.llmGetConfig();
    setLlmConfig(c);
    setLlmForm({
      apiKey: c.effective?.apiKey === '***' ? '' : (c.effective?.apiKey || ''),
      modelName: c.effective?.modelName || '',
      apiBaseUrl: c.effective?.apiBaseUrl || 'https://openrouter.ai/api/v1',
      scope: 'global',
    });
    const bc = await window.electronAPI.browserGetConfig();
    setBrowserForm({ browser: bc.browser === 'custom' ? 'custom' : 'yandex', executablePath: bc.executablePath || '' });
  };

  const handleLlmSave = async () => {
    setLlmSaving(true);
    try {
      await window.electronAPI.llmSaveConfig({
        scope: llmForm.scope,
        apiKey: llmForm.apiKey || '***',
        modelName: llmForm.modelName || undefined,
        apiBaseUrl: llmForm.apiBaseUrl || undefined,
      });
      await window.electronAPI.browserSaveConfig({
        browser: browserForm.browser,
        executablePath: browserForm.browser === 'custom' ? (browserForm.executablePath || null) : null,
      });
      const c = await window.electronAPI.llmGetConfig();
      setLlmConfig(c);
      setSettingsOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLlmSaving(false);
    }
  };

  const handleBrowserBrowse = async () => {
    const p = await window.electronAPI?.selectBrowserExecutable();
    if (p) setBrowserForm((f) => ({ ...f, executablePath: p }));
  };

  const openCloneDialog = () => {
    setWorkspaceMenuAnchor(null);
    setCloneFolderName((workspace?.title || 'Workspace') + ' (copy)');
    setCloneParentPath('');
    setCloneError('');
    setCloneDialogOpen(true);
  };

  const handleCloneChooseFolder = async () => {
    const p = await window.electronAPI?.openFolder();
    if (p) setCloneParentPath(p);
  };

  const handleCloneSubmit = async () => {
    if (!cloneParentPath.trim()) {
      setCloneError('Choose destination folder');
      return;
    }
    setCloneError('');
    setCloneLoading(true);
    try {
      const result = await window.electronAPI.workspaceClone(workspacePath, cloneParentPath, cloneFolderName.trim() || undefined);
      setCloneDialogOpen(false);
      setSnackbar({ open: true, message: 'Workspace copied. Open it from Recent or Open folder.', severity: 'success' });
      if (onOpenFolder && result?.path) {
        onOpenFolder(result.path);
      }
    } catch (e) {
      setCloneError(e.message || 'Clone failed');
    } finally {
      setCloneLoading(false);
    }
  };

  const handleExportZip = async () => {
    setWorkspaceMenuAnchor(null);
    setExportLoading(true);
    try {
      const result = await window.electronAPI.workspaceExportZip(workspacePath);
      if (result?.canceled) return;
      if (result?.success) {
        setSnackbar({ open: true, message: 'Workspace exported successfully', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: result?.error || 'Export failed', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Export failed', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const openImportDialog = () => {
    setWorkspaceMenuAnchor(null);
    setImportZipPath('');
    setImportTargetPath('');
    setImportDialogOpen(true);
  };

  const handleImportSelectZip = async () => {
    const p = await window.electronAPI?.openZip();
    if (p) setImportZipPath(p);
  };

  const handleImportSelectFolder = async () => {
    const p = await window.electronAPI?.openFolder();
    if (p) setImportTargetPath(p);
  };

  const handleImportSubmit = async () => {
    if (!importZipPath || !importTargetPath) {
      setSnackbar({ open: true, message: 'Select ZIP file and destination folder', severity: 'warning' });
      return;
    }
    setImportLoading(true);
    try {
      const result = await window.electronAPI.workspaceImportZip(importZipPath, importTargetPath);
      setImportDialogOpen(false);
      setSnackbar({ open: true, message: 'Workspace imported successfully', severity: 'success' });
      if (onOpenFolder && result?.path) {
        onOpenFolder(result.path);
      }
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Import failed', severity: 'error' });
    } finally {
      setImportLoading(false);
    }
  };

  const workspaceHeader = (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 0,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <IconButton size="small" onClick={onCloseWorkspace} sx={{ color: 'text.secondary' }} title="Close workspace (Home)">
        <HomeIcon />
      </IconButton>
      <FolderOpenIcon sx={{ color: 'secondary.main' }} />
      <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {workspacePath}
      </Typography>
      <IconButton
        size="small"
        onClick={(e) => setWorkspaceMenuAnchor(e.currentTarget)}
        sx={{ color: 'text.secondary' }}
        title="Workspace actions"
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={workspaceMenuAnchor}
        open={!!workspaceMenuAnchor}
        onClose={() => setWorkspaceMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={openCloneDialog}>
          <ContentCopyIcon sx={{ mr: 1, fontSize: 20 }} /> Copy workspace
        </MenuItem>
        <MenuItem onClick={handleExportZip} disabled={exportLoading}>
          <FileDownloadIcon sx={{ mr: 1, fontSize: 20 }} /> Export to ZIP
        </MenuItem>
        <MenuItem onClick={openImportDialog}>
          <FileUploadIcon sx={{ mr: 1, fontSize: 20 }} /> Import from ZIP
        </MenuItem>
      </Menu>
      <IconButton size="small" onClick={onRefresh} sx={{ color: 'text.secondary' }} title="Refresh">
        <RefreshIcon />
      </IconButton>
      {onToggleTheme && (
        <IconButton size="small" onClick={onToggleTheme} aria-label={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} sx={{ color: 'text.secondary' }} title={themeMode === 'dark' ? 'Light theme' : 'Dark theme'}>
          {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      )}
      <Button size="small" startIcon={<SettingsIcon />} onClick={openSettings} sx={{ color: 'text.primary' }}>
        Settings
      </Button>
      {!gitRoot && workspacePath && (
        <Button
          size="small"
          startIcon={<AccountTreeIcon />}
          onClick={handleInitGit}
          disabled={initGitBusy}
          sx={{ color: 'text.primary' }}
        >
          Initialize repository
        </Button>
      )}
      {gitRoot && (
        <>
          <AccountTreeIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          <FormControl size="small" sx={{ minWidth: 100 }} variant="outlined">
            <Select
              open={branchSelectOpen}
              onOpen={() => setBranchSelectOpen(true)}
              onClose={() => setBranchSelectOpen(false)}
              value={branch || ''}
              displayEmpty
              renderValue={(v) => v || 'main'}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val.startsWith('remote/')) handleBranchSelect(val.slice(7), true);
                else if (val) handleBranchSelect(val, false);
              }}
              sx={{ color: 'text.primary', height: 32, fontSize: '0.875rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
            >
              {branches.map((b) => (
                <MenuItem key={b} value={b}>{b}</MenuItem>
              ))}
              {remoteBranches.length > 0 && [
                <MenuItem key="remote-divider" disabled sx={{ opacity: 0.7 }}><Typography variant="caption">origin</Typography></MenuItem>,
                ...remoteBranches.filter((b) => !branches.includes(b)).map((b) => (
                  <MenuItem key={`remote-${b}`} value={`remote/${b}`}>{b} (origin)</MenuItem>
                )),
              ]}
            </Select>
          </FormControl>
          {status && (status.ahead > 0 || status.behind > 0) && (
            <Typography variant="caption" sx={{ color: 'success.main' }}>
              {status.ahead > 0 && `↑${status.ahead}`}
              {status.behind > 0 && ` ↓${status.behind}`}
            </Typography>
          )}
          <Button size="small" onClick={handleFetch} disabled={gitBusy} sx={{ color: 'text.primary' }} title="Fetch from remote">Fetch</Button>
          <Button size="small" startIcon={<CallReceivedIcon />} onClick={handlePull} disabled={gitBusy} sx={{ color: 'text.primary' }}>
            Pull
          </Button>
          <Button size="small" startIcon={<CallMadeIcon />} onClick={handlePush} disabled={gitBusy} sx={{ color: 'text.primary' }}>
            Push
          </Button>
          <Button size="small" onClick={openRemotesDialog} sx={{ color: 'text.secondary' }}>Remotes</Button>
          <Button
            size="small"
            startIcon={<SaveIcon />}
            onClick={() => setCommitOpen(true)}
            disabled={gitBusy || !hasChanges}
            sx={{ color: 'text.primary' }}
          >
            Commit
          </Button>
        </>
      )}
    </Paper>
  );

  const workspaceSidebar = (
    <Paper
      sx={{
        flex: '0 0 280px',
        p: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Workspace: {workspace?.title || 'Untitled'}
            </Typography>
            <IconButton size="small" onClick={openWorkspaceTitleEdit} sx={{ color: 'text.secondary', p: 0.25 }} title="Edit workspace name">
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button size="small" startIcon={<SearchIcon />} onClick={() => { setView('tests'); setSelectedTestId(null); setSelectedPageId(null); }} sx={{ color: 'secondary.main', justifyContent: 'flex-start' }}>
              Tests
            </Button>
            <Button size="small" startIcon={<DataObjectIcon />} onClick={() => { setView('variables'); setSelectedPageId(null); setSelectedTestId(null); }} sx={{ color: 'secondary.main', justifyContent: 'flex-start' }}>
              Variables
            </Button>
            <Button size="small" startIcon={<DescriptionIcon />} onClick={() => { setView('page'); setSelectedPageId(null); setSelectedTestId(null); }} sx={{ color: 'secondary.main', justifyContent: 'flex-start' }}>
              Pages
            </Button>
            <Button size="small" startIcon={<ApiIcon />} onClick={() => { setView('apiBases'); setSelectedPageId(null); setSelectedTestId(null); setSelectedBaseId(null); }} sx={{ color: 'secondary.main', justifyContent: 'flex-start' }} title="API Bases">
              API Bases
            </Button>
            <Button size="small" startIcon={<AllInclusiveIcon />} onClick={() => { setView('sharedSteps'); setSelectedPageId(null); setSelectedTestId(null); }} sx={{ color: 'secondary.main', justifyContent: 'flex-start' }}>
              Shared Steps
            </Button>
            <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => { setView('run'); setSelectedPageId(null); setSelectedTestId(null); }} sx={{ color: 'secondary.main', justifyContent: 'flex-start' }}>
              Run Tests
            </Button>
            <Button size="small" startIcon={<AssessmentIcon />} onClick={() => { setView('report'); setSelectedPageId(null); setSelectedTestId(null); }} sx={{ color: 'secondary.main', justifyContent: 'flex-start' }}>
              Reports
            </Button>
          </Box>
    </Paper>
  );

  const workspaceContent = (
    <>
          {view === 'list' && (
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Typography sx={{ color: 'text.secondary' }}>Select a page or test to edit, or Run tests / Reports.</Typography>
            </Box>
          )}
          {view === 'page' && !selectedPageId && (
            <PagesListScreen
              pages={pages}
              onAddPage={handleAddPageOpen}
              onOpenPage={(id) => { setSelectedPageId(id); }}
            />
          )}
          {view === 'page' && selectedPageId && (
            <PageScreen
              pageId={selectedPageId}
              page={pages.find((p) => p.id === selectedPageId)}
              onBack={() => { setSelectedPageId(null); }}
              onRefresh={onRefresh}
            />
          )}
          {view === 'test' && selectedTestId && (
            <TestEditorScreen
              testId={selectedTestId}
              onBack={() => { setView('list'); setSelectedTestId(null); }}
              onRefresh={onRefresh}
              onOpenRun={() => setView('run')}
              onViewReport={(id) => { setReportId(id); setView('report'); }}
            />
          )}
          {view === 'tests' && (
            <TestsScreen
              tests={tests}
              pages={pages}
              onBack={() => setView('list')}
              onRefresh={onRefresh}
              onOpenTest={(id) => { setView('test'); setSelectedTestId(id); setSelectedPageId(null); }}
            />
          )}
          {view === 'run' && (
            <RunScreen
              tests={tests}
              onBack={() => setView('list')}
              onRefresh={onRefresh}
              onViewReport={(id) => { setReportId(id); setView('report'); }}
            />
          )}
          {view === 'report' && (
            <ReportView reportId={reportId} onBack={() => setView('list')} onRefresh={onRefresh} />
          )}
          {view === 'variables' && (
            <VariablesScreen onBack={() => setView('list')} />
          )}
          {view === 'apiBases' && (
            <ApiBasesListScreen
              onBack={() => setView('list')}
              onRefresh={onRefresh}
              onOpenBase={(id) => { setSelectedBaseId(id); setView('apiBase'); }}
            />
          )}
          {view === 'apiBase' && selectedBaseId && (
            <ApiBaseScreen
              baseId={selectedBaseId}
              onBack={() => { setView('apiBases'); setSelectedBaseId(null); }}
              onRefresh={onRefresh}
            />
          )}
          {view === 'sharedSteps' && (
            <SharedStepsScreen onBack={() => setView('list')} onRefresh={onRefresh} />
          )}

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Settings</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ color: 'primary.main', mt: 1, mb: 1 }}>Browser for tests</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Yandex Browser (bundled with the app) or any Chromium-based executable you choose.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}>
            <InputLabel id="browser-select-label" sx={{ color: 'text.secondary' }}>Browser</InputLabel>
            <Select
              labelId="browser-select-label"
              label="Browser"
              value={browserForm.browser}
              onChange={(e) => setBrowserForm((f) => ({ ...f, browser: e.target.value }))}
              sx={{ color: 'text.primary', '.MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
            >
              <MenuItem value="yandex">Yandex Browser (bundled)</MenuItem>
              <MenuItem value="custom">Custom (path to executable)</MenuItem>
            </Select>
          </FormControl>
          {browserForm.browser === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Executable path"
                value={browserForm.executablePath}
                onChange={(e) => setBrowserForm((f) => ({ ...f, executablePath: e.target.value }))}
                placeholder="C:\path\to\browser.exe"
                sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
              />
              <Button variant="outlined" onClick={handleBrowserBrowse} sx={{ flexShrink: 0, borderColor: 'divider', color: 'text.primary' }}>Browse</Button>
            </Box>
          )}

          <Typography variant="subtitle2" sx={{ color: 'primary.main', mt: 2, mb: 1 }}>LLM (OpenRouter)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Used for AI test generation. Leave API key empty to keep current value.
          </Typography>
          <TextField
            fullWidth
            label="API Key"
            type="password"
            value={llmForm.apiKey}
            onChange={(e) => setLlmForm((f) => ({ ...f, apiKey: e.target.value }))}
            placeholder="sk-..."
            sx={{ mb: 0.5, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
            Or set TESTBLOX_LLM_API_KEY in env (e.g. in .env in workspace root) to avoid storing the key here.
          </Typography>
          <TextField
            fullWidth
            label="Model name"
            value={llmForm.modelName}
            onChange={(e) => setLlmForm((f) => ({ ...f, modelName: e.target.value }))}
            placeholder="openai/gpt-4o-mini"
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <TextField
            fullWidth
            label="API Base URL"
            value={llmForm.apiBaseUrl}
            onChange={(e) => setLlmForm((f) => ({ ...f, apiBaseUrl: e.target.value }))}
            placeholder="https://openrouter.ai/api/v1"
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Save to: {llmForm.scope === 'global' ? 'Global (all workspaces)' : 'This workspace only'}
          </Typography>
          <Button size="small" onClick={() => setLlmForm((f) => ({ ...f, scope: f.scope === 'global' ? 'workspace' : 'global' }))} sx={{ ml: 1, color: 'secondary.main' }}>
            Switch to {llmForm.scope === 'global' ? 'workspace' : 'global'}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleLlmSave} disabled={llmSaving} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={remotesOpen} onClose={() => setRemotesOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Git remotes</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Add or remove remotes. origin is typically used for fetch/pull/push.
          </Typography>
          {remotes.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontStyle: 'italic' }}>
              Add origin to push to GitHub or GitLab.
            </Typography>
          )}
          {remotes.map((r) => (
            <Box key={r.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.primary', minWidth: 80 }}>{r.name}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.url}</Typography>
              <Button size="small" color="error" onClick={() => handleRemoveRemote(r.name)} disabled={gitBusy}>Remove</Button>
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <TextField size="small" label="Name" value={newRemoteName} onChange={(e) => setNewRemoteName(e.target.value)} placeholder="origin" sx={{ width: 120, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
            <TextField size="small" label="URL" value={newRemoteUrl} onChange={(e) => setNewRemoteUrl(e.target.value)} placeholder="https://..." sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
            <Button size="small" variant="outlined" onClick={handleAddRemote} disabled={gitBusy || !newRemoteName.trim() || !newRemoteUrl.trim()} sx={{ borderColor: 'divider', color: 'text.primary' }}>Add</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemotesOpen(false)} sx={{ color: 'text.secondary' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={commitOpen} onClose={() => setCommitOpen(false)} PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Commit changes</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder="Commit message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommitOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleCommit} disabled={!commitMessage.trim() || gitBusy} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>
            Commit
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={workspaceTitleOpen} onClose={() => !workspaceTitleSaving && setWorkspaceTitleOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Workspace name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            value={workspaceTitleValue}
            onChange={(e) => setWorkspaceTitleValue(e.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkspaceTitleOpen(false)} disabled={workspaceTitleSaving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleWorkspaceTitleSave} disabled={workspaceTitleSaving} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={generateDialogOpen} onClose={() => !generateBusy && setGenerateDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Generate tests with AI</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Select pages and/or API endpoints. The AI will generate UI and/or API test scenarios.</Typography>
          <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Pages</Typography>
          <Autocomplete
            multiple
            options={pages}
            getOptionLabel={(p) => p.title || p.url || p.id}
            value={pages.filter((p) => generatePageIds.includes(p.id))}
            onChange={(_, next) => setGeneratePageIds(next.map((p) => p.id))}
            renderTags={(value, getTagProps) =>
              value.map((p, i) => (
                <Chip
                  key={p.id}
                  label={p.title || p.url || '—'}
                  size="small"
                  {...getTagProps({ index: i })}
                  sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search pages…"
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
              />
            )}
            sx={{ mb: 2 }}
          />
          <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>API Bases</Typography>
          <Autocomplete
            multiple
            options={generateApiBases}
            getOptionLabel={(b) => b.title || b.baseUrl || b.id}
            value={generateApiBases.filter((b) => generateBaseIds.includes(b.id))}
            onChange={(_, next) => setGenerateBaseIds(next.map((b) => b.id))}
            renderTags={(value, getTagProps) =>
              value.map((b, i) => (
                <Chip
                  key={b.id}
                  label={b.title || b.baseUrl || '—'}
                  size="small"
                  {...getTagProps({ index: i })}
                  sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search API bases…"
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
              />
            )}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Additional instructions (optional)"
            value={generatePrompt}
            onChange={(e) => setGeneratePrompt(e.target.value)}
            multiline
            rows={2}
            placeholder="e.g. Focus on login and profile API"
            sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          {generateError && <Typography sx={{ color: 'error.main', mt: 2 }}>{generateError}</Typography>}
          {generateResult && generateResult.length > 0 && (
            <Typography sx={{ color: 'success.main', mt: 2 }}>Created {generateResult.length} test(s).</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)} disabled={generateBusy} sx={{ color: 'text.secondary' }}>Close</Button>
          <Button onClick={handleGenerateSubmit} disabled={generateBusy || (generatePageIds.length === 0 && generateBaseIds.length === 0)} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>
            {generateBusy ? 'Generating…' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newTestDialogOpen} onClose={() => !newTestSaving && setNewTestDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Add test</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Test title"
            value={newTestTitle}
            onChange={(e) => setNewTestTitle(e.target.value)}
            placeholder="e.g. Login flow"
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTestDialogOpen(false)} disabled={newTestSaving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleNewTestSubmit} disabled={newTestSaving} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addPageOpen} onClose={() => !addPageSaving && setAddPageOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Add page</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            A page is a URL you want to test. You can parse it later to get elements for building test steps.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            placeholder="e.g. Login page"
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <TextField
            fullWidth
            label="URL"
            value={newPageUrl}
            onChange={(e) => setNewPageUrl(e.target.value)}
            placeholder="https://example.com"
            sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPageOpen(false)} disabled={addPageSaving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleAddPageSubmit} disabled={addPageSaving} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>
            {addPageSaving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cloneDialogOpen} onClose={() => !cloneLoading && setCloneDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Copy workspace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="New workspace name"
            value={cloneFolderName}
            onChange={(e) => setCloneFolderName(e.target.value)}
            placeholder="Workspace (copy)"
            sx={{ mt: 1, mb: 2, '& .MuiOutlinedInput-root': { color: 'text.primary' } }}
          />
          <TextField fullWidth label="Destination folder" value={cloneParentPath} readOnly placeholder="Choose folder" sx={{ mb: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
          <Button size="small" onClick={handleCloneChooseFolder} sx={{ color: 'secondary.main' }}>Choose folder</Button>
          {cloneError && <Typography variant="body2" sx={{ color: 'error.main', mt: 2 }}>{cloneError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialogOpen(false)} disabled={cloneLoading} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleCloneSubmit} disabled={cloneLoading || !cloneParentPath.trim()} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>
            {cloneLoading ? 'Copying…' : 'Copy'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => !importLoading && setImportDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ color: 'secondary.main' }}>Import workspace from ZIP</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="ZIP file" value={importZipPath} readOnly placeholder="Select ZIP file" sx={{ mt: 1, mb: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
          <Button size="small" onClick={handleImportSelectZip} sx={{ color: 'secondary.main', mb: 2 }}>Select ZIP file</Button>
          <TextField fullWidth label="Destination folder" value={importTargetPath} readOnly placeholder="Choose folder" sx={{ mb: 1, '& .MuiOutlinedInput-root': { color: 'text.primary' } }} />
          <Button size="small" onClick={handleImportSelectFolder} sx={{ color: 'secondary.main' }}>Choose folder</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importLoading} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleImportSubmit} disabled={importLoading || !importZipPath || !importTargetPath} variant="contained" sx={{ bgcolor: 'success.main', color: 'background.default', '&:hover': { bgcolor: 'success.dark' } }}>
            {importLoading ? 'Importing…' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );

  return (
    <MainLayout
      header={workspaceHeader}
      sidebar={workspaceSidebar}
      content={workspaceContent}
    />
  );
}
