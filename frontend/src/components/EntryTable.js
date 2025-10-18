import React, { useEffect, useState } from 'react';
import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, TablePagination, TextField, CircularProgress, Button, Select, MenuItem, InputLabel,
  FormControl, Tooltip, TableSortLabel, Box,
  Dialog, DialogActions, DialogContent,
  Checkbox, FormControlLabel, Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';
import EditDialog from './EditDialog';

const GOLD_PRIMARY = "#b78629";
const TABLE_HEAD_BG = "#fff";
const TABLE_ROW_EVEN_BG = "#faf9f3";
const TABLE_ROW_HOVER_BG = "#fffbeee0";
const TABLE_BORDER = "#e6be7e";

// Format date to DD/MM/YYYY HH:MM (24hr)
function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return dateTimeString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatPrintStatus(testingMethod) {
  if (!testingMethod) return '';
  return testingMethod === 'With Print' ? 'Yes' : 'No';
}

function extractDate(dateTimeString) {
  if (!dateTimeString) return '';
  return dateTimeString.substring(0, 10);
}

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
function stableSort(array, comparator) {
  const stabilized = array.map((el, idx) => [el, idx]);
  stabilized.sort((a, b) => {
    const cmp = comparator(a[0], b[0]);
    if (cmp !== 0) return cmp;
    return a[1] - b[1];
  });
  return stabilized.map(el => el[0]);
}

function PrintPreview({ entry, fields }) {
  if (!entry) return null;
  return (
    <div style={{ width: 210, background: "#fffbeee0", padding: 10, borderRadius: 6, fontFamily: "monospace" }}>
      <Typography align="center" sx={{ fontWeight: 700, fontSize: 15, mb: 1, color: "#cfa04f" }}>
        GuruKrupa Gold Testing Center
      </Typography>
      <hr style={{ margin: '6px 0' }}/>
      {fields.TransactionID && <Typography>SR No: {entry.TransactionID}</Typography>}
      {fields.CustomerName && <Typography>Name: {entry.CustomerName}</Typography>}
      {fields.CustomerMobile && <Typography>Mobile: {entry.CustomerMobile}</Typography>}
      {fields.SampleType && <Typography>Sample Type: {entry.SampleType}</Typography>}
      {fields.TransactionDate && <Typography>Date: {formatDateTime(entry.TransactionDate)}</Typography>}
      {fields.SampleWeight && <Typography>Weight: {entry.SampleWeight} gm</Typography>}
      {fields.TouchValue && <Typography>Touch: {entry.TouchValue}</Typography>}
      {fields.KaratValue && <Typography>Karat: {entry.KaratValue}</Typography>}
      {fields.TestingMethod && <Typography>Print Slip: {formatPrintStatus(entry.TestingMethod)}</Typography>}
      {fields.Remark && <Typography>Remark: {entry.Remark}</Typography>}
      <hr style={{ margin: '6px 0' }}/>
      <Typography align="center">Thank you!</Typography>
    </div>
  );
}

