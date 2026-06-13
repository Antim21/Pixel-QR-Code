import { useState, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { UploadCloud, ScanLine, X, Copy, Check, ExternalLink, Wifi, FileText, Link2, AlertCircle, RefreshCw } from 'lucide-react';

function detectType(text) {
  if (!text) return { type: 'unknown', label: 'Unknown', icon: FileText };
  if (/^https?:\/\//i.test(text)) return { type: 'url', label: 'URL / Link', icon: Link2 };
  if (/^WIFI:/i.test(text)) return { type: 'wifi', label: 'Wi-Fi Credentials', icon: Wifi };
  if (/^BEGIN:VCARD/i.test(text)) return { type: 'vcard', label: 'Contact (vCard)', icon: FileText };
  if (/^mailto:/i.test(text)) return { type: 'email', label: 'Email Address', icon: FileText };
  if (/^SMSTO?:/i.test(text)) return { type: 'sms', label: 'SMS Message', icon: FileText };
  if (/^geo:/i.test(text)) return { type: 'geo', label: 'GPS Location', icon: FileText };
  return { type: 'text', label: 'Plain Text', icon: FileText };
}

function parseWifi(str) {
  const get = (key) => {
    const match = str.match(new RegExp(`${key}:([^;]*)`));
    return match ? match[1] : '';
  };
  return {
    ssid: get('S'),
    security: get('T') || 'None',
    password: get('P'),
    hidden: /H:true/i.test(str),
  };
}

export default function QRDecoder() {
  const [dragActive, setDragActive] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [decoding, setDecoding] = useState(false);
  const [result, setResult] = useState(null); // { text, type, label }
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const decode = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    setDecoding(true);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      setPreviewSrc(src);

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        setDecoding(false);
        if (code) {
          const { type, label, icon } = detectType(code.data);
          setResult({ text: code.data, type, label, icon });
        } else {
          // Try inverted
          const codeInv = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'onlyInvert',
          });
          if (codeInv) {
            const { type, label, icon } = detectType(codeInv.data);
            setResult({ text: codeInv.data, type, label, icon });
          } else {
            setError('No QR code detected. Try a clearer, higher-contrast image.');
          }
        }
      };
      img.onerror = () => {
        setDecoding(false);
        setError('Could not load image. Please try a different file.');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) decode(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) decode(e.target.files[0]);
  };

  const handleReset = () => {
    setPreviewSrc(null);
    setResult(null);
    setError(null);
    setDecoding(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopy = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const wifiData = result?.type === 'wifi' ? parseWifi(result.text) : null;

  return (
    <div className="decoder-wrapper">
      {/* Hidden canvas for pixel processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="decoder-layout">
        {/* Left: Upload Zone */}
        <div className="decoder-upload-col">
          <div className="decoder-card">
            <h3 className="decoder-section-title">
              <ScanLine size={20} />
              Upload QR Image
            </h3>
            <p className="decoder-desc">
              Upload any image containing a QR code. Works with screenshots, photos, or saved QR files.
            </p>

            {!previewSrc ? (
              <div
                className={`decoder-dropzone${dragActive ? ' drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div className="decoder-dropzone-icon">
                  <UploadCloud size={36} />
                </div>
                <span className="decoder-dropzone-text">
                  Drag & drop QR image here
                </span>
                <span className="decoder-dropzone-hint">
                  or <span className="decoder-link">click to browse</span>
                </span>
                <span className="decoder-dropzone-formats">PNG · JPG · WebP · GIF · BMP</span>
              </div>
            ) : (
              <div className="decoder-preview-container">
                <div className="decoder-preview-img-wrap">
                  <img src={previewSrc} alt="Uploaded QR" className="decoder-preview-img" />
                  {decoding && (
                    <div className="decoder-scanning-overlay">
                      <RefreshCw size={24} className="animate-spin" />
                      <span>Scanning…</span>
                    </div>
                  )}
                </div>
                <button className="decoder-reset-btn" onClick={handleReset}>
                  <X size={15} /> Try Another Image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Result Panel */}
        <div className="decoder-result-col">
          <div className="decoder-card decoder-result-card">
            <h3 className="decoder-section-title">
              <FileText size={20} />
              Decoded Output
            </h3>

            {!previewSrc && !result && !error && (
              <div className="decoder-empty-state">
                <div className="decoder-empty-icon">
                  <ScanLine size={40} />
                </div>
                <p>Upload a QR image on the left to see the decoded content here.</p>
              </div>
            )}

            {decoding && (
              <div className="decoder-empty-state">
                <div className="decoder-empty-icon" style={{ color: 'var(--color-accent)' }}>
                  <RefreshCw size={36} className="animate-spin" />
                </div>
                <p>Analysing image pixels…</p>
              </div>
            )}

            {error && !decoding && (
              <div className="decoder-error-box">
                <AlertCircle size={20} />
                <div>
                  <strong>Detection Failed</strong>
                  <p style={{ marginBottom: 0, marginTop: '4px', fontSize: '0.9rem' }}>{error}</p>
                </div>
              </div>
            )}

            {result && !decoding && (
              <div className="decoder-result-content">
                {/* Type Badge */}
                <div className="decoder-type-badge">
                  <result.icon size={14} />
                  {result.label}
                </div>

                {/* Wi-Fi Parsed View */}
                {result.type === 'wifi' && wifiData && (
                  <div className="decoder-wifi-grid">
                    <div className="decoder-wifi-row">
                      <span className="decoder-wifi-key">Network (SSID)</span>
                      <span className="decoder-wifi-val">{wifiData.ssid || '—'}</span>
                    </div>
                    <div className="decoder-wifi-row">
                      <span className="decoder-wifi-key">Security</span>
                      <span className="decoder-wifi-val">{wifiData.security}</span>
                    </div>
                    <div className="decoder-wifi-row">
                      <span className="decoder-wifi-key">Password</span>
                      <span className="decoder-wifi-val decoder-password">
                        {wifiData.password || 'None'}
                      </span>
                    </div>
                    <div className="decoder-wifi-row">
                      <span className="decoder-wifi-key">Hidden</span>
                      <span className="decoder-wifi-val">{wifiData.hidden ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                )}

                {/* Raw text output */}
                <div className="decoder-raw-label">Raw Content</div>
                <div className="decoder-raw-box">
                  {result.text}
                </div>

                {/* Actions */}
                <div className="decoder-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleCopy}>
                    {copied ? (
                      <><Check size={14} /> Copied!</>
                    ) : (
                      <><Copy size={14} /> Copy Content</>
                    )}
                  </button>
                  {result.type === 'url' && (
                    <a
                      href={result.text}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <ExternalLink size={14} /> Open Link
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tips card */}
          <div className="decoder-tips-card">
            <p className="decoder-tips-title">💡 Tips for best results</p>
            <ul className="decoder-tips-list">
              <li>Use high-resolution, unblurred images</li>
              <li>Ensure good contrast between QR and background</li>
              <li>Screenshots decode more reliably than phone photos</li>
              <li>Cropping tightly around the QR improves accuracy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
