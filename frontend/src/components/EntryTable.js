import React, { useEffect, useState } from 'react';
import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, TablePagination, TextField, CircularProgress, Button, Select, MenuItem, InputLabel,
  FormControl, TableSortLabel, Box, Dialog, DialogActions, DialogContent, Collapse
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EditDialog from './EditDialog';

// --- Constants & Formatters ---
const GOLD_PRIMARY = "#b78629";
const TABLE_HEAD_BG = "#fff";
const TABLE_ROW_EVEN_BG = "#faf9f3";
const TABLE_ROW_HOVER_BG = "#fffbeee0";
const TABLE_BORDER = "#e6be7e";

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

function extractDate(dateTimeString) {
  if (!dateTimeString) return '';
  return dateTimeString.substring(0, 10);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatWeight(value) {
  const n = toNumber(value);
  return n === null ? '' : n.toFixed(3);
}

function formatTwoDecimals(value) {
  const n = toNumber(value);
  return n === null ? '' : n.toFixed(2);
}

// Split TransactionDate into separate date and time
function splitDateAndTime(dateTimeString) {
  if (!dateTimeString) return { date: '', time: '' };
  const d = new Date(dateTimeString);
  if (isNaN(d.getTime())) return { date: dateTimeString, time: '' };
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

// --- Sorting Helpers ---
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

// --- Component: Print Preview (Fix #2: Handles Multiple Items) ---
function PrintPreview({ entry }) {
  if (!entry) return null;

  const { date, time } = splitDateAndTime(entry.TransactionDate);
  const receiptNo = entry.TransactionID || '';

  // Determine if we have multiple items or a single flat entry
  const hasItems = entry.items && entry.items.length > 0;
  const itemsToPrint = hasItems ? entry.items : [entry];

  return (
    <Box sx={{
      width: 320, bgcolor: "#fffdf7", borderRadius: 2, border: "1px solid #f2d7a2",
      px: 3, py: 2.2, fontFamily: "monospace", fontSize: 13, mx: "auto"
    }}>
      {/* Header */}
      <Typography align="center" sx={{ fontWeight: 700, fontSize: 15, mb: 0.4, color: GOLD_PRIMARY }}>
        GURUKRUPA
      </Typography>
      <Typography align="center" sx={{ fontSize: 11, mb: 0.4 }}>
        Computerized Testing & Laser Soldering
      </Typography>
      <Typography align="center" sx={{ fontSize: 11, mb: 0.4 }}>
        3175/32, BEADON PURA, KAROL BAGH, DEL-05
      </Typography>
      <Typography align="center" sx={{ fontSize: 11, mb: 0.4 }}>------------------------------------------------</Typography>

      <Typography align="center" sx={{ fontWeight: 700, fontSize: 13, mb: 0.2 }}>
        Receipt
      </Typography>
      <Typography align="center" sx={{ fontSize: 11, mb: 0.6 }}>------------------------------------------------</Typography>

      {/* Meta Data */}
      <Typography sx={{ fontSize: 12, mb: 0.2 }}>Date: {date} {time}</Typography>
      <Typography sx={{ fontSize: 12, mb: 0.4 }}>Receipt No: {receiptNo}</Typography>
      <Typography align="center" sx={{ fontSize: 11, mb: 0.6 }}>------------------------------------------------</Typography>

      {/* Customer Info */}
      <Typography sx={{ fontSize: 12 }}>Cust: {entry.CustomerName}</Typography>
      {entry.CustomerMobile && <Typography sx={{ fontSize: 12 }}>Mob: {entry.CustomerMobile}</Typography>}
      <Typography align="center" sx={{ fontSize: 11, mt: 0.6, mb: 0.4 }}>------------------------------------------------</Typography>

      {/* Items Table */}
      <Box component="table" sx={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <Box component="thead">
          <Box component="tr" sx={{ borderBottom: '1px solid #ccc' }}>
            <Box component="th" sx={{ textAlign: 'left', py: 0.5, fontWeight: 'bold' }}>Item</Box>
            <Box component="th" sx={{ textAlign: 'right', py: 0.5, fontWeight: 'bold' }}>Weight</Box>
            <Box component="th" sx={{ textAlign: 'right', py: 0.5, fontWeight: 'bold' }}>Tunch</Box>
          </Box>
        </Box>
        <Box component="tbody">
          {itemsToPrint.map((item, idx) => (
            <Box component="tr" key={idx}>
              <Box component="td" sx={{ textAlign: 'left', py: 0.3 }}>{item.SampleType}</Box>
              <Box component="td" sx={{ textAlign: 'right', py: 0.3 }}>{formatWeight(item.SampleWeight)}</Box>
              <Box component="td" sx={{ textAlign: 'right', py: 0.3 }}>{formatTwoDecimals(item.TouchValue)}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {entry.Remark && (
        <>
           <Typography align="center" sx={{ fontSize: 11, mt: 0.4, mb: 0.4 }}>------------------------------------------------</Typography>
           <Typography sx={{ fontSize: 12 }}>Rem: {entry.Remark}</Typography>
        </>
      )}

      <Typography align="center" sx={{ fontSize: 11, mt: 0.6, mb: 0.4 }}>------------------------------------------------</Typography>
      <Typography align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Thank you!</Typography>
      <Typography align="center" sx={{ fontSize: 11 }}>Visit Again. Call: 9075516373</Typography>
      <Typography align="center" sx={{ fontSize: 11, mt: 0.4 }}>------------------------------------------------</Typography>
    </Box>
  );
}

// --- Component: Expandable Row (Fix #1: Collapsible Logic) ---
function Row({ row, rowIndex, onEdit, onPrint }) {
  const [open, setOpen] = useState(false);

  // Check if we have sub-items to determine if we need the arrow
  const hasSubItems = row.items && row.items.length > 1;

  // If items exist, use the first one for the main row display, else use row itself
  const mainDisplay = (row.items && row.items.length > 0) ? row.items[0] : row;

  return (
    <>
      <TableRow
        hover
        sx={{
          backgroundColor: rowIndex % 2 === 0 ? TABLE_ROW_EVEN_BG : "#fff",
          '& > *': { borderBottom: 'unset' } // Hide bottom border for expandable row
        }}
      >
        {/* Expand Icon Column */}
        <TableCell width={50}>
          {hasSubItems && (
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>

        <TableCell component="th" scope="row"><b>{row.TransactionID}</b></TableCell>
        <TableCell>{formatDateTime(row.TransactionDate)}</TableCell>
        <TableCell><b>{row.CustomerName}</b></TableCell>
        <TableCell>{row.CustomerMobile}</TableCell>
        
        {/* Main Item Data */}
        <TableCell align="right">{formatWeight(mainDisplay.SampleWeight)}</TableCell>
        <TableCell>{mainDisplay.SampleType}</TableCell>
        <TableCell align="right">{formatTwoDecimals(mainDisplay.TouchValue)}</TableCell>
        
        <TableCell>{row.Remark}</TableCell>

        <TableCell>
          <IconButton color="primary" size="small" onClick={() => onEdit(row)}>
            <EditIcon />
          </IconButton>
          <IconButton color="secondary" size="small" onClick={() => onPrint(row)}>
            <PrintIcon />
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Collapsible Detail Row */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, ml: 6 }}>
              <Typography variant="subtitle2" gutterBottom component="div" sx={{color: GOLD_PRIMARY}}>
                Additional Items
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Weight</TableCell>
                    <TableCell align="right">Tunch</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Skip the first item as it is shown in the main row */}
                  {row.items && row.items.slice(1).map((subItem, index) => (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">{subItem.SampleType}</TableCell>
                      <TableCell align="right">{formatWeight(subItem.SampleWeight)}</TableCell>
                      <TableCell align="right">{formatTwoDecimals(subItem.TouchValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// --- Main Component: EntryTable ---
export default function EntryTable({ refreshFlag, onCreateClick }) {
  // State
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState('');
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('TransactionID');
  const [localRefresh, setLocalRefresh] = useState(0); // Fix for Edit refresh

  // Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printEntry, setPrintEntry] = useState(null);
  const [printCopies, setPrintCopies] = useState(1);
  
  // Feedback States
  const [messageDialog, setMessageDialog] = useState({ open: false, type: 'success', text: '' });
  const [printLoading, setPrintLoading] = useState(false);

  // Fetch Data (Refreshes on prop change or local edit success)
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:8000/entries')
      .then(res => res.json())
      .then(list => {
        setEntries(list);
        setLoading(false);
      })
      .catch(() => {
        setEntries([]);
        setLoading(false);
      });
  }, [refreshFlag, localRefresh]);

  // Derived Data (Filter & Sort)
  const dateOptions = Array.from(new Set(entries.map(e => extractDate(e.TransactionDate)))).sort((a, b) => b.localeCompare(a));
  
  const filteredEntries = entries.filter(entry => {
    const srnoMatch = search && String(entry.TransactionID).includes(search.trim());
    const nameMatch = search && entry.CustomerName?.toLowerCase().includes(search.toLowerCase());
    const mobileMatch = search && entry.CustomerMobile?.toLowerCase().includes(search.toLowerCase());
    const searchPass = !search || srnoMatch || nameMatch || mobileMatch;
    const datePass = !dateFilter || extractDate(entry.TransactionDate) === dateFilter;
    return searchPass && datePass;
  });

  const sortedEntries = stableSort(filteredEntries, getComparator(order, orderBy));

  // Handlers
  const handlePrintSetup = (row) => {
    setPrintEntry(row);
    setPrintCopies(1);
    setPrintDialogOpen(true);
  };

  const handlePhysicalPrint = async () => {
    if (!printEntry) return;
    setPrintLoading(true);
    try {
      await fetch('http://localhost:8000/print-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Copies: printCopies, Entry: printEntry })
      });
      setMessageDialog({ open: true, type: 'success', text: 'Print sent successfully.' });
      setPrintDialogOpen(false);
    } catch (err) {
      setMessageDialog({ open: true, type: 'error', text: 'Print Failed: ' + err.message });
    }
    setPrintLoading(false);
  };

  // Edit Logic
  const openEditDialog = (entry) => {
    setEditingEntry(entry);
    setEditDialogOpen(true);
  };

  const handleDialogSave = async (updatedEntry) => {
    try {
      // Use the items endpoint to update items and transaction-level remark
      const res = await fetch(`http://localhost:8000/entries/${updatedEntry.TransactionID}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: updatedEntry.items,
          Remark: updatedEntry.Remark  // Transaction-level remark
        }),
      });

      if (!res.ok) throw new Error('Update failed');
      
      // Success feedback
      setMessageDialog({ open: true, type: 'success', text: 'Entry Updated Successfully' });
      setEditDialogOpen(false);
      setEditingEntry(null);
      setLocalRefresh(prev => prev + 1); // Trigger Table Refresh (Fix #3)
    } catch (err) {
      setMessageDialog({ open: true, type: 'error', text: 'Update Failed: ' + err.message });
    }
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <Paper elevation={0} sx={{ p: 0, borderRadius: 10, maxWidth: 1200, mx: 'auto', border: `1px solid ${TABLE_BORDER}`, overflow: 'hidden' }}>
      
      {/* Table Toolbar */}
      <Box sx={{ p: 2.4, bgcolor: TABLE_HEAD_BG, borderBottom: `2px solid ${TABLE_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: GOLD_PRIMARY }}>Transactions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateClick} sx={{ bgcolor: GOLD_PRIMARY, borderRadius: 5 }}>Add</Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1, px: 2.4, mb: 2 }}>
        <TextField label="Search" variant="outlined" size="small" sx={{ flex: 1 }} value={search} onChange={e => setSearch(e.target.value)} />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Date</InputLabel>
          <Select value={dateFilter} label="Date" onChange={e => setDateFilter(e.target.value)}>
            <MenuItem value=""><em>All</em></MenuItem>
            {dateOptions.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
        </FormControl>
        {dateFilter && <Button onClick={() => setDateFilter('')}>Clear</Button>}
      </Box>

      {/* Table Content */}
      {loading ? (
        <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: TABLE_HEAD_BG }}>
                  <TableCell width={50} /> {/* Expand arrow col */}
                  <TableCell><TableSortLabel active={orderBy === 'TransactionID'} direction={order} onClick={e => handleRequestSort(e, 'TransactionID')}>SR. No</TableSortLabel></TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell><TableSortLabel active={orderBy === 'CustomerName'} direction={order} onClick={e => handleRequestSort(e, 'CustomerName')}>Name</TableSortLabel></TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell align="right">Weight</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Tunch</TableCell>
                  <TableCell>Remark</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                  <Row 
                    key={row.TransactionID} 
                    row={row} 
                    rowIndex={row.TransactionID} 
                    onEdit={openEditDialog} 
                    onPrint={handlePrintSetup} 
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={sortedEntries.length}
            page={page}
            onPageChange={(e, n) => setPage(n)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </>
      )}

      {/* Edit Dialog */}
      <EditDialog 
        open={editDialogOpen} 
        entry={editingEntry} 
        onClose={() => setEditDialogOpen(false)} 
        onSave={handleDialogSave} 
      />

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography>Copies:</Typography>
            {[1, 2, 3].map(n => (
              <Button key={n} size="small" variant={printCopies === n ? 'contained' : 'outlined'} onClick={() => setPrintCopies(n)}>{n}</Button>
            ))}
          </Box>
          <Box>
            <Typography align="center" sx={{ fontWeight: 'bold', mb: 1 }}>Preview</Typography>
            <PrintPreview entry={printEntry} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePhysicalPrint} disabled={printLoading}>{printLoading ? "Printing..." : "Print"}</Button>
        </DialogActions>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialog.open} onClose={() => setMessageDialog(p => ({ ...p, open: false }))}>
        <DialogContent>
          <Typography color={messageDialog.type === 'success' ? GOLD_PRIMARY : 'error'}>{messageDialog.text}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialog(p => ({ ...p, open: false }))}>OK</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}