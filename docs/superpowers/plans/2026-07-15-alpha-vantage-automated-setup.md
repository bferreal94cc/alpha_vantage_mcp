# Alpha Vantage Automated Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, repeatable installation and verification path for the complete Alpha Vantage MCP workspace.

**Architecture:** A single idempotent shell script owns local dependency setup and command verification. GitHub Actions invokes the same repository requirements in a clean Ubuntu runner, runs available tests, and conditionally checks a live quote with a repository secret.

**Tech Stack:** Python 3.13, uv workspace, Bash, GitHub Actions, Alpha Vantage MCP/CLI.

## Global Constraints

- Use Python 3.13 because the MCP and agent packages require `>=3.13`.
- Use the committed `uv.lock` with `--frozen`.
- Synchronize all workspace packages and dependency groups.
- Never commit or print `ALPHA_VANTAGE_API_KEY`.
- The setup must pass without an API key; only the live data check may be skipped.

---

### Task 1: Bootstrap script

**Files:**
- Create: `scripts/setup.sh`

**Interfaces:**
- Consumes: repository root `pyproject.toml` and `uv.lock`.
- Produces: installed `.venv`, synchronized workspace packages, verified `marketdata-mcp-server` and `marketdata-cli` entry points.

- [ ] Create an idempotent Bash script with strict error handling.
- [ ] Install `uv` only when it is absent.
- [ ] Install/select Python 3.13 and run `uv sync --frozen --all-packages --all-groups`.
- [ ] Verify package imports and both command help screens.
- [ ] Perform `global_quote IBM` only when `ALPHA_VANTAGE_API_KEY` is present.

### Task 2: Continuous setup verification

**Files:**
- Create: `.github/workflows/setup-and-verify.yml`

**Interfaces:**
- Consumes: source tree, lockfile, optional `secrets.ALPHA_VANTAGE_API_KEY`.
- Produces: GitHub Actions status for setup, imports, commands, tests, and optional live quote.

- [ ] Configure push, pull request, and manual triggers.
- [ ] Use checkout, Python 3.13, and `astral-sh/setup-uv` with caching.
- [ ] Synchronize from the lockfile.
- [ ] Verify imports and commands.
- [ ] Run pytest only when test files exist.
- [ ] Run the live quote only when the secret is configured.

### Task 3: Operator documentation

**Files:**
- Create: `docs/AUTOMATED_SETUP.md`

**Interfaces:**
- Consumes: bootstrap script and workflow behavior.
- Produces: exact local commands, GitHub secret name, run instructions, and troubleshooting steps.

- [ ] Document one-command local setup.
- [ ] Document `ALPHA_VANTAGE_API_KEY` configuration without exposing its value.
- [ ] Document local MCP and CLI startup commands.
- [ ] Document workflow behavior and expected skipped live-check state.

### Task 4: Review and integration

**Files:**
- Review all files created by Tasks 1-3.

- [ ] Open a pull request from `automation/alpha-vantage-setup` to `main`.
- [ ] Verify workflow runs for the pull request head commit.
- [ ] Merge only after required setup checks succeed, or clearly report if repository Actions require manual enablement or the API-key secret is absent.
