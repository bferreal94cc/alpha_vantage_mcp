# Mobile Market Dashboard Design

## Objective

Build a sleek, mobile-first Alpha Vantage dashboard that installs from Safari as an iPhone home-screen app and never exposes the API key to browser code.

## Architecture

The dashboard is a dependency-free progressive web app in `dashboard/`, published through GitHub Pages. A GitHub Actions workflow reads `ALPHA_VANTAGE_API_KEY`, generates a sanitized JSON snapshot server-side, and deploys only the static dashboard and snapshot. The browser never receives the credential.

## User experience

- Dark, modern visual system with dimensional cards and compact mobile spacing.
- Overview cards for market status, tracked symbols, gainers, losers, news, data freshness, and feed errors.
- Default watchlist: SPY, QQQ, XSP, ONDS, AAPL, NVDA, AMD, and TSLA.
- Bottom navigation and a built-in iPhone installation guide.
- Standalone PWA behavior, offline shell caching, pull-to-refresh-friendly controls, and clear delayed/rate-limited states.

## Data policy

Alpha Vantage is the exclusive numerical market-data source for generated snapshots. Snapshot timestamps and endpoint errors are displayed. The generator must retain partial results when a premium endpoint, quota, or individual request fails.

## Deployment

GitHub Pages deploys from Actions. Core snapshots refresh on a quota-conscious market-hours schedule; manual dispatch supports immediate refresh. Full news/mover refreshes run less often than quotes. The workflow can deploy an empty setup state before the repository secret is configured.

## Security

- No API key in HTML, JavaScript, service worker, manifest, snapshot, logs, or committed files.
- The key is read only from GitHub Actions secrets or a local environment variable.
- Public Pages output contains market data and errors only, never request URLs containing credentials.
