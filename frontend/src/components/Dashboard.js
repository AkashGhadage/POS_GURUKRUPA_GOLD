import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Stack, Tabs, Tab, LinearProgress
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const API = 'http://localhost:8000';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(m) {
  if (!m || m.length < 7) return m;
  const [year, mon] = m.split('-');
  const idx = parseInt(mon, 10) - 1;
  return `${year} ${MONTH_NAMES[idx] || mon}`;
}

function GrowthChip({ value, suffix = '%' }) {
  if (value === 0) return <Typography variant="caption" color="text.secondary">—</Typography>;
  const color = value > 0 ? 'success.main' : 'error.main';
  const icon = value > 0 ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />;
  return (
    <Stack direction="row" alignItems="center" spacing={0.3}>
      {icon}
      <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{value > 0 ? '+' : ''}{value}{suffix}</Typography>
    </Stack>
  );
}

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function Dashboard({ refreshFlag }) {
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetch(`${API}/report/summary`)
      .then(r => r.json())
      .then(data => setSummary(data))
      .catch(() => {});
  }, [refreshFlag]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/report/download`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GK_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed: ' + e.message);
    }
    setDownloading(false);
  };

  return (
    <>
      {/* Today's Stats Bar */}
      <Paper elevation={2} sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>Today:</Typography>
          <Chip label={`Entries: ${summary?.today?.entries ?? '—'}`} color="primary" variant="outlined" size="small" />
          <Chip label={`Customers: ${summary?.today?.customers ?? '—'}`} color="secondary" variant="outlined" size="small" />
          <Chip label={`Weight: ${summary?.today?.weight ?? '—'} gm`} color="success" variant="outlined" size="small" />
          {summary?.avg_test_min > 0 && (
            <Chip label={`Avg Test: ${summary.avg_test_min} min`} color="info" variant="outlined" size="small" />
          )}
          <Chip label={`Total All-Time: ${summary?.total_entries ?? '—'}`} variant="outlined" size="small" />
        </Stack>
        <Button variant="contained" size="small" startIcon={<AssessmentIcon />} onClick={() => setOpen(true)}>
          Reports
        </Button>
      </Paper>

      {/* Reports Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          Reports & Analytics
          <Button variant="contained" size="small" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Generating...' : 'Download Excel'}
          </Button>
        </DialogTitle>
        <DialogContent sx={{ px: 2 }}>
          {!summary ? <CircularProgress /> : (
            <>
              <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Growth" />
                <Tab label="New vs Returning" />
                <Tab label="Loyalty" />
                <Tab label="Gold vs Silver" />
                <Tab label="Touch Quality" />
                <Tab label="Sample Types" />
                <Tab label="Peak Hours" />
                <Tab label="Day of Week" />
                <Tab label="Top Customers" />
                <Tab label="Customer Churn" />
              </Tabs>

              {/* Tab 0: Month-over-Month Growth */}
              <TabPanel value={tab} index={0}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Track your business momentum — are entries and customers growing each month?
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="center">Entries</TableCell>
                        <TableCell align="center">Growth</TableCell>
                        <TableCell align="center">Customers</TableCell>
                        <TableCell align="center">Growth</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(summary.growth || []).map((g, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontWeight: 600 }}>{formatMonth(g.month)}</TableCell>
                          <TableCell align="center">{g.entries} <Typography variant="caption" color="text.secondary">({g.prev_entries})</Typography></TableCell>
                          <TableCell align="center"><GrowthChip value={g.entry_growth} /></TableCell>
                          <TableCell align="center">{g.customers} <Typography variant="caption" color="text.secondary">({g.prev_customers})</Typography></TableCell>
                          <TableCell align="center"><GrowthChip value={g.cust_growth} /></TableCell>
                        </TableRow>
                      ))}
                      {(!summary.growth || summary.growth.length === 0) && (
                        <TableRow><TableCell colSpan={5} align="center">Need 2+ months of data</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Tab 1: New vs Returning Customers */}
              <TabPanel value={tab} index={1}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Are you attracting new customers or relying on repeat business? Healthy shops have 20-40% new customers each month.
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="center" sx={{ color: '#2e7d32' }}>New</TableCell>
                        <TableCell align="center" sx={{ color: '#1565c0' }}>Returning</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell sx={{ minWidth: 130 }}>New %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(summary.new_vs_returning || []).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontWeight: 600 }}>{formatMonth(r.month)}</TableCell>
                          <TableCell align="center" sx={{ color: '#2e7d32', fontWeight: 600 }}>{r.new}</TableCell>
                          <TableCell align="center" sx={{ color: '#1565c0' }}>{r.returning}</TableCell>
                          <TableCell align="center">{r.total}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant="determinate" value={r.new_pct} color="success" sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                              <Typography variant="caption" sx={{ minWidth: 35 }}>{r.new_pct}%</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Tab 2: Customer Loyalty Segments */}
              <TabPanel value={tab} index={2}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Focus on converting One-Time → Occasional → Regular. VIPs are your brand ambassadors.
                </Typography>
                <Stack spacing={1.5} sx={{ maxWidth: 500 }}>
                  {(summary.loyalty_segments || []).map((s, i) => {
                    const colors = ['#ffcdd2', '#fff9c4', '#c8e6c9', '#bbdefb'];
                    const textColors = ['#c62828', '#f57f17', '#2e7d32', '#1565c0'];
                    return (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: colors[i] || '#f5f5f5' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ color: textColors[i], fontWeight: 700 }}>{s.segment}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={`${s.count} customers`} size="small" />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: textColors[i] }}>{s.pct}%</Typography>
                          </Stack>
                        </Stack>
                        <LinearProgress variant="determinate" value={s.pct} sx={{ mt: 1, height: 6, borderRadius: 3 }} />
                      </Paper>
                    );
                  })}
                  <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
                    Total unique customers: {summary.total_customers ?? '—'}
                  </Typography>
                </Stack>
              </TabPanel>

              {/* Tab 3: Gold vs Silver */}
              <TabPanel value={tab} index={3}>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="center" sx={{ color: '#e65100' }}>Gold Count</TableCell>
                        <TableCell align="right" sx={{ color: '#e65100' }}>Gold Weight</TableCell>
                        <TableCell align="center" sx={{ color: '#546e7a' }}>Silver Count</TableCell>
                        <TableCell align="right" sx={{ color: '#546e7a' }}>Silver Weight</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.monthly.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontWeight: 600 }}>{formatMonth(m.month)}</TableCell>
                          <TableCell align="center">{m.gold_count}</TableCell>
                          <TableCell align="right">{m.gold_weight} gm</TableCell>
                          <TableCell align="center">{m.silver_count}</TableCell>
                          <TableCell align="right">{m.silver_weight} gm</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Tab 4: Touch Value Distribution */}
              <TabPanel value={tab} index={4}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Understand what purity levels dominate your market — helps set expectations and identify fraud patterns.
                </Typography>
                <Stack spacing={1.5} sx={{ maxWidth: 450 }}>
                  {(summary.touch_distribution || []).map((t, i) => {
                    const barColors = ['#4caf50', '#8bc34a', '#ffc107', '#ff9800', '#f44336', '#9e9e9e'];
                    return (
                      <Box key={i}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.range}</Typography>
                          <Typography variant="body2">{t.count} ({t.pct}%)</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={Math.min(t.pct * 2, 100)} sx={{ height: 10, borderRadius: 5, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: barColors[i] || '#1976d2' } }} />
                      </Box>
                    );
                  })}
                </Stack>
              </TabPanel>

              {/* Tab 5: Sample Type Breakdown */}
              <TabPanel value={tab} index={5}>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Sample Type</TableCell>
                        <TableCell align="center">Count</TableCell>
                        <TableCell align="center">Avg Touch</TableCell>
                        <TableCell align="center">Avg Weight</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>% of Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(summary.sample_types || []).map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{s.type}</TableCell>
                          <TableCell align="center">{s.count}</TableCell>
                          <TableCell align="center">{s.avg_touch || '—'}</TableCell>
                          <TableCell align="center">{s.avg_weight} gm</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant="determinate" value={s.pct} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                              <Typography variant="caption">{s.pct}%</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Tab 6: Peak Hours */}
              <TabPanel value={tab} index={6}>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hour</TableCell>
                        <TableCell align="center">Entries</TableCell>
                        <TableCell sx={{ minWidth: 160 }}>Distribution</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(summary.peak_hours || []).map((h, i) => (
                        <TableRow key={i}>
                          <TableCell>{h.hour}</TableCell>
                          <TableCell align="center">{h.count}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant="determinate" value={Math.min(h.pct * 3, 100)} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                              <Typography variant="caption" sx={{ minWidth: 35 }}>{h.pct}%</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Tab 7: Day of Week */}
              <TabPanel value={tab} index={7}>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Day</TableCell>
                        <TableCell align="center">Entries</TableCell>
                        <TableCell sx={{ minWidth: 160 }}>Distribution</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(summary.day_of_week || []).map((d, i) => (
                        <TableRow key={i} sx={d.day === 'Sunday' ? { bgcolor: '#fff8e1' } : {}}>
                          <TableCell sx={{ fontWeight: 600 }}>{d.day}</TableCell>
                          <TableCell align="center">{d.count}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant="determinate" value={Math.min(d.pct * 3, 100)} color="secondary" sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                              <Typography variant="caption" sx={{ minWidth: 35 }}>{d.pct}%</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Tab 8: Top Customers */}
              <TabPanel value={tab} index={8}>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell>Mobile</TableCell>
                        <TableCell align="center">Visits</TableCell>
                        <TableCell>Last Visit</TableCell>
                        <TableCell align="center">Avg Touch</TableCell>
                        <TableCell>Common Sample</TableCell>
                        <TableCell align="center">Days Ago</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.customers.slice(0, 30).map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.mobile}</TableCell>
                          <TableCell align="center">{c.visits}</TableCell>
                          <TableCell>{c.last_visit}</TableCell>
                          <TableCell align="center">{c.avg_touch || '—'}</TableCell>
                          <TableCell>{c.most_common_sample}</TableCell>
                          <TableCell align="center">{c.days_since_last}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Tab 9: Customer Churn */}
              <TabPanel value={tab} index={9}>
                <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningAmberIcon color="warning" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Customers with 2+ visits who haven't returned in 30+ days — potential lost customers.
                  </Typography>
                </Box>
                {(summary.churn_customers || []).length === 0 ? (
                  <Typography color="success.main" sx={{ py: 3, textAlign: 'center' }}>No churned customers found — great retention!</Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Customer</TableCell>
                          <TableCell>Mobile</TableCell>
                          <TableCell align="center">Past Visits</TableCell>
                          <TableCell>Last Visit</TableCell>
                          <TableCell align="center" sx={{ color: '#d32f2f' }}>Days Gone</TableCell>
                          <TableCell align="center">Avg Touch</TableCell>
                          <TableCell>Common Sample</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(summary.churn_customers || []).map((c, i) => (
                          <TableRow key={i} sx={{ bgcolor: c.days_gone > 90 ? '#ffebee' : c.days_gone > 60 ? '#fff3e0' : 'inherit' }}>
                            <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                            <TableCell>{c.mobile}</TableCell>
                            <TableCell align="center">{c.visits}</TableCell>
                            <TableCell>{c.last_visit}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: c.days_gone > 90 ? '#d32f2f' : c.days_gone > 60 ? '#e65100' : '#333' }}>{c.days_gone}</TableCell>
                            <TableCell align="center">{c.avg_touch || '—'}</TableCell>
                            <TableCell>{c.most_common_sample}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </TabPanel>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
