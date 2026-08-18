#!/usr/bin/env node
/**
 * Supply-chain verification for git-desktop-tui.
 *
 * Commands:
 *   update   Rebuild supplychain-manifest.json (frozen snapshot of the
 *            dependency tree + lockfile fingerprint). Run ONLY after you have
 *            manually reviewed a dependency change.
 *   verify   Compare the current lockfile against the frozen manifest and
 *            check that the installed node_modules tree matches the lockfile.
 *            Exit code 1 on any drift. This is the CI / pre-run gate.
 *   audit    Run `npm audit` with a high severity threshold.
 *
 * See supplychain.md for the full threat model.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

// Resolve repository root in a cross-platform way
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCK_PATH = path.join(ROOT, 'package-lock.json');
const PKG_PATH = path.join(ROOT, 'package.json');
const MANIFEST_PATH = path.join(ROOT, 'supplychain-manifest.json');
const NM_PATH = path.join(ROOT, 'node_modules');

const cmd = process.argv[2] || 'verify';

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`[FAIL] Cannot parse ${path.basename(p)}: ${err.message}`);
    process.exit(1);
  }
}

function buildManifest() {
  let lockBuf;
  let lock;

  // In CI we prefer using the committed package-lock.json (HEAD) because
  // 'npm ci' on the runner can sometimes rewrite the on-disk lockfile
  // (different npm/node versions, metadata), producing spurious diffs.
  // Use git show HEAD:package-lock.json when available (CI or env var).
  if (process.env.CI) {
    try {
      const out = execSync('git show HEAD:package-lock.json', { encoding: 'utf8' });
      lockBuf = Buffer.from(out, 'utf8');
      lock = JSON.parse(out);
    } catch (err) {
      // Fallback to on-disk file if git fails
      lockBuf = fs.readFileSync(LOCK_PATH);
      lock = readJson(LOCK_PATH);
    }
  } else {
    lockBuf = fs.readFileSync(LOCK_PATH);
    lock = readJson(LOCK_PATH);
  }

  const pkg = readJson(PKG_PATH);

  const packages = Object.entries(lock.packages)
    .filter(([key]) => key !== '')
    .map(([key, v]) => ({
      name: key.split('node_modules/').pop(),
      version: v.version || '',
      resolved: v.resolved || '',
      integrity: v.integrity || ''
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    tool: 'git-desktop-tui supply chain manifest',
    node: process.version,
    npm: execSync('npm --version', { encoding: 'utf8' }).trim(),
    generatedAt: new Date().toISOString(),
    lockfileVersion: lock.lockfileVersion,
    lockfileSha256: sha256(lockBuf),
    rootDependencies: pkg.dependencies || {},
    packageCount: packages.length,
    packages
  };
}

function missingInstalled(manifest) {
  const missing = [];
  for (const p of manifest.packages) {
    if (p.name.startsWith('node_modules/')) continue;
    if (!fs.existsSync(path.join(NM_PATH, p.name))) {
      missing.push(p.name);
    }
  }
  return missing;
}

function unexpectedInstalled(manifest) {
  if (!fs.existsSync(NM_PATH)) return [];
  const expected = new Set(manifest.packages.map((p) => p.name));
  const expectedScopes = new Set(
    manifest.packages
      .map((p) => p.name.split('/')[0])
      .filter((p) => p.startsWith('@'))
  );
  const found = [];
  for (const entry of fs.readdirSync(NM_PATH)) {
    if (entry === '.bin' || entry === '.package-lock.json' || entry.startsWith('.')) continue;
    if (expected.has(entry)) continue;
    // A scoped directory (@scope) is expected when any package lives under it.
    if (entry.startsWith('@') && expectedScopes.has(entry)) continue;
    found.push(entry);
  }
  return found;
}

function diffPackages(cur, ref) {
  const byName = new Map(ref.packages.map((p) => [p.name, p]));
  const diff = [];
  for (const p of cur.packages) {
    const r = byName.get(p.name);
    if (!r) {
      diff.push(`  [ADDED] ${p.name}@${p.version}`);
      continue;
    }
    if (r.version !== p.version || r.resolved !== p.resolved || r.integrity !== p.integrity) {
      diff.push(`  [MODIFIED] ${p.name}: ${r.version} -> ${p.version}`);
    }
    byName.delete(p.name);
  }
  for (const [, r] of byName) {
    diff.push(`  [REMOVED] ${r.name}@${r.version}`);
  }
  return diff;
}

function update() {
  const manifest = buildManifest();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`supplychain-manifest.json updated:`);
  console.log(`  lockfile sha256 : ${manifest.lockfileSha256}`);
  console.log(`  packages        : ${manifest.packageCount}`);
  console.log(`  node            : ${manifest.node}`);
}

function verify() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`No manifest found. Run "npm run supplychain:update" first.`);
    process.exit(1);
  }

  const ref = readJson(MANIFEST_PATH);
  const cur = buildManifest();
  let failures = 0;

  if (cur.lockfileSha256 !== ref.lockfileSha256) {
    failures++;
    console.error(`[FAIL] package-lock.json hash changed:`);
    console.error(`  recorded : ${ref.lockfileSha256}`);
    console.error(`  current  : ${cur.lockfileSha256}`);
  } else {
    console.log(`[OK] package-lock.json hash matches manifest.`);
  }

  const diffs = diffPackages(cur, ref);
  if (diffs.length) {
    failures++;
    console.error(`[FAIL] dependency tree drifted from frozen manifest (${diffs.length} changes):`);
    diffs.forEach((d) => console.error(d));
  } else {
    console.log(`[OK] dependency tree matches manifest (${cur.packageCount} packages).`);
  }

  const missing = missingInstalled(cur);
  if (missing.length) {
    failures++;
    console.error(`[FAIL] packages declared in lockfile but missing from node_modules: ${missing.join(', ')}`);
  } else {
    console.log(`[OK] all lockfile packages are installed.`);
  }

  const unexpected = unexpectedInstalled(cur);
  if (unexpected.length) {
    failures++;
    console.error(`[FAIL] unexpected packages present in node_modules (not in lockfile): ${unexpected.join(', ')}`);
  } else {
    console.log(`[OK] no unexpected packages in node_modules.`);
  }

  if (failures) {
    console.error(`\n✗ Supply chain verification FAILED (${failures} problem(s)).`);
    console.error(`  If the change was reviewed and intentional, run "npm run supplychain:update".`);
    process.exit(1);
  }
  console.log(`\n✓ Supply chain verification PASSED.`);
}

function audit() {
  try {
    execSync('npm audit --audit-level=high', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

switch (cmd) {
  case 'update':
    update();
    break;
  case 'audit':
    audit();
    break;
  default:
    verify();
}