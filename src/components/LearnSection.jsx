import { useState } from 'react';
import { BookOpen, Cpu, ShieldCheck, HelpCircle, ArrowRight, Info, Eye } from 'lucide-react';

const ANATOMY_PARTS = {
  finder: {
    id: 'finder',
    title: 'Finder Patterns (Position Detection)',
    tag: 'Navigation & Position',
    desc: 'The three large squares located in the top-left, top-right, and bottom-left corners. They allow the scanner to instantly locate the QR code, recognize its orientation, and read it from any angle (even 180° upside down or skewed).',
    technical: 'Each finder pattern is a 7x7 module square with a 3x3 black center, separated by a white border. This specific 1:1:3:1:1 width ratio is unique and rarely occurs in natural images, making it easy for scanner software to isolate.'
  },
  alignment: {
    id: 'alignment',
    title: 'Alignment Patterns',
    tag: 'Distortion Correction',
    desc: 'Smaller concentric squares scattered within larger QR codes (starting from Version 2). They act as anchor points, allowing the scanner to correct for perspective distortion, curvature of the surface, or camera tilt.',
    technical: 'As QR codes grow in size (up to Version 40, which is 177x177 modules), physical warping is common. These 5x5 module markers help the scanning algorithm construct a grid overlay, straightening out warped grids.'
  },
  timing: {
    id: 'timing',
    title: 'Timing Patterns',
    tag: 'Grid Mapping',
    desc: 'A single row and column of alternating dark and light modules that connect the three finder patterns. They act as "rulers", telling the scanner the exact width and height of a single module grid cell.',
    technical: 'Because QR codes can be printed at any physical size, timing patterns are critical for calculating the grid coordinate mapping. They run horizontally along row 6 and vertically along column 6.'
  },
  format: {
    id: 'format',
    title: 'Format Information',
    tag: 'Metadata & Error Level',
    desc: 'Important metadata cells near the finder patterns. They contain information about the Error Correction Level (L, M, Q, or H) and the Mask Pattern applied to the data grid.',
    technical: 'Since format information is crucial for decoding the rest of the QR, it is heavily protected. It is encoded twice with its own BCH error correction code so it can be read even if parts of the QR are dirty.'
  },
  data: {
    id: 'data',
    title: 'Data & Error Correction Area',
    tag: 'Payload & Redundancy',
    desc: 'The rest of the QR code grid containing the actual encoded information (links, text, files) alongside mathematical error correction bytes (Reed-Solomon codes) that recover damaged data.',
    technical: 'Data is encoded into binary bits. Reed-Solomon error correction calculations append extra bytes. If a QR code is smudged or scratched, these mathematical equations reconstruct the lost bits, allowing it to scan successfully.'
  }
};

const FAQ_ITEMS = [
  {
    question: "What does 'QR' stand for?",
    answer: "QR stands for 'Quick Response'. They were invented in 1994 by Masahiro Hara from the Japanese company Denso Wave. Initially, they were designed to track automotive parts during manufacturing due to their high speed, high capacity, and multi-directional readability compared to traditional barcodes."
  },
  {
    question: "How much data can a QR code hold?",
    answer: "A QR code can hold up to 2,953 bytes of binary data. In terms of plain text characters, a maximum Version 40 QR code can store up to 7,089 numeric characters, 4,296 alphanumeric characters, or 1,817 Kanji characters. As you add more data, the grid becomes denser (higher version)."
  },
  {
    question: "Do QR codes require an internet connection to scan?",
    answer: "No! The QR code itself is just visual data encoded in black and white squares. Your phone's camera decrypts this data entirely offline. However, if the decoded data is a website link (URL), you will need internet access to open that website. If the QR code contains plain text, Wi-Fi credentials, or contact info (vCard), it works completely offline."
  },
  {
    question: "Why do some QR codes have logos in the center?",
    answer: "This is possible due to Reed-Solomon Error Correction. At the highest level (Level H), up to 30% of the QR code modules can be missing, dirty, or obscured, and the scanner can still mathematically reconstruct the missing data. Designers take advantage of this by placing a custom logo in the center without breaking the scan."
  },
  {
    question: "What is 'Quishing' and how do I prevent it?",
    answer: "Quishing is 'QR Phishing'. Attackers replace real QR codes (e.g., on parking meters, menus, or emails) with stickers pointing to malicious spoofed sites to steal passwords or payment details. To prevent it: (1) check physical QR codes for stickers or overlays, (2) look at the URL preview on your phone screen before opening it, (3) avoid scanning QR codes from unexpected emails, and (4) never download files/apps directly from a QR code link."
  },
  {
    question: "How do QR codes handle scanning errors?",
    answer: "They use Reed-Solomon error correction codes, the same mathematics used in CD/DVD recovery and deep space communications. There are four levels: Level L (7% recovery), Level M (15% recovery), Level Q (25% recovery), and Level H (30% recovery). Higher recovery levels make the QR code safer to use outdoors where they might get scratched, but require a denser grid layout."
  }
];

