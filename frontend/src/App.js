import React, { useState } from 'react';
import EntryForm from './components/EntryForm';
import EntryTable from './components/EntryTable';
import HeroTitle from './components/HeroTitle';
import {
  Box, CssBaseline, useMediaQuery, Dialog, DialogContent, DialogTitle, DialogActions, Button, Snackbar
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const GOLD_PRIMARY = "#B78629";
const OFF_WHITE = "#f5f7fa";

const getTheme = () =>
  createTheme({
    palette: {
      primary: { main: GOLD_PRIMARY },
      background: { default: OFF_WHITE, paper: "#fff" },
      text: { primary: "#232C38", secondary: GOLD_PRIMARY }
    },
    typography: {
      fontFamily: "'Montserrat','Segoe UI','Roboto',sans-serif"
    }
  });

export default function App() {
  const isMobile = useMediaQuery('(max-width:900px)');
  const [formOpen, setFormOpen] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(Date.now());

  // Snackbar (gold notification)
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const handleFormSuccess = (entryId) => {
  setFormOpen(false);
  setRefreshFlag(Date.now());
  setSnackMsg(entryId ? `Entry created successfully! SR. No: ${entryId}` : 'Entry created successfully!');
  setSnackOpen(true);
};
 


  return (
    <ThemeProvider theme={getTheme()}>
      <CssBaseline />
      <HeroTitle />
      <Box
        sx={{
          minHeight: '85vh',
          px: isMobile ? 0.7 : 2.5,
          py: isMobile ? 0.7 : 1.5,
          background: `linear-gradient(120deg,#faf9ec 90%,#f5f7fa 100%)`,
          transition: 'background 0.38s',
        }}
      >
        <EntryTable
          refreshFlag={refreshFlag}
          onCreateClick={() => setFormOpen(true)}
        />

        <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle
            sx={{
              fontWeight: 'bold',
              color: GOLD_PRIMARY,
              background: "#fcf5e7"
            }}
          >
            Create Entry
          </DialogTitle>
          <DialogContent sx={{ pb: 1.5 }}>
            <EntryForm onSuccess={handleFormSuccess} />
          </DialogContent>
          <DialogActions sx={{ pb: 2, pr: 2 }}>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={snackOpen}
          autoHideDuration={2600}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
           sx={{
              top: '50% !important',
              transform: 'translateY(-50%)'
            }}
        >
          <MuiAlert
            onClose={() => setSnackOpen(false)}
            severity="success"
            variant="filled"
            elevation={8}
             sx={{
              fontWeight: 700,
              fontSize: 18,
              background: 'linear-gradient(90deg, #fffbe7 60%, #f7e3b4 100%)', // faded cream gold
              color: '#7a6234', // soft gold-brown text
              letterSpacing: 1,
              boxShadow: '0 4px 32px #e6be7e22',
              borderRadius: 3,
              border: '1px solid #f2e2b2'
            }}
          >
            {snackMsg}
          </MuiAlert>
        </Snackbar>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(34px);}
            to { opacity: 1; transform: translateY(0);}
          }
          .fade-in { animation: fadeIn 0.7s cubic-bezier(.5,1.4,.7,1); }
        `}</style>
      </Box>
    </ThemeProvider>
  );
}
