import blessed from 'blessed';
import { checkForUpdates, applyUpdate, getCurrentVersion } from '../../git/updater.js';

export class UpdateModal {
  constructor(screen) {
    this.screen = screen;
    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 66,
      height: 14,
      label: ' {bold}Software Update (Ctrl+U){/bold} ',
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
      width: 60,
      height: 8,
      tags: true,
      content: 'Checking for updates...'
    });

    this.checkBtn = blessed.button({
      parent: this.box,
      top: 10,
      left: 4,
      width: 17,
      height: 1,
      content: ' [c] Check Again ',
      align: 'center',
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.updateBtn = blessed.button({
      parent: this.box,
      top: 10,
      left: 24,
      width: 17,
      height: 1,
      content: ' [u] Update Now ',
      align: 'center',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.closeBtn = blessed.button({
      parent: this.box,
      top: 10,
      left: 44,
      width: 17,
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
    this.checkBtn.on('press', () => this.doCheck());
    this.box.key(['c'], () => this.doCheck());

    this.updateBtn.on('press', () => this.doUpdate());
    this.box.key(['u'], () => this.doUpdate());

    this.closeBtn.on('press', () => this.hide());
    this.box.key(['escape', 'q'], () => this.hide());
  }

  async doCheck() {
    this.statusText.setContent('{cyan-fg}Checking for updates...{/cyan-fg}');
    this.screen.render();
    const res = await checkForUpdates();
    this.renderResult(res);
  }

  renderResult(res) {
    const cur = `Current version: {yellow-fg}v${res.currentVersion}{/yellow-fg}`;
    if (res.error) {
      this.statusText.setContent(`${cur}\n\n{red-fg}✗ ${res.error}{/red-fg}\n\nCheck again later or run: {gray-fg}git pull --ff-only{/gray-fg}`);
      this.screen.render();
      return;
    }
    const latest = `Latest version:  {green-fg}v${res.latestVersion}{/green-fg}`;
    if (res.updateAvailable) {
      this.statusText.setContent(
        `${cur}\n${latest}\n\n{green-fg}{bold}✓ A new version is available!{/bold}{/green-fg}\n\nPress {bold}[u]{/bold} or click Update to pull it and reinstall dependencies.`
      );
      this.updateBtn.focus();
    } else {
      this.statusText.setContent(
        `${cur}\n${latest}\n\n{yellow-fg}✓ You are up to date.{/yellow-fg}\n\n${res.url}`
      );
      this.checkBtn.focus();
    }
    this.screen.render();
  }

  async doUpdate() {
    this.statusText.setContent('{cyan-fg}Updating (git pull + npm ci)...\n\nThis may take a few seconds...{/cyan-fg}');
    this.screen.render();
    const res = applyUpdate();
    if (res.success) {
      this.statusText.setContent(
        `{green-fg}{bold}✓ Update applied successfully!{/bold}{/green-fg}\n\n${res.output}\n\nPlease restart the app ({yellow-fg}q{/yellow-fg} then run gd again) to use the new version.`
      );
      this.screen.emit('notify', '✓ Update applied. Restart the app to use the new version.');
    } else {
      this.statusText.setContent(
        `{red-fg}{bold}✗ Update failed.{/bold}{/red-fg}\n\n${res.output}\n\nYou may need to pull manually: git pull --ff-only`
      );
      this.screen.emit('notify', 'Update failed — see modal for details.');
    }
    this.screen.render();
  }

  async show() {
    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();
    this.screen.render();
    await this.doCheck();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}