import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
export const PROJECT_ROOT = path.resolve(path.dirname(__filename), '../..');

const UPDATE_REPO = process.env.GITU_UPDATE_REPO || 'j0rd1s3rr4n0/GithubDesktopTUI';
const CACHE_PATH = path.join(os.homedir(), '.gitu_updates.json');

export function getCurrentVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function compareVersions(a, b) {
  const pa = String(a).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function readCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    }
  } catch {}
  return null;
}

function writeCache(data) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ ...data, checkedAt: new Date().toISOString() }, null, 2), 'utf8');
  } catch {}
}

export async function checkForUpdates() {
  const currentVersion = getCurrentVersion();
  const cache = readCache();
  if (cache && cache.latestVersion && Date.now() - new Date(cache.checkedAt).getTime() < 6 * 3600 * 1000) {
    return {
      currentVersion,
      latestVersion: cache.latestVersion,
      updateAvailable: compareVersions(cache.latestVersion, currentVersion) > 0,
      url: cache.url || `https://github.com/${UPDATE_REPO}`,
      fromCache: true
    };
  }

  let latestVersion = null;
  let url = `https://github.com/${UPDATE_REPO}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'git-desktop-tui', 'Accept': 'application/vnd.github+json' }
    });
    if (res.ok) {
      const data = await res.json();
      latestVersion = String(data.tag_name || '').replace(/^v/i, '') || null;
      if (data.html_url) url = data.html_url;
    }
  } catch {}

  if (!latestVersion) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${UPDATE_REPO}/master/package.json`, {
        headers: { 'User-Agent': 'git-desktop-tui' }
      });
      if (res.ok) {
        const pkg = await res.json();
        latestVersion = String(pkg.version || '').replace(/^v/i, '') || null;
      }
    } catch {}
  }

  if (!latestVersion) {
    return { currentVersion, latestVersion: null, updateAvailable: false, url, error: 'Could not reach update server.' };
  }

  const result = {
    currentVersion,
    latestVersion,
    updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
    url
  };
  writeCache({ latestVersion, url });
  return result;
}

export function applyUpdate() {
  const root = PROJECT_ROOT;
  const steps = [];
  const err = (prefix, e) => `[${prefix}] ${(e.stderr || e.stdout || '').toString().trim()}`;

  // 1) Pull latest code
  const pull = spawnSync('git', ['pull', '--ff-only'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (pull.status !== 0) {
    return { success: false, output: err('git pull', pull), steps };
  }
  steps.push('git pull --ff-only: OK');

  // 2) (Re)install dependencies
  const npm = spawnSync('npm', ['ci'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (npm.status !== 0) {
    const fallback = spawnSync('npm', ['install'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (fallback.status !== 0) {
      return { success: false, output: err('npm install', fallback), steps };
    }
    steps.push('npm install: OK');
  } else {
    steps.push('npm ci: OK');
  }

  // 3) Refresh global links (npm link is idempotent)
  try {
    const link = spawnSync('npm', ['link'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (link.status === 0) steps.push('npm link: OK');
  } catch {}

  return { success: true, output: steps.join('\n'), steps };
}

export { PROJECT_ROOT as UPDATE_PROJECT_ROOT };