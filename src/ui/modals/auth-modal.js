import blessed from 'blessed';

export class AuthModal {
  constructor(screen, ghService, onAuthChangedCallback) {
    this.screen = screen;
    this.ghService = ghService;
    this.onAuthChanged = onAuthChangedCallback;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 12,
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
      width: 54,
      tags: true,
      content: 'Checking authentication status...'
    });

    this.loginBtn = blessed.button({
      parent: this.box,
      top: 6,
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
      top: 6,
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
      top: 6,
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
    this.loginBtn.on('press', () => {
      this.statusText.setContent('{yellow-fg}To login, run "gh auth login" in your terminal shell.{/yellow-fg}');
      this.screen.render();
    });

    this.logoutBtn.on('press', async () => {
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
    });

    this.closeBtn.on('press', () => this.hide());
    this.box.key(['escape', 'q'], () => this.hide());
  }

  async show() {
    this.box.show();
    this.statusText.setContent('Checking authentication status...');
    this.screen.render();

    const auth = await this.ghService.getAuthStatus();
    if (auth.isLoggedIn) {
      this.statusText.setContent(`{green-fg}✓ Authenticated as @${auth.user}{/green-fg} on {bold}${auth.host || 'github.com'}{/bold}`);
      this.logoutBtn.focus();
    } else {
      this.statusText.setContent('{yellow-fg}✗ Not logged in to GitHub CLI.{/yellow-fg}\nRun {bold}gh auth login{/bold} in terminal to sign in.');
      this.loginBtn.focus();
    }
    this.screen.render();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}
