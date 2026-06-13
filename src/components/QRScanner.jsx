import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera, CameraOff, RefreshCw, Copy, Check, ExternalLink,
  Link2, Wifi, FileText, AlertCircle, FlipHorizontal2, Maximize2
} from 'lucide-react';

function detectType(text) {
  if (!text) return { type: 'unknown', label: 'Unknown', Icon: FileText };
  if (/^https?:\/\//i.test(text)) return { type: 'url', label: 'URL / Link', Icon: Link2 };
  if (/^WIFI:/i.test(text)) return { type: 'wifi', label: 'Wi-Fi Credentials', Icon: Wifi };
  if (/^BEGIN:VCARD/i.test(text)) return { type: 'vcard', label: 'Contact (vCard)', Icon: FileText };
  if (/^mailto:/i.test(text)) return { type: 'email', label: 'Email', Icon: FileText };
  if (/^SMSTO?:/i.test(text)) return { type: 'sms', label: 'SMS Message', Icon: FileText };
  if (/^geo:/i.test(text)) return { type: 'geo', label: 'GPS Location', Icon: FileText };
  return { type: 'text', label: 'Plain Text', Icon: FileText };
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
  };
}

export default function QRScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // environment = back, user = front
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);

  // Check if multiple cameras exist
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const cams = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(cams.length > 1);
    }).catch(() => {});
  }, []);

  const stopStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScan = useCallback(async (facing = facingMode) => {
    setError(null);
    setResult(null);
    setScanning(true);

    try {
      stopStream();

      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      setIsActive(true);
      setScanning(false);

      const tick = () => {
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code?.data) {
          const { type, label, Icon } = detectType(code.data);
          setResult({ text: code.data, type, label, Icon });
          setScanFlash(true);
          setTimeout(() => setScanFlash(false), 600);
          // Pause scanning after finding — user can reset
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setScanning(false);
      setIsActive(false);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  }, [facingMode, stopStream]);

  const handleStop = useCallback(() => {
    stopStream();
    setIsActive(false);
    setScanning(false);
  }, [stopStream]);

  const handleFlip = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (isActive) startScan(next);
  }, [facingMode, isActive, startScan]);

  const handleReset = useCallback(() => {
    setResult(null);
    // Resume scanning
    if (rafRef.current === null && streamRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const tick = () => {
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code?.data) {
          const { type, label, Icon } = detectType(code.data);
          setResult({ text: code.data, type, label, Icon });
          setScanFlash(true);
          setTimeout(() => setScanFlash(false), 600);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const handleCopy = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Cleanup on unmount
  useEffect(() => () => stopStream(), [stopStream]);

  const wifiData = result?.type === 'wifi' ? parseWifi(result.text) : null;

  return (
    <div className="scanner-wrapper">
      <div className="scanner-layout">
        {/* Left: Camera Panel */}
        <div className="scanner-cam-col">
          <div className="scanner-cam-card">
            <div className="scanner-cam-header">
              <span className="scanner-cam-title">
                <Camera size={18} /> Live Camera
              </span>
              {isActive && (
                <div className="scanner-status-dot">
                  <span className="scanner-status-pulse" />
                  Scanning
                </div>
              )}
            </div>

            {/* Video viewport */}
            <div className={`scanner-viewport${scanFlash ? ' scan-flash' : ''}`}>
              <video
                ref={videoRef}
                className="scanner-video"
                muted
                playsInline
                style={{ display: isActive ? 'block' : 'none' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Idle placeholder */}
              {!isActive && !scanning && (
                <div className="scanner-idle-placeholder">
                  <div className="scanner-idle-icon">
                    <Camera size={48} />
                  </div>
                  <p>Camera is off</p>
                  <span>Press <strong>Start Scanning</strong> to activate</span>
                </div>
              )}

              {/* Loading spinner */}
              {scanning && (
                <div className="scanner-idle-placeholder">
                  <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                  <p style={{ marginTop: '12px' }}>Requesting camera…</p>
                </div>
              )}

              {/* Viewfinder overlay when active and no result */}
              {isActive && !result && (
                <div className="scanner-viewfinder">
                  <div className="scanner-corner tl" />
                  <div className="scanner-corner tr" />
                  <div className="scanner-corner bl" />
                  <div className="scanner-corner br" />
                  <div className="scanner-scan-line" />
                </div>
              )}

              {/* Frozen overlay when result found */}
              {isActive && result && (
                <div className="scanner-found-overlay">
                  <Check size={36} />
                  <span>QR Detected!</span>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="scanner-controls">
              {!isActive ? (
                <button
                  className="btn btn-accent scanner-main-btn"
                  onClick={() => startScan()}
                  disabled={scanning}
                >
                  {scanning ? (
                    <><RefreshCw size={16} className="animate-spin" /> Starting…</>
                  ) : (
                    <><Camera size={16} /> Start Scanning</>
                  )}
                </button>
              ) : (
                <button
                  className="btn btn-secondary scanner-main-btn"
                  onClick={handleStop}
                >
                  <CameraOff size={16} /> Stop Camera
                </button>
              )}

              {hasMultipleCameras && isActive && (
                <button
                  className="btn btn-secondary scanner-icon-btn"
                  onClick={handleFlip}
                  title="Flip camera"
                >
                  <FlipHorizontal2 size={16} />
                </button>
              )}
            </div>

            {error && (
              <div className="scanner-error-box">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="scanner-tips-card">
            <p className="scanner-tips-title">💡 Tips for best scanning</p>
            <ul className="scanner-tips-list">
              <li>Hold the QR code steady within the frame corners</li>
              <li>Ensure good lighting — avoid glare and shadows</li>
              <li>The QR code fills at least 30% of the camera view</li>
              <li>Works offline — no data leaves your device</li>
            </ul>
          </div>
        </div>

        {/* Right: Result Panel */}
        <div className="scanner-result-col">
          <div className="scanner-result-card">
            <h3 className="scanner-result-title">
              <Maximize2 size={18} />
              Scan Result
            </h3>

            {!result && !error && (
              <div className="scanner-result-empty">
                <div className="scanner-result-empty-icon">
                  <Maximize2 size={44} />
                </div>
                <p>Point your camera at a QR code</p>
                <span>Results will appear here instantly</span>
              </div>
            )}

            {result && (
              <div className="scanner-result-content">
                {/* Type badge */}
                <div className="scanner-type-badge">
                  <result.Icon size={13} />
                  {result.label}
                </div>

                {/* Wi-Fi parsed view */}
                {result.type === 'wifi' && wifiData && (
                  <div className="scanner-wifi-grid">
                    <div className="scanner-wifi-row">
                      <span className="scanner-wifi-key">Network (SSID)</span>
                      <span className="scanner-wifi-val">{wifiData.ssid || '—'}</span>
                    </div>
                    <div className="scanner-wifi-row">
                      <span className="scanner-wifi-key">Security</span>
                      <span className="scanner-wifi-val">{wifiData.security}</span>
                    </div>
                    <div className="scanner-wifi-row">
                      <span className="scanner-wifi-key">Password</span>
                      <span className="scanner-wifi-val" style={{ letterSpacing: '0.08em' }}>
                        {wifiData.password || 'None'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Raw payload */}
                <div className="scanner-raw-label">Decoded Payload</div>
                <div className="scanner-raw-box">{result.text}</div>

                {/* Actions */}
                <div className="scanner-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleCopy}>
                    {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
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

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleReset}
                    style={{ marginLeft: 'auto' }}
                  >
                    <RefreshCw size={14} /> Scan Another
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Browser compatibility note */}
          <div className="scanner-compat-card">
            <p className="scanner-compat-title">🔒 Privacy First</p>
            <p className="scanner-compat-body">
              Camera access happens entirely in your browser. No video frames are uploaded or stored.
              Decoding runs locally using <code>jsQR</code> — works fully offline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
