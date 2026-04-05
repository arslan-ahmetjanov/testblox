import { Box, Button, Typography, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ScreenHeader from '../components/ScreenHeader';
import SectionLabel from '../components/SectionLabel';

export default function PagesListScreen({ pages, onAddPage, onOpenPage }) {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <ScreenHeader
        title="Pages"
        actions={
          <Button size="small" startIcon={<AddIcon />} onClick={onAddPage} sx={{ color: 'primary.main' }}>
            Add
          </Button>
        }
      />
      <SectionLabel sx={{ mb: 0.5 }}>All pages</SectionLabel>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Pages are URLs you want to test. Select a page to open its elements and tests.
      </Typography>
      <List dense>
        {pages.length === 0 && (
          <ListItem>
            <ListItemText
              primary="No pages yet"
              secondary="Click Add to create a page (title + URL), then generate elements and tests"
              primaryTypographyProps={{ sx: { color: 'text.primary' } }}
              secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
            />
          </ListItem>
        )}
        {pages.map((p) => (
          <ListItem key={p.id} disablePadding>
            <ListItemButton onClick={() => onOpenPage?.(p.id)}>
              <ListItemText
                primary={p.title}
                secondary={p.url || '—'}
                primaryTypographyProps={{ sx: { color: 'text.primary' } }}
                secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

