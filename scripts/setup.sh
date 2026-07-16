#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '[alpha-vantage-setup] %s\n' "$*"
}

if ! command -v uv >/dev/null 2>&1; then
  log "uv was not found; installing it with the official installer"
  if command -v curl >/dev/null 2>&1; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m pip install --user uv
  else
    printf 'Error: install curl or Python 3 before running this setup.\n' >&2
    exit 1
  fi
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi

log "Installing/selecting Python 3.13"
uv python install 3.13

log "Synchronizing all locked workspace packages and dependency groups"
uv sync --frozen --all-packages --all-groups

log "Verifying workspace package imports"
uv run python - <<'PY'
import av_api
import av_cli
import av_mcp

print("Imported av_api, av_cli, and av_mcp successfully")
PY

log "Verifying MCP and CLI entry points"
uv run marketdata-mcp-server --help >/dev/null
uv run marketdata-cli --help >/dev/null

if [[ "${RUN_LIVE_CHECK:-auto}" != "never" && -n "${ALPHA_VANTAGE_API_KEY:-}" ]]; then
  log "Running a live Alpha Vantage quote check"
  live_output="$(mktemp)"
  trap 'rm -f "$live_output"' EXIT
  uv run marketdata-cli global_quote IBM >"$live_output"
  test -s "$live_output"
  rm -f "$live_output"
  trap - EXIT
  log "Live quote check passed"
else
  log "Live quote check skipped; set ALPHA_VANTAGE_API_KEY to enable it"
fi

log "Setup and verification completed successfully"
