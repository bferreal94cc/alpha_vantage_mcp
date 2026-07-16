# Automated Setup and Verification

This repository includes a repeatable setup path for the complete Alpha Vantage MCP workspace.

## Local setup

From the repository root:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

You can also run it without changing file permissions:

```bash
bash scripts/setup.sh
```

The script:

1. Installs `uv` when it is not already available.
2. Installs/selects Python 3.13.
3. Runs `uv sync --frozen --all-packages --all-groups`.
4. Imports the `av_api`, `av_cli`, and `av_mcp` packages.
5. Verifies `marketdata-mcp-server` and `marketdata-cli` command discovery.
6. Runs a live IBM quote check when `ALPHA_VANTAGE_API_KEY` is available.

## Configure the API key locally

Do not commit the key. Export it in your shell:

```bash
export ALPHA_VANTAGE_API_KEY="your-key-value"
```

Then rerun setup or call the tools directly:

```bash
./scripts/setup.sh
uv run marketdata-cli global_quote IBM
uv run marketdata-mcp-server
```

To install dependencies without making a live request even when the key is present:

```bash
RUN_LIVE_CHECK=never ./scripts/setup.sh
```

## Configure GitHub Actions

Create a repository Actions secret named exactly:

```text
ALPHA_VANTAGE_API_KEY
```

In GitHub, open the repository and go to **Settings → Secrets and variables → Actions → New repository secret**. Enter the secret name above and paste the key as the value.

The `Setup and Verify` workflow runs on:

- pushes to `main` and `automation/**` branches;
- pull requests;
- manual workflow dispatches.

When the secret is configured, setup includes a live quote request. When the secret is absent, installation, imports, command checks, and tests still run, and the live request is reported as skipped.

## Troubleshooting

### `uv` is not found after installation

Start a new shell or add the standard install locations to the current shell:

```bash
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
```

### The live quote check fails

Confirm that `ALPHA_VANTAGE_API_KEY` is set, valid, and entitled for the requested endpoint. API throttling or plan limits can also make a valid installation fail its live check.

### Start the MCP server with an explicit key

The environment-variable method is preferred, but the server also accepts a positional key:

```bash
uv run marketdata-mcp-server "your-key-value"
```

Avoid placing that command in shared shell history, logs, workflow files, or documentation containing a real key.
