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
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mode } = req.query;

    if (mode === 'cloud') {
      try {
        // Read file from local disk to upload to tmpfiles.org
        const fileBuffer = await fs.promises.readFile(req.file.path);
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });
        const formData = new FormData();
        formData.append('file', blob, req.file.originalname);

        // Upload to tmpfiles.org
        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Cloud upload to tmpfiles.org failed');
        const result = await response.json();

        if (result.status === 'success') {
          // Format cloud URL to direct download
          const directUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          
          // Delete local file since it's uploaded to the cloud
          try {
            await fs.promises.unlink(req.file.path);
          } catch (unlinkErr) {
            console.error('Error deleting temp file:', unlinkErr);
          }

          return res.json({
            success: true,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: directUrl,
            fullUrl: directUrl
          });
        } else {
          throw new Error(result.message || 'Unknown tmpfiles.org error');
        }
      } catch (cloudError) {
        console.error('Cloud upload failed, falling back/cleaning up:', cloudError);
        // Delete local file to avoid leaks on error
        try {
          await fs.promises.unlink(req.file.path);
        } catch (unlinkErr) {
          console.warn('Failed to clean up temp file:', unlinkErr);
        }
        return res.status(502).json({ error: `Cloud upload failed: ${cloudError.message}` });
      }
    } else {
      // Local Wi-Fi sharing mode: Generate download link
      const fileUrl = `/api/download/${req.file.filename}?name=${encodeURIComponent(req.file.originalname)}`;
      const fullUrl = `http://${LOCAL_IP}:${PORT}${fileUrl}`;

      return res.json({
        success: true,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl,       // relative URL (for frontend proxy)
        fullUrl: fullUrl    // absolute URL with local IP (for QR scanner)
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Server error during file upload' });
  }
});

// GET download file (forces download with Content-Disposition)
app.get('/api/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const originalName = req.query.name || safeFilename;
    res.download(filePath, originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Server error during download');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', localIp: LOCAL_IP });
});

app.get('/api/shorten', async (req, res) => {
  const { url, alias } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // 1. Try is.gd first
  try {
    let apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`;
    if (alias) {
      apiUrl += `&shorturl=${encodeURIComponent(alias)}`;
    }
    
    const response = await fetch(apiUrl);
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json') || contentType.includes('text/javascript')) {
      const data = await response.json();
      if (data.shorturl) {
        return res.json({ shorturl: data.shorturl });
      } else if (data.errorcode === 2) {
        return res.status(400).json({ error: 'This custom alias is already taken or invalid. Please try another one.' });
      } else if (data.errormessage) {
        throw new Error(data.errormessage);
      }
    } else {
      const text = await response.text();
      console.warn('is.gd returned non-JSON response:', text);
      throw new Error(text || `is.gd returned status ${response.status}`);
    }
  } catch (err) {
    console.warn('is.gd failed, trying fallback:', err.message);
    if (alias) {
      return res.status(422).json({ error: `Could not shorten with custom alias: ${err.message}` });
    }
  }

  // 2. Fallback to tinyurl.com if is.gd fails and no alias was requested
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
