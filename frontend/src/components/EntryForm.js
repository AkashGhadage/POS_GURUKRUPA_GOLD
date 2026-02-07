import React, { useState } from 'react';
import {
  TextField, Button, MenuItem, Paper, Autocomplete, Typography,
  Select, InputLabel, FormControl, Box, IconButton, Divider, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const sampleTypeOptions = ['GOLD SAMPLE', 'SILVER SAMPLE', 'GOLD ORNAMENT', 'SILVER ORNAMENT', 'Coin', 'Bar', 'Ring'];

export default function EntryForm({ onSuccess }) {
  const [form, setForm] = useState({
    CustomerName: '', 
    CustomerMobile: '', 
    SampleWeight: '',
    SampleType: 'GOLD SAMPLE', 
    TestingMethod: 'Without Print', 
    Remark: '',
  });
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const isLocked = itemsList.length > 0;

  // --- VALIDATION RULES ---
  const validateMobile = (val) => val.replace(/\D/g, '').slice(0, 10);
  const validateWeight = (val) => {
    if (val === '') return '';
    const num = parseFloat(val);
    return num >= 0 ? val : '0';
  };

  const handleSearch = async (query) => {
    if (!query || query.length < 2) {
      setOptions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/customers/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setOptions(data);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAdd = () => {
    if (!form.SampleWeight || parseFloat(form.SampleWeight) <= 0) 
        return setError("Please enter a valid weight (greater than 0).");
    if (!form.CustomerName) 
        return setError("Please enter Customer Name first.");
    
    setItemsList([...itemsList, { 
      SampleType: form.SampleType, 
      SampleWeight: parseFloat(form.SampleWeight) 
    }]);
    
    setForm({ ...form, SampleWeight: '' }); 
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    let finalItems = itemsList.map(item => ({
      SampleWeight: parseFloat(item.SampleWeight),
      SampleType: item.SampleType,
      TouchValue: 0.0,
      KaratValue: 0.0,
      Remark: ""
    }));

    if (form.SampleWeight && parseFloat(form.SampleWeight) > 0) {
      finalItems.push({
        SampleWeight: parseFloat(form.SampleWeight),
        SampleType: form.SampleType,
        TouchValue: 0.0,
        KaratValue: 0.0,
        Remark: ""
      });
    }

    if (finalItems.length === 0) return setError("Please add at least one item.");
    if (form.CustomerMobile && form.CustomerMobile.length !== 10) 
        return setError("Mobile number must be exactly 10 digits.");

    setLoading(true);

    const payload = {
      CustomerName: form.CustomerName.toUpperCase(), // Clean data: Always save names in Uppercase
      CustomerMobile: form.CustomerMobile || "",
      TestingMethod: form.TestingMethod,
      Items: finalItems 
    };

    try {
      const res = await fetch('http://localhost:8000/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail?.[0]?.msg || "Server Validation Error");
      }
      
      const data = await res.json();
      setItemsList([]);
      setForm({ 
        CustomerName: '', CustomerMobile: '', SampleWeight: '', 
        SampleType: 'GOLD SAMPLE', TestingMethod: 'Without Print', Remark: '' 
      });
      
      if (onSuccess) onSuccess(data.TransactionID); 

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch' }}>
        
        {/* LEFT COLUMN: CUSTOMER INFO */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#B78629', mb: 1, mt: 2 }}>
            CUSTOMER INFO
          </Typography>

          <Autocomplete
            freeSolo
            disabled={isLocked}
            options={options}
            getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.CustomerName}
            onInputChange={(e, val) => {
              setForm({ ...form, CustomerName: val });
              handleSearch(val);
            }}
            onChange={(e, val) => {
              if (val && typeof val !== 'string') {
                setForm({ ...form, CustomerName: val.CustomerName, CustomerMobile: val.CustomerMobile });
              }
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.CustomerMobile + option.CustomerName}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{option.CustomerName}</Typography>
                  <Typography variant="caption" color="primary">{option.CustomerMobile}</Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField {...params} label="Customer Name*" required size="small" 
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>{searchLoading ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>
                  ),
                }}
              />
            )}
          />

          <TextField 
            label="Mobile" fullWidth size="small" disabled={isLocked}
            value={form.CustomerMobile} 
            onChange={(e) => {
                const cleanVal = validateMobile(e.target.value);
                setForm({...form, CustomerMobile: cleanVal});
                handleSearch(cleanVal);
            }} 
            inputProps={{ maxLength: 10 }}
            helperText={form.CustomerMobile.length > 0 && form.CustomerMobile.length < 10 ? "Must be 10 digits" : ""}
          />

          <FormControl fullWidth size="small" disabled={isLocked}>
            <InputLabel>Method</InputLabel>
            <Select label="Method" value={form.TestingMethod} onChange={(e)=>setForm({...form, TestingMethod: e.target.value})}>
              <MenuItem value="With Print">With Print</MenuItem>
              <MenuItem value="Without Print">Without Print</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Remark" fullWidth size="small" multiline rows={4} disabled={isLocked}
            value={form.Remark} onChange={(e)=>setForm({...form, Remark: e.target.value})} 
          />
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, borderRightWidth: 1.5 }} />

        {/* RIGHT COLUMN: ITEM DETAILS */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#B78629', mb: 1, mt: 2 }}>
            ITEM DETAILS
          </Typography>
          <Autocomplete 
            freeSolo options={sampleTypeOptions} value={form.SampleType} size="small"
            onChange={(e, v) => setForm({...form, SampleType: v || 'GOLD SAMPLE'})}
            renderInput={(params) => <TextField {...params} label="Sample Type" fullWidth />}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Weight (gm)" fullWidth size="small" type="number" 
              value={form.SampleWeight} 
              onChange={(e) => setForm({...form, SampleWeight: validateWeight(e.target.value)})} 
            />
            <Button variant="contained" onClick={handleAdd} sx={{ minWidth: '60px', bgcolor: '#B78629' }}>
              <AddIcon />
            </Button>
          </Box>

          <Paper variant="outlined" sx={{ p: 1, bgcolor: '#fdfdfd', height: '180px', overflowY: 'auto' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#888', mb: 1, display: 'block' }}>ITEM LIST</Typography>
            {itemsList.map((it, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, mb: 1, bgcolor: '#fff', border: '1px solid #eee' }}>
                <Typography variant="body2">{idx+1}. {it.SampleType} ({it.SampleWeight}g)</Typography>
                <IconButton size="small" onClick={() => setItemsList(itemsList.filter((_, i) => i !== idx))}><DeleteIcon fontSize="inherit" color="error" /></IconButton>
              </Box>
            ))}
          </Paper>
        </Box>
      </Box>

      {error && <Typography color="error" variant="caption" sx={{ mt: 2, display: 'block', textAlign: 'center', fontWeight: 'bold' }}>{error}</Typography>}

      <Button type="submit" variant="contained" fullWidth disabled={loading}
        sx={{ mt: 4, py: 1.5, bgcolor: '#B78629', fontWeight: 'bold', fontSize: '1rem' }}
      >
        {loading ? "SAVING..." : `  SAVE ALL (${itemsList.length + (form.SampleWeight ? 1 : 0)})`}
      </Button>
    </Box>
  );
}