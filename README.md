# 🐙 GitHub Desktop TUI (`gd` / `gitu`)

> A modern, lightning-fast Terminal User Interface (TUI) for Git and GitHub CLI (`gh`), inspired by GitHub Desktop. Built for developers who love the speed of the terminal paired with rich visual ergonomics.

Developed with ❤️ by [**j0rd1s3rr4n0**](https://github.com/j0rd1s3rr4n0).

---

## ✨ Features

- ⚡ **Tab 1: Changes & Staging**: File checklist (`[x]` / `[ ]`), real-time syntax-colored diff preview with line numbers, and commit summary + description panel (`Ctrl+Enter`).
- 📜 **Tab 2: Commit History**: Interactive timeline of commits with full patch diff inspection.
- 🌿 **Tab 3: Branch Manager**: Browse local & remote branches, checkout, create new branches (`b`), and execute fast Push (`P`) & Pull (`p`).
- 📥 **Tab 4: Stash Drawer**: Save, apply, pop, and drop stashes safely.
- 🐙 **Tab 5: GitHub Integration**: Full integration with GitHub CLI (`gh pr list`, `gh issue list`, `gh repo list`).
- 📂 **Tab 6: Unified Repositories**: Manage all recent local and cloned GitHub repositories with instant switching and custom folder path opener.
- ℹ️ **Tab 7: About**: App documentation and developer profile.
- 🖱️ **Full Mouse & Scroll Wheel Support**: Clickable interactive tab buttons, line-by-line mouse scroll wheel support, and click-to-focus input boxes.
- 🔐 **Seamless GitHub Authentication**: Built-in interactive browser login (`gh auth login`) with standard terminal raw-mode suspension.
- 🎯 **Flexible Clone Destination Prompt**: Decide target parent directory (`.` or custom path) with live full-path preview before cloning.
- 📋 **Full Error Inspector & Logging**: Expandable scrollable error modal for inspecting complete stack traces, logged automatically to `~/.gitu_error.log`.
- 🛡️ **Universal Escape Safety**: `Esc` / `q` closes active internal windows without quitting the app. Dedicated `Shift+Q` or `Ctrl+C` for exiting.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher
- **Git** installed on your system
- **GitHub CLI (`gh`)** for authentication and remote GitHub features (`gh auth login`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/j0rd1s3rr4n0/git-desktop-tui.git
   cd git-desktop-tui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Link CLI executable**:
   ```bash
   npm link
   ```
   *Now you can launch the app from any directory by typing `gd` or `gitu`!*

---

## ⌨️ Keyboard Shortcuts & Navigation

| Key | Description |
|---|---|
| `1` – `7` | Switch Tabs (1: Changes, 2: History, 3: Branches, 4: Stash, 5: GitHub, 6: Repos, 7: About) |
| `Ctrl+Tab` / `Ctrl+Right` | Next Tab |
| `Ctrl+Shift+Tab` / `Ctrl+Left` | Previous Tab |
| `Space` | Stage / Unstage selected file |
| `a` / `u` | Stage ALL / Unstage ALL files |
| `d` | Discard changes in selected file |
| `c` | Focus Commit Summary input box |
| `Ctrl+Enter` | Execute Commit (from Summary or Description) |
| `b` / `n` | Create new branch modal |
| `P` / `p` | Git Push (`Shift+P`) / Git Pull (`p`) |
| `s` | Create new stash modal |
| `o` / `Ctrl+O` | Browse & clone remote GitHub repositories (Profile & Orgs) |
| `i` | Open Init Git / Clone Dialog |
| `L` | GitHub Auth / Login status |
| `r` | Refresh Git & GitHub status |
| `?` / `F1` | Toggle Keyboard Shortcuts Help Window |
| `F2` | Open About Window |
| `Esc` / `q` | Close active window / modal (does not exit app) |
| `Shift+Q` / `Ctrl+C` | Quit Application |

---

## 🛠️ Architecture

- **Engine**: Node.js (ES Modules)
- **TUI Framework**: [`blessed`](https://github.com/chjj/blessed)
- **Git Provider**: [`simple-git`](https://github.com/steveukx/simple-git)
- **GitHub CLI Integration**: Official [`gh`](https://cli.github.com/) CLI tool

---

## 👤 Author

Developed by **[j0rd1s3rr4n0](https://github.com/j0rd1s3rr4n0)**.

Feel free to open issues or submit pull requests to contribute!

---

## 📄 License

[MIT License](LICENSE) © 2026 j0rd1s3rr4n0
