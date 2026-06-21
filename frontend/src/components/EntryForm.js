import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  InputAdornment,
  Chip,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ClearIcon from '@mui/icons-material/Clear';

const sampleTypeOptions = [
  'GOLD SAMPLE','GOLD SKIN TEST','SILVER SAMPLE','SILVER SKIN TEST',"GOLD ORNAMENT","SILVER ORNAMENT",'Reni','Rava', 'Chas','Coin', 'Bar','Ring', 'Chain','Bangle', 'Pendant', 'Other'
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
    TestingMethod: 'Without Print',
    Remark: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceSuggestions, setVoiceSuggestions] = useState([]);
  const mediaRecorderRef = useRef(null);
  const printOnSubmitRef = useRef(false);
  const voiceFieldRef = useRef('CustomerName');

  // Phonetic key — simplifies Indian names to how they SOUND
  function phoneticKey(str) {
    if (!str) return '';
    return str.toUpperCase()
      .replace(/[AEIOU]+/g, 'A')
      .replace(/PH/g, 'F')
      .replace(/GH/g, 'G')
      .replace(/SH/g, 'S')
      .replace(/TH/g, 'T')
      .replace(/CH/g, 'C')
      .replace(/CK/g, 'K')
      .replace(/(.)\1+/g, '$1')
      .replace(/[^A-Z]/g, '');
  }

  // Fuzzy similarity score (0 to 1) using Levenshtein
  function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length >= b.length ? b : a;
    if (longer.length === 0) return 1;
    const costs = [];
    for (let i = 0; i <= longer.length; i++) {
      let lastVal = i;
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) { costs[j] = j; }
        else if (j > 0) {
          let newVal = costs[j - 1];
          if (longer[i - 1] !== shorter[j - 1]) {
            newVal = Math.min(Math.min(newVal, lastVal), costs[j]) + 1;
          }
          costs[j - 1] = lastVal;
          lastVal = newVal;
        }
      }
      if (i > 0) costs[shorter.length] = lastVal;
    }
    return (longer.length - costs[shorter.length]) / longer.length;
  }

  // Combined score: 60% text + 40% phonetic
  function matchScore(heard, known) {
    const textSim = similarity(heard, known);
    const phoneSim = similarity(phoneticKey(heard), phoneticKey(known));
    return textSim * 0.6 + phoneSim * 0.4;
  }

  // Find best customer matches from all alternatives
  function findBestFromAlternatives(alternatives) {
    if (!alternatives || alternatives.length === 0 || customerOptions.length === 0) return null;
    let bestMatch = null;
    let bestScore = 0;
    for (const alt of alternatives) {
      for (const opt of customerOptions) {
        const score = matchScore(alt, opt.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { name: opt.name, mobile: opt.mobile, score };
        }
      }
    }
    return bestScore >= 0.6 ? bestMatch : null;
  }

  // Find top N matching customers
  function findTopMatches(text, topN = 4) {
    if (!text || customerOptions.length === 0) return [];
    const upper = text.toUpperCase().trim();
    const scored = customerOptions.map(opt => ({
      name: opt.name,
      mobile: opt.mobile,
      score: matchScore(upper, opt.name),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.filter(s => s.score >= 0.5).slice(0, topN);
  }

  async function startVoiceInput(field = 'CustomerName') {
    if (listening) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    voiceFieldRef.current = field;
    setVoiceSuggestions([]);
    setInterimText('Recording...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const chunks = [];

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(data));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Store refs for stopping
      mediaRecorderRef.current = { state: 'recording', stop: () => {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        stream.getTracks().forEach(t => t.stop());

        setListening(false);
        setInterimText('Recognizing...');

        // Convert PCM float32 to WAV
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        if (totalLength < 1000) {
          setInterimText('');
          setError('Recording too short — hold mic longer');
          return;
        }
        const pcm = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          pcm.set(chunk, offset);
          offset += chunk.length;
        }

        // Downsample to 16000Hz if needed for smaller file & better compatibility
        const actualRate = audioContext.sampleRate;
        let finalPcm = pcm;
        let finalRate = actualRate;
        if (actualRate > 16000) {
          const ratio = actualRate / 16000;
          const newLength = Math.floor(pcm.length / ratio);
          finalPcm = new Float32Array(newLength);
          for (let i = 0; i < newLength; i++) {
            finalPcm[i] = pcm[Math.floor(i * ratio)];
          }
          finalRate = 16000;
        }

        const wavBuffer = encodeWAV(finalPcm, finalRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });

        // Send to backend
        sendAudioToBackend(blob);
      }};

      setListening(true);
    } catch (err) {
      setListening(false);
      setInterimText('');
      setError('Microphone access denied');
    }
  }

  function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true);  // PCM format
    view.setUint16(22, 1, true);  // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true);  // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Convert float32 to int16
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  async function sendAudioToBackend(blob) {
    try {
      const res = await fetch('http://localhost:8000/voice-recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: blob,
      });
      const data = await res.json();

      if (data.error && !data.text) {
        setInterimText('');
        setError('Voice: ' + data.error);
        return;
      }

      const targetField = voiceFieldRef.current;
      const alternatives = data.alternatives || [];
      const bestText = data.text || '';

      if (targetField === 'CustomerName' && customerOptions.length > 0) {
        const match = findBestFromAlternatives(alternatives);
        if (match && match.score >= 0.75) {
          setForm(f => ({ ...f, CustomerName: match.name, CustomerMobile: match.mobile || f.CustomerMobile }));
          setVoiceSuggestions([]);
        } else {
          setForm(f => ({ ...f, [targetField]: bestText }));
          const suggestions = findTopMatches(bestText);
          if (suggestions.length > 0) {
            setVoiceSuggestions(suggestions);
          }
        }
      } else {
        setForm(f => ({ ...f, [targetField]: bestText }));
      }
      setInterimText('');
    } catch (err) {
      setInterimText('');
      setError('Voice recognition failed: ' + err.message);
    }
  }

  function selectSuggestion(suggestion) {
    setForm(f => ({
      ...f,
      CustomerName: suggestion.name,
      CustomerMobile: suggestion.mobile || f.CustomerMobile,
    }));
    setVoiceSuggestions([]);
  }

  useEffect(() => {
    fetch('http://localhost:8000/entries')
      .then(r => r.json())
      .then(data => {
        // unique (name, mobile) pairs — same name with different mobiles = separate options
        const seen = new Set();
        const opts = [];
        data.forEach(e => {
          const name = e.CustomerName ? e.CustomerName.toUpperCase() : null;
          if (!name) return;
          const mobile = e.CustomerMobile || '';
          const key = `${name}|${mobile}`;
          if (!seen.has(key)) { seen.add(key); opts.push({ name, mobile }); }
        });
        opts.sort((a, b) => a.name.localeCompare(b.name) || a.mobile.localeCompare(b.mobile));
        setCustomerOptions(opts);
      })
      .catch(() => {});
  }, []);

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
    const shouldPrint = printOnSubmitRef.current;
    printOnSubmitRef.current = false;
    await submitForm(shouldPrint);
  }

  async function submitForm(shouldPrint) {
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

      if (shouldPrint) {
        await fetch('http://localhost:8000/print-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Entry: data, Copies: 2 }),
        });
      }

      setForm({
        CustomerName: '',
        CustomerMobile: '',
        SampleWeight: '',
        SampleType: '',
        TouchValue: '',
        KaratValue: '',
        TestingMethod: 'Without Print',
        Remark: '',
      });
      // refresh customer suggestions so newly added customer appears
      fetch('http://localhost:8000/entries')
        .then(r => r.json())
        .then(data => {
          const seen = new Set();
          const opts = [];
          data.forEach(e => {
            const name = e.CustomerName ? e.CustomerName.toUpperCase() : null;
            if (!name) return;
            const mobile = e.CustomerMobile || '';
            const key = `${name}|${mobile}`;
            if (!seen.has(key)) { seen.add(key); opts.push({ name, mobile }); }
          });
          opts.sort((a, b) => a.name.localeCompare(b.name) || a.mobile.localeCompare(b.mobile));
          setCustomerOptions(opts);
        })
        .catch(() => {});
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
        <Autocomplete
          freeSolo
          options={customerOptions}
          getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.name}
          filterOptions={(options, { inputValue }) => {
            const q = inputValue.toUpperCase();
            return options.filter(o => o.name.includes(q));
          }}
          inputValue={form.CustomerName}
          onInputChange={(e, val, reason) => {
            if (reason === 'input')
              setForm(f => ({ ...f, CustomerName: val.toUpperCase() }));
          }}
          onChange={(e, newValue) => {
            if (!newValue) {
              setForm(f => ({ ...f, CustomerName: '', CustomerMobile: '' }));
            } else if (typeof newValue === 'string') {
              setForm(f => ({ ...f, CustomerName: newValue.toUpperCase() }));
            } else {
              setForm(f => ({ ...f, CustomerName: newValue.name, CustomerMobile: newValue.mobile }));
            }
          }}
          renderOption={(props, opt) => (
            <li {...props} key={`${opt.name}|${opt.mobile}`}>
              <span style={{ fontWeight: 600 }}>{opt.name}</span>
              {opt.mobile && (
                <span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>{opt.mobile}</span>
              )}
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Customer Name"
              name="CustomerName"
              required
              size="small"
              sx={fieldMargin}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {form.CustomerName && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          tabIndex={-1}
                          onClick={() => setForm(f => ({ ...f, CustomerName: '', CustomerMobile: '' }))}
                        >
                          <ClearIcon fontSize="small" sx={{ color: '#aaa' }} />
                        </IconButton>
                      </InputAdornment>
                    )}
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => startVoiceInput('CustomerName')}
                        title={listening ? 'Listening... (click to stop)' : 'Speak customer name'}
                        sx={{
                          color: listening ? '#fff' : '#cfa04f',
                          bgcolor: listening ? '#e53935' : 'transparent',
                          animation: listening ? 'pulse 1s infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': { boxShadow: '0 0 0 0 rgba(229,57,53,0.5)' },
                            '70%': { boxShadow: '0 0 0 8px rgba(229,57,53,0)' },
                            '100%': { boxShadow: '0 0 0 0 rgba(229,57,53,0)' },
                          },
                          '&:hover': { bgcolor: listening ? '#c62828' : '#f5f0e0' },
                        }}
                      >
                        {listening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  </>
                ),
              }}
            />
          )}
        />
        {/* Voice listening indicator */}
        {(listening || interimText) && (
          <Typography variant="caption" sx={{ color: listening ? '#e53935' : '#1565c0', fontStyle: 'italic', mt: -0.5, ml: 1, display: 'block', animation: 'blink 1s infinite', '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }}>
            🎤 {interimText || 'Recording... tap mic to stop'}
          </Typography>
        )}
        {/* Voice suggestions — did you mean? */}
        {voiceSuggestions.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1, mt: -0.5, mb: 0.5, bgcolor: '#fffde7' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Did you mean?
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {voiceSuggestions.map((s, i) => (
                <Chip
                  key={i}
                  label={`${s.name}${s.mobile ? ' (' + s.mobile + ')' : ''}`}
                  size="small"
                  color={i === 0 ? 'primary' : 'default'}
                  variant={i === 0 ? 'filled' : 'outlined'}
                  onClick={() => selectSuggestion(s)}
                  sx={{ cursor: 'pointer', fontWeight: i === 0 ? 700 : 400 }}
                />
              ))}
              <Chip
                label="Keep as typed"
                size="small"
                variant="outlined"
                color="default"
                onClick={() => setVoiceSuggestions([])}
                sx={{ cursor: 'pointer' }}
              />
            </Stack>
          </Paper>
        )}
        <TextField
          label="Mobile"
          name="CustomerMobile"
          fullWidth
          value={form.CustomerMobile}
          onChange={handleMobileChange}
          onFocus={(e) => e.target.select()}
          size="small"
          inputProps={{ maxLength: 10, inputMode: "numeric", pattern: "[0-9]{10}" }}
          InputProps={form.CustomerMobile ? {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setForm(f => ({ ...f, CustomerMobile: '' }))} tabIndex={-1}>
                  <ClearIcon fontSize="small" sx={{ color: '#aaa' }} />
                </IconButton>
              </InputAdornment>
            ),
          } : undefined}
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
          startIcon={<PrintIcon />}
          fullWidth
          type="submit"
          disabled={loading}
          onClick={() => { printOnSubmitRef.current = true; }}
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
          {loading ? 'Saving…' : 'Create & Print (×2)'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon sx={{ color: '#cfa04f' }} />}
          fullWidth
          type="submit"
          disabled={loading}
          onClick={() => { printOnSubmitRef.current = false; }}
          sx={{
            mt: 0.8,
            py: 1,
            fontWeight: 'bold',
            borderColor: '#cfa04f',
            color: '#cfa04f',
            borderRadius: 2,
            fontSize: 15,
            '&:hover': {
              background: 'rgba(207,160,79,0.07)',
              borderColor: '#cfa04f',
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
