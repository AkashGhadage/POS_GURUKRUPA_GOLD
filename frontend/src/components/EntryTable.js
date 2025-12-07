import React, { useEffect, useState } from 'react';
import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, TablePagination, TextField, CircularProgress, Button, Select, MenuItem, InputLabel,
  FormControl, Tooltip, TableSortLabel, Box,
  Dialog, DialogActions, DialogContent
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

// ---- numeric format helpers (display only) ----
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatWeight(value) {
  const n = toNumber(value);
  return n === null ? '' : n.toFixed(3); // 3 decimals for weight [web:265]
}

function formatTwoDecimals(value) {
  const n = toNumber(value);
  return n === null ? '' : n.toFixed(2); // 2 decimals for touch/karat [web:265]
}

// Split TransactionDate into separate date and time like receipt format
function splitDateAndTime(dateTimeString) {
  if (!dateTimeString) return { date: '', time: '' };
  const d = new Date(dateTimeString);
  if (isNaN(d.getTime())) return { date: dateTimeString, time: '' };

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${mi}`,
  };
}

// Token-style print preview
function PrintPreview({ entry }) {
  if (!entry) return null;

  const { date, time } = splitDateAndTime(entry.TransactionDate);
  const weightStr = formatWeight(entry.SampleWeight);
  const karatStr = formatTwoDecimals(entry.KaratValue);
  const touchStr = formatTwoDecimals(entry.TouchValue);
  const receiptNo = entry.TransactionID ? `${entry.TransactionID}` : '';

  return (
    <Box
      sx={{
        width: 320,
        bgcolor: "#fffdf7",
        borderRadius: 2,
        border: "1px solid #f2d7a2",
        px: 3,
        py: 2.2,
        fontFamily: "monospace",
        fontSize: 13,
        mx: "auto",
      }}
    >
      {/* Header */}
      <Typography
        align="center"
        sx={{
          fontWeight: 700,
          fontSize: 15,
          mb: 0.4,
          color: GOLD_PRIMARY,
        }}
      >
        GURUKRUPA
      </Typography>
      <Typography
        align="center"
        sx={{ fontSize: 11, mb: 0.4 }}
      >
        Computerized Testing & Laser Soldering Services
      </Typography>
      <Typography
        align="center"
        sx={{ fontSize: 10, mb: 0.2 }}
      >
        3175/32, BEADON PURA, KAROL BAGH,
      </Typography>
      <Typography
        align="center"
        sx={{ fontSize: 10, mb: 0.4 }}
      >
        NEW DELHI, 110005
      </Typography>
      <Typography align="center" sx={{ fontSize: 11, mb: 0.4 }}>
        ----------------------------------------------------------------
      </Typography>

      {/* Title */}
      <Typography
        align="center"
        sx={{ fontWeight: 700, fontSize: 13, mb: 0.2 }}
      >
        Tunch Receipt
      </Typography>
      <Typography align="center" sx={{ fontSize: 11, mb: 0.6 }}>
        ----------------------------------------------------------------
      </Typography>

      {/* Date / Time / Receipt */}
      <Typography
        sx={{
          fontSize: 12,
          display: 'flex',
          justifyContent: 'space-between',
          mb: 0.2,
        }}
      >
        <span>Date: {date}</span>
        <span>Time: {time}</span>
      </Typography>
      <Typography sx={{ fontSize: 12, mb: 0.4 }}>
        Receipt No: {receiptNo}
      </Typography>
      <Typography align="center" sx={{ fontSize: 11, mb: 0.6 }}>
        ----------------------------------------------------------------
      </Typography>

      {/* Details */}
      <Typography sx={{ fontSize: 12 }}>Customer:    {entry.CustomerName}</Typography>
      {entry.CustomerMobile && (
        <Typography sx={{ fontSize: 12 }}>Mobile:      {entry.CustomerMobile}</Typography>
      )}
      <Typography sx={{ fontSize: 12 }}>Sample Type: {entry.SampleType}</Typography>
      <Typography sx={{ fontSize: 12 }}>
        Weight:      {weightStr} gm
      </Typography>
      {karatStr && (
        <Typography sx={{ fontSize: 12 }}>Karat:      {karatStr} K</Typography>
      )}
      {touchStr && (
        <Typography sx={{ fontSize: 12 }}>Touch:       {touchStr}</Typography>
      )}
      {entry.Remark && (
        <Typography sx={{ fontSize: 12 }}>Remark:      {entry.Remark}</Typography>
      )}
      <Typography align="center" sx={{ fontSize: 11, mt: 0.6, mb: 0.4 }}>
        ----------------------------------------------------------------
      </Typography>

      {/* Footer */}
      <Typography
        align="center"
        sx={{ fontWeight: 700, fontSize: 12 }}
      >
        Thank you!
      </Typography>
      <Typography align="center" sx={{ fontSize: 11 }}>
        Visit Again. Call:
      </Typography>
      <Typography align="center" sx={{ fontSize: 11 }}>
        9075516373
      </Typography>
      <Typography align="center" sx={{ fontSize: 11, mt: 0.4 }}>
        ----------------------------------------------------------------
      </Typography>
    </Box>
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

  // Message dialog state (replaces alerts)
  const [messageDialog, setMessageDialog] = useState({
    open: false,
    type: 'success',
    text: ''
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
    // Block printing if tunch (TouchValue) is 0 or not set
    const tunch = Number(row.TouchValue);

    if (!Number.isFinite(tunch) || tunch === 0) {
      setMessageDialog({
        open: true,
        type: 'error',
        text: 'Please enter Tunch before printing.'
      });
      return; // Do not open print dialog
    }

    // OK to print
    setPrintEntry(row);
    setPrintCopies(1);
    setPrintDialogOpen(true);
  }

  async function handlePhysicalPrint() {
    if (!printEntry) return;
    setPrintLoading(true);
    try {
      await fetch('http://localhost:8000/print-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Copies: printCopies,
          Entry: printEntry
        })
      });
      setMessageDialog({
        open: true,
        type: 'success',
        text: 'Print sent to thermal printer.'
      });
      setPrintDialogOpen(false);
    } catch (err) {
      setMessageDialog({
        open: true,
        type: 'error',
        text: 'Failed to send print : ' + (err.message || 'Unknown error')
      });
    }
    setPrintLoading(false);
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
      setMessageDialog({
        open: true,
        type: 'error',
        text: 'Failed to update entry: ' + (err.message || 'Unknown error')
      });
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
          <Button color="secondary" variant="text" onClick={() => setDateFilter('')}>
            Clear
          </Button>
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
                    >
                      SR. No
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={headStyle}>
                    <TableSortLabel
                      active={orderBy === 'TransactionDate'}
                      direction={orderBy === 'TransactionDate' ? order : 'asc'}
                      onClick={e => handleRequestSort(e, 'TransactionDate')}
                      sx={{ color: GOLD_PRIMARY }}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={headStyle}>
                    <TableSortLabel
                      active={orderBy === 'CustomerName'}
                      direction={orderBy === 'CustomerName' ? order : 'asc'}
                      onClick={e => handleRequestSort(e, 'CustomerName')}
                      sx={{ color: GOLD_PRIMARY }}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={headStyle}>Mobile</TableCell>
                  <TableCell sx={headStyle} align="right">
                    <TableSortLabel
                      active={orderBy === 'SampleWeight'}
                      direction={orderBy === 'SampleWeight' ? order : 'asc'}
                      onClick={e => handleRequestSort(e, 'SampleWeight')}
                      sx={{ color: GOLD_PRIMARY }}
                    >
                      Weight (gm)
                    </TableSortLabel>
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
                      <TableCell sx={rowCellStyle} align="right">
                        {formatWeight(row.SampleWeight)}
                      </TableCell>
                      <TableCell sx={rowCellStyle}>{row.SampleType}</TableCell>
                      <TableCell sx={rowCellStyle} align="right">
                        {formatTwoDecimals(row.TouchValue)}
                      </TableCell>
                      <TableCell sx={rowCellStyle} align="right">
                        {formatTwoDecimals(row.KaratValue)}
                      </TableCell>
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

          {/* PRINT DIALOG - vertical with 1/2 buttons + custom */}
          <Dialog
            open={printDialogOpen}
            onClose={() => setPrintDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                pt: 2.5,
                pb: 1.5,
              }}
            >
              {/* Copies controls (small, horizontal) */}
              <Box sx={{ width: '100%', maxWidth: 420 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Print Copies:</Typography>

                  {[1, 2, 3, 4, 5].map(n => (
                    <Button
                      key={n}
                      size="small"
                      variant={printCopies === n ? 'contained' : 'outlined'}
                      sx={{
                        minWidth: 40,
                        px: 1.4,
                        py: 0.3,
                        fontSize: 13,
                      }}
                      onClick={() => setPrintCopies(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/* Centered preview below */}
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 0.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
                    Preview
                  </Typography>
                  <PrintPreview entry={printEntry} />
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPrintDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handlePhysicalPrint}
                disabled={printLoading || !printEntry}
              >
                {printLoading ? "Printing..." : "Print"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* MESSAGE DIALOG */}
          <Dialog
            open={messageDialog.open}
            onClose={() => setMessageDialog(prev => ({ ...prev, open: false }))}
          >
            <DialogContent>
              <Typography
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: messageDialog.type === 'success' ? GOLD_PRIMARY : 'error.main'
                }}
              >
                {messageDialog.type === 'success' ? 'Success' : 'Error'}
              </Typography>
              <Typography sx={{ fontSize: 14 }}>
                {messageDialog.text}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setMessageDialog(prev => ({ ...prev, open: false }))}
                autoFocus
              >
                OK
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Paper>
  );
}
