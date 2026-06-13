import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Link2, Scissors, Copy, Check, ExternalLink, Download,
  RefreshCw, Clock, Trash2, QrCode, AlertCircle, ArrowRight, TrendingDown
} from 'lucide-react';

const HISTORY_KEY = 'pixelqr_shortener_history';
const MAX_HISTORY = 8;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {}
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

function savings(orig, short) {
  const pct = Math.round(((orig - short) / orig) * 100);
  return pct > 0 ? pct : 0;
}

export default function URLShortener({ onUseInGenerator }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { short, original, createdAt }
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [activeHistoryQr, setActiveHistoryQr] = useState(null); // index of expanded history QR
  const miniCanvasRef = useRef(null);

  // Draw QR onto a canvas then convert to data URL
  const drawMiniQr = useCallback(async (value, canvasEl) => {
    if (!canvasEl || !value) return null;
    try {
      await QRCode.toCanvas(canvasEl, value, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#191919', light: '#FAF6F0' },
      });
      return canvasEl.toDataURL('image/png');
    } catch {
      return null;
    }
  }, []);

  // Generate QR data URL for result
  useEffect(() => {
    if (!result?.short) { setQrDataUrl(null); return; }
    const offscreen = document.createElement('canvas');
    QRCode.toCanvas(offscreen, result.short, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#191919', light: '#FAF6F0' },
    }).then(() => setQrDataUrl(offscreen.toDataURL('image/png')))
      .catch(() => setQrDataUrl(null));
  }, [result]);

  const shorten = async () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Please enter a URL.'); return; }
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('URL must start with http:// or https://');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setQrDataUrl(null);

    try {
      // Try our local Express proxy first (no CORS issues)
      let data;
      try {
        const res = await fetch(`/api/shorten?url=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          throw new Error('Proxy server error');
        }
        data = await res.json();
      } catch {
        // Fallback: call is.gd via corsproxy.io if backend isn't running
        const res = await fetch(
          `https://corsproxy.io/?url=${encodeURIComponent(`https://is.gd/create.php?format=json&url=${encodeURIComponent(trimmed)}`)}`
        );
        data = await res.json();
      }

      if (data.shorturl) {
        const entry = {
          short: data.shorturl,
          original: trimmed,
          createdAt: new Date().toISOString(),
        };
        setResult(entry);

        // Prepend to history (avoid duplicates)
        setHistory(prev => {
          const filtered = prev.filter(h => h.original !== trimmed);
          const next = [entry, ...filtered].slice(0, MAX_HISTORY);
          saveHistory(next);
          return next;
        });
      } else if (data.error) {
        throw new Error(data.error);
      } else if (data.errorcode) {
        throw new Error(data.errormessage || 'Could not shorten URL');
      } else {
        throw new Error('Unknown error from shortening service');
      }
    } catch (err) {
      setError(err.message || 'Failed to shorten. Check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `pixelqr-short-${Date.now()}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteHistory = (idx) => {
    setHistory(prev => {
      const next = prev.filter((_, i) => i !== idx);
      saveHistory(next);
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') shorten();
  };

  const handleHistoryQrToggle = async (idx) => {
    if (activeHistoryQr === idx) {
      setActiveHistoryQr(null);
      return;
    }
    setActiveHistoryQr(idx);
  };

  return (
    <div className="shortener-wrapper">
      {/* Input card */}
      <div className="shortener-input-card">
        <div className="shortener-input-header">
          <Scissors size={18} className="shortener-header-icon" />
          <div>
            <h3 className="shortener-input-title">Paste your long URL</h3>
            <p className="shortener-input-sub">Shorter URLs = simpler QR codes with fewer modules — easier to scan</p>
          </div>
        </div>

        <div className="shortener-input-row">
          <div className="shortener-input-wrap">
            <Link2 size={16} className="shortener-input-icon" />
            <input
              id="url-input"
              type="url"
              className="shortener-url-input"
              placeholder="https://your-very-long-url.com/with/many/params?ref=xyz"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(null); }}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            {url && (
              <button
                className="shortener-clear-btn"
                onClick={() => { setUrl(''); setError(null); setResult(null); }}
              >×</button>
            )}
          </div>
          <button
            className="btn btn-accent shortener-shorten-btn"
            onClick={shorten}
            disabled={loading || !url.trim()}
          >
            {loading
              ? <><RefreshCw size={15} className="animate-spin" /> Shortening…</>
              : <><Scissors size={15} /> Shorten</>}
          </button>
        </div>

        {url && !error && (
          <div className="shortener-char-bar">
            <span className="shortener-char-count">{url.length} characters</span>
            <div className="shortener-char-track">
              <div
                className="shortener-char-fill"
                style={{ width: `${Math.min(100, (url.length / 200) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="shortener-error">
            <AlertCircle size={15} />
            {error}
          </div>
        )}
      </div>

      {/* Result + QR side by side */}
      {result && (
        <div className="shortener-result-grid">
          {/* Result card */}
          <div className="shortener-result-card">
            <div className="shortener-result-badge">
              <TrendingDown size={13} />
              {savings(result.original.length, result.short.length)}% shorter
            </div>

            <div className="shortener-comparison">
              <div className="shortener-comparison-row original">
                <span className="shortener-comparison-label">Original</span>
                <span className="shortener-comparison-url">{result.original}</span>
                <span className="shortener-comparison-len">{result.original.length} chars</span>
              </div>
              <div className="shortener-arrow">
                <ArrowRight size={16} />
              </div>
              <div className="shortener-comparison-row short">
                <span className="shortener-comparison-label">Shortened</span>
                <a
                  href={result.short}
                  target="_blank"
                  rel="noreferrer"
                  className="shortener-short-link"
                >
                  {result.short}
                </a>
                <span className="shortener-comparison-len">{result.short.length} chars</span>
              </div>
            </div>

            <div className="shortener-result-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleCopy(result.short)}
              >
                {copied === result.short
                  ? <><Check size={13} /> Copied!</>
                  : <><Copy size={13} /> Copy Short URL</>}
              </button>
              <a
                href={result.short}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <ExternalLink size={13} /> Open
              </a>
              {onUseInGenerator && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onUseInGenerator(result.short)}
                  title="Open this URL in the QR Generator"
                >
                  <QrCode size={13} /> Full Generator
                </button>
              )}
            </div>
          </div>

          {/* Mini QR card */}
          <div className="shortener-qr-card">
            <span className="shortener-qr-label">QR of Short URL</span>
            {qrDataUrl ? (
              <>
                <img
                  src={qrDataUrl}
                  alt="QR code for shortened URL"
                  className="shortener-qr-img"
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleDownloadQr}
                  style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                >
                  <Download size={13} /> Download QR
                </button>
              </>
            ) : (
              <div className="shortener-qr-placeholder">
                <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="shortener-history-card">
          <div className="shortener-history-header">
            <span className="shortener-history-title">
              <Clock size={15} /> Recent
            </span>
            <button
              className="shortener-history-clear"
              onClick={handleClearHistory}
            >
              <Trash2 size={13} /> Clear all
            </button>
          </div>

          <div className="shortener-history-list">
            {history.map((item, idx) => (
              <div key={idx} className="shortener-history-item">
                <div className="shortener-history-main">
                  <div className="shortener-history-urls">
                    <span className="shortener-history-orig" title={item.original}>
                      {item.original.length > 60 ? item.original.slice(0, 60) + '…' : item.original}
                    </span>
                    <div className="shortener-history-bottom">
                      <a
                        href={item.short}
                        target="_blank"
                        rel="noreferrer"
                        className="shortener-history-short"
                      >
                        {item.short}
                      </a>
                      <span className="shortener-history-date">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="shortener-history-actions">
                    <button
                      className="shortener-hist-btn"
                      onClick={() => handleCopy(item.short)}
                      title="Copy short URL"
                    >
                      {copied === item.short ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <button
                      className="shortener-hist-btn"
                      onClick={() => handleHistoryQrToggle(idx)}
                      title="Show QR"
                    >
                      <QrCode size={13} />
                    </button>
                    <button
                      className="shortener-hist-btn shortener-hist-delete"
                      onClick={() => handleDeleteHistory(idx)}
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Inline QR toggle */}
                {activeHistoryQr === idx && (
                  <HistoryQRMini url={item.short} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why it matters info card */}
      <div className="shortener-why-card">
        <div className="shortener-why-grid">
          <div className="shortener-why-item">
            <span className="shortener-why-icon">📦</span>
            <strong>Fewer modules</strong>
            <p>Short URLs need fewer QR pixels — less dense, easier to print small</p>
          </div>
          <div className="shortener-why-item">
            <span className="shortener-why-icon">⚡</span>
            <strong>Faster scanning</strong>
            <p>Simpler QR codes are decoded faster by all scanner apps</p>
          </div>
          <div className="shortener-why-item">
            <span className="shortener-why-icon">🎨</span>
            <strong>Better design</strong>
            <p>Lower-version QRs allow more creative customization and logo overlays</p>
          </div>
          <div className="shortener-why-item">
            <span className="shortener-why-icon">🔗</span>
            <strong>Cleaner sharing</strong>
            <p>Short links are readable and memorable even without a QR scanner</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tiny inline component to render history QR on demand
function HistoryQRMini({ url }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    const offscreen = document.createElement('canvas');
    QRCode.toCanvas(offscreen, url, {
      width: 160,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#191919', light: '#FAF6F0' },
    }).then(() => setDataUrl(offscreen.toDataURL('image/png')))
      .catch(() => {});
  }, [url]);

  if (!dataUrl) return (
    <div className="shortener-history-qr-mini" style={{ justifyContent: 'center', display: 'flex', padding: '12px' }}>
      <RefreshCw size={16} className="animate-spin" />
    </div>
  );

  return (
    <div className="shortener-history-qr-mini">
      <img src={dataUrl} alt="QR" />
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => {
          const link = document.createElement('a');
          link.download = `pixelqr-${Date.now()}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      >
        <Download size={12} /> Save
      </button>
    </div>
  );
}
