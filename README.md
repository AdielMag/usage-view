# Usage View ⚡

> Ultra-lightweight Cross-Platform System Tray (Windows) & Menu Bar (macOS) Usage & Session Quota Monitor for **Claude** and **Antigravity / Gemini**.

Built with **Tauri v2 (Rust)** and **React + TypeScript + Tailwind CSS**.

---

## ✨ Features

- 🪟 **Cross-Platform Native Tray Resident**:
  - Lives in the **Windows Notification Area / System Tray** and **macOS Menu Bar**.
  - Clicking the icon smoothly toggles an anchored floating popover at your tray coordinates.
  - Automatically hides when clicking outside or pressing `Esc`.
- ⚡ **Claude Session Telemetry**:
  - **Claude Pro / Team / Enterprise**: Live 5-Hour rolling window consumption & exact countdown timer until full reset.
  - **Anthropic API**: Requests per minute (RPM), Tokens per minute (TPM), and rate-limit header tracking.
  - **Claude Code CLI**: Auto-detects local sessions from `~/.claude.json` for 1-click connection.
- 🌌 **Antigravity / Gemini Telemetry**:
  - **Antigravity / Google AI Studio / Gemini API**: Tracks daily request quota, RPM limits, and thinking token pools.
  - **Pi Coding Agent**: Auto-detects local agent configuration from `~/.pi/`.
- ⏱️ **Real-Time Live Countdown Timers**:
  - Ticking countdown to the exact second when your session limits rollover.
- 🔔 **Smart Desktop Notifications**:
  - Alerts you when your session quota has completely reset to 100%.
  - Warning alerts when quota reaches critical 80% / 95% thresholds.
- 🔒 **Zero-Plaintext Security**:
  - All tokens and session cookies are encrypted using native OS Keyrings (**Windows Credential Manager** and **macOS Keychain**).
- 🚀 **Ultra Low Resource Footprint**:
  - Rust backend consumes only ~15 MB RAM in the background.

---

## 🛠️ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust & Cargo](https://rustup.rs/) (v1.75+)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
To launch the desktop app with live system tray integration:
```bash
npm run tauri:dev
```

To run the web preview interface in your browser:
```bash
npm run dev
```

### 3. Build Production Binaries
Generate native standalone installers (`.exe`/`.msi` on Windows, `.dmg`/`.app` on macOS):
```bash
npm run tauri:build
```
The compiled binaries will be output to `src-tauri/target/release/bundle/`.

---

## 🔑 How to Connect Accounts

### 1. Claude.ai (Pro / Team)
1. Open [Claude.ai](https://claude.ai) in Chrome / Edge / Brave / Safari.
2. Open Developer Tools (`F12` or `Cmd+Option+I`) > **Application** tab > **Cookies** > `https://claude.ai`.
3. Copy the value of the `sessionKey` cookie (starts with `sk-ant-sid01-...`).
4. In Usage View, click **+ Add Account** > **Claude** > **Web Pro** and paste the token.

### 2. Anthropic API
1. Open [Anthropic Console](https://console.anthropic.com/) > **API Keys**.
2. Create and copy an API key (starts with `sk-ant-api03-...`).
3. In Usage View, click **+ Add Account** > **Claude** > **API Key**.

### 3. Claude Code CLI (Auto-detected)
- If you use `claude` in your terminal, Usage View will automatically detect your local `~/.claude.json` configuration with a 1-click **Connect** button!

### 4. Antigravity & Gemini
1. Open [Google AI Studio](https://aistudio.google.com/) > **Get API Key**.
2. Copy your API Key (starts with `AIzaSy...`).
3. In Usage View, click **+ Add Account** > **Antigravity / Gemini** and paste your key.

---

## ⚙️ Configuration & Options

- **Polling Frequency**: Configurable from 1 min to 15 mins (default: 3 mins).
- **Auto-start on Boot**: Toggleable Launch-at-Login support for Windows Startup & macOS LaunchAgents.
- **Multiple Accounts**: Monitor multiple Claude and Antigravity accounts simultaneously in the same tray popover.
