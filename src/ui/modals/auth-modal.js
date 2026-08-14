import blessed from 'blessed';
import { spawnSync, execAsync } from 'child_process';
import util from 'util';

export class AuthModal {
  constructor(screen, ghService, onAuthChangedCallback) {
    this.screen = screen;
    this.ghService = ghService;
    this.onAuthChanged = onAuthChangedCallback;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 62,
      height: 13,
      label: ' {bold}GitHub Account Authentication (gh){/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      keys: true
    });

    this.statusText = blessed.text({
      parent: this.box,
      top: 1,
      left: 2,
      width: 56,
      tags: true,
      content: 'Checking authentication status...'
    });

    this.loginBtn = blessed.button({
      parent: this.box,
      top: 7,
      left: 4,
      width: 16,
      height: 1,
      content: ' [l] Login ',
      align: 'center',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.logoutBtn = blessed.button({
      parent: this.box,
      top: 7,
      left: 22,
      width: 16,
      height: 1,
      content: ' [o] Logout ',
      align: 'center',
      style: {
        bg: 'red',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.closeBtn = blessed.button({
      parent: this.box,
      top: 7,
      left: 40,
      width: 16,
      height: 1,
      content: ' [Esc] Close ',
      align: 'center',
      style: {
        bg: 'gray',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.setupEvents();
  }

  setupEvents() {
    this.loginBtn.on('press', () => this.runInteractiveLogin());
    this.box.key(['l'], () => this.runInteractiveLogin());

    this.logoutBtn.on('press', () => this.runLogout());
    this.box.key(['o'], () => this.runLogout());

    this.closeBtn.on('press', () => this.hide());
    this.box.key(['escape', 'q'], () => this.hide());
  }

  runInteractiveLogin() {
    this.hide();

    // 1. Leave blessed screen
    this.screen.leave();

    // 2. Restore standard canonical terminal input mode for full stdin support (Enter, keys)
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
      process.stdin.resume();
    }
    process.stdout.write('\x1b[?25h'); // Ensure cursor is visible

    console.clear();
    console.log('\n\x1b[1m\x1b[36m=== GitHub CLI Login (gh auth login) ===\x1b[0m\n');

    try {
      spawnSync('gh', ['auth', 'login'], { stdio: 'inherit' });
    } catch (err) {
      console.log(`\n\x1b[33mgh auth login completed or cancelled.\x1b[0m\n`);
    }

    // 3. Restore Blessed TUI mode
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    this.screen.enter();
    this.screen.render();
    this.show();
    if (this.onAuthChanged) this.onAuthChanged();
  }

  async runLogout() {
    this.statusText.setContent('{cyan-fg}Logging out from GitHub CLI...{/cyan-fg}');
    this.screen.render();
    const res = await this.ghService.logout();
    if (res.success) {
      this.statusText.setContent('{red-fg}✓ Logged out successfully.{/red-fg}');
      if (this.onAuthChanged) this.onAuthChanged();
    } else {
      this.statusText.setContent(`{red-fg}Logout failed: ${res.error}{/red-fg}`);
    }
    this.screen.render();
  }

  async show() {
    this.box.show();
    this.statusText.setContent('Checking authentication status...');
    this.screen.render();

    const auth = await this.ghService.getAuthStatus();
    if (auth.isLoggedIn) {
      this.statusText.setContent(`{green-fg}✓ Authenticated as @${auth.user}{/green-fg} on {bold}${auth.host || 'github.com'}{/bold}\n\nPress [l] to re-authenticate or [o] to logout.`);
      this.logoutBtn.focus();
    } else {
      this.statusText.setContent('{yellow-fg}✗ Not logged in to GitHub CLI.{/yellow-fg}\n\nPress {bold}[l]{/bold} or click Login to sign in interactively.');
      this.loginBtn.focus();
    }
    this.screen.render();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}
