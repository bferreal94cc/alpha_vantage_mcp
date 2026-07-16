# Alpha Edge Mobile Market Dashboard

Alpha Edge is a mobile-first progressive web app built from the `dashboard/` directory. It is designed for Safari installation on an iPhone home screen and publishes through GitHub Pages.

## Security model

The browser never receives `ALPHA_VANTAGE_API_KEY`. GitHub Actions reads the repository secret, calls Alpha Vantage, writes a sanitized market snapshot, and deploys only static dashboard files and market data.

Because this repository is public, the dashboard page and generated market snapshot are public. The API key remains private in GitHub Secrets.

## One-time GitHub setup

### 1. Add the Alpha Vantage secret

In the repository, open:

**Settings → Secrets and variables → Actions → New repository secret**

Create a secret named exactly:

```text
ALPHA_VANTAGE_API_KEY
```

### 2. Enable GitHub Pages

Open:

**Settings → Pages → Build and deployment**

Set **Source** to **GitHub Actions**.

The deployment workflow publishes the site at:

```text
https://bferreal94cc.github.io/alpha_vantage_mcp/
```

### 3. Run the dashboard workflow

Open **Actions → Mobile Market Dashboard → Run workflow**. After the deployment job succeeds, open the Pages URL above.

## Add to the iPhone home screen

1. Open the dashboard URL in Safari.
2. Tap the Share button.
3. Scroll down and select **Add to Home Screen**.
4. Tap **Add**.

The dashboard then opens in standalone app mode without Safari controls.

## Default watchlist

```text
SPY, QQQ, XSP, ONDS, AAPL, NVDA, AMD, TSLA
```

## Optional repository variables

In **Settings → Secrets and variables → Actions → Variables**, the following variables can customize behavior:

| Variable | Purpose | Default |
|---|---|---|
| `DASHBOARD_WATCHLIST` | Comma-separated symbols requested from the premium bulk quote endpoint | `SPY,QQQ,XSP,ONDS,AAPL,NVDA,AMD,TSLA` |
| `DASHBOARD_FREE_SYMBOLS` | Up to four priority symbols used for free-tier `GLOBAL_QUOTE` fallback | `SPY,QQQ,XSP,ONDS` |
| `DASHBOARD_PREMIUM_MODE` | Set to `true` to allow every hourly scheduled refresh | `false` |

## Refresh policy

The workflow is scheduled hourly between 13:00 and 22:00 UTC on weekdays.

- In free-tier mode, API calls occur only at 13:00, 17:00, and 21:00 UTC to stay near Alpha Vantage's standard 25-request daily limit.
- In premium mode, every scheduled run may refresh.
- Manual workflow runs refresh immediately.
- The browser refresh button reloads the latest published snapshot; it does not expose the key or call Alpha Vantage directly.

## Data behavior

The generator requests:

- `REALTIME_BULK_QUOTES` for the full watchlist when entitled;
- `GLOBAL_QUOTE` for the four priority symbols when bulk quotes are unavailable;
- `MARKET_STATUS`;
- `TOP_GAINERS_LOSERS`;
- `NEWS_SENTIMENT`.

Partial results remain visible. Quota, entitlement, and endpoint errors appear under **Feed notices** rather than blanking the dashboard.

## Local preview

From the repository root:

```bash
python -m http.server 8080 --directory dashboard
```

Then open `http://localhost:8080`.

To generate a local snapshot first:

```bash
export ALPHA_VANTAGE_API_KEY="your-key-value"
python dashboard/generate_snapshot.py
```

Never commit the generated key, shell history containing a real key, or a `.env` file.
