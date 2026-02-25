const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_PATH = path.join(__dirname, 'crew.csv');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (existing site)
app.use(express.static(__dirname));

// Helper to escape CSV fields
function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  const needsQuotes = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

// Simple health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Admin page (secondary page)
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// API to append a new crew member
app.post('/api/crew', (req, res) => {
  const {
    name,
    picture,
    bio,
    fn,
    function: fnAlt,
    department,
    icon,
  } = req.body || {};

  const crewName = (name || '').trim();
  const crewDept = (department || '').trim();
  const crewFn = (fn || fnAlt || '').trim();

  if (!crewName || !crewDept || !crewFn) {
    return res.status(400).json({
      error: 'Missing required fields: name, function, department',
    });
  }

  const row = [
    csvEscape(crewName),
    csvEscape((picture || '').trim()),
    csvEscape((bio || '').trim()),
    csvEscape(crewFn),
    csvEscape(crewDept),
    csvEscape((icon || 'images/icon.png').trim()),
  ].join(',') + '\n';

  fs.appendFile(CSV_PATH, row, (err) => {
    if (err) {
      console.error('Error appending to CSV:', err);
      return res.status(500).json({ error: 'Failed to write to crew.csv' });
    }
    return res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}/admin`);
});

