<div align="center">

```
██████╗ ██╗██╗  ██╗███████╗██╗      ██████╗ ██████╗
██╔══██╗██║╚██╗██╔╝██╔════╝██║     ██╔═══██╗██╔══██╗
██████╔╝██║ ╚███╔╝ █████╗  ██║     ██║   ██║██████╔╝
██╔═══╝ ██║ ██╔██╗ ██╔══╝  ██║     ██║▄▄ ██║██╔══██╗
██║     ██║██╔╝ ██╗███████╗███████╗╚██████╔╝██║  ██║
╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚══▀▀═╝ ╚═╝  ╚═╝
```

**The open-source, pixel-perfect QR toolkit.**  
Generate · Decode · Scan — all in your browser. Zero tracking. Zero uploads. Just pixels.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express)](https://expressjs.com)
[![jsQR](https://img.shields.io/badge/jsQR-Decoder-orange?style=flat-square)](https://github.com/cozmo/jsQR)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## What is PixelQR?

**PixelQR** is a high-fidelity, browser-native QR toolkit — built for people who want more than just a URL box and a download button.

Every tool runs client-side. No QR code you generate or scan ever touches a remote server (unless you choose cloud file hosting). Your data stays yours.

```
┌─────────────────────────────────────────────────────────┐
│  Learn  →  Generator  →  Decoder  →  Scanner  → Shortener│
│                                                         │
│  One app. Five tools. All in the browser.               │
└─────────────────────────────────────────────────────────┘
```

---

## Features

### 📖 Learn — The QR Deep-Dive
An interactive education section that actually teaches you something:
- How QR codes store data (encoding zones, Reed-Solomon correction)
- The anatomy of every part — finder patterns, timing strips, alignment markers
- Clickable SVG diagram: hover over each zone to learn what it does
- FAQ accordion: fake vs. real QR, version differences, what those squares mean

### ⚡ Generator — Build Any QR
Five input modes. One live preview.

| Mode | What it encodes |
|------|----------------|
| 🔗 Link / URL | Any web address |
| 📝 Text | Raw text, notes, serial numbers |
| 📁 File Share | Upload a file → get a scannable link |
| 🖼️ Photo | Upload an image → shareable QR |
| 📶 Wi-Fi | SSID + password → tap-to-connect |

**Customization panel:**
- 6 curated pastel color palettes + custom color picker
- Center logo overlay (your brand stamped into the QR)
- Error correction levels: L / M / Q / H
- Export as **PNG**, **SVG (vector)**, or **copy to clipboard**

**File hosting modes:**
- ☁️ **Cloud** — uploads to `tmpfiles.org` (60-min public link, scans anywhere)
- 🖥️ **Local Wi-Fi** — hosts via your machine's Express server, scans on LAN instantly

### 🔍 Decoder — Reverse Any QR
Drop an image. Get the answer.
- Drag-and-drop or click to upload (PNG · JPG · WebP · GIF · BMP)
- Pixel-level decoding via `jsQR` — runs entirely on-device
- Smart type detection: URL → button to open, Wi-Fi → parsed credential table, text → monospace display
- Copy decoded content with one click
- Tries normal + inverted scan for difficult images

### 📷 Scanner — Live Camera QR
Point. Scan. Done.
- WebRTC `getUserMedia` — no plugins, no extensions
- Animated viewfinder corners + sweeping scan line
- Frame-by-frame `requestAnimationFrame` loop for instant detection
- Front/back camera flip (when multiple cameras detected)
- Green flash overlay on successful decode
- "Scan Another" resumes the loop immediately
- 100% offline — no frame is ever uploaded anywhere

### ✂️ Shortener — URL Optimizer
Shorter URLs require fewer QR modules, making them significantly faster and easier to scan at smaller print sizes:
- **Resilient Fallback Engine**: Uses a server-side proxy to wrap `is.gd` and falls back automatically to `tinyurl.com` if rate-limited or experiencing database issues.
- **Micro QR Preview**: Instantly renders and previews a clean QR code of the shortened link directly in the shortener dashboard.
- **Direct Link Export**: Click "Full Generator" to instantly transfer the shortened link into the customization engine for adding custom colors, frames, or logos.
- **Analytics & History**: Live character-counter bar showing code simplification percentage, and local persistent history in `localStorage` with inline QR code expansion and quick-copy utilities.

---

## Tech Stack

```
Frontend                    Backend (optional)
─────────────────────       ──────────────────────────
React 19 (Vite 8)           Node.js + Express 5
Vanilla CSS (no Tailwind)   Multer (file uploads)
jsQR (QR decode/scan)       Local IPv4 detection
qrcode (QR generation)      Concurrently (dev runner)
lucide-react (icons)        is.gd & TinyURL (shortener APIs)
Plus Jakarta Sans (font)
Lora serif (headings)
JetBrains Mono (code)
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### Install

```bash
git clone https://github.com/yourusername/pixelqr.git
cd pixelqr
npm install
```

### Run (Frontend + Backend together)

```bash
npm run dev
```

This starts:
- **Vite frontend** → `http://localhost:5173`
- **Express backend** → `http://localhost:3000` (for local file sharing)

### Frontend Only

```bash
npm run dev:frontend
```

### Production Build

```bash
npm run build
```

---

## Project Structure

```
pixelqr/
├── index.html                  # Entry HTML + anti-FOUC theme script
├── server.js                   # Express: file uploads + LAN IP detection + URL shortening proxy
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                # React DOM root
    ├── App.jsx                 # Layout, nav, routing, theme toggle
    ├── index.css               # Full design system (tokens, dark mode, all components)
    └── components/
        ├── LearnSection.jsx    # Education page: anatomy SVG, FAQ, cards
        ├── GeneratorSection.jsx# QR generator: 5 input modes, customizer, export
        ├── QRDecoder.jsx       # Image upload → jsQR pixel decode
        ├── QRScanner.jsx       # WebRTC camera → live frame decode
        └── URLShortener.jsx    # URL Shortener: is.gd/TinyURL backend integration
```

---

## Dark Mode

PixelQR ships with a polished dark mode using CSS custom properties. It:
- Defaults to your OS preference (`prefers-color-scheme`)
- Persists your last choice in `localStorage`
- Prevents flash-of-unstyled-content (FOUC) with an inline script in `<head>`
- Transitions all colors smoothly via `transition: background-color 0.3s`

Toggle it anytime with the **sun/moon button** in the top-right corner.

---

## Local File Sharing (Wi-Fi Mode)

When you run `npm run dev`, the Express server starts alongside Vite and:

1. Detects your machine's local IPv4 address
2. Hosts uploaded files at `http://<your-ip>:3000/uploads/<filename>`
3. The frontend generates a QR code pointing to that URL

Anyone on the same Wi-Fi network can scan the QR to download the file instantly.

> This feature requires `npm run dev` (not just `npm run dev:frontend`). The generator UI will automatically disable Local mode if the backend is not reachable.

---

## Privacy

| Action | Where it runs | Data sent anywhere? |
|--------|---------------|---------------------|
| Generate QR | Browser (canvas) | Never |
| Decode image | Browser (jsQR) | Never |
| Live scan | Browser (WebRTC) | Never |
| Shorten URL | Express proxy → `is.gd` / `tinyurl.com` | Target URL only, no user/analytics tracking |
| Cloud file upload | `tmpfiles.org` via CORS proxy | Your file only, 60-min expiry |
| Local file share | Your own machine | LAN only |

---

## Roadmap

- [ ] QR History — save recent codes to localStorage
- [ ] vCard / Contact QR mode
- [ ] Dot-style picker (rounded, dots, classy modules)
- [ ] Gradient QR color fills
- [ ] PWA support — installable, works fully offline
- [ ] Encrypted QR payload (password-protected)

---

## Credits

Designed by **Antim Maurya**  
Built with **React** and **Express**

---

<div align="center">

Made with precision, not shortcuts. Open source. No ads. No tracking.

</div>
