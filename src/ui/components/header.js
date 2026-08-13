import blessed from 'blessed';

export class Header {
  constructor(options = {}) {
    this.box = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'blue' },
        bg: 'black',
        fg: 'white'
      }
    });
  }

  update({ repoName, currentBranch, ahead = 0, behind = 0, ghUser = null }) {
    const repoText = `{bold}{white-fg} GitHub Desktop TUI{/white-fg}{/bold} | Repo: {green-fg}${repoName}{/green-fg}`;
    const branchBadge = `{bold}{black-bg}{yellow-fg}  ${currentBranch} {/yellow-fg}{/black-bg}{/bold}`;
    
    let syncText = '{green-fg}✓ Up to date{/green-fg}';
    if (ahead > 0 || behind > 0) {
      const aheadStr = ahead > 0 ? `{yellow-fg}↑${ahead}{/yellow-fg}` : '';
      const behindStr = behind > 0 ? `{magenta-fg}↓${behind}{/magenta-fg}` : '';
      syncText = `{bold}${aheadStr} ${behindStr}{/bold}`.trim();
    }

    let ghStatus = '{yellow-fg}GitHub: Not Logged In [L]{/yellow-fg}';
    if (ghUser) {
      ghStatus = `{cyan-fg}GitHub: @${ghUser}{/cyan-fg}`;
    }

    const shortcutsText = '{cyan-fg}[F1/?]{/cyan-fg} Help  {cyan-fg}[1-5]{/cyan-fg} Tabs  {cyan-fg}[P]{/cyan-fg} Push  {cyan-fg}[p]{/cyan-fg} Pull  {cyan-fg}[L]{/cyan-fg} GitHub Auth  {cyan-fg}[r]{/cyan-fg} Refresh  {cyan-fg}[q]{/cyan-fg} Quit';

    const content = `${repoText}   Branch: ${branchBadge}   Sync: ${syncText}   ${ghStatus}\n${shortcutsText}`;
    this.box.setContent(content);
  }
}
