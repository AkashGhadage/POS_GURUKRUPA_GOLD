import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, Snackbar, Alert
} from "@mui/material";

export default function EditDialog({ open, onClose, entry, onSave, loading }) {
  const [touchValue, setTouchValue] = useState(entry ? entry.TouchValue : "");
  const [karatValue, setKaratValue] = useState(entry ? entry.KaratValue : "");
  const [remark, setRemark] = useState(entry ? entry.Remark || "" : "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    setTouchValue(entry ? entry.TouchValue : "");
    setKaratValue(entry ? entry.KaratValue : "");
    setRemark(entry ? entry.Remark || "" : "");
  }, [entry]);

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
              <TextField
                label="Touch Value"
                value={touchValue}
                type="number"
                onChange={e => setTouchValue(e.target.value)}
                fullWidth
                size="small"
                margin="dense"
              />
              <TextField
                label="Karat Value"
                value={karatValue}
                type="number"
                onChange={e => setKaratValue(e.target.value)}
                fullWidth
                size="small"
                margin="dense"
              />
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
          <Button onClick={handleSave} variant="contained" disabled={loading}>Save</Button>
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
