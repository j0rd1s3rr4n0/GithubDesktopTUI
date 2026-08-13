# 🖥️ GitHub Desktop TUI (`gitu`)

> **GitHub Desktop for your terminal** — A modern, interactive Terminal User Interface (TUI) for Git built with Node.js, `blessed`, and `simple-git`.

`gitu` brings the clean, intuitive 2-column layout and workflow of **GitHub Desktop** directly into your terminal.

---

## ✨ Features

- 📑 **GitHub Desktop 4-Tab Navigation**:
  1. **Changes**: Checklist of modified, added, deleted, and untracked files (`[x]` / `[ ]`), real-time syntax-highlighted diff viewer, and commit form (Summary & Description + `Ctrl+Enter`).
  2. **History**: Scrollable commit history timeline with full metadata (author, email, hash, date) and complete patch diff view.
  3. **Branches**: Browse local & remote branches, checkout branches instantly (`Enter`), create new branches (`b`), and sync (`Push` / `Pull`).
  4. **Stash Drawer**: List stashes, create stash with custom message (`s`), apply (`a`), pop (`p`), or drop (`x`).
- 🎨 **Visual Excellence & Highlighting**:
  - Header bar with Repo Name, Active Branch badge (` main`), ahead/behind commit indicators (`↑2 ↓1`), and quick shortcut hints.
  - Color-coded diff rendering with green additions (`+`), red deletions (`-`), cyan hunk headers (`@@`), and line numbers.
- ⌨️ **Keyboard & Mouse Controls**: Full keyboard shortcut support + interactive mouse clicking for tab selection and button execution.

---

## 🚀 Quick Usage

Simplemente escribe **`gd`** en la terminal desde **cualquier repositorio Git**:

```bash
gd
```

O si deseas abrir un repositorio en una ruta específica:
```bash
gd /ruta/a/tu-proyecto-git
```

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| --- | --- |
| `1` - `4` | Switch Tab View (`1`: Changes, `2`: History, `3`: Branches, `4`: Stash) |
| `Tab` / `Shift+Tab` | Switch focus between left list & right detail/diff pane |
| `Space` | Toggle Stage / Unstage selected file (Changes tab) |
| `a` | Stage ALL files |
| `u` | Unstage ALL files |
| `c` | Focus Commit Summary input box |
| `Ctrl+Enter` | Execute Commit (from Summary or Description input) |
| `b` / `n` | Open Create New Branch modal dialog |
| `s` | Open Stash Changes modal dialog |
| `P` (`Shift+P`) | Push commits to remote origin |
| `p` | Pull commits from remote origin |
| `r` | Refresh Git status |
| `?` / `F1` | Toggle Keyboard Shortcuts Help modal |
| `q` / `Ctrl+C` | Quit application |

---

## 🏗️ Project Architecture

```
git-desktop-tui/
├── bin/
│   └── gitu.js                 # Executable CLI entrypoint
├── src/
│   ├── git/
│   │   └── git-service.js      # Git wrapper service using simple-git
│   └── ui/
│       ├── app.js              # Main Blessed screen & Tab controller
│       ├── components/
│       │   ├── header.js       # Top status & shortcuts bar
│       │   └── diff-viewer.js  # Unified syntax-highlighted diff widget
│       ├── modals/
│       │   ├── help-modal.js   # Help cheat sheet modal
│       │   ├── branch-modal.js # New branch creation dialog
│       │   ├── stash-modal.js  # Stash creation dialog
│       │   └── confirm-modal.js# Action confirmation dialog
│       └── views/
│           ├── changes-view.js # Changes, Staging & Commit Panel (Tab 1)
│           ├── history-view.js # Commit History & Patch viewer (Tab 2)
│           ├── branches-view.js# Branch Manager & Remote Sync (Tab 3)
│           └── stash-view.js   # Stash Drawer (Tab 4)
├── package.json
└── README.md
```

---

## 📄 License
MIT License
