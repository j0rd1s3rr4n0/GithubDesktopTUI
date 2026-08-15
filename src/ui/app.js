import blessed from 'blessed';
import path from 'path';
import { GitService } from '../git/git-service.js';
import { GhService } from '../git/gh-service.js';
import { RepoStore } from '../git/repo-store.js';
import { I18nService } from '../git/i18n-service.js';
import { Header } from './components/header.js';
import { ChangesView } from './views/changes-view.js';
import { HistoryView } from './views/history-view.js';
import { BranchesView } from './views/branches-view.js';
import { StashView } from './views/stash-view.js';
import { GithubView } from './views/github-view.js';
import { ReposView } from './views/repos-view.js';
import { AboutView } from './views/about-view.js';
import { AccountView } from './views/account-view.js';
import { HelpModal } from './modals/help-modal.js';
import { AboutModal } from './modals/about-modal.js';
import { BranchModal } from './modals/branch-modal.js';
import { StashModal } from './modals/stash-modal.js';
import { ConfirmModal } from './modals/confirm-modal.js';
import { InitModal } from './modals/init-modal.js';
import { AuthModal } from './modals/auth-modal.js';
import { RepoBrowserModal } from './modals/repo-browser-modal.js';
import { CloneDestinationModal } from './modals/clone-destination-modal.js';
import { ErrorModal } from './modals/error-modal.js';
import { ReadmeModal } from './modals/readme-modal.js';
import { MarkdownDiffModal } from './modals/markdown-diff-modal.js';
import { CreateRepoModal } from './modals/create-repo-modal.js';
import { SettingsModal } from './modals/settings-modal.js';
import { UpdateModal } from './modals/update-modal.js';
import { LanguageModal } from './modals/language-modal.js';
import { SettingsView } from './views/settings-view.js';
import { checkForUpdates } from '../git/updater.js';

export class App {
  constructor(targetRepoPath = process.cwd()) {
    this.gitService = new GitService(targetRepoPath);
    this.ghService = new GhService(targetRepoPath);

    // Normalize terminal environment for full Tmux / Screen compatibility
    if (process.env.TMUX || (process.env.TERM && (process.env.TERM.includes('screen') || process.env.TERM.includes('tmux')))) {
      if (!process.env.COLORTERM) process.env.COLORTERM = 'truecolor';
      if (!process.env.TERM || process.env.TERM === 'screen' || process.env.TERM === 'tmux') {
        process.env.TERM = 'xterm-256color';
      }
    }

    this.screen = blessed.screen({
      smartCSR: false,
      fastCSR: true,
      title: 'GitHub Desktop TUI - gitu / gd',
      fullUnicode: true,
      forceUnicode: true,
      terminal: process.env.TERM || 'xterm-256color',
      warnings: false,
      dump: false
    });

    this.activeTab = 0; // 0..7 (8 Tabs Total)
    this.ghUser = null;

    this.initUI();
    this.initEvents();
  }

  async start() {
    const isRepo = await this.gitService.isRepo();
    if (!isRepo) {
      this.showInitModal();
      return;
    }

    RepoStore.addRecent(this.gitService.repoPath);
    await this.refreshGlobalHeader();
    this.switchTab(0);
    this.updateI18nLabels();
    this.screen.render();
    this.autoCheckUpdates();
  }

  async autoCheckUpdates() {
    try {
      const res = await checkForUpdates();
      if (res.updateAvailable) {
        this.notify(`⬆ Update available: v${res.latestVersion} (current v${res.currentVersion}). Press Ctrl+U to update.`);
      }
    } catch {}
  }

  async switchRepositoryPath(newPath) {
    try {
      const resolvedPath = path.resolve(newPath);
      const tempGit = new GitService(resolvedPath);
      const isRepo = await tempGit.isRepo();

      if (!isRepo) {
        this.errorModal.showError(I18nService.t('notAGitRepoTitle'), `Path "${resolvedPath}" is not a Git repository.`);
        return;
      }

      this.gitService = tempGit;
      this.ghService = new GhService(resolvedPath);

      this.views[0].gitService = this.gitService;
      this.views[1].gitService = this.gitService;
      this.views[2].gitService = this.gitService;
      this.views[3].gitService = this.gitService;
      this.views[4].ghService = this.ghService;
      this.views[4].gitService = this.gitService;

      RepoStore.addRecent(resolvedPath);
      await this.refreshGlobalHeader();
      this.switchTab(0);
      this.notify(`Switched repository to: ${path.basename(resolvedPath)}`);
    } catch (err) {
      this.errorModal.showError('Switch Repository Failed', err);
    }
  }

