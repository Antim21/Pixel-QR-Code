import { useState, useEffect } from 'react';
import LearnSection from './components/LearnSection';
import GeneratorSection from './components/GeneratorSection';
import QRDecoder from './components/QRDecoder';
import QRScanner from './components/QRScanner';
import URLShortener from './components/URLShortener';
import { QrCode, BookOpen, Sun, Moon, ScanLine, Camera, Link2 } from 'lucide-react';

const PixelQRLogo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transition: 'transform var(--transition-fast)' }}
    className="logo-icon-svg"
  >
    {/* Top-left finder pattern */}
    <rect x="8" y="8" width="36" height="36" rx="5" fill="var(--color-accent)" />
    <rect x="16" y="16" width="20" height="20" rx="2" fill="var(--color-bg)" />
    <rect x="22" y="22" width="8" height="8" rx="1" fill="var(--color-accent)" />
    {/* Top-right finder pattern */}
    <rect x="56" y="8" width="36" height="36" rx="5" fill="var(--color-accent)" />
    <rect x="64" y="16" width="20" height="20" rx="2" fill="var(--color-bg)" />
    <rect x="70" y="22" width="8" height="8" rx="1" fill="var(--color-accent)" />
    {/* Bottom-left finder pattern */}
    <rect x="8" y="56" width="36" height="36" rx="5" fill="var(--color-accent)" />
    <rect x="16" y="64" width="20" height="20" rx="2" fill="var(--color-bg)" />
    <rect x="22" y="70" width="8" height="8" rx="1" fill="var(--color-accent)" />
    {/* Data pixel dots bottom-right area */}
    <rect x="56" y="56" width="10" height="10" rx="2" fill="var(--color-accent)" />
    <rect x="72" y="56" width="10" height="10" rx="2" fill="var(--color-accent)" />
    <rect x="56" y="72" width="10" height="10" rx="2" fill="var(--color-accent)" />
    <rect x="64" y="64" width="10" height="10" rx="2" fill="var(--color-accent)" opacity="0.5" />
    <rect x="80" y="72" width="10" height="10" rx="2" fill="var(--color-accent)" />
    <rect x="72" y="80" width="10" height="10" rx="2" fill="var(--color-accent)" opacity="0.4" />
  </svg>
);

function App() {
  const [activeView, setActiveView] = useState('learn'); // 'learn' | 'generator' | 'decoder' | 'scanner' | 'shortener'
  const [generatorUrl, setGeneratorUrl] = useState('');
  const [theme, setTheme] = useState(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  });
  const [serverConfig, setServerConfig] = useState(null);

  // Sync theme with body class and local storage
  useEffect(() => {
    const root = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only update if user hasn't pinned a specific theme
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Fetch server config on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => {
        if (!res.ok) throw new Error('Not local server');
        return res.json();
      })
      .then((data) => {
        console.log('Server config loaded:', data);
        setServerConfig(data);
      })
      .catch((err) => {
        console.log('Running in static/serverless mode:', err.message);
      });
  }, []);

  // View transition navigation helper
  const navigateTo = (view) => {
    if (activeView === view) return;
    
    if (!document.startViewTransition) {
      setActiveView(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    document.startViewTransition(() => {
      setActiveView(view);
      // Wait for React to render before scrolling
      setTimeout(() => window.scrollTo({ top: 0 }), 0);
    });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo-container" onClick={() => navigateTo('learn')} style={{ cursor: 'pointer' }}>
          <PixelQRLogo size={32} />
          <span className="logo-text">
            Pixel<span>QR</span>
          </span>
        </div>

        <div className="nav-links">
          <button 
            className={`nav-btn ${activeView === 'learn' ? 'active' : ''}`}
            onClick={() => navigateTo('learn')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={16} /> Learn
            </span>
          </button>
          <button 
            className={`nav-btn ${activeView === 'generator' ? 'active' : ''}`}
            onClick={() => navigateTo('generator')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <QrCode size={16} /> Generator
            </span>
          </button>
          <button 
            className={`nav-btn ${activeView === 'decoder' ? 'active' : ''}`}
            onClick={() => navigateTo('decoder')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ScanLine size={16} /> Decoder
            </span>
          </button>
          <button 
            className={`nav-btn ${activeView === 'scanner' ? 'active' : ''}`}
            onClick={() => navigateTo('scanner')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} /> Scanner
            </span>
          </button>
          <button 
            className={`nav-btn ${activeView === 'shortener' ? 'active' : ''}`}
            onClick={() => navigateTo('shortener')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Link2 size={16} /> Shortener
            </span>
          </button>
          
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main>
        {activeView === 'learn' && <LearnSection onStartGenerating={() => navigateTo('generator')} />}
        {activeView === 'generator' && (
          <GeneratorSection 
            serverConfig={serverConfig} 
            initialUrl={generatorUrl}
            onClearInitialUrl={() => setGeneratorUrl('')}
          />
        )}
        {activeView === 'decoder' && (
          <div className="view-section">
            <div className="tool-page-header">
              <h2>QR Code Decoder</h2>
              <p>Upload any image containing a QR code — we'll decode it and reveal what's inside, right in your browser. No data is sent to any server.</p>
            </div>
            <QRDecoder />
          </div>
        )}
        {activeView === 'scanner' && (
          <div className="view-section">
            <div className="tool-page-header">
              <h2>Live QR Scanner</h2>
              <p>Point your camera at any QR code and it decodes instantly — no uploads, no servers, 100% in your browser.</p>
            </div>
            <QRScanner />
          </div>
        )}
        {activeView === 'shortener' && (
          <div className="view-section">
            <div className="tool-page-header">
              <h2>URL Shortener</h2>
              <p>Turn any long URL into a short, clean link — then generate a QR code for it. Shorter URL = simpler QR = easier to scan.</p>
            </div>
            <URLShortener
              onUseInGenerator={(shortUrl) => {
                setGeneratorUrl(shortUrl);
                navigateTo('generator');
              }}
            />
          </div>
        )}
      </main>

      <footer>
        <p>© {new Date().getFullYear()} PixelQR — High Tech QR Engine & Education Platform.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          Designed by Antim Maurya. Built with React and Express.
        </p>
      </footer>
    </div>
  );
}

export default App;
