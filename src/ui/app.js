import blessed from 'blessed';
import path from 'path';
import { GitService } from '../git/git-service.js';
import { GhService } from '../git/gh-service.js';
import { RepoStore } from '../git/repo-store.js';
import { Header } from './components/header.js';
import { ChangesView } from './views/changes-view.js';
import { HistoryView } from './views/history-view.js';
import { BranchesView } from './views/branches-view.js';
import { StashView } from './views/stash-view.js';
import { GithubView } from './views/github-view.js';
import { ReposView } from './views/repos-view.js';
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

export class App {
  constructor(targetRepoPath = process.cwd()) {
    this.gitService = new GitService(targetRepoPath);
    this.ghService = new GhService(targetRepoPath);

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'GitHub Desktop TUI - gitu / gd',
      fullUnicode: true
    });

    this.activeTab = 0; // 0: Changes, 1: History, 2: Branches, 3: Stash, 4: GitHub, 5: Repositories
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
    this.screen.render();
  }

  async switchRepositoryPath(newPath) {
    try {
      const resolvedPath = path.resolve(newPath);
      const tempGit = new GitService(resolvedPath);
      const isRepo = await tempGit.isRepo();

      if (!isRepo) {
        this.errorModal.showError('Invalid Git Repository', `Path "${resolvedPath}" is not a Git repository.`);
        return;
      }

      this.gitService = tempGit;
      this.ghService = new GhService(resolvedPath);

      this.views[0].gitService = this.gitService;
      this.views[1].gitService = this.gitService;
      this.views[2].gitService = this.gitService;
      this.views[3].gitService = this.gitService;
      this.views[4].ghService = this.ghService;

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
    // Top Header Component
    this.header = new Header();
    this.screen.append(this.header.box);

    // Tab Navigation Bar
    this.tabBar = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'gray' },
        bg: 'black'
      },
      mouse: true
    });
    this.screen.append(this.tabBar);

    // Clickable Interactive Tab Buttons
    this.tabButtons = [];
    const tabLabels = [
      '[1] Changes',
      '[2] History',
      '[3] Branches',
      '[4] Stash',
      '[5] GitHub',
      '[6] Repositories'
    ];

    let currentLeft = 1;
    tabLabels.forEach((label, idx) => {
      const btn = blessed.button({
        parent: this.tabBar,
        top: 0,
        left: currentLeft,
        height: 1,
        width: label.length + 2,
        content: ` ${label} `,
        tags: true,
        style: {
          bg: 'black',
          fg: 'gray',
          focus: { bg: 'blue', fg: 'white' }
        },
        mouse: true,
        keys: true
      });

      btn.on('click', () => this.switchTab(idx));
      btn.on('press', () => this.switchTab(idx));

      this.tabButtons.push(btn);
      currentLeft += label.length + 3;
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
      content: ' Click Tabs or press 1-6 | [?] Ayuda | [F2] About | [L] Auth | [S-q] Salir'
    });
    this.screen.append(this.notificationBar);

    // Initialize Views
    const viewOptions = { top: 6 };
    this.views = [
      new ChangesView(this.screen, this.gitService, viewOptions),
      new HistoryView(this.screen, this.gitService, viewOptions),
      new BranchesView(this.screen, this.gitService, viewOptions),
      new StashView(this.screen, this.gitService, viewOptions),
      new GithubView(this.screen, this.ghService, viewOptions),
      new ReposView(this.screen, this, viewOptions)
    ];

    this.views.forEach(v => {
      this.screen.append(v.container);
      v.onStatusChanged = () => this.refreshGlobalHeader();
    });

    // Initialize Modals
    this.helpModal = new HelpModal(this.screen);
    this.aboutModal = new AboutModal(this.screen);
    this.confirmModal = new ConfirmModal(this.screen);
    this.errorModal = new ErrorModal(this.screen);

    this.authModal = new AuthModal(this.screen, this.ghService, async () => {
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
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

  updateTabBar() {
    this.tabButtons.forEach((btn, idx) => {
      if (idx === this.activeTab) {
        btn.style.bg = 'blue';
        btn.style.fg = 'white';
        btn.style.bold = true;
      } else {
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
    this.views.forEach((v, idx) => {
      if (idx === index) v.show();
      else v.hide();
    });
    this.updateTabBar();
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
        ghUser: this.ghUser
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
      this.notificationBar.setContent(' Click Tabs or press 1-6 | [?] Ayuda | [F2] About | [L] Auth | [S-q] Salir');
      this.screen.render();
    }, 4000);
  }

  hasOpenModal() {
    return Boolean(
      (this.helpModal && this.helpModal.modal && this.helpModal.modal.visible) ||
      (this.aboutModal && this.aboutModal.modal && this.aboutModal.modal.visible) ||
      (this.authModal && this.authModal.box && this.authModal.box.visible) ||
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
    if (this.cloneDestModal && this.cloneDestModal.box && this.cloneDestModal.box.visible) {
      this.cloneDestModal.hide();
      return true;
    }
    if (this.aboutModal && this.aboutModal.modal && this.aboutModal.modal.visible) {
      this.aboutModal.hide();
      return true;
    }
    if (this.errorModal && this.errorModal.box && this.errorModal.box.visible) {
      this.errorModal.hide();
      return true;
    }
    if (this.repoBrowserModal && this.repoBrowserModal.box && this.repoBrowserModal.box.visible) {
      this.repoBrowserModal.hide();
      return true;
    }
    if (this.initModal && this.initModal.repoBrowserModal && this.initModal.repoBrowserModal.box && this.initModal.repoBrowserModal.box.visible) {
      this.initModal.repoBrowserModal.hide();
      return true;
    }
    if (this.helpModal && this.helpModal.modal && this.helpModal.modal.visible) {
      this.helpModal.hide();
      return true;
    }
    if (this.authModal && this.authModal.box && this.authModal.box.visible) {
      this.authModal.hide();
      return true;
    }
    if (this.branchModal && this.branchModal.form && this.branchModal.form.visible) {
      this.branchModal.hide();
      return true;
    }
    if (this.stashModal && this.stashModal.form && this.stashModal.form.visible) {
      this.stashModal.hide();
      return true;
    }
    if (this.confirmModal && this.confirmModal.box && this.confirmModal.box.visible) {
      this.confirmModal.hide();
      return true;
    }
    if (this.initModal && this.initModal.box && this.initModal.box.visible) {
      this.initModal.hide();
      return true;
    }
    return false;
  }

  initEvents() {
    // Explicit Quit Application Shortcuts: Ctrl+C and Shift+Q
    this.screen.key(['C-c', 'S-q'], () => {
      process.exit(0);
    });

    // Mouse scroll wheel support (wheelup / wheeldown) - 1 unit line by line
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

    // Lowercase 'q' quits app ONLY when no modal/window is open
    this.screen.key(['q'], () => {
      if (!this.hasOpenModal()) {
        process.exit(0);
      } else {
        this.closeTopModal();
      }
    });

    // Escape closes top active modal ONLY
    this.screen.key(['escape'], () => {
      this.closeTopModal();
    });

    // Hotkey 'o' or 'C-o' to open Clone / Remote Repositories Browser from anywhere
    this.screen.key(['o', 'C-o'], () => {
      const changesView = this.views[0];
      const typingInInput = this.activeTab === 0 && changesView && changesView.isInputFocused();
      if (!typingInInput && !this.hasOpenModal()) {
        this.showRepoBrowserModal();
      }
    });

    // Hotkey 'i' when no input is focused opens Init / Clone menu
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

    // Next / Previous Tab cycle hotkeys
    this.screen.key(['C-right', '>'], () => {
      this.switchTab((this.activeTab + 1) % 6);
    });

    this.screen.key(['C-left', '<'], () => {
      this.switchTab((this.activeTab - 1 + 6) % 6);
    });

    this.screen.key(['f1', '?'], () => {
      this.helpModal.toggle();
    });

    this.screen.key(['f2'], () => {
      this.aboutModal.toggle();
    });

    this.screen.key(['r'], async () => {
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
      this.notify('Refreshed Git & GitHub status');
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
      if (!this.hasOpenModal() && this.activeTab !== 0 && this.activeTab !== 3) {
        this.stashModal.show();
      }
    });

    this.screen.key(['S-p'], async () => {
      this.executePush();
    });

    this.screen.key(['p'], async () => {
      if (!this.hasOpenModal() && this.activeTab !== 0 && this.activeTab !== 3) {
        this.executePull();
      }
    });

    // Custom Screen Events
    this.screen.on('notify', msg => this.notify(msg));
    this.screen.on('show-error', (title, err) => this.errorModal.showError(title, err));
    this.screen.on('trigger-gh-auth', () => this.handleGhAuthDirect());
    this.screen.on('open-branch-modal', () => this.branchModal.show());
    this.screen.on('open-stash-modal', () => this.stashModal.show());
    this.screen.on('execute-push', () => this.executePush());
    this.screen.on('execute-pull', () => this.executePull());

    this.screen.on('resize', () => {
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

  executePush() {
    this.notify('Pushing commits to remote origin...');
    this.gitService.push().then(() => {
      this.notify('✓ Push completed successfully');
      this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
    }).catch(err => {
      this.errorModal.showError('Push Failed', err);
    });
  }

  executePull() {
    this.notify('Pulling updates from remote origin...');
    this.gitService.pull().then(() => {
      this.notify('✓ Pull completed successfully');
      this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
    }).catch(err => {
      this.errorModal.showError('Pull Failed', err);
    });
  }
}
