import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Link2, FileText, Wifi, Image, UploadCloud, Check, Copy, Download, 
  ChevronDown, ExternalLink, ShieldAlert, Cpu, Laptop, ShieldCheck, RefreshCw, X, QrCode
} from 'lucide-react';

const PASTEL_PALETTES = [
  { name: 'Charcoal Minimal', fore: '#191919', back: '#FAF6F0' },
  { name: 'Terracotta Sand', fore: '#B45309', back: '#FEF3C7' },
  { name: 'Forest Mint', fore: '#15803D', back: '#F0FDF4' },
  { name: 'Slate Ice', fore: '#1E293B', back: '#F1F5F9' },
  { name: 'Ocean Mist', fore: '#0369A1', back: '#F0F9FF' },
  { name: 'Plum Blush', fore: '#701A75', back: '#FDF4FF' }
];

export default function GeneratorSection({ serverConfig, initialUrl, onClearInitialUrl }) {
  const [contentType, setContentType] = useState('link'); // 'link', 'text', 'file', 'photo', 'wifi'
  
  // Input states
  const [urlInput, setUrlInput] = useState('https://');

  useEffect(() => {
    if (initialUrl) {
      setContentType('link');
      setUrlInput(initialUrl);
      if (onClearInitialUrl) {
        onClearInitialUrl();
      }
    }
  }, [initialUrl, onClearInitialUrl]);
  const [textInput, setTextInput] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSecurity, setWifiSecurity] = useState('WPA'); // 'WPA', 'WEP', 'nopass'
  const [wifiHidden, setWifiHidden] = useState(false);

  // File Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('cloud'); // 'local', 'cloud'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { success: bool, url: string, fullUrl: string, originalName: string }
  const fileInputRef = useRef(null);

  // QR Customizer states
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [customFore, setCustomFore] = useState('#191919');
  const [customBack, setCustomBack] = useState('#FAF6F0');
  const [useCustomColors, setUseCustomColors] = useState(false);
  
  const [errorCorrection, setErrorCorrection] = useState('H'); // 'L', 'M', 'Q', 'H' (H recommended for logo)
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const logoInputRef = useRef(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // QR Generation state
  const [qrValue, setQrValue] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [qrMeta, setQrMeta] = useState({ version: 1, mask: 0 });
  const canvasRef = useRef(null);

  // Sync colors
  const activeFore = useCustomColors ? customFore : PASTEL_PALETTES[paletteIdx].fore;
  const activeBack = useCustomColors ? customBack : PASTEL_PALETTES[paletteIdx].back;

  // Resolve qrValue based on input parameters
  useEffect(() => {
    if (contentType === 'link') {
      setQrValue(urlInput || '');
    } else if (contentType === 'text') {
      setQrValue(textInput || '');
    } else if (contentType === 'wifi') {
      // Wi-Fi QR Code string structure: WIFI:S:SSID;T:Security;P:Password;H:true;;
      if (wifiSsid) {
        const escapeStr = (str) => str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/:/g, '\\:').replace(/,/g, '\\,');
        const ssid = escapeStr(wifiSsid);
        const pass = escapeStr(wifiPassword);
        setQrValue(`WIFI:S:${ssid};T:${wifiSecurity};P:${pass};H:${wifiHidden ? 'true' : 'false'};;`);
      } else {
        setQrValue('');
      }
    } else if (contentType === 'file' || contentType === 'photo') {
      if (uploadStatus && uploadStatus.success) {
        setQrValue(uploadStatus.fullUrl);
      } else {
        setQrValue('');
      }
    }
  }, [contentType, urlInput, textInput, wifiSsid, wifiPassword, wifiSecurity, wifiHidden, uploadStatus]);

  // Generate QR Code on Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Clear canvas if value is empty
    if (!qrValue) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }

    const qrOptions = {
      width: 400,
      margin: 2,
      errorCorrectionLevel: errorCorrection,
      color: {
        dark: activeFore,
        light: activeBack
      }
    };

    QRCode.toCanvas(canvasRef.current, qrValue, qrOptions, (err) => {
      if (err) {
        console.error('Error generating QR code:', err);
        return;
      }

      // Draw center logo if present
      if (logoPreviewUrl) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = logoPreviewUrl;
        img.onload = () => {
          // Calculate center and size
          const logoSize = Math.floor(canvas.width * 0.18); // 18% of canvas size
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;

          // Draw solid white background card behind the logo to cover underlying modules
          ctx.fillStyle = activeBack;
          ctx.beginPath();
          ctx.roundRect(x - 4, y - 4, logoSize + 8, logoSize + 8, 6);
          ctx.fill();

          // Draw logo image
          ctx.drawImage(img, x, y, logoSize, logoSize);
        };
      }
    });

    // Approximate version and mask for metadata display
    try {
      const qrData = QRCode.create(qrValue, { errorCorrectionLevel: errorCorrection });
      setQrMeta({
        version: qrData.version,
        mask: qrData.maskPattern
      });
    } catch (e) {
      // Ignored for raw estimation
    }

  }, [qrValue, activeFore, activeBack, errorCorrection, logoPreviewUrl]);

  // Drag and drop helper functions
  const [dragActive, setDragActive] = useState(false);
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    // Check type constraints for photo tab
    if (contentType === 'photo' && !file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP) under the photo tab.');
      return;
    }
    setSelectedFile(file);
    setUploadStatus(null); // Reset upload status
  };

  // Upload file logic
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadStatus(null);

    // If local backend is running, route all uploads through it
    if (serverConfig) {
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch(`/api/upload?mode=${uploadMode}`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `${uploadMode === 'cloud' ? 'Cloud' : 'Local'} upload failed`);
        }

        const result = await response.json();

        if (result.success) {
          setUploadStatus({
            success: true,
            url: result.url,
            fullUrl: result.fullUrl,
            originalName: selectedFile.name
          });
        } else {
          throw new Error(`${uploadMode === 'cloud' ? 'Cloud' : 'Local'} upload rejected by server`);
        }
      } catch (err) {
        console.error(err);
        setUploadStatus({
          success: false,
          error: err.message || `Failed to upload in ${uploadMode} mode. Please try again.`
        });
      } finally {
        setIsUploading(false);
      }
    }
    // Fallback: If backend is NOT running (pure static frontend mode)
    else {
      if (uploadMode === 'local') {
        setUploadStatus({
          success: false,
          error: 'Local backend is not running. Run npm run dev to start.'
        });
        setIsUploading(false);
        return;
      }

      // Cloud mode fallback via corsproxy.io (if server is not running)
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('https://corsproxy.io/?url=https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Cloud upload failed');
        const result = await response.json();

        if (result.status === 'success') {
          const fileUrl = result.data.url;
          const directUrl = fileUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

          setUploadStatus({
            success: true,
            url: directUrl,
            fullUrl: directUrl,
            originalName: selectedFile.name
          });
        } else {
          throw new Error(result.message || 'Unknown error');
        }
      } catch (err) {
        console.error(err);
        setUploadStatus({
          success: false,
          error: 'Failed to upload to the temporary cloud. Please try again or run the local server.'
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Logo upload handlers
  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoPreviewUrl(url);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreviewUrl(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Export functions
  const downloadPNG = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSVG = async () => {
    try {
      const options = {
        width: 400,
        margin: 2,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: activeFore,
          light: activeBack
        }
      };

      const svgString = await QRCode.toString(qrValue, {
        ...options,
        type: 'svg'
      });

      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.svg`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    } catch (err) {
      console.error('Copy to clipboard failed', err);
    }
  };

  // Parsing content for Simulator visualization
  const getSimParsedDetails = () => {
    if (!qrValue) return 'No scan payload detected. Fill inputs to generate.';
    
    if (qrValue.startsWith('WIFI:')) {
      const parts = qrValue.split(';');
      const ssid = parts.find(p => p.startsWith('S:'))?.substring(2) || 'Unknown';
      const security = parts.find(p => p.startsWith('T:'))?.substring(2) || 'None';
      const password = parts.find(p => p.startsWith('P:'))?.substring(2) || '';
      return `📶 Wi-Fi Settings:\nSSID: ${ssid}\nSecurity: ${security}\nPassword: ${'*'.repeat(password.length) || 'None'}`;
    }

    if (qrValue.startsWith('http://') || qrValue.startsWith('https://')) {
      const isLocal = qrValue.includes(':3000/uploads/');
      const isCloud = qrValue.includes('tmpfiles.org');
      let type = '🔗 Link';
      if (isLocal) type = '📁 Local File (Wi-Fi Share)';
      else if (isCloud) type = '☁️ Cloud Upload Link';
      return `${type}:\n${qrValue}`;
    }

    return `📝 Plain Text / Note:\n"${qrValue}"`;
  };

  return (
    <div className="view-section">
      <div className="generator-layout">
        {/* Left Side: Generator Controls */}
        <div className="generator-panel">
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '20px' }}>
            Generate Custom QR Code
          </h2>

          {/* Type Selection Tabs */}
          <div className="tab-list">
            <button 
              className={`tab-btn ${contentType === 'link' ? 'active' : ''}`}
              onClick={() => { setContentType('link'); setUploadStatus(null); }}
            >
              <Link2 />
              <span>Link/URL</span>
            </button>
            <button 
              className={`tab-btn ${contentType === 'text' ? 'active' : ''}`}
              onClick={() => { setContentType('text'); setUploadStatus(null); }}
            >
              <FileText />
              <span>Text</span>
            </button>
            <button 
              className={`tab-btn ${contentType === 'file' ? 'active' : ''}`}
              onClick={() => { setContentType('file'); setUploadStatus(null); }}
            >
              <UploadCloud />
              <span>File Share</span>
            </button>
            <button 
              className={`tab-btn ${contentType === 'photo' ? 'active' : ''}`}
              onClick={() => { setContentType('photo'); setUploadStatus(null); }}
            >
              <Image />
              <span>Photo</span>
            </button>
            <button 
              className={`tab-btn ${contentType === 'wifi' ? 'active' : ''}`}
              onClick={() => { setContentType('wifi'); setUploadStatus(null); }}
            >
              <Wifi />
              <span>Wi-Fi</span>
            </button>
          </div>

          {/* DYNAMIC FORMS BASED ON TAB */}
          
          {/* 1. LINK INPUT */}
          {contentType === 'link' && (
            <div className="input-group">
              <label className="input-label">Destination URL</label>
              <input 
                type="url" 
                className="form-control" 
                placeholder="https://example.com/page" 
                value={urlInput} 
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
          )}

          {/* 2. TEXT INPUT */}
          {contentType === 'text' && (
            <div className="input-group">
              <label className="input-label">Plain Text Content</label>
              <textarea 
                className="form-control" 
                placeholder="Enter text, serial numbers, or raw notes..." 
                value={textInput} 
                onChange={(e) => setTextInput(e.target.value)}
              />
            </div>
          )}

          {/* 3. WI-FI INPUT */}
          {contentType === 'wifi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Network Name (SSID)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="MyHomeWifi" 
                  value={wifiSsid} 
                  onChange={(e) => setWifiSsid(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Security Type</label>
                  <select 
                    className="form-control" 
                    value={wifiSecurity} 
                    onChange={(e) => setWifiSecurity(e.target.value)}
                  >
                    <option value="WPA">WPA / WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None (Open)</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="WiFiPassword123" 
                    value={wifiPassword} 
                    disabled={wifiSecurity === 'nopass'}
                    onChange={(e) => setWifiPassword(e.target.value)}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', marginTop: '4px' }}>
                <input 
                  type="checkbox" 
                  checked={wifiHidden} 
                  onChange={(e) => setWifiHidden(e.target.checked)} 
                />
                Hidden network
              </label>
            </div>
          )}

          {/* 4 & 5. FILE / PHOTO UPLOADS */}
          {(contentType === 'file' || contentType === 'photo') && (
            <div>
              {/* Choice of Upload mode */}
              <div className="input-label">Select Hosting Environment</div>
              <div className="upload-mode-selector">
                <div 
                  className={`mode-card ${uploadMode === 'cloud' ? 'active' : ''}`}
                  onClick={() => setUploadMode('cloud')}
                >
                  <span className="mode-card-title">☁️ Cloud Upload</span>
                  <span className="mode-card-desc">Generates a public link valid for 60 mins. Scans anywhere in the world.</span>
                </div>
                <div 
                  className={`mode-card ${uploadMode === 'local' ? 'active' : ''} ${!serverConfig ? 'disabled' : ''}`}
                  onClick={() => serverConfig && setUploadMode('local')}
                  style={{ opacity: serverConfig ? 1 : 0.5, cursor: serverConfig ? 'pointer' : 'not-allowed' }}
                >
                  <span className="mode-card-title">
                    <Laptop size={14} /> Local Share
                  </span>
                  <span className="mode-card-desc">Hosted on your local machine. Files scan instantly for anyone on your Wi-Fi network.</span>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              {!selectedFile ? (
                <div 
                  className={`dropzone-container ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept={contentType === 'photo' ? 'image/*' : '*'}
                    onChange={handleFileChange}
                  />
                  <UploadCloud className="dropzone-icon" />
                  <span className="dropzone-text">Drag & drop your {contentType} here, or <span style={{ textDecoration: 'underline', color: 'var(--color-accent)' }}>browse</span></span>
                  <span className="dropzone-hint">
                    {contentType === 'photo' ? 'Supports JPG, PNG, WebP up to 10MB' : 'Supports PDF, Docs, Zip up to 25MB'}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="file-preview-box">
                    <div className="file-preview-info">
                      {contentType === 'photo' ? <Image size={18} /> : <FileText size={18} />}
                      <div className="file-preview-name" title={selectedFile.name}>{selectedFile.name}</div>
                      <div className="file-preview-size">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</div>
                    </div>
                    {!isUploading && !uploadStatus && (
                      <button className="btn-remove-file" onClick={handleRemoveFile}>
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Trigger Upload Button */}
                  {!uploadStatus && (
                    <button 
                      className="btn btn-accent" 
                      onClick={handleFileUpload} 
                      disabled={isUploading}
                      style={{ width: '100%' }}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Uploading to {uploadMode === 'local' ? 'Local Server' : 'Cloud'}...
                        </>
                      ) : (
                        'Upload & Generate QR Code'
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Upload Notification feedback */}
              {uploadStatus && (
                <div style={{ marginTop: '16px' }}>
                  {uploadStatus.success ? (
                    <div className="alert-notice success">
                      <ShieldCheck className="alert-icon" size={18} />
                      <div className="alert-text-wrapper">
                        <span className="alert-title">Upload Successful!</span>
                        <span className="alert-body">
                          Generated QR points to: <code style={{ wordBreak: 'break-all' }}>{uploadStatus.fullUrl}</code>
                        </span>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={handleRemoveFile}
                          style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                        >
                          Upload Another
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="alert-notice error">
                      <ShieldAlert className="alert-icon" size={18} />
                      <div className="alert-text-wrapper">
                        <span className="alert-title">Upload Failed</span>
                        <span className="alert-body">{uploadStatus.error}</span>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={handleFileUpload}
                          style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                        >
                          Retry Upload
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Local network warning if local selected but backend missing */}
              {uploadMode === 'local' && !serverConfig && (
                <div className="alert-notice info" style={{ marginTop: '12px' }}>
                  <Info className="alert-icon" size={18} />
                  <div className="alert-text-wrapper">
                    <span className="alert-title">Local share inactive</span>
                    <span className="alert-body">
                      The local backend server is not running or accessible. Please use <strong>Cloud Upload</strong> or run <code>node server.js</code> to initialize local IP sharing.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COLLAPSIBLE DESIGN CUSTOMIZER */}
          <div className={`customizer-accordion${isCustomizerOpen ? ' open' : ''}`}>
            <div 
              className="customizer-header" 
              onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
            >
              <span className="customizer-title">
                🎨 Custom Styles & Layout
              </span>
              <ChevronDown 
                size={18} 
                style={{ 
                  transform: isCustomizerOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform var(--transition-normal)'
                }} 
              />
            </div>

            <div className="customizer-content">
              {/* Palette chooser */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Select Color Theme</label>
                <div className="palette-container">
                  {PASTEL_PALETTES.map((pal, idx) => (
                    <div 
                      key={idx}
                      className={`palette-swatch ${!useCustomColors && paletteIdx === idx ? 'active' : ''}`}
                      style={{ backgroundColor: pal.fore }}
                      title={pal.name}
                      onClick={() => {
                        setPaletteIdx(idx);
                        setUseCustomColors(false);
                      }}
                    />
                  ))}
                </div>

                <div className="custom-color-row">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={useCustomColors} 
                      onChange={(e) => setUseCustomColors(e.target.checked)} 
                    />
                    Use Custom Colors
                  </label>

                  {useCustomColors && (
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div className="color-input-wrapper">
                        <span>Dots:</span>
                        <input 
                          type="color" 
                          className="color-picker-input"
                          value={customFore}
                          onChange={(e) => setCustomFore(e.target.value)}
                        />
                      </div>
                      <div className="color-input-wrapper">
                        <span>Bg:</span>
                        <input 
                          type="color" 
                          className="color-picker-input"
                          value={customBack}
                          onChange={(e) => setCustomBack(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error correction selection */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Error Correction Level</label>
                <div className="design-grid-option">
                  {[
                    { key: 'L', label: 'Low (7%)' },
                    { key: 'M', label: 'Medium (15%)' },
                    { key: 'Q', label: 'Quartile (25%)' },
                    { key: 'H', label: 'High (30% - Rec.)' }
                  ].map((ec) => (
                    <button
                      key={ec.key}
                      className={`design-btn ${errorCorrection === ec.key ? 'active' : ''}`}
                      onClick={() => setErrorCorrection(ec.key)}
                    >
                      {ec.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom logo upload */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Center Logo Brand Overlay</label>
                <div className="logo-upload-wrapper">
                  <div className="logo-preview-circle">
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="Logo overlay" />
                    ) : (
                      <Cpu size={18} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={logoInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                  <button 
                    className="logo-upload-btn-label"
                    onClick={() => logoInputRef.current.click()}
                  >
                    Upload Logo
                  </button>
                  {logoPreviewUrl && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={handleRemoveLogo}
                      style={{ color: 'var(--color-error)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Overlaying a logo utilizes error correction. The QR code stays scanable. Recommended to keep Error Correction at High (H).
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Preview Panel */}
        <div className="preview-panel">
          <span className="preview-title">Live QR Preview</span>
          
          <div className="qr-container-wrapper">
            {qrValue ? (
              <canvas ref={canvasRef} />
            ) : (
              <div style={{ width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                <QrCode size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <span style={{ fontSize: '0.85rem' }}>Awaiting Input</span>
              </div>
            )}
          </div>

          {/* Test Scan Simulator */}
          <div className="scan-simulator">
            <div className="sim-header">
              <Cpu size={16} />
              <span>Mobile Scanner Preview</span>
            </div>
            <div className="sim-result-box">
              {getSimParsedDetails()}
            </div>
            {qrValue && (
              <div className="sim-actions">
                {qrValue.startsWith('http') && (
                  <a href={qrValue} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.75rem', padding: '6px' }}>
                    Follow Link <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Metadata Display */}
          {qrValue && (
            <div className="meta-tag-list">
              <div className="meta-item">
                <span className="meta-label">QR Version:</span>
                <span className="meta-value">V{qrMeta.version} ({21 + (qrMeta.version - 1) * 4}x{21 + (qrMeta.version - 1) * 4} modules)</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Mask Pattern:</span>
                <span className="meta-value">Pattern {qrMeta.mask}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Error Correction:</span>
                <span className="meta-value">{errorCorrection} (Max {errorCorrection === 'H' ? '30%' : errorCorrection === 'Q' ? '25%' : errorCorrection === 'M' ? '15%' : '7%'} loss recovery)</span>
              </div>
            </div>
          )}

          {/* Export Action Buttons */}
          <div className="output-actions-grid">
            <button 
              className="output-btn btn-primary" 
              onClick={downloadPNG}
              disabled={!qrValue}
              style={{ opacity: qrValue ? 1 : 0.5 }}
            >
              <Download size={16} /> PNG
            </button>
            <button 
              className="output-btn btn-secondary" 
              onClick={downloadSVG}
              disabled={!qrValue}
              style={{ opacity: qrValue ? 1 : 0.5 }}
            >
              <Download size={16} /> SVG (Vector)
            </button>
            <button 
              className="output-btn btn-secondary" 
              onClick={copyToClipboard}
              disabled={!qrValue}
              style={{ gridColumn: '1 / -1', opacity: qrValue ? 1 : 0.5 }}
            >
              {copySuccess ? (
                <>
                  <Check size={16} style={{ color: 'var(--color-success)' }} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy QR to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