export default function EntryTable({ refreshFlag, onCreateClick }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [dateFilter, setDateFilter] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  // Print dialog states
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printEntry, setPrintEntry] = useState(null);
  const [printCopies, setPrintCopies] = useState(1);
  const [printLoading, setPrintLoading] = useState(false);

  const [fieldSelections, setFieldSelections] = useState({
    TransactionID: true,
    CustomerName: true,
    CustomerMobile: true,
    SampleType: true,
    TransactionDate: true,
    SampleWeight: true,
    TouchValue: true,
    KaratValue: true,
    TestingMethod: true,
    Remark: true,
  });

  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('TransactionID');

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:8000/entries')
      .then(res => res.json())
      .then(list => {
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setEntries([]));
  }, [editDialogOpen === false, refreshFlag]);

  const dateOptions = Array.from(
    new Set(entries.map(e => extractDate(e.TransactionDate)))
  ).sort((a, b) => b.localeCompare(a));

  const filteredEntries = entries.filter(entry => {
    const srnoMatch = search && String(entry.TransactionID).includes(search.trim());
    const nameMatch = search && entry.CustomerName?.toLowerCase().includes(search.toLowerCase());
    const mobileMatch = search && entry.CustomerMobile?.toLowerCase().includes(search.toLowerCase());
    const searchPass = !search || srnoMatch || nameMatch || mobileMatch;
    const datePass = !dateFilter || extractDate(entry.TransactionDate) === dateFilter;
    return searchPass && datePass;
  });

  const sortedEntries = stableSort(filteredEntries, getComparator(order, orderBy));

  // Print dialog open/setup
  function handlePrintSetup(row) {
    setPrintEntry(row);
    setPrintCopies(1);
    setFieldSelections({
      TransactionID: true,
      CustomerName: true,
      CustomerMobile: true,
      SampleType: true,
      TransactionDate: true,
      SampleWeight: true,
      TouchValue: true,
      KaratValue: true,
      TestingMethod: true,
      Remark: true,
    });
    setPrintDialogOpen(true);
  }

  function handleFieldChange(field) {
    setFieldSelections(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }

  async function handlePhysicalPrint() {
    setPrintLoading(true);
    try {
      const payload = {};
      Object.keys(fieldSelections).forEach(field => {
        if (fieldSelections[field]) {
          payload[field] = printEntry[field];
        }
      });
      await fetch('http://localhost:8000/print-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Copies: printCopies,
          Entry: payload
        })
      });
      alert('Print job sent to thermal printer!');
    } catch (err) {
      alert("Failed to send print job: " + err.message);
    }
    setPrintLoading(false);
    setPrintDialogOpen(false);
  }

  function openEditDialog(entry) {
    setEditingEntry(entry);
    setEditDialogOpen(true);
  }
  function closeEditDialog() {
    setEditDialogOpen(false);
    setEditingEntry(null);
    setEditLoading(false);
  }

  async function handleDialogSave(updatedEntry, successCallback) {
    setEditLoading(true);
    const payload = {
      CustomerName: updatedEntry.CustomerName,
      CustomerMobile: updatedEntry.CustomerMobile,
      SampleWeight: Number(updatedEntry.SampleWeight),
      SampleType: updatedEntry.SampleType,
      TouchValue: updatedEntry.TouchValue,
      KaratValue: updatedEntry.KaratValue,
      TestingMethod: updatedEntry.TestingMethod,
      Remark: updatedEntry.Remark,
    };
    try {
      const res = await fetch(`http://localhost:8000/entries/${updatedEntry.TransactionID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || 'Server error');
      setHighlightId(updatedEntry.TransactionID);
      setTimeout(() => setHighlightId(null), 1700);
      if (typeof successCallback === "function") successCallback();
      closeEditDialog();
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
    setEditLoading(false);
  }

  function handleChangePage(event, newPage) { setPage(newPage); }
  function handleChangeRowsPerPage(event) {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }
  function handleRequestSort(event, property) {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  }

  const headStyle = {
    py: 1, fontWeight: 700, color: GOLD_PRIMARY,
    borderBottom: `2px solid ${TABLE_BORDER}`,
    fontSize: 14, letterSpacing: 0.8
  };
  const rowCellStyle = { py: 1, px: 1.1 };

  return (
    <Paper elevation={0} sx={{
      p: 0,
      borderRadius: 10,
      maxWidth: 1200,
      mx: 'auto',
      border: `1px solid ${TABLE_BORDER}`,
      overflow: 'hidden',
      boxShadow: '0 2px 18px rgba(0, 0, 0, 0.09)'
    }}>
      <Box sx={{
        p: 2.4,
        bgcolor: TABLE_HEAD_BG,
        borderBottom: `2px solid ${TABLE_BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Typography variant="h6" sx={{
          fontWeight: 700,
          color: GOLD_PRIMARY,
          fontSize: 20,
          letterSpacing: 0.2
        }}>
          Transactions
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            background: GOLD_PRIMARY,
            fontWeight: 700,
            fontSize: 16,
            px: 2.7,
            py: 1,
            borderRadius: 5,
            boxShadow: '0 2px 9px #B7862930',
            "&:hover": { background: "#FFD700", color: "#232C38" }
          }}
          onClick={onCreateClick}
        >
          Add
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 1, px: 2.4 }}>
        <TextField
          label="Search by SR. No, name or mobile"
          variant="outlined"
          size="small"
          sx={{ flex: 1 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Date Filter</InputLabel>
          <Select
            value={dateFilter}
            label="Date Filter"
            onChange={e => setDateFilter(e.target.value)}
          >
            <MenuItem value=""><em>All Dates</em></MenuItem>
            {dateOptions.map(date => (
              <MenuItem value={date} key={date}>{date}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {dateFilter &&
          <Button color="secondary" variant="text" onClick={() => setDateFilter('')}>Clear</Button>
        }
      </Box>
      {loading ? (
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </div>
      ) : sortedEntries.length === 0 ? (
        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD_PRIMARY, fontSize: 16 }}>
          No transactions found.
        </div>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: TABLE_HEAD_BG }}>
                  <TableCell sx={headStyle}>
                    <TableSortLabel
                      active={orderBy === 'TransactionID'}
                      direction={orderBy === 'TransactionID' ? order : 'asc'}
                      onClick={e => handleRequestSort(e, 'TransactionID')}
                      sx={{ color: GOLD_PRIMARY }}
                    >SR. No</TableSortLabel>
                  </TableCell>
                  <TableCell sx={headStyle}>
                    <TableSortLabel
                      active={orderBy === 'TransactionDate'}
                      direction={orderBy === 'TransactionDate' ? order : 'asc'}
                      onClick={e => handleRequestSort(e, 'TransactionDate')}
                      sx={{ color: GOLD_PRIMARY }}
                    >Date</TableSortLabel>
                  </TableCell>
                  <TableCell sx={headStyle}>
                    <TableSortLabel
                      active={orderBy === 'CustomerName'}
                      direction={orderBy === 'CustomerName' ? order : 'asc'}
                      onClick={e => handleRequestSort(e, 'CustomerName')}
                      sx={{ color: GOLD_PRIMARY }}
                    >Name</TableSortLabel>
                  </TableCell>
                  <TableCell sx={headStyle}>Mobile</TableCell>
                  <TableCell sx={headStyle} align="right">
                    <TableSortLabel
                      active={orderBy === 'SampleWeight'}
                      direction={orderBy === 'SampleWeight' ? order : 'asc'}
                      onClick={e => handleRequestSort(e, 'SampleWeight')}
                      sx={{ color: GOLD_PRIMARY }}
                    >Weight (gm)</TableSortLabel>
                  </TableCell>
                  <TableCell sx={headStyle}>Type</TableCell>
                  <TableCell sx={headStyle} align="right">Touch</TableCell>
                  <TableCell sx={headStyle} align="right">Karat</TableCell>
                  <TableCell sx={headStyle}>Print</TableCell>
                  <TableCell sx={headStyle}>Remark</TableCell>
                  <TableCell sx={headStyle} colSpan={2}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedEntries
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, idx) => (
                    <TableRow
                      key={row.TransactionID}
                      hover
                      sx={{
                        backgroundColor: highlightId === row.TransactionID
                          ? "#FFD70060"
                          : idx % 2 === 0 ? TABLE_ROW_EVEN_BG : "#fff",
                        borderBottom: `1px solid ${TABLE_BORDER}`,
                        '&:hover': { backgroundColor: TABLE_ROW_HOVER_BG },
                        transition: 'background 0.18s'
                      }}
                    >
                      <TableCell sx={rowCellStyle}>{row.TransactionID}</TableCell>
                      <TableCell sx={rowCellStyle}>
                        {formatDateTime(row.TransactionDate)}
                      </TableCell>
                      <TableCell sx={rowCellStyle}>{row.CustomerName}</TableCell>
                      <TableCell sx={rowCellStyle}>{row.CustomerMobile}</TableCell>
                      <TableCell sx={rowCellStyle} align="right">{row.SampleWeight}</TableCell>
                      <TableCell sx={rowCellStyle}>{row.SampleType}</TableCell>
                      <TableCell sx={rowCellStyle} align="right">{row.TouchValue}</TableCell>
                      <TableCell sx={rowCellStyle} align="right">{row.KaratValue}</TableCell>
                      <TableCell sx={rowCellStyle}>{formatPrintStatus(row.TestingMethod)}</TableCell>
                      <TableCell sx={rowCellStyle}>{row.Remark}</TableCell>
                      <TableCell sx={rowCellStyle}>
                        <Tooltip title="Edit Touch/Karat" arrow>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => openEditDialog(row)}
                            aria-label="Edit"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={rowCellStyle}>
                        <Tooltip title="Print Record" arrow>
                          <IconButton
                            color="secondary"
                            size="small"
                            onClick={() => handlePrintSetup(row)}
                            aria-label="Print"
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={sortedEntries.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 7, 10, 25]}
            sx={{ borderTop: `1px solid ${TABLE_BORDER}`, bgcolor: "#fff" }}
          />
          <EditDialog
            open={editDialogOpen}
            entry={editingEntry}
            onClose={closeEditDialog}
            onSave={handleDialogSave}
            loading={editLoading}
          />

          {/* PRINT DIALOG */}
          <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="md">
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={6} sx={{ minWidth: 250 }}>
                  <Typography sx={{ mb: 1 }}>Enter number of copies:</Typography>
                  <TextField
                    type="number"
                    value={printCopies}
                    min={1}
                    size="small"
                    onChange={e => setPrintCopies(Math.max(1, Number(e.target.value)))}
                    sx={{ mb: 2, width: 120 }}
                  />
                  <Typography sx={{ mb: 1, mt: 2 }}>Select fields to show:</Typography>
                  {Object.keys(fieldSelections).map(key => (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          checked={fieldSelections[key]}
                          onChange={() => handleFieldChange(key)}
                          color="primary"
                        />
                      }
                      label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      sx={{ display: 'block', ml: 0 }}
                    />
                  ))}
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>Print Preview:</Typography>
                  <PrintPreview entry={printEntry} fields={fieldSelections} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handlePhysicalPrint}
                disabled={printLoading}
              >
                {printLoading ? "Printing..." : "Print"}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Paper>
  );
}
