# 🔒 Supply Chain Security & Dependency Inventory

> **File:** `supplychain.md`
> **Applies to:** `git-desktop-tui` v1.0.0
> **Generated:** 2026-08-14
> **Node.js:** v22.23.2 (engine requirement: `>=18`) — **npm:** 10.9.8

This document is the **single source of truth** for the software supply chain of
this project. It enumerates every package, dependency, and pinned version, states
the trust model, and defines how to **detect** supply-chain compromise and how to
**harden** against malware campaigns (typosquatting, dependency confusion,
compromised maintainers, tampered tarballs, malicious install scripts).

---

## 1. Purpose & Scope

- List **every** direct and transitive dependency with its **exact pinned
  version**, **registry source (`resolved`)**, and **SHA-512 integrity hash**.
- Provide a **frozen, verifiable snapshot** of the dependency tree
  (`supplychain-manifest.json`) so any drift or tampering is detectable.
- Define operational **verification, change-control, and incident-response**
  procedures.

Attack surface today: **8 packages** (2 direct, 6 transitive), **0 known
vulnerabilities**.

---

## 2. Trust Model & Threats

The project executes third-party code during `npm install` (install scripts) and
at runtime. We assume the **npm registry is a high-value target** and design for
the following attack classes:

| Threat | Example | Mitigation in this repo |
|---|---|---|
| **Typosquatting** | Malicious look-alike package name | Only 2 direct deps, both long-established, pinned exact |
| **Dependency confusion** | Attacker publishes same name on a public registry to win version resolution | Registry pinned to `https://registry.npmjs.org/` only; no mirrors |
| **Compromised maintainer** | Legit package republished with backdoor | `package-lock.json` pins `resolved` + `integrity` (SHA-512) of every tarball; verification script re-checks |
| **Tampered transport / CDN** | Registry response swapped in transit | `strict-ssl=true`; SHA-512 integrity enforced by npm |
| **Malicious install script** | `postinstall` executes payload | Only 2 direct deps; tree fully auditable (8 packages); manifest freeze detects additions |
| **Vulnerable legacy dependency** | Old package with known CVE used as blast radius | Dead dependencies removed; `npm audit` gated at `high` |
| **`node_modules` tampering** | Attacker modifies files after install | `verify:supplychain` detects unexpected/missing packages and lockfile drift |

---

## 3. Toolchain

| Component | Version | Value |
|---|---|---|
| Node.js | v22.23.2 | Runtime (`engines.node >= 18`) |
| npm | 10.9.8 | Package manager (`lockfileVersion: 3`) |
| Registry | `https://registry.npmjs.org/` | Pinned in `.npmrc` |
| Lockfile | `package-lock.json` | Source of truth for exact tree |

**Lockfile fingerprint (SHA-256):**

```
d6ec29b3a1639f06a740ce7a780a260381be84456b73654489126ce01721055d  package-lock.json
adce29d5ef9c246f02b52fae3fe12ef18befb6814f2a17cacbc0694b58997cb6  supplychain-manifest.json
```

---

## 4. Direct Dependencies

Pinned via `save-exact` (no `^`/`~` ranges). Both are pure-JavaScript, widely
adopted, and importable only from this project's source.

| Package | Version | License | Purpose | Integrity (SHA-512) |
|---|---|---|---|---|
| `blessed` | `0.1.81` | MIT | Terminal UI rendering engine | `sha512-LoF5gae+hlmfORcG1M5+5XZi4LBmvlXTzwJWzUlPryN/SJdSflZvROM2TwkT0GMpq7oqT48NRd4GS7BiVBc5OQ==` |
| `simple-git` | `3.36.0` | MIT | Git CLI wrapper (status, diff, commit, push/pull…) | `sha512-cGQjLjK8bxJw4QuYT7gxHw3/IouVESbhahSsHrX97MzCL1gu2u7oy38W6L2ZIGECEfIBG4BabsWDPjBxJENv9Q==` |

> All packages resolve from `https://registry.npmjs.org/<pkg>/-/<pkg>-<version>.tgz`.

---

## 5. Transitive Dependency Inventory

Complete dependency tree (everything npm will install):

