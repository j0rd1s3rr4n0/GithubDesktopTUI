import blessed from 'blessed';
import { GitService } from '../git/git-service.js';
import { GhService } from '../git/gh-service.js';
import { Header } from './components/header.js';
import { ChangesView } from './views/changes-view.js';
import { HistoryView } from './views/history-view.js';
import { BranchesView } from './views/branches-view.js';
import { StashView } from './views/stash-view.js';
import { GithubView } from './views/github-view.js';
import { HelpModal } from './modals/help-modal.js';
import { BranchModal } from './modals/branch-modal.js';
import { StashModal } from './modals/stash-modal.js';
import { ConfirmModal } from './modals/confirm-modal.js';
import { InitModal } from './modals/init-modal.js';
import { AuthModal } from './modals/auth-modal.js';

export class App {
  constructor(targetRepoPath = process.cwd()) {
    this.gitService = new GitService(targetRepoPath);
    this.ghService = new GhService(targetRepoPath);

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'GitHub Desktop TUI - gitu / gd',
      fullUnicode: true
    });

    this.activeTab = 0; // 0: Changes, 1: History, 2: Branches, 3: Stash, 4: GitHub
    this.ghUser = null;

    this.initUI();
    this.initEvents();
  }

  async start() {
    const isRepo = await this.gitService.isRepo();
    if (!isRepo) {
      this.initModal = new InitModal(this.screen, this.gitService, this.ghService, async (action) => {
        await this.refreshGlobalHeader();
        this.switchTab(0);
        this.notify(action === 'cloned' ? 'Repository cloned successfully!' : 'Initialized new Git repository!');
        this.screen.render();
      });
      this.initModal.show();
      return;
    }

    await this.refreshGlobalHeader();
    this.switchTab(0);
    this.screen.render();
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
      }
    });
    this.screen.append(this.tabBar);

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
      content: ' Press [?] for Help | [L] GitHub Auth | [5] GitHub CLI'
    });
    this.screen.append(this.notificationBar);

    // Initialize Views
    const viewOptions = { top: 6 };
    this.views = [
      new ChangesView(this.screen, this.gitService, viewOptions),
      new HistoryView(this.screen, this.gitService, viewOptions),
      new BranchesView(this.screen, this.gitService, viewOptions),
      new StashView(this.screen, this.gitService, viewOptions),
      new GithubView(this.screen, this.ghService, viewOptions)
    ];

    this.views.forEach(v => {
      this.screen.append(v.container);
      v.onStatusChanged = () => this.refreshGlobalHeader();
    });

    // Initialize Modals
    this.helpModal = new HelpModal(this.screen);
    this.confirmModal = new ConfirmModal(this.screen);

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
        this.notify(`Failed to create branch: ${err.message}`);
      }
    });

    this.stashModal = new StashModal(this.screen, async (msg, untracked) => {
      try {
        await this.gitService.createStash(msg, untracked);
        this.notify('Stashed changes');
        await this.refreshGlobalHeader();
        this.views[this.activeTab].refresh();
      } catch (err) {
        this.notify(`Stash failed: ${err.message}`);
      }
    });

    this.updateTabBar();
  }

  updateTabBar() {
    const tabs = [
      '[1] Changes',
      '[2] History',
      '[3] Branches',
      '[4] Stash',
      '[5] GitHub (gh)'
    ];

    const formattedTabs = tabs.map((tab, idx) => {
      if (idx === this.activeTab) {
        return `{bold}{black-bg}{cyan-fg} ${tab} {/cyan-fg}{/black-bg}{/bold}`;
      }
      return `{gray-fg} ${tab} {/gray-fg}`;
    });

    this.tabBar.setContent(` Tabs:  ${formattedTabs.join('  |  ')}`);
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
      this.notificationBar.setContent(' Press [?] for Help | [L] GitHub Auth | [5] GitHub CLI');
      this.screen.render();
    }, 4000);
  }

  initEvents() {
    // Global Keybindings
    this.screen.key(['q', 'C-c'], () => {
      process.exit(0);
    });

    this.screen.key(['1'], () => this.switchTab(0));
    this.screen.key(['2'], () => this.switchTab(1));
    this.screen.key(['3'], () => this.switchTab(2));
    this.screen.key(['4'], () => this.switchTab(3));
    this.screen.key(['5'], () => this.switchTab(4));

    this.screen.key(['f1', '?'], () => {
      this.helpModal.toggle();
    });

    this.screen.key(['r'], async () => {
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
      this.notify('Refreshed Git & GitHub status');
    });

    this.screen.key(['L', 'l'], async () => {
      if (this.activeTab !== 0) { // Avoid conflict when typing in commit inputs
        await this.handleGhAuthDirect();
      }
    });

    this.screen.key(['b', 'n'], () => {
      this.branchModal.show();
    });

    this.screen.key(['s'], () => {
      if (this.activeTab !== 0 && this.activeTab !== 3) {
        this.stashModal.show();
      }
    });

    this.screen.key(['S-p'], async () => {
      this.executePush();
    });

    this.screen.key(['p'], async () => {
      if (this.activeTab !== 0 && this.activeTab !== 3) {
        this.executePull();
      }
    });

    // Custom Screen Events
    this.screen.on('notify', msg => this.notify(msg));
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
      // Direct login without intermediate menu!
      this.authModal.runInteractiveLogin();
    } else {
      // If already logged in, show status & logout modal
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
      this.notify(`Push failed: ${err.message}`);
    });
  }

  executePull() {
    this.notify('Pulling updates from remote origin...');
    this.gitService.pull().then(() => {
      this.notify('✓ Pull completed successfully');
      this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
    }).catch(err => {
      this.notify(`Pull failed: ${err.message}`);
    });
  }
}
