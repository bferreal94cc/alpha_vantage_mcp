import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "dashboard"


def test_dashboard_is_installable_and_mobile_ready() -> None:
    index = (DASHBOARD / "index.html").read_text(encoding="utf-8")
    manifest = json.loads((DASHBOARD / "manifest.webmanifest").read_text(encoding="utf-8"))
    app = (DASHBOARD / "app.js").read_text(encoding="utf-8")

    assert 'name="viewport"' in index
    assert 'rel="manifest"' in index
    assert 'apple-mobile-web-app-capable' in index
    assert manifest["display"] == "standalone"
    assert manifest["start_url"] == "./"
    assert "serviceWorker.register" in app


def test_browser_bundle_contains_no_credential_or_direct_api_request() -> None:
    browser_files = [
        DASHBOARD / "index.html",
        DASHBOARD / "app.js",
        DASHBOARD / "styles.css",
        DASHBOARD / "sw.js",
        DASHBOARD / "manifest.webmanifest",
    ]

    for path in browser_files:
        content = path.read_text(encoding="utf-8")
        assert "secrets.ALPHA_VANTAGE_API_KEY" not in content
        assert "apikey=" not in content.lower()
        assert "alphavantage.co/query" not in content.lower()


def test_snapshot_generator_uses_secret_environment_and_sanitizes_errors() -> None:
    generator = (DASHBOARD / "generate_snapshot.py").read_text(encoding="utf-8")

    assert 'os.environ.get("ALPHA_VANTAGE_API_KEY")' in generator
    assert "sanitize_error" in generator
    assert "apikey" in generator
    assert "market-snapshot.json" in generator


def test_dashboard_has_required_primary_sections() -> None:
    index = (DASHBOARD / "index.html").read_text(encoding="utf-8")

    for section_id in ("overview", "watchlist", "movers", "news", "settings"):
        assert f'id="{section_id}"' in index


def test_dashboard_workflow_only_deploys_when_explicitly_enabled() -> None:
    workflow = (ROOT / ".github" / "workflows" / "mobile-dashboard.yml").read_text(
        encoding="utf-8"
    )

    assert "vars.DASHBOARD_DEPLOY_ENABLED == 'true'" in workflow
    assert "actions/configure-pages@v6" in workflow
    assert "actions/deploy-pages@v4" in workflow
