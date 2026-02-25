const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_PATH = path.join(__dirname, 'crew.csv');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (existing site)
app.use(express.static(__dirname));

// Multer storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'pictureFile') {
      cb(null, path.join(__dirname, 'assets', 'thumbs'));
    } else if (file.fieldname === 'iconFile') {
      cb(null, path.join(__dirname, 'images'));
    } else {
      cb(null, path.join(__dirname, 'uploads'));
    }
  },
  filename: (req, file, cb) => {
    const original = file.originalname || 'file';
    const ext = path.extname(original);
    const base = path
      .basename(original, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'image';
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({ storage });

// Helper to escape CSV fields
function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  const needsQuotes = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : `"${escaped}"`;
}

// Simple health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Admin page (secondary page)
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// API to append a new crew member (supports JSON and multipart with files)
app.post(
  '/api/crew',
  upload.fields([
    { name: 'pictureFile', maxCount: 1 },
    { name: 'iconFile', maxCount: 1 },
  ]),
  (req, res) => {
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

    // Determine final picture/icon paths
    let picturePath = (picture || '').trim();
    let iconPath = (icon || 'images/icon.png').trim();

    if (req.files && req.files.pictureFile && req.files.pictureFile[0]) {
      const f = req.files.pictureFile[0];
      picturePath = `assets/thumbs/${f.filename}`;
    }

    if (req.files && req.files.iconFile && req.files.iconFile[0]) {
      const f = req.files.iconFile[0];
      iconPath = `images/${f.filename}`;
    }

    const row = [
      csvEscape(crewName),
      csvEscape(picturePath),
      csvEscape((bio || '').trim()),
      csvEscape(crewFn),
      csvEscape(crewDept),
      csvEscape(iconPath),
    ].join(',') + '\n';

    fs.appendFile(CSV_PATH, row, (err) => {
      if (err) {
        console.error('Error appending to CSV:', err);
        return res.status(500).json({ error: 'Failed to write to crew.csv' });
      }
      return res.json({ success: true });
    });
  }
);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}/admin`);
});