```
git-desktop-tui@1.0.0
├── blessed@0.1.81                              (direct)
└─┬ simple-git@3.36.0                           (direct)
  ├── @kwsites/file-exists@1.1.1
  │   └── debug@4.4.3
  │       └── ms@2.1.3
  ├── @kwsites/promise-deferred@1.1.1
  ├── @simple-git/args-pathspec@1.0.3
  └─┬ @simple-git/argv-parser@1.1.1
      ├── @simple-git/args-pathspec@1.0.3
      └── debug@4.4.3
          └── ms@2.1.3
```

| # | Package | Version | Resolved | Integrity (SHA-512) |
|---|---|---|---|---|
| 1 | `@kwsites/file-exists` | 1.1.1 | `registry.npmjs.org/@kwsites/file-exists/-/file-exists-1.1.1.tgz` | `sha512-m9/5YGR18lIwxSFDwfE3oA7bWuq9kdau6ugN4H2rJeyhFQZcG9AgSHkQtSD15a8WvTgfz9aikZMrKPHvbpqFiw==` |
| 2 | `@kwsites/promise-deferred` | 1.1.1 | `registry.npmjs.org/@kwsites/promise-deferred/-/promise-deferred-1.1.1.tgz` | `sha512-GaHYm+c0O9MjZRu0ongGBRbinu8gVAMd2UZjji6jVmqKtZluZnptXGWhz1E8j8D2HJ3f/yMxKAUC0b+57wncIw==` |
| 3 | `@simple-git/args-pathspec` | 1.0.3 | `registry.npmjs.org/@simple-git/args-pathspec/-/args-pathspec-1.0.3.tgz` | `sha512-ngJMaHlsWDTfjyq9F3VIQ8b7NXbBLq5j9i5bJ6XLYtD6qlDXT7fdKY2KscWWUF8t18xx052Y/PUO1K1TRc9yKA==` |
| 4 | `@simple-git/argv-parser` | 1.1.1 | `registry.npmjs.org/@simple-git/argv-parser/-/argv-parser-1.1.1.tgz` | `sha512-Q9lBcfQ+VQCpQqGJFHe5yooOS5hGdLFFbJ5R+R5aDsnkPCahtn1hSkMcORX65J2Z5lxSkD0lQorMsncuBQxYUw==` |
| 5 | `debug` | 4.4.3 | `registry.npmjs.org/debug/-/debug-4.4.3.tgz` | `sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==` |
| 6 | `ms` | 2.1.3 | `registry.npmjs.org/ms/-/ms-2.1.3.tgz` | `sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==` |

> The full machine-readable snapshot (with per-package `resolved` + `integrity`)
> is frozen in **`supplychain-manifest.json`**. `package-lock.json` (lockfile
> v3) remains the canonical per-install source.

---

## 6. Vulnerability Assessment

```bash
npm audit
```

**Result: 0 vulnerabilities** (0 info / 0 low / 0 moderate / 0 high / 0 critical).

### Historical note — attack-surface reduction (2026-08-14)

The project previously declared three **unused** dependencies —
`blessed-contrib`, `cli-highlight`, and `chalk` — none of which were imported
anywhere in `src/`. They dragged in **84 transitive packages** (92 total) and
were the sole source of **4 known vulnerabilities**:

- `lodash@4.17.23` (high) — code injection via `_.template` + prototype pollution
- `xml2js` (moderate) — prototype pollution (via `map-canvas`)

These were **removed**, reducing the tree from 92 → 8 packages and the audit to
**0 findings**. This is the single largest reduction of supply-chain blast radius
available for this project.

---

## 7. Hardening Measures Implemented