  showInitModal() {
    if (!this.initModal) {
      this.initModal = new InitModal(this.screen, this.gitService, this.ghService, async (action, clonedPath) => {
        const targetPath = clonedPath || this.gitService.repoPath;
        if (clonedPath) {
          const repoName = path.basename(clonedPath);
          RepoStore.addCloned(repoName, clonedPath);
        }
        await this.switchRepositoryPath(targetPath);
      });
    }
    this.initModal.show();
  }

  showRepoBrowserModal() {
    if (!this.cloneDestModal) {
      this.cloneDestModal = new CloneDestinationModal(this.screen, async (repoTarget, destinationParentDir) => {
        this.notify(`Cloning ${repoTarget}...`);
        const res = await this.ghService.cloneRepo(repoTarget, destinationParentDir);
        if (res.success) {
          if (res.clonedPath) {
            const repoName = path.basename(res.clonedPath);
            RepoStore.addCloned(repoName, res.clonedPath, repoTarget);
            await this.switchRepositoryPath(res.clonedPath);
          }
          this.notify('Repository cloned successfully!');
        } else {
          this.errorModal.showError('Clone Repository Failed', res.error);
        }
      });
    }

    if (!this.repoBrowserModal) {
      this.repoBrowserModal = new RepoBrowserModal(this.screen, this.ghService, (repoTarget) => {
        this.cloneDestModal.prompt(repoTarget, this.gitService.repoPath);
      });
    }
    this.repoBrowserModal.show();
  }

