# Alpha Vantage Automated Setup Design

## Objective

Make `bferreal94cc/alpha_vantage_mcp` self-installing and continuously verifiable without committing API credentials.

## Selected approach

Use the existing fork as Dakota's owned repository. Add a repository-local bootstrap script and a GitHub Actions workflow that install Python 3.13, install `uv`, synchronize every workspace package from the committed lockfile, verify the MCP and CLI entry points, run tests when present, and optionally perform a live Alpha Vantage quote check when the repository secret `ALPHA_VANTAGE_API_KEY` exists.

## Alternatives considered

1. Duplicate the fork into a second detached repository. Rejected because it creates unnecessary divergence and the connected GitHub integration does not expose repository creation.
2. Rewrite the Python stdio MCP server as a Cloudflare Worker. Rejected for this setup because it changes runtimes, requires Cloudflare credentials and deployment configuration, and duplicates the official remote MCP endpoint.

## Components

- `scripts/setup.sh`: idempotent local/CI bootstrap and static verification.
- `.github/workflows/setup-and-verify.yml`: automated setup on pushes, pull requests, and manual dispatch.
- `docs/AUTOMATED_SETUP.md`: operating instructions, secret configuration, commands, and troubleshooting.

## Security

- Never store the Alpha Vantage API key in tracked files, workflow YAML, logs, or command output.
- Read the key only from `ALPHA_VANTAGE_API_KEY` or GitHub Actions secrets.
- Run a live API check only when the secret exists.

## Verification

The workflow must fail when dependency synchronization, package imports, CLI discovery, MCP command discovery, or repository tests fail. The live quote check is conditional so pull requests and fresh forks remain testable without secrets.
