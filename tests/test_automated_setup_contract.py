from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_bootstrap_script_is_secure_and_reproducible() -> None:
    script = (ROOT / "scripts" / "setup.sh").read_text(encoding="utf-8")

    assert "set -Eeuo pipefail" in script
    assert "uv sync --frozen --all-packages --all-groups" in script
    assert "uv run marketdata-mcp-server --help" in script
    assert "uv run marketdata-cli --help" in script
    assert "ALPHA_VANTAGE_API_KEY" in script
    assert "YOUR_API_KEY" not in script


def test_github_workflow_uses_python_313_and_secret_backed_live_check() -> None:
    workflow = (ROOT / ".github" / "workflows" / "setup-and-verify.yml").read_text(
        encoding="utf-8"
    )

    assert 'python-version: "3.13"' in workflow
    assert "astral-sh/setup-uv@" in workflow
    assert "uv sync --frozen --all-packages --all-groups" in workflow
    assert "secrets.ALPHA_VANTAGE_API_KEY" in workflow
    assert "marketdata-cli global_quote IBM" in workflow


def test_operator_documentation_names_required_secret() -> None:
    documentation = (ROOT / "docs" / "AUTOMATED_SETUP.md").read_text(
        encoding="utf-8"
    )

    assert "ALPHA_VANTAGE_API_KEY" in documentation
    assert "./scripts/setup.sh" in documentation
    assert "marketdata-mcp-server" in documentation
