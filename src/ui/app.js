import blessed from 'blessed';
import { GitService } from '../git/git-service.js';
import { Header } from './components/header.js';
import { ChangesView } from './views/changes-view.js';
import { HistoryView } from './views/history-view.js';
import { BranchesView } from './views/branches-view.js';
import { StashView } from './views/stash-view.js';
import { HelpModal } from './modals/help-modal.js';
import { BranchModal } from './modals/branch-modal.js';
import { StashModal } from './modals/stash-modal.js';
import { ConfirmModal } from './modals/confirm-modal.js';

export class App {
  constructor(targetRepoPath = process.cwd()) {
    this.gitService = new GitService(targetRepoPath);

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'GitHub Desktop TUI - gitu',
      fullUnicode: true
    });

    this.activeTab = 0; // 0: Changes, 1: History, 2: Branches, 3: Stash

    this.initUI();
    this.initEvents();
  }

  async start() {
    const isRepo = await this.gitService.isRepo();
    if (!isRepo) {
      console.error(`\x1b[31mError: Path "${this.gitService.repoPath}" is not a Git repository.\x1b[0m`);
      process.exit(1);
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
      content: ' Press [?] or [F1] for keyboard shortcuts help'
    });
    this.screen.append(this.notificationBar);

    // Initialize Views
    const viewOptions = { top: 6 };
    this.views = [
      new ChangesView(this.screen, this.gitService, viewOptions),
      new HistoryView(this.screen, this.gitService, viewOptions),
      new BranchesView(this.screen, this.gitService, viewOptions),
      new StashView(this.screen, this.gitService, viewOptions)
    ];

    this.views.forEach(v => {
      this.screen.append(v.container);
      v.onStatusChanged = () => this.refreshGlobalHeader();
    });

    // Initialize Modals
    this.helpModal = new HelpModal(this.screen);
    this.confirmModal = new ConfirmModal(this.screen);

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
      '[4] Stash'
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
      this.header.update({
        repoName,
        currentBranch: status.currentBranch,
        ahead: status.ahead,
        behind: status.behind,
        isClean: status.isClean
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
      this.notificationBar.setContent(' Press [?] or [F1] for keyboard shortcuts help');
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

    this.screen.key(['f1', '?'], () => {
      this.helpModal.toggle();
    });

    this.screen.key(['r'], async () => {
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
      this.notify('Refreshed Git status');
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

    // Custom Screen Events emitted from child components
    this.screen.on('notify', msg => this.notify(msg));
    this.screen.on('open-branch-modal', () => this.branchModal.show());
    this.screen.on('open-stash-modal', () => this.stashModal.show());
    this.screen.on('execute-push', () => this.executePush());
    this.screen.on('execute-pull', () => this.executePull());

    // Screen resize listener
    this.screen.on('resize', () => {
      this.screen.render();
    });
  }

  async executePush() {
    this.notify('Pushing commits to remote origin...');
    try {
      await this.gitService.push();
      this.notify('✓ Push completed successfully');
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
    } catch (err) {
      this.notify(`Push failed: ${err.message}`);
    }
  }

  async executePull() {
    this.notify('Pulling updates from remote origin...');
    try {
      await this.gitService.pull();
      this.notify('✓ Pull completed successfully');
      await this.refreshGlobalHeader();
      this.views[this.activeTab].refresh();
    } catch (err) {
      this.notify(`Pull failed: ${err.message}`);
    }
  }
}
