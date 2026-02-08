import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, Snackbar, Alert,
  Box, Divider, Paper
} from "@mui/material";

const GOLD_PRIMARY = "#B78629";

export default function EditDialog({ open, onClose, entry, onSave, loading }) {
  // State for all items (each with TouchValue)
  const [items, setItems] = useState([]);
  // Transaction-level remark
  const [remark, setRemark] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Sync items and remark when entry changes
  useEffect(() => {
    if (entry && entry.items && entry.items.length > 0) {
      // Multi-item structure
      setItems(entry.items.map(item => ({
        ItemID: item.ItemID,
        SampleType: item.SampleType,
        SampleWeight: item.SampleWeight,
        TouchValue: item.TouchValue ?? ""
      })));
      setRemark(entry.Remark || "");
    } else if (entry) {
      // Fallback for legacy single-item structure
      setItems([{
        ItemID: entry.ItemID,
        SampleType: entry.SampleType,
        SampleWeight: entry.SampleWeight,
        TouchValue: entry.TouchValue ?? ""
      }]);
      setRemark(entry.Remark || "");
    } else {
      setItems([]);
      setRemark("");
    }
  }, [entry]);

  // Update a specific item's field
  const handleItemChange = (index, field, value) => {
    // Apply validation based on field type
    let validatedValue = value;
    if (field === 'TouchValue') {
      validatedValue = validateTouch(value);
    }
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: validatedValue } : item
    ));
  };

  // Touch value: max 2 decimal places, range 0-100
  const validateTouch = (val) => {
    if (val === '') return '';
    // Allow only numbers and one decimal point
    let cleaned = val.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    // Ensure value is within valid range (0-100 for percentage)
    const num = parseFloat(cleaned);
    if (num > 100) return '100';
    if (num < 0) return '0';
    return cleaned;
  };

  function handleSave() {
    // Validate all items
    for (let i = 0; i < items.length; i++) {
      if (isNaN(Number(items[i].TouchValue))) {
        setError(`Item ${i + 1}: Tunch must be a number.`);
        return;
      }
    }
    setError("");

    // Build payload with updated items and transaction-level remark
    const updatedEntry = {
      ...entry,
      Remark: remark,
      items: items.map(item => ({
        ItemID: item.ItemID,
        SampleType: item.SampleType,
        SampleWeight: item.SampleWeight,
        TouchValue: Number(item.TouchValue) || 0
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
                      label="Tunch Value"
                      value={item.TouchValue}
                      onChange={e => handleItemChange(index, 'TouchValue', e.target.value)}
                      size="small"
                      sx={{ width: 120 }}
                      placeholder="0.00"
                      helperText
                    />
                  </Box>
                </Paper>
              ))}

              <Divider sx={{ my: 1 }} />

              {/* Transaction Remark */}
              <TextField
                label="Remark (for this transaction)"
                value={remark}
                onChange={e => setRemark(e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={2}
              />

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