export default function LearnSection({ onStartGenerating }) {
  const [activePart, setActivePart] = useState('finder');
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="view-section">
      {/* Hero Section */}
      <section className="hero-section">
        <h1>Understanding the Grid</h1>
        <p className="hero-subtitle">
          QR codes are the visual bridge between the physical and digital worlds. Explore their anatomy, how they are generated, and how to scan them safely.
        </p>
        <button className="btn btn-primary btn-lg" onClick={onStartGenerating}>
          Create Your Custom QR Code <ArrowRight size={16} />
        </button>
      </section>

      {/* Interactive Anatomy Explorer */}
      <section className="anatomy-explorer">
        <div className="anatomy-header">
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Interactive QR Anatomy</h2>
          <p style={{ fontSize: '0.95rem' }}>Hover or tap the different color regions of the QR code to learn what they do.</p>
        </div>

        {/* Custom SVG QR Code Diagram */}
        <div className="svg-container">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Background Grid Representation (Light gray dots) */}
            <g opacity="0.15">
              {Array.from({ length: 14 }).map((_, r) =>
                Array.from({ length: 14 }).map((_, c) => (
                  <rect
                    key={`bg-${r}-${c}`}
                    x={10 + r * 6}
                    y={10 + c * 6}
                    width="4"
                    height="4"
                    fill="var(--text-primary)"
                    rx="0.5"
                  />
                ))
              )}
            </g>

            {/* 1. FINDER PATTERNS (Top-Left, Top-Right, Bottom-Left) */}
            <g 
              className={`interactive-part part-finder ${activePart === 'finder' ? 'active' : ''}`}
              onMouseEnter={() => setActivePart('finder')}
              onClick={() => setActivePart('finder')}
            >
              {/* Top-Left Finder */}
              <path d="M 6 6 L 34 6 L 34 34 L 6 34 Z M 14 14 L 26 14 L 26 26 L 14 26 Z" />
              {/* Top-Right Finder */}
              <path d="M 66 6 L 94 6 L 94 34 L 66 34 Z M 74 14 L 86 14 L 86 26 L 74 26 Z" />
              {/* Bottom-Left Finder */}
              <path d="M 6 66 L 34 66 L 34 94 L 6 94 Z M 14 74 L 26 74 L 26 86 L 14 86 Z" />
            </g>

            {/* 2. ALIGNMENT PATTERN (Lower-Right) */}
            <g 
              className={`interactive-part part-alignment ${activePart === 'alignment' ? 'active' : ''}`}
              onMouseEnter={() => setActivePart('alignment')}
              onClick={() => setActivePart('alignment')}
            >
              <path d="M 70 70 L 82 70 L 82 82 L 70 82 Z M 74 74 L 78 74 L 78 78 L 74 78 Z" />
            </g>

            {/* 3. TIMING PATTERNS (Horizontal and Vertical dotted lines) */}
            <g 
              className={`interactive-part part-timing ${activePart === 'timing' ? 'active' : ''}`}
              onMouseEnter={() => setActivePart('timing')}
              onClick={() => setActivePart('timing')}
            >
              {/* Horizontal line at Row 6 (y=28..32) between Top-Left and Top-Right finders */}
              <path d="M 38 28 H 42 V 32 H 38 Z M 46 28 H 50 V 32 H 46 Z M 54 28 H 58 V 32 H 54 Z" />
              {/* Vertical line at Col 6 (x=28..32) between Top-Left and Bottom-Left finders */}
              <path d="M 28 38 V 42 H 32 V 38 Z M 28 46 V 50 H 32 V 46 Z M 28 54 V 58 H 32 V 54 Z" />
            </g>

            {/* 4. FORMAT INFORMATION (Cells next to finder patterns) */}
            <g 
              className={`interactive-part part-format ${activePart === 'format' ? 'active' : ''}`}
              onMouseEnter={() => setActivePart('format')}
              onClick={() => setActivePart('format')}
            >
              {/* Format cells surrounding top-left finder */}
              <rect x="6" y="38" width="4" height="4" />
              <rect x="14" y="38" width="4" height="4" />
              <rect x="22" y="38" width="4" height="4" />
              <rect x="38" y="6" width="4" height="4" />
              <rect x="38" y="14" width="4" height="4" />
              <rect x="38" y="22" width="4" height="4" />
              {/* Format cells around top-right & bottom-left finders */}
              <rect x="60" y="6" width="4" height="4" />
              <rect x="60" y="14" width="4" height="4" />
              <rect x="6" y="60" width="4" height="4" />
              <rect x="14" y="60" width="4" height="4" />
            </g>

            {/* 5. DATA & ERROR CORRECTION AREA (Main matrix body) */}
            <g 
              className={`interactive-part part-data ${activePart === 'data' ? 'active' : ''}`}
              onMouseEnter={() => setActivePart('data')}
              onClick={() => setActivePart('data')}
            >
              {/* A collection of random-looking binary blocks in the remaining area */}
              <rect x="42" y="42" width="8" height="8" />
              <rect x="54" y="42" width="6" height="6" />
              <rect x="42" y="54" width="6" height="8" />
              <rect x="54" y="54" width="10" height="6" />
              <rect x="42" y="70" width="12" height="12" />
              <rect x="86" y="42" width="8" height="8" />
              <rect x="86" y="54" width="6" height="8" />
              <rect x="42" y="86" width="16" height="8" />
              <rect x="62" y="86" width="6" height="6" />
            </g>
          </svg>
        </div>

        {/* Selected Part Explanations */}
        <div className="anatomy-info-box">
          <span className="anatomy-feature-tag">
            {ANATOMY_PARTS[activePart].tag}
          </span>
          <h3 style={{ marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>
            {ANATOMY_PARTS[activePart].title}
          </h3>
          <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
            {ANATOMY_PARTS[activePart].desc}
          </p>
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
              <Cpu size={12} /> Technical Detail
            </span>
            <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', lineHeight: '1.4', color: 'var(--text-secondary)', marginBottom: 0 }}>
              {ANATOMY_PARTS[activePart].technical}
            </p>
          </div>

          {/* Quick link buttons for navigation */}
          <div className="anatomy-desc-list">
            {Object.values(ANATOMY_PARTS).map((part) => (
              <div
                key={part.id}
                className={`anatomy-desc-item ${activePart === part.id ? 'active' : ''}`}
                onClick={() => setActivePart(part.id)}
              >
                <Eye size={14} style={{ color: activePart === part.id ? 'var(--color-accent)' : 'inherit' }} />
                <span>{part.title.split(' (')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Educational Panels */}
      <section className="edu-grid">
        <div className="edu-card">
          <div className="edu-card-title">
            <Cpu size={22} />
            <h3>How QR Codes Work</h3>
          </div>
          <div className="edu-card-body">
            <p>
              QR codes store data as binary strings. The scanning engine reads the black blocks as binary <strong>1s</strong> and the white spaces as <strong>0s</strong>.
            </p>
            <p>
              To keep the grid balanced and avoid large blocks of solid black or white (which confuse camera sensors), a mathematical <strong>mask pattern</strong> is overlaid on the grid. Scanners automatically un-mask this layer before reading.
            </p>
            <p>
              Reed-Solomon mathematical algorithms are woven directly into the grid data. This redundant backup data reconstructs damaged parts of the code.
            </p>
          </div>
        </div>

        <div className="edu-card">
          <div className="edu-card-title">
            <ShieldCheck size={22} />
            <h3>Is Your QR Code Real or Phishing?</h3>
          </div>
          <div className="edu-card-body">
            <p>
              QR Phishing (or <strong>Quishing</strong>) is a growing threat where physical QR codes are taped over with malicious link alternatives.
            </p>
            <ul>
              <li><strong>Check for overlays:</strong> Feel the code card. Is there a sticker covering the original printed code?</li>
              <li><strong>Inspect the domain:</strong> Look at the URL preview before visiting. Ensure it matches the expected official site (e.g. <code>https://officialsite.com</code>, not <code>https://officia1site-login.com</code>).</li>
              <li><strong>Secure Protocol:</strong> Avoid HTTP domains; verify HTTPS.</li>
              <li><strong>Never download direct files:</strong> Treat any QR code that prompts direct APK or executable downloads as suspicious.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="faq-section">
        <h2 className="faq-title">Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className={`faq-item ${openFaq === index ? 'open' : ''}`}
              onClick={() => toggleFaq(index)}
            >
              <div className="faq-header">
                <span className="faq-question">{item.question}</span>
                <HelpCircle size={18} className="faq-icon" />
              </div>
              <div className="faq-answer">
                <p style={{ margin: 0, paddingRight: '20px' }}>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section style={{ margin: '60px 0', padding: '40px 24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '12px' }}>Ready to generate your own QR code?</h2>
        <p style={{ maxWidth: '600px', margin: '0 auto 24px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
          Create highly customized codes for websites, plain text, Wi-Fi details, or upload photos and documents to share instantly.
        </p>
        <button className="btn btn-accent" onClick={onStartGenerating}>
          Get Started <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}
