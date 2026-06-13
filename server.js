import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists (uses /tmp on Vercel serverless environment)
const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const uploadsDir = isVercel ? '/tmp' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Helper function to get local IPv4 address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[interfaceName]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIPAddress();

// Configure Multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name: timestamp + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB file size limit
});

// GET configuration (to tell the frontend the local network IP)
app.get('/api/config', (req, res) => {
  res.json({
    localIp: LOCAL_IP,
    port: PORT,
    baseUrl: `http://${LOCAL_IP}:${PORT}`
  });
});

// POST upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate local access URL for this file
    const fileUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `http://${LOCAL_IP}:${PORT}${fileUrl}`;

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl,       // relative URL (for frontend proxy)
      fullUrl: fullUrl    // absolute URL with local IP (for QR scanner)
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error during file upload' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', localIp: LOCAL_IP });
});

app.get('/api/shorten', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // 1. Try is.gd first
  try {
    const apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    if (response.ok) {
      // Some error states in is.gd might still return 200 with text instead of JSON
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('text/javascript')) {
        const data = await response.json();
        if (data.shorturl) {
          return res.json({ shorturl: data.shorturl });
        }
      } else {
        const text = await response.text();
        console.warn('is.gd returned non-JSON response:', text);
      }
    }
  } catch (err) {
    console.warn('is.gd failed, trying tinyurl fallback:', err.message);
  }

  // 2. Fallback to tinyurl.com if is.gd fails
  try {
    const tinyUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
    const response = await fetch(tinyUrl);
    if (response.ok) {
      const shorturl = await response.text();
      if (shorturl && shorturl.trim() && !shorturl.startsWith('Error')) {
        return res.json({ shorturl: shorturl.trim() });
      }
    }
    res.status(422).json({ error: 'Could not shorten URL with either is.gd or tinyurl' });
  } catch (err) {
    console.error('TinyURL fallback error:', err);
    res.status(500).json({ error: 'Failed to reach shortening service' });
  }
});

// Serve static frontend files in production (after compiling React app)
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // Fallback to React index.html for SPA frontend routing
  app.use((req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Only listen if not running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`Express server running on http://localhost:${PORT}`);
    console.log(`Local network URL: http://${LOCAL_IP}:${PORT}`);
    console.log(`===================================================`);
  });
}

export default app;
