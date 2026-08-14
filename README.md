# 🐙 GitHub Desktop TUI (`gd` / `gitu`)

> **A modern, feature-packed, ultra-fast 8-Tab Terminal User Interface for Git & GitHub CLI.** Inspired by GitHub Desktop, crafted with Node.js, Blessed, and 24-bit TrueColor ANSI rendering.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![Creator](https://img.shields.io/badge/Creator-j0rd1s3rr4n0-magenta.svg)](https://github.com/j0rd1s3rr4n0)
[![Languages](https://img.shields.io/badge/Languages-10%20Supported-blue.svg)](#-10-language-internationalization-f3)

---

## ⚡ 1-Line Universal Linux Auto-Installer

Run this command in your Linux terminal to automatically install all dependencies (Node.js 18+, Git, GitHub CLI, Python3 Pillow, xclip) and link global `gd` / `gitu` CLI commands:

```bash
curl -fsSL https://raw.githubusercontent.com/j0rd1s3rr4n0/git-desktop-tui/master/autoinstall.sh | bash
```

*Or execute locally after cloning:*

```bash
git clone https://github.com/j0rd1s3rr4n0/git-desktop-tui.git
cd git-desktop-tui
chmod +x autoinstall.sh
./autoinstall.sh
```

---

## 💻 System Requirements

### 🛠️ Software Requirements

| Component | Requirement | Purpose |
| :--- | :--- | :--- |
| **Operating System** | Linux (Ubuntu, Debian, Fedora, Arch, Manjaro, etc.) or macOS (10.15+) | Host OS platform |
| **Node.js** | v18.0.0 or higher (`node --version`) | Core JavaScript runtime |
| **Git** | v2.20.0 or higher (`git --version`) | Local version control engine |
| **GitHub CLI (`gh`)** | v2.0.0+ (Optional, recommended) | Remote PRs, Issues, Auth & API integration |
| **Python 3 & Pillow** | Python 3.8+ with `Pillow`/`PIL` (`pip install pillow`) | High-Definition 24-bit TrueColor ANSI avatar rendering |
| **Clipboard Utilities** | `xclip` or `wl-copy` (Wayland) | Universal path copying to system clipboard (`y` / `Ctrl+C`) |

### ⚡ Hardware Requirements (Minimum vs Recommended)

| Hardware Resource | Minimum Requirements | Recommended Requirements |
| :--- | :--- | :--- |
| **Processor (CPU)** | **Single-Core @ 800 MHz** (x86-64 / ARMv7 / Raspberry Pi) | Dual-Core @ 1.5 GHz or higher |
| **System Memory (RAM)** | **64 MB** available RAM | **256 MB - 512 MB** available RAM |
| **Graphics (GPU)** | **None Required** (Runs on Headless SSH / Serial / Framebuffer) | Integrated Intel HD / AMD / Apple Silicon GPU |
| **Disk Storage** | **15 MB** free space | **50 MB** free space |
| **Terminal Display** | 80 x 24 text grid (ANSI 16/256-color) | 120 x 35 text grid with 24-bit TrueColor support |

---

## ✨ Features & Architecture

`GitHub Desktop TUI` brings the simplicity and productivity of GitHub Desktop directly into your Linux or macOS terminal without any heavy GUI overhead or background daemons.

### 🌟 Key Highlights

* **8 Dedicated Navigation Tabs (`1-8` or Mouse Click)**:
  1. `[1] Changes`: Interactive staging checklist, strict **1-line / 10-line diff scroll**, single-read textbox guards (eliminating double-typing bugs), `Tab`/`Shift+Tab` field navigation, and draft text preservation.
  2. `[2] History`: Full commit log timeline with interactive patch details.
  3. `[3] Branches`: Local & remote branch checkout, new branch creation modal, 1-key Push (`P`) & Pull (`p`).
  4. `[4] Stash`: Complete Stash drawer manager (Create, Apply, Pop, Drop).
  5. `[5] GitHub`: Pull Requests, Issues, and Remote Repositories powered by the official GitHub CLI (`gh`).
  6. `[6] Repositories`: Unified local & cloned repo manager with a **multi-threaded low-resource background system scanner (`s`)** that inspects disk from `/` for `.git` repositories (<10% CPU, <20MB RAM).
  7. `[7] About`: Live real-time GitHub profile auto-upgrade for developer `@j0rd1s3rr4n0`, featuring a **High-Res 24-bit TrueColor Lanczos ANSI Avatar (`32x32` / `63-column` ratio)** and real-time i18n switcher.
  8. `[8] My Account`: Authenticated user profile, live avatar, real-time commit counter, **line insertions (`+`)**, **line deletions (`-`)**, net code contributed, push/pull counters, and **1-click personal repository clone**.

* **📖 Interpreted Markdown README Viewer (`m` / `Ctrl+M`)**:
  - Automatically parses and renders `README.md` files directly in your terminal with colored headers, syntax-highlighted code blocks, bullet points, and links.

* **🌐 10-Language Internationalization (`F3`)**:
  - Switch languages on-the-fly with `F3` or the language button: **English (`en`, default)**, **Spanish (`es`)**, **Catalan (`ca`)**, **French (`fr`)**, **German (`de`)**, **Czech (`cs`)**, **Russian (`ru`)**, **Chinese (`zh`)**, **Japanese (`ja`)**, and **Hindi (`hi`)**.

* **📋 Universal Path & URL Copying (`y` / `Ctrl+C`)**:
  - Copy any file path, repository folder path, or GitHub URL directly to your system clipboard (`xclip` / `wl-copy`) with instant notification feedback.

* **🔍 100% Zero-Ghosting Screen Rendering (`fastCSR`)**:
  - Clean cell invalidation and terminal buffer resets prevent dead text artifacts or residual characters when scrolling or switching tabs/modals.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Description |
| :--- | :--- |
| `1` - `8` | Switch directly between Tabs 1 to 8 |
| `Ctrl + Left` / `Ctrl + Right` | Cycle sequentially through tabs |
| `Tab` / `Shift + Tab` | Move focus between inputs, buttons, and lists |
| `Esc` / `q` | Close active modal window without quitting app |
| `Shift + Q` / `Ctrl + C` | Quit application |
| `m` / `Ctrl + M` | Open interpreted Markdown README viewer |
| `y` / `Ctrl + C` (on list items) | Copy selected file path, repo path, or URL to clipboard |
| `Space` | Toggle stage/unstage file (`Changes` tab) |
| `a` / `u` | Stage all (`a`) or Unstage all (`u`) files |
| `c` | Focus commit summary input (`Changes` tab) |
| `Ctrl + Enter` | Confirm and execute commit (`Changes` tab) |
| `Up` / `Down` / `j` / `k` | Scroll list or diff preview strictly **1 line per step** |
| `PageUp` / `PageDown` | Scroll diff preview **10 lines per step** |
| `g` / `G` | Jump to top (`g`) or bottom (`G`) of diff |
| `b` / `n` | Open Create New Branch modal |
| `s` | Open Stash modal / Trigger background system repo scan (`[6] Repos`) |
| `P` (`Shift+P`) | Push commits to remote origin |
| `p` | Pull updates from remote origin |
| `L` | Authenticate or switch GitHub account via `gh auth login` |
| `Ctrl + O` / `o` | Open Clone Remote Repository & Browse Orgs Modal |
| `F3` | Toggle between 10 supported languages |
| `r` | Refresh Git & GitHub status, sync live profile & avatar |
| `F1` / `?` | Toggle Help & Hotkeys modal |

---

## 👨‍💻 Creator & License

Developed with ❤️ by **Jordi Serrano (`j0rd1s3rr4n0`)**.

- **GitHub Profile**: [https://github.com/j0rd1s3rr4n0](https://github.com/j0rd1s3rr4n0)
- **Bug Reports & Feature Requests**: [https://github.com/j0rd1s3rr4n0/git-desktop-tui/issues](https://github.com/j0rd1s3rr4n0/git-desktop-tui/issues)
- **License**: Released under the [MIT License](LICENSE).
