import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, Snackbar, Alert,
  Box, Divider, Paper
} from "@mui/material";

const GOLD_PRIMARY = "#B78629";

export default function EditDialog({ open, onClose, entry, onSave, loading }) {
  // State for all items (each with TouchValue, KaratValue, Remark)
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Sync items when entry changes
  useEffect(() => {
    if (entry && entry.items && entry.items.length > 0) {
      // Multi-item structure
      setItems(entry.items.map(item => ({
        ItemID: item.ItemID,
        SampleType: item.SampleType,
        SampleWeight: item.SampleWeight,
        TouchValue: item.TouchValue ?? "",
        KaratValue: item.KaratValue ?? "",
        Remark: item.Remark || ""
      })));
    } else if (entry) {
      // Fallback for legacy single-item structure
      setItems([{
        ItemID: entry.ItemID,
        SampleType: entry.SampleType,
        SampleWeight: entry.SampleWeight,
        TouchValue: entry.TouchValue ?? "",
        KaratValue: entry.KaratValue ?? "",
        Remark: entry.Remark || ""
      }]);
    } else {
      setItems([]);
    }
  }, [entry]);

  // Update a specific item's field
  const handleItemChange = (index, field, value) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  function handleSave() {
    // Validate all items
    for (let i = 0; i < items.length; i++) {
      if (isNaN(Number(items[i].TouchValue)) || isNaN(Number(items[i].KaratValue))) {
        setError(`Item ${i + 1}: Touch and Karat must be numbers.`);
        return;
      }
    }
    setError("");

    // Build payload with updated items
    const updatedEntry = {
      ...entry,
      items: items.map(item => ({
        ItemID: item.ItemID,
        SampleType: item.SampleType,
        SampleWeight: item.SampleWeight,
        TouchValue: Number(item.TouchValue) || 0,
        KaratValue: Number(item.KaratValue) || 0,
        Remark: item.Remark
      }))
    };

    onSave(updatedEntry, () => setSuccess(true));
  }

  const handleCloseSnackbar = () => setSuccess(false);

  const formatWeight = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n.toFixed(3) : val;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: "#fcf5e7", color: GOLD_PRIMARY, fontWeight: 'bold' }}>
          Edit Transaction: SR. No {entry?.TransactionID}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {entry && (
            <Stack spacing={2}>
              {/* Header Info (Read-only) */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#faf9f3" }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="Customer Name"
                    value={entry.CustomerName}
                    InputProps={{ readOnly: true }}
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                  />
                  <TextField
                    label="Mobile"
                    value={entry.CustomerMobile || "-"}
                    InputProps={{ readOnly: true }}
                    size="small"
                    sx={{ flex: 1, minWidth: 150 }}
                  />
                  <TextField
                    label="Date"
                    value={entry.TransactionDate?.substring(0, 19).replace("T", " ") || ""}
                    InputProps={{ readOnly: true }}
                    size="small"
                    sx={{ flex: 1, minWidth: 180 }}
                  />
                </Box>
              </Paper>

              <Divider sx={{ my: 1 }} />

              {/* Items Section */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: GOLD_PRIMARY }}>
                Items ({items.length})
              </Typography>

              {items.map((item, index) => (
                <Paper key={item.ItemID || index} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: GOLD_PRIMARY }}>
                    Item {index + 1}: {item.SampleType}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                      label="Weight (g)"
                      value={formatWeight(item.SampleWeight)}
                      InputProps={{ readOnly: true }}
                      size="small"
                      sx={{ width: 120 }}
                    />
                    <TextField
                      label="Touch Value"
                      value={item.TouchValue}
                      type="number"
                      onChange={e => handleItemChange(index, 'TouchValue', e.target.value)}
                      size="small"
                      sx={{ width: 120 }}
                      inputProps={{ step: "0.01" }}
                    />
                    <TextField
                      label="Karat Value"
                      value={item.KaratValue}
                      type="number"
                      onChange={e => handleItemChange(index, 'KaratValue', e.target.value)}
                      size="small"
                      sx={{ width: 120 }}
                      inputProps={{ step: "0.01" }}
                    />
                    <TextField
                      label="Remark"
                      value={item.Remark}
                      onChange={e => handleItemChange(index, 'Remark', e.target.value)}
                      size="small"
                      sx={{ flex: 1, minWidth: 150 }}
                    />
                  </Box>
                </Paper>
              ))}

              {error && <Typography color="error" fontSize={13}>{error}</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="error" disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading} sx={{ bgcolor: GOLD_PRIMARY }}>
            {loading ? "Saving..." : "Save All"}
          </Button>
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
