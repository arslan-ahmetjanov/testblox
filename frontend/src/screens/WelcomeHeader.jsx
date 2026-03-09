import { Box, Paper, Typography, IconButton } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import TestbloxLogo from '../components/TestbloxLogo';

export default function WelcomeHeader({ themeMode, onToggleTheme }) {
  return (
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
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <TestbloxLogo size={28} color="currentColor" />
      </Box>
      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
        TestBlox
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        No workspace open
      </Typography>
      <Box sx={{ flex: 1 }} />
      {onToggleTheme && (
        <IconButton size="small" onClick={onToggleTheme} aria-label={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} sx={{ color: 'text.secondary' }}>
          {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      )}
    </Paper>
  );
}
