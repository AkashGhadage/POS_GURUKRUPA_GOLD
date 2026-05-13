import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, Snackbar, Alert, Chip, Box
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";

const FALLBACK_TOUCH = [99.9, 95.5, 92.0, 91.6, 90.0, 85.0, 80.0, 75.0];

function rankSuggestions(data, customerName, sampleType) {
  const name = (customerName || '').toUpperCase();
  const type = (sampleType || '').toUpperCase();

  // score map: touchValue -> points
  const scores = {};
  const add = (v, pts) => {
    if (!v || v <= 0) return;
    const k = Number(v).toFixed(2);
    scores[k] = (scores[k] || 0) + pts;
  };

  data.forEach(e => {
    if (!e.TouchValue || e.TouchValue <= 0) return;
    const eName = (e.CustomerName || '').toUpperCase();
    const eType = (e.SampleType || '').toUpperCase();
    const sameCustomer = eName === name;
    const sameType = eType === type;
    if (sameCustomer && sameType) add(e.TouchValue, 10); // best match
    else if (sameCustomer)        add(e.TouchValue, 5);  // same customer
    else if (sameType)            add(e.TouchValue, 2);  // same sample type
    else                          add(e.TouchValue, 1);  // global frequency
  });

  // add fallback values at lowest priority if not already present
  FALLBACK_TOUCH.forEach(v => { const k = v.toFixed(2); if (!scores[k]) scores[k] = 0.5; });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k]) => Number(k));
}

export default function EditDialog({ open, onClose, entry, onSave, loading }) {
  const [touchValue, setTouchValue] = useState(entry ? entry.TouchValue : "");
  const [karatValue, setKaratValue] = useState(entry ? entry.KaratValue : "");
  const [remark, setRemark] = useState(entry ? entry.Remark || "" : "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [touchSuggestions, setTouchSuggestions] = useState(FALLBACK_TOUCH);

  useEffect(() => {
    setTouchValue(entry ? entry.TouchValue : "");
    setKaratValue(entry ? entry.KaratValue : "");
    setRemark(entry ? entry.Remark || "" : "");
    setSuccess(false);
    setError("");
  }, [entry]);

  useEffect(() => {
    if (!open) return;
    fetch('http://localhost:8000/entries')
      .then(r => r.json())
      .then(data => setTouchSuggestions(rankSuggestions(data, entry?.CustomerName, entry?.SampleType)))
      .catch(() => {});
  }, [open, entry?.CustomerName, entry?.SampleType]);

  function handleSave() {
    if (isNaN(Number(touchValue)) || isNaN(Number(karatValue))) {
      setError("Touch and Karat must be numbers.");
      return;
    }
    setError("");
    onSave(
      {
        ...entry,
        TouchValue: Number(touchValue),
        KaratValue: Number(karatValue),
        Remark: remark,
      },
      () => setSuccess(true)
    );
  }

  async function handleSaveAndPrint() {
    if (isNaN(Number(touchValue)) || isNaN(Number(karatValue))) {
      setError("Touch and Karat must be numbers.");
      return;
    }
    setError("");
    const updatedEntry = {
      ...entry,
      TouchValue: Number(touchValue),
      KaratValue: Number(karatValue),
      Remark: remark,
    };
    onSave(updatedEntry, async (savedEntry) => {
      setSuccess(true);
      // Use savedEntry if returned, otherwise use updatedEntry
      const entryToPrint = savedEntry || updatedEntry;
      await fetch("http://localhost:8000/print-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Entry: entryToPrint, Copies: 1 }),
      });
    });
  }

  const handleCloseSnackbar = () => setSuccess(false);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Transaction: SR. No {entry?.TransactionID}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {entry && (
            <Stack spacing={1.2}>
              <TextField
                label="Customer Name"
                value={entry.CustomerName}
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
                margin="dense"
              />
              <TextField
                label="Mobile"
                value={entry.CustomerMobile}
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
                margin="dense"
              />
              <TextField
                label="Sample Weight"
                value={entry.SampleWeight}
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
                margin="dense"
              />
              <TextField
                label="Sample Type"
                value={entry.SampleType}
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
                margin="dense"
              />
              <TextField
                label="Date"
                value={
                  entry.TransactionDate &&
                  entry.TransactionDate.substring(0, 19).replace("T", " ")
                }
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
                margin="dense"
              />
              <Box>
                <Typography variant="caption" sx={{ color: '#888', mb: 0.5, display: 'block' }}>Suggested Touch:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {touchSuggestions.map(v => (
                    <Chip
                      key={v}
                      label={v.toFixed(2)}
                      size="small"
                      onClick={() => {
                        setTouchValue(v.toFixed(2));
                      }}
                      variant={Number(touchValue).toFixed(2) === v.toFixed(2) ? 'filled' : 'outlined'}
                      sx={{
                        borderColor: '#cfa04f',
                        color: Number(touchValue).toFixed(2) === v.toFixed(2) ? '#fff' : '#cfa04f',
                        background: Number(touchValue).toFixed(2) === v.toFixed(2) ? '#cfa04f' : 'transparent',
                        fontWeight: 600, fontSize: 12,
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <TextField
                label="Touch Value"
                value={touchValue}
                type="number"
                onChange={e => setTouchValue(e.target.value)}
                fullWidth
                size="small"
                margin="dense"
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label="Karat Value"
                  value={karatValue}
                  type="number"
                  onChange={e => setKaratValue(e.target.value)}
                  fullWidth
                  size="small"
                  margin="dense"
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const num = parseFloat(touchValue);
                    if (!isNaN(num) && num > 0) setKaratValue((num / 100 * 24).toFixed(2));
                  }}
                  sx={{ mt: '8px', minWidth: 52, borderColor: '#cfa04f', color: '#cfa04f', fontSize: 11, whiteSpace: 'nowrap' }}
                >
                  Calc
                </Button>
              </Box>
              {/* Compact remark field */}
              <TextField
                label="Remark"
                value={remark}
                onChange={e => setRemark(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                size="small"
                margin="dense"
              />
              {error && <Typography color="error" fontSize={13}>{error}</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="error" disabled={loading}>Cancel</Button>
          <Button
            onClick={handleSaveAndPrint}
            variant="contained"
            startIcon={<PrintIcon />}
            disabled={loading}
            sx={{ background: '#cfa04f', '&:hover': { filter: 'brightness(0.96)' } }}
          >
            Save & Print
          </Button>
          <Button onClick={handleSave} variant="outlined" disabled={loading} sx={{ borderColor: '#cfa04f', color: '#cfa04f' }}>Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={success}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ fontWeight: 'bold' }}>
          Entry updated!
        </Alert>
      </Snackbar>
    </>
  );
}
 