  initUI() {
    // Top Header Component (3 lines: top 0 to 2)
    this.header = new Header();
    this.screen.append(this.header.box);

    // Sleek High-Contrast Borderless Tab Strip Container (2 lines: top 3 to 4)
    this.tabBar = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: 2,
      tags: true,
      style: {
        bg: 'black',
        fg: 'white'
      },
      mouse: true
    });
    this.screen.append(this.tabBar);

    // Separator line below tab bar
    this.tabBarLine = blessed.box({
      parent: this.tabBar,
      top: 1,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: 'blue',
        fg: 'cyan'
      },
      content: '{gray-fg}──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────{/gray-fg}',
      tags: true
    });

    // Clickable Interactive Tab Buttons (8 Tabs)
    this.tabButtons = [];
    this.tabKeys = [
      'tabChanges',
      'tabHistory',
      'tabBranches',
      'tabStash',
      'tabGithub',
      'tabRepos',
      'tabAbout',
      'tabAccount',
      'tabSettings'
    ];

    let currentLeft = 1;
    this.tabKeys.forEach((key, idx) => {
      const label = I18nService.t(key);
      const btn = blessed.button({
        parent: this.tabBar,
        top: 0,
        left: currentLeft,
        height: 1,
        width: label.length + 4,
        content: ` ${label} │`,
        tags: true,
        style: {
          bg: 'black',
          fg: 'gray',
          focus: { bg: 'blue', fg: 'white', bold: true }
        },
        mouse: true,
        keys: true
      });

      btn.on('click', () => this.switchTab(idx));
      btn.on('press', () => this.switchTab(idx));

      this.tabButtons.push(btn);
      currentLeft += label.length + 4;
    });

    // Notification Bar at bottom
    this.notificationBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true
      },
      content: I18nService.t('bottomHint')
    });
    this.screen.append(this.notificationBar);

    // Initialize 8 Views starting from top: 5
    const viewOptions = { top: 5 };
    this.views = [
      new ChangesView(this.screen, this.gitService, viewOptions),
      new HistoryView(this.screen, this.gitService, viewOptions),
      new BranchesView(this.screen, this.gitService, viewOptions),
      new StashView(this.screen, this.gitService, viewOptions),
      new GithubView(this.screen, this.ghService, viewOptions),
      new ReposView(this.screen, this, viewOptions),
      new AboutView(this.screen, this, viewOptions),
      new AccountView(this.screen, this, viewOptions),
      new SettingsView(this.screen, this, viewOptions)
    ];

    // Give GithubView access to gitService for remote origin checks
    this.views[4].gitService = this.gitService;

    this.views.forEach(v => {
      this.screen.append(v.container);
      v.onStatusChanged = () => this.refreshGlobalHeader();
    });

    // Initialize Modals
    this.helpModal = new HelpModal(this.screen);
    this.aboutModal = new AboutModal(this.screen);
    this.confirmModal = new ConfirmModal(this.screen);
    this.errorModal = new ErrorModal(this.screen);
    this.readmeModal = new ReadmeModal(this.screen, this.gitService);
    this.markdownDiffModal = new MarkdownDiffModal(this.screen);

    this.createRepoModal = new CreateRepoModal(this.screen, this.ghService, this.gitService, async (repoName, isPrivate) => {
      this.notify(`Creating & publishing repository "${repoName}" to GitHub (${isPrivate ? 'Private' : 'Public'})...`);
      const res = await this.ghService.createRemoteRepo(repoName, isPrivate);
      if (res.success) {
        this.notify(`✓ Repository "${repoName}" published to GitHub successfully!`);
        await this.refreshGlobalHeader();
        this.views[this.activeTab].refresh();
      } else {
        this.errorModal.showError('Create GitHub Repository Failed', res.error);
      }
    });

    this.authModal = new AuthModal(this.screen, this.ghService, async () => {
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
    });

    this.settingsModal = new SettingsModal(this.screen, this.ghService);
    this.updateModal = new UpdateModal(this.screen);

    this.languageModal = new LanguageModal(this.screen, (lang) => {
      I18nService.setLanguage(lang);
      this.notify(`Language changed to: ${lang.toUpperCase()}`);
      this.updateI18nLabels();
    });

    this.branchModal = new BranchModal(this.screen, async (name, checkout) => {
      try {
        await this.gitService.createBranch(name, checkout);
        this.notify(`Created branch "${name}"`);
        await this.refreshGlobalHeader();
        this.views[this.activeTab].refresh();
      } catch (err) {
        this.errorModal.showError('Create Branch Failed', err);
      }
    });

    this.stashModal = new StashModal(this.screen, async (msg, untracked) => {
      try {
        await this.gitService.createStash(msg, untracked);
        this.notify('Stashed changes');
        await this.refreshGlobalHeader();
        this.views[this.activeTab].refresh();
      } catch (err) {
        this.errorModal.showError('Create Stash Failed', err);
      }
    });

    this.updateTabBar();
  }

  updateI18nLabels() {
    let currentLeft = 1;
    this.tabButtons.forEach((btn, idx) => {
      const label = I18nService.t(this.tabKeys[idx]);
      const sep = idx === this.tabButtons.length - 1 ? '' : ' │';
      btn.setContent(` ${label}${sep}`);
      btn.position.left = currentLeft;
      btn.position.width = label.length + (sep ? 4 : 2);
      currentLeft += label.length + (sep ? 4 : 2);
    });

    this.notificationBar.setContent(I18nService.t('bottomHint'));
    this.header.update();

    this.views.forEach(v => {
      if (v && typeof v.updateI18nLabels === 'function') {
        v.updateI18nLabels();
      }
    });

    if (this.views[this.activeTab] && typeof this.views[this.activeTab].refresh === 'function') {
      this.views[this.activeTab].refresh();
    }

    this.updateTabBar();
    this.screen.render();
  }

  updateTabBar() {
    this.tabButtons.forEach((btn, idx) => {
      const label = I18nService.t(this.tabKeys[idx]);
      const sep = idx === this.tabButtons.length - 1 ? '' : ' │';

      if (idx === this.activeTab) {
        btn.setContent(` {bold}${label}{/bold}${sep}`);
        btn.style.bg = 'blue';
        btn.style.fg = 'white';
        btn.style.bold = true;
      } else {
        btn.setContent(` ${label}${sep}`);
        btn.style.bg = 'black';
        btn.style.fg = 'gray';
        btn.style.bold = false;
      }
    });
    this.screen.render();
  }

  switchTab(index) {
    if (index < 0 || index >= this.views.length) return;
    this.activeTab = index;

    // 1. Hide all view containers
    this.views.forEach((v) => v.hide());

    // 2. Clear terminal buffer & reset cell allocation memory to eradicate ghost characters in tmux
    if (this.screen.program) {
      this.screen.program.clear();
    }
    if (typeof this.screen.alloc === 'function') {
      this.screen.alloc();
    }

    // 3. Show target active view
    const activeView = this.views[index];
    activeView.show();

    // 4. Update header, tab bar styling and force clean re-render
    this.header.box.setFront();
    this.tabBar.setFront();
    this.notificationBar.setFront();
    this.updateTabBar();
    this.screen.render();
  }

  async refreshGlobalHeader() {
    try {
      const repoName = await this.gitService.getRepoName();
      const status = await this.gitService.getStatus();
      const auth = await this.ghService.getAuthStatus();

      this.ghUser = auth.isLoggedIn ? auth.user : null;

      this.header.update({
        repoName,
        currentBranch: status.currentBranch,
        ahead: status.ahead,
        behind: status.behind,
        ghUser: this.ghUser,
        remoteType: auth.remoteType
      });
      this.screen.render();
    } catch {
      // Ignore header refresh failure
    }
  }

  notify(msg) {
    this.notificationBar.setContent(` ${msg}`);
    this.screen.render();
    if (this.notifyTimeout) clearTimeout(this.notifyTimeout);
    this.notifyTimeout = setTimeout(() => {
      this.notificationBar.setContent(I18nService.t('bottomHint'));
      this.screen.render();
    }, 4000);
  }

  hasOpenModal() {
    return Boolean(
      (this.helpModal && this.helpModal.modal && this.helpModal.modal.visible) ||
      (this.aboutModal && this.aboutModal.modal && this.aboutModal.modal.visible) ||
      (this.createRepoModal && this.createRepoModal.box && this.createRepoModal.box.visible) ||
      (this.readmeModal && this.readmeModal.box && this.readmeModal.box.visible) ||
      (this.markdownDiffModal && this.markdownDiffModal.box && this.markdownDiffModal.box.visible) ||
      (this.authModal && this.authModal.box && this.authModal.box.visible) ||
      (this.settingsModal && this.settingsModal.box && this.settingsModal.box.visible) ||
      (this.updateModal && this.updateModal.box && this.updateModal.box.visible) ||
      (this.languageModal && this.languageModal.box && this.languageModal.box.visible) ||
      (this.branchModal && this.branchModal.form && this.branchModal.form.visible) ||
      (this.stashModal && this.stashModal.form && this.stashModal.form.visible) ||
      (this.confirmModal && this.confirmModal.box && this.confirmModal.box.visible) ||
      (this.errorModal && this.errorModal.box && this.errorModal.box.visible) ||
      (this.cloneDestModal && this.cloneDestModal.box && this.cloneDestModal.box.visible) ||
      (this.initModal && this.initModal.box && this.initModal.box.visible) ||
      (this.initModal && this.initModal.repoBrowserModal && this.initModal.repoBrowserModal.box && this.initModal.repoBrowserModal.box.visible) ||
      (this.repoBrowserModal && this.repoBrowserModal.box && this.repoBrowserModal.box.visible)
    );
  }

  closeTopModal() {
    let closed = false;
    if (this.createRepoModal && this.createRepoModal.box && this.createRepoModal.box.visible) {
      this.createRepoModal.hide();
      closed = true;
    } else if (this.markdownDiffModal && this.markdownDiffModal.box && this.markdownDiffModal.box.visible) {
      this.markdownDiffModal.hide();
      closed = true;
    } else if (this.readmeModal && this.readmeModal.box && this.readmeModal.box.visible) {
      this.readmeModal.hide();
      closed = true;
    } else if (this.cloneDestModal && this.cloneDestModal.box && this.cloneDestModal.box.visible) {
      this.cloneDestModal.hide();
      closed = true;
    } else if (this.aboutModal && this.aboutModal.modal && this.aboutModal.modal.visible) {
      this.aboutModal.hide();
      closed = true;
    } else if (this.errorModal && this.errorModal.box && this.errorModal.box.visible) {
      this.errorModal.hide();
      closed = true;
    } else if (this.repoBrowserModal && this.repoBrowserModal.box && this.repoBrowserModal.box.visible) {
      this.repoBrowserModal.hide();
      closed = true;
    } else if (this.initModal && this.initModal.repoBrowserModal && this.initModal.repoBrowserModal.box && this.initModal.repoBrowserModal.box.visible) {
      this.initModal.repoBrowserModal.hide();
      closed = true;
    } else if (this.helpModal && this.helpModal.modal && this.helpModal.modal.visible) {
      this.helpModal.hide();
      closed = true;
    } else if (this.settingsModal && this.settingsModal.box && this.settingsModal.box.visible) {
      this.settingsModal.hide();
      closed = true;
    } else if (this.updateModal && this.updateModal.box && this.updateModal.box.visible) {
      this.updateModal.hide();
      closed = true;
    } else if (this.languageModal && this.languageModal.box && this.languageModal.box.visible) {
      this.languageModal.hide();
      closed = true;
    } else if (this.authModal && this.authModal.box && this.authModal.box.visible) {
      this.authModal.hide();
      closed = true;
    } else if (this.branchModal && this.branchModal.form && this.branchModal.form.visible) {
      this.branchModal.hide();
      closed = true;
    } else if (this.stashModal && this.stashModal.form && this.stashModal.form.visible) {
      this.stashModal.hide();
      closed = true;
    } else if (this.confirmModal && this.confirmModal.box && this.confirmModal.box.visible) {
      this.confirmModal.hide();
      closed = true;
    } else if (this.initModal && this.initModal.box && this.initModal.box.visible) {
      this.initModal.hide();
      closed = true;
    }

    if (closed) {
      if (this.screen.program) this.screen.program.clear();
      if (typeof this.screen.alloc === 'function') this.screen.alloc();
      this.screen.render();
      return true;
    }
    return false;
  }

  initEvents() {
    this.screen.key(['C-c'], () => {
      // Blessed emits to the screen BEFORE the focused element, so Ctrl+C used
      // as a copy shortcut in lists/modals would be swallowed by the quit
      // handler. Delegate the copy to the active view (or open modal) first.
      if (this.hasOpenModal()) {
        // Modal elements (readme, markdown-diff) handle Ctrl+C for copy.
        return;
      }
      const view = this.views[this.activeTab];
      if (view && typeof view.handleCtrlC === 'function' && view.handleCtrlC()) {
        return;
      }
      process.exit(0);
    });

    this.screen.key(['S-q'], () => {
      process.exit(0);
    });

    this.screen.on('element wheelup', (el) => {
      if (el && typeof el.scroll === 'function') {
        el.scroll(-1);
        this.screen.render();
      } else if (el && typeof el.up === 'function') {
        el.up();
        this.screen.render();
      }
    });

    this.screen.on('element wheeldown', (el) => {
      if (el && typeof el.scroll === 'function') {
        el.scroll(1);
        this.screen.render();
      } else if (el && typeof el.down === 'function') {
        el.down();
        this.screen.render();
      }
    });

    this.screen.key(['q'], () => {
      if (!this.hasOpenModal()) {
        process.exit(0);
      } else {
        this.closeTopModal();
      }
    });

    this.screen.key(['escape'], () => {
      this.closeTopModal();
    });

    this.screen.key(['m', 'C-m'], () => {
      const changesView = this.views[0];
      const typingInInput = this.activeTab === 0 && changesView && changesView.isInputFocused();
      if (!typingInInput && !this.hasOpenModal()) {
        this.readmeModal.show();
      }
    });

    this.screen.key(['o', 'C-o'], () => {
      const changesView = this.views[0];
      const typingInInput = this.activeTab === 0 && changesView && changesView.isInputFocused();
      if (!typingInInput && !this.hasOpenModal()) {
        this.showRepoBrowserModal();
      }
    });

    this.screen.key(['i'], () => {
      const changesView = this.views[0];
      const typingInInput = this.activeTab === 0 && changesView && changesView.isInputFocused();
      if (!typingInInput && !this.hasOpenModal()) {
        this.showInitModal();
      }
    });

    this.screen.key(['1'], () => this.switchTab(0));
    this.screen.key(['2'], () => this.switchTab(1));
    this.screen.key(['3'], () => this.switchTab(2));
    this.screen.key(['4'], () => this.switchTab(3));
    this.screen.key(['5'], () => this.switchTab(4));
    this.screen.key(['6'], () => this.switchTab(5));
    this.screen.key(['7'], () => this.switchTab(6));
    this.screen.key(['8'], () => this.switchTab(7));
    this.screen.key(['9'], () => this.switchTab(8));

    this.screen.key(['C-right', '>'], () => {
      this.switchTab((this.activeTab + 1) % 9);
    });

    this.screen.key(['C-left', '<'], () => {
      this.switchTab((this.activeTab - 1 + 9) % 9);
    });

    this.screen.key(['f1', '?'], () => {
      this.helpModal.toggle();
    });

    this.screen.key(['f2'], () => {
      this.switchTab(6);
    });

    this.screen.key(['f3'], () => {
      const newLang = I18nService.cycleLanguage();
      this.notify(`Language changed to: ${newLang.toUpperCase()}`);
      this.updateI18nLabels();
    });

    this.screen.key(['S-f3'], () => {
      if (!this.hasOpenModal()) {
        this.languageModal.show();
      }
    });

    // Some terminals send Shift+F3 as CSI 1;2R (xterm F1-F4 style). Blessed
    // parses that sequence with key.name 'undefined' and silently drops it, so
    // the 'S-f3' binding cannot catch it — detect it on the raw byte stream.
    let sftF3Buf = Buffer.alloc(0);
    this.screen.program.on('data', (data) => {
      sftF3Buf = Buffer.concat([sftF3Buf, Buffer.from(data)]);
      let hit;
      while ((hit = sftF3Buf.indexOf('\x1b[1;2R')) !== -1) {
        if (!this.hasOpenModal()) {
          this.languageModal.show();
        }
        sftF3Buf = sftF3Buf.slice(hit + 6);
      }
      if (sftF3Buf.length > 8) sftF3Buf = sftF3Buf.slice(-8);
    });

    this.screen.key(['r'], async () => {
      await this.refreshGlobalHeader();
      const view = this.views[this.activeTab];
      if (this.activeTab === 5 && view && typeof view.refresh === 'function') {
        await view.refresh(true); // Force-refresh fork metadata on the Repositories tab
      } else if (view && typeof view.refresh === 'function') {
        view.refresh();
      }
      this.notify(I18nService.t('refreshedNotice'));
    });

    this.screen.key(['L', 'l'], async () => {
      const changesView = this.views[0];
      const typingInInput = this.activeTab === 0 && changesView && changesView.isInputFocused();
      if (!typingInInput) {
        await this.handleGhAuthDirect();
      }
    });

    this.screen.key(['b', 'n'], () => {
      if (!this.hasOpenModal()) {
        this.branchModal.show();
      }
    });

    this.screen.key(['s'], () => {
      if (!this.hasOpenModal() && this.activeTab !== 0 && this.activeTab !== 3 && this.activeTab !== 5) {
        this.stashModal.show();
      }
    });

    this.screen.key(['S-g'], async () => {
      const changesView = this.views[0];
      const typingInInput = this.activeTab === 0 && changesView && changesView.isInputFocused();
      if (!typingInInput && !this.hasOpenModal()) {
        await this.openCreateRepoModal();
      }
    });

    this.screen.key(['S-p'], async () => {
      await this.executePush();
    });

    this.screen.key(['p'], async () => {
      if (!this.hasOpenModal() && this.activeTab !== 0 && this.activeTab !== 3 && this.activeTab !== 5) {
        await this.executePull();
      }
    });

    this.screen.key(['C-p'], async () => {
      if (!this.hasOpenModal() && this.activeTab !== 0 && this.activeTab !== 3 && this.activeTab !== 5) {
        await this.executePull();
      }
    });

    this.screen.key([','], () => {
      const changesView = this.views[0];
      const typingInInput = this.activeTab === 0 && changesView && changesView.isInputFocused();
      if (!this.hasOpenModal() && !typingInInput) {
        this.settingsModal.show();
      }
    });

    this.screen.key(['C-u'], () => {
      const changesView = this.views[0];
      const typingInInput = this.activeTab === 0 && changesView && changesView.isInputFocused();
      if (!this.hasOpenModal() && !typingInInput) {
        this.updateModal.show();
      }
    });

    this.screen.on('confirm-undo-marked', (question, marked) => {
      this.confirmModal.ask(question, async () => {
        if (this.views[0] && typeof this.views[0].doUndoMarked === 'function') {
          await this.views[0].doUndoMarked(marked);
        }
      });
    });

    this.screen.on('settings-saved', async () => {
      await this.refreshGlobalHeader();
      if (this.views[this.activeTab] && typeof this.views[this.activeTab].refresh === 'function') {
        this.views[this.activeTab].refresh();
      }
    });

    this.screen.on('notify', msg => this.notify(msg));
    this.screen.on('show-error', (title, err) => this.errorModal.showError(title, err));
    this.screen.on('trigger-gh-auth', () => this.handleGhAuthDirect());
    this.screen.on('open-branch-modal', () => this.branchModal.show());
    this.screen.on('open-stash-modal', () => this.stashModal.show());
    this.screen.on('open-markdown-diff', (rawDiff, filePath) => {
      this.markdownDiffModal.show(rawDiff, filePath);
    });
    this.screen.on('open-readme-content', (rawText, title) => {
      this.readmeModal.showContent(rawText, title);
    });
    this.screen.on('execute-push', () => this.executePush());
    this.screen.on('execute-pull', () => this.executePull());
    this.screen.on('open-create-repo-modal', () => this.openCreateRepoModal());

    this.screen.on('resize', () => {
      this.updateI18nLabels();
      this.refreshGlobalHeader();
      this.screen.render();
    });
  }

  async handleGhAuthDirect() {
    const auth = await this.ghService.getAuthStatus();
    if (!auth.isLoggedIn) {
      this.authModal.runInteractiveLogin();
    } else {
      this.authModal.show();
    }
  }

  async openCreateRepoModal() {
    const hasRemote = await this.gitService.hasRemoteOrigin();
    if (hasRemote) {
      this.notify('✓ This repository already has a remote origin on GitHub.');
      return;
    }

    const auth = await this.ghService.getAuthStatus();
    if (!auth.isLoggedIn) {
      this.errorModal.showError(
        'GitHub Authentication Required',
        'You must be logged in with GitHub CLI to publish a repository.\n\nPress [L] to authenticate first.'
      );
      return;
    }

    this.createRepoModal.prompt();
  }

  async executePush() {
    const hasRemote = await this.gitService.hasRemoteOrigin();
    if (!hasRemote) {
      const auth = await this.ghService.getAuthStatus();
      if (!auth.isLoggedIn) {
        this.errorModal.showError(
          'GitHub Remote Origin Missing',
          'This local Git repository does not have a remote origin linked.\n\nPlease press [L] to authenticate with GitHub CLI first so you can create & publish it.'
        );
        return;
      }
      this.createRepoModal.prompt();
      return;
    }

    this.notify('Pushing commits to remote origin...');
    RepoStore.recordPush();
    try {
      await this.gitService.push();
      this.notify('✓ Push completed successfully');
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
    } catch (err) {
      this.errorModal.showError('Push Failed', err);
    }
  }

  async executePull() {
    const hasRemote = await this.gitService.hasRemoteOrigin();
    if (!hasRemote) {
      const auth = await this.ghService.getAuthStatus();
      if (!auth.isLoggedIn) {
        this.errorModal.showError(
          'GitHub Remote Origin Missing',
          'This local Git repository does not have a remote origin linked to pull from.\n\nPlease press [L] to authenticate with GitHub CLI first to create & link a GitHub repository.'
        );
        return;
      }
      this.createRepoModal.prompt();
      return;
    }

    this.notify('Pulling updates from remote origin...');
    RepoStore.recordPull();
    try {
      await this.gitService.pull();
      this.notify('✓ Pull completed successfully');
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
    } catch (err) {
      this.errorModal.showError('Pull Failed', err);
    }
  }
}
