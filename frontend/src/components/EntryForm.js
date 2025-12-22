import React, { useState } from 'react';
import {
  TextField,
  Button,
  MenuItem,
  Paper,
  Autocomplete,
  Typography,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const sampleTypeOptions = [
  'Reni','Rava', 'Chas','Tukdi' ,'Bat','Langadi', 'Coin', 'Bar','Ring', 'Chain','Bangle', 'Pendant', 'Other'
];
const testingMethodOptions = ['With Print', 'Without Print'];

export default function EntryForm({ onSuccess }) {
  const [form, setForm] = useState({
    CustomerName: '',
    CustomerMobile: '',
    SampleWeight: '',
    SampleType: '',
    TouchValue: '',
    KaratValue: '',
    TestingMethod: '',
    Remark: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSampleTypeChange(event, newValue) {
    setForm({ ...form, SampleType: newValue || '' });
  }

  function handleMobileChange(e) {
    // Only allow numbers, max 10 digits
    const value = e.target.value.replace(/[^\d]/g, '');
    if (value.length <= 10) {
      setForm({ ...form, CustomerMobile: value });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!form.TestingMethod) {
      setError('Testing method is required.');
      setLoading(false);
      return;
    }
    if (form.CustomerMobile && form.CustomerMobile.length !== 10) {
      setError('Mobile must be exactly 10 digits.');
      setLoading(false);
      return;
    }

    const payload = {
      CustomerName: form.CustomerName,
      CustomerMobile: form.CustomerMobile || "",
      SampleWeight: Number(form.SampleWeight),
      SampleType: form.SampleType,
      // Touch/Karat defaulted to 0 on create; edited later in EditDialog
      TouchValue: form.TouchValue === '' ? 0 : Number(form.TouchValue),
      KaratValue: form.KaratValue === '' ? 0 : Number(form.KaratValue),
      TestingMethod: form.TestingMethod,
      Remark: form.Remark,
    };

    try {
      const res = await fetch('http://localhost:8000/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Server error');
      }
      const data = await res.json();
      setForm({
        CustomerName: '',
        CustomerMobile: '',
        SampleWeight: '',
        SampleType: 'Ring',
        TouchValue: '',
        KaratValue: '',
        TestingMethod: '',
        Remark: '',
      });
      if (onSuccess) onSuccess(data.TransactionID);
    } catch (err) {
      setError(err.message || 'Failed to submit');
    }
    setLoading(false);
  }

  const fieldMargin = { mb: 1.2 };

  return (
    <Paper
      elevation={3}
      sx={{
        px: 1.5,
        py: 1.7,
        borderRadius: 2,
        mt: 1,
        width: '100%',
        maxWidth: 400,
        boxSizing: 'border-box',
        mx: 'auto',
      }}
    >
      <form onSubmit={handleSubmit}>
        <TextField
          label="Customer Name"
          name="CustomerName"
          fullWidth
          required
          value={form.CustomerName}
          onChange={handleChange}
          size="small"
          sx={fieldMargin}
        />
        <TextField
          label="Mobile"
          name="CustomerMobile"
          fullWidth
          value={form.CustomerMobile}
          onChange={handleMobileChange}
          size="small"
          inputProps={{ maxLength: 10, inputMode: "numeric", pattern: "[0-9]{10}" }}
          sx={fieldMargin}
        />
        <TextField
          label="Sample Weight (gm)"
          name="SampleWeight"
          fullWidth
          required
          type="number"
          inputProps={{ step: "0.001", min: "0.001" }}
          value={form.SampleWeight}
          onChange={handleChange}
          size="small"
          sx={fieldMargin}
        />
        <Autocomplete
          freeSolo
          options={sampleTypeOptions}
          value={form.SampleType}
          onChange={handleSampleTypeChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Sample Type"
              name="SampleType"
              fullWidth
              required
              size="small"
              sx={fieldMargin}
              onChange={(e) => setForm({ ...form, SampleType: e.target.value })}
            />
          )}
        />
        <FormControl fullWidth size="small" sx={fieldMargin}>
          <InputLabel id="testing-method-label">Testing Method</InputLabel>
          <Select
            labelId="testing-method-label"
            label="Testing Method"
            name="TestingMethod"
            value={form.TestingMethod}
            onChange={handleChange}
            required
          >
            {testingMethodOptions.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Remark"
          name="Remark"
          fullWidth
          multiline
          minRows={2}
          value={form.Remark}
          onChange={handleChange}
          size="small"
          sx={fieldMargin}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ color: '#fff' }} />}
          fullWidth
          type="submit"
          disabled={loading}
          sx={{
            mt: 0.5,
            py: 1,
            fontWeight: 'bold',
            background: '#cfa04f',
            color: '#fff',
            boxShadow: '0 2px 7px rgba(207,160,79,0.12)',
            borderRadius: 2,
            mb: 0.1,
            fontSize: 15,
            '&:hover': {
              filter: 'brightness(0.96)',
              boxShadow: '0 4px 10px rgba(207,160,79,0.19)',
            },
          }}
        >
          {loading ? 'Saving…' : 'Create Entry'}
        </Button>
        {error && (
          <Typography color="error" sx={{ mt: 0.6, fontSize: 13 }}>{error}</Typography>
        )}
      </form>
    </Paper>
  );
}
