# Mobile Market Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an installable iPhone market dashboard backed by secure Alpha Vantage snapshots.

**Architecture:** A dependency-free PWA renders sanitized static JSON. GitHub Actions owns API-key access, quota-aware refreshes, verification, artifact creation, and GitHub Pages deployment.

**Tech Stack:** HTML, CSS, JavaScript, service workers, Python 3.13 standard library, pytest, GitHub Actions, GitHub Pages, Alpha Vantage REST endpoints.

## Global Constraints

- Never expose `ALPHA_VANTAGE_API_KEY` to browser files or deployed artifacts.
- Default to a dark, modern, mobile-first interface with home-screen installation support.
- Clearly identify snapshot freshness, partial data, quota limits, and unavailable endpoints.
- Preserve partial data when one Alpha Vantage endpoint fails.
- Keep free-tier scheduled usage within the standard 25-request daily quota under normal operation.

---

### Task 1: PWA shell

**Files:**
- Create: `dashboard/index.html`
- Create: `dashboard/styles.css`
- Create: `dashboard/app.js`
- Create: `dashboard/manifest.webmanifest`
- Create: `dashboard/sw.js`
- Create: `dashboard/icon.svg`
- Create: `dashboard/.nojekyll`

- [x] Build Overview, Watchlist, Movers, News, and Settings sections.
- [x] Add iPhone installation guidance and standalone PWA metadata.
- [x] Add offline shell caching and network-first snapshot refresh.
- [x] Add responsive card layouts, bottom navigation, feed status, and notices.

### Task 2: Snapshot pipeline

**Files:**
- Create: `dashboard/generate_snapshot.py`
- Create: `dashboard/data/market-snapshot.json`

- [x] Read the API key only from `ALPHA_VANTAGE_API_KEY`.
- [x] Request bulk quotes with four-symbol `GLOBAL_QUOTE` fallback.
- [x] Request market status, movers, and news.
- [x] Sanitize errors and preserve partial or prior snapshot sections.
- [x] Apply quota-conscious free-tier scheduling.

### Task 3: Verification and deployment

**Files:**
- Create: `tests/test_dashboard_contract.py`
- Create: `.github/workflows/mobile-dashboard.yml`

- [x] Test mobile/PWA metadata and primary sections.
- [x] Test that browser bundles do not reference the secret variable.
- [x] Test snapshot generator secret handling.
- [x] Verify on pull requests and deploy GitHub Pages from `main`.

### Task 4: Operator documentation

**Files:**
- Create: `docs/DASHBOARD.md`

- [x] Document GitHub secret setup, Pages activation, home-screen installation, refresh policy, variables, and local preview.

### Task 5: Integration

- [ ] Open a pull request from `feature/mobile-market-dashboard` to `main`.
- [ ] Verify the pull-request workflow passes in a clean runner.
- [ ] Merge the verified branch.
- [ ] Inspect the main-branch Pages deployment and report any one-time repository setting still required.