| Measure | Location | Effect |
|---|---|---|
| Remove unused/vulnerable deps | `package.json` | 92 → 8 packages, 0 CVEs |
| Exact version pinning | `.npmrc` (`save-exact=true`) | No floating ranges; reproducible installs |
| Pinned registry | `.npmrc` (`registry=https://registry.npmjs.org/`) | No dependency-confusion/mirror fallback |
| Audit on install | `.npmrc` (`audit=true`) | Fails on vulnerable trees at install time |
| Engine enforcement | `.npmrc` (`engine-strict=true`) + `package.json.engines.node>=18` | Rejects unsupported runtimes |
| Strict TLS | `.npmrc` (`strict-ssl=true`) | Verifies registry certs |
| Lockfile required | `.npmrc` (`package-lock=true`) + `verify` gate | Install must reproduce pinned tree |
| Frozen manifest | `supplychain-manifest.json` | Immutable baseline of every package + lockfile hash |
| Verification gate | `scripts/verify-supply-chain.mjs` | Detects drift / tampering / unexpected packages |
| Audit gate | `npm run supplychain:audit` | Fails if any `high`+ vulnerability appears |

---

## 8. Verification & Detection (how to detect compromise)

Run before install, in CI, or anytime you suspect tampering:

```bash
# Full integrity + drift check (exit 1 on any problem):
npm run verify:supplychain

# Fresh install strictly from the lockfile (never re-resolves ranges):
npm ci

# Confirm installed tree matches the lockfile exactly:
npm ls --all

# Vulnerability gate (fails on >= high):
npm run supplychain:audit
```

What `npm run verify:supplychain` detects:

| Check | Detects |
|---|---|
| `package-lock.json` SHA-256 vs manifest | Any modification of the lockfile |
| Per-package name/version/`resolved`/`integrity` vs manifest | Added, removed, or re-resolved packages (e.g. a poisoned replacement) |
| Missing packages in `node_modules` | Incomplete / corrupted install |
| Unexpected packages in `node_modules` | Untracked code injected into the install |
| Malformed `package-lock.json` | Files corrupted in transit or by tampering |

---

## 9. Change-Control Policy (adding / updating a dependency)

1. Review the change **manually** — read the new package's source, maintainer,
   and reputation. Prefer tiny, widely-used, actively maintained packages.
2. Install and pin exactly:
   ```bash
   npm install <pkg>@<exact-version> --save-exact
   npm ci
   npm run supplychain:audit
   ```
3. Regenerate the frozen baseline **only after** the change is approved:
   ```bash
   npm run supplychain:update
   ```
4. Commit `package.json`, `package-lock.json`, `supplychain-manifest.json`,
   and this document together. **Never** commit `node_modules/` (see
   `.gitignore`).
5. Every future `git diff` on dependency files must be accompanied by a
   matching manifest change — a silent lockfile edit now fails CI.

---

## 10. Incident Response

If `npm run verify:supplychain` (or `npm audit`) fails:

1. **Stop using the app immediately.** Do not push or run the affected tree.
2. Identify the drift: `npm run verify:supplychain` names the package(s).
3. Inspect the tarball against its `integrity` hash; compare with the published
   hash on `registry.npmjs.org`. Check npm advisory data
   (`npm audit`), GitHub advisories, and the package's commit history.
4. If a package was replaced or added **without** a reviewed change, treat it as
   **compromised**:
   ```bash
   rm -rf node_modules package-lock.json
   git checkout package-lock.json supplychain-manifest.json package.json
   npm ci
   npm run verify:supplychain
   ```
5. Rotate any credentials the tool could have touched (GitHub tokens in the
   environment, `gh` auth) if compromise is confirmed.
6. Report findings with package name, version, `resolved`, `integrity`, and the
   timeline.

---

## 11. Out-of-Band Baseline (recommended)

For maximum tamper resistance, store the lockfile fingerprint **outside** this
repo (it is technically modifiable by a repo compromise):

- Add the SHA-256 from §3 to your CI configuration / release notes.
- Consider signing `supplychain-manifest.json` in release artifacts.
- Enable GitHub Dependabot + OSSF Scorecard for continuous monitoring.

---

## 12. References

- `package.json` — declared dependencies
- `package-lock.json` — canonical resolved tree (lockfile v3)
- `supplychain-manifest.json` — frozen baseline used by `verify:supplychain`
- `.npmrc` — registry / audit / pinning policy
- `scripts/verify-supply-chain.mjs` — verification implementation
- npm security: <https://docs.npmjs.com/cli/v10/commands/npm-audit>
- OSSF Scorecard: <https://securityscorecards.dev>