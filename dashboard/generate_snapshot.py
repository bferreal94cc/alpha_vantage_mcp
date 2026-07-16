#!/usr/bin/env python3
"""Generate a browser-safe Alpha Vantage snapshot for the static PWA."""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_URL = "https://www.alphavantage.co/query"
OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "market-snapshot.json"
WATCHLIST = tuple(
    symbol.strip().upper()
    for symbol in os.environ.get(
        "DASHBOARD_WATCHLIST", "SPY,QQQ,XSP,ONDS,AAPL,NVDA,AMD,TSLA"
    ).split(",")
    if symbol.strip()
)
FREE_FALLBACK_SYMBOLS = tuple(
    symbol.strip().upper()
    for symbol in os.environ.get("DASHBOARD_FREE_SYMBOLS", "SPY,QQQ,XSP,ONDS").split(",")
    if symbol.strip()
)[:4]
FREE_REFRESH_HOURS_UTC = {13, 17, 21}


class FeedError(RuntimeError):
    """A safe-to-display Alpha Vantage request error."""


def is_true(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def sanitize_error(value: Any, api_key: str = "") -> str:
    """Remove credentials, query strings, and unnecessary whitespace from errors."""
    text = re.sub(r"\s+", " ", str(value)).strip()
    if api_key:
        text = text.replace(api_key, "[redacted]")
    text = re.sub(r"([?&]apikey=)[^&\s]+", r"\1[redacted]", text, flags=re.IGNORECASE)
    text = re.sub(r"https://www\.alphavantage\.co/query\?[^\s]+", "Alpha Vantage request", text)
    return text[:500] or "Unknown Alpha Vantage error"


def call_api(api_key: str, function: str, **params: Any) -> dict[str, Any]:
    query = {"function": function, **params, "apikey": api_key}
    request = Request(
        f"{API_URL}?{urlencode(query)}",
        headers={"User-Agent": "alpha-edge-dashboard/1.0"},
    )

    try:
        with urlopen(request, timeout=30) as response:  # noqa: S310 - fixed trusted host
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise FeedError(f"{function}: {sanitize_error(exc, api_key)}") from exc

    if not isinstance(payload, dict):
        raise FeedError(f"{function}: unexpected response format")

    error_value = payload.get("Error Message") or payload.get("Note")
    information = payload.get("Information")
    has_usable_data = any(
        key in payload
        for key in (
            "data",
            "Global Quote",
            "markets",
            "top_gainers",
            "top_losers",
            "feed",
        )
    )

    if error_value:
        raise FeedError(f"{function}: {sanitize_error(error_value, api_key)}")
    if information and not has_usable_data:
        raise FeedError(f"{function}: {sanitize_error(information, api_key)}")

    return payload


def normalize_global_quote(payload: dict[str, Any]) -> dict[str, Any] | None:
    raw = payload.get("Global Quote")
    if not isinstance(raw, dict) or not raw:
        return None
    return {
        "symbol": raw.get("01. symbol"),
        "price": raw.get("05. price"),
        "change": raw.get("09. change"),
        "change_percent": raw.get("10. change percent"),
        "volume": raw.get("06. volume"),
        "timestamp": raw.get("07. latest trading day"),
        "available": True,
    }


def normalize_bulk_quotes(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    if not isinstance(data, list):
        return []

    quotes: list[dict[str, Any]] = []
    for raw in data:
        if not isinstance(raw, dict) or not raw.get("symbol"):
            continue
        quotes.append(
            {
                "symbol": raw.get("symbol"),
                "price": raw.get("close") or raw.get("price"),
                "change": raw.get("change"),
                "change_percent": raw.get("change_percent"),
                "volume": raw.get("volume"),
                "timestamp": raw.get("timestamp"),
                "open": raw.get("open"),
                "high": raw.get("high"),
                "low": raw.get("low"),
                "previous_close": raw.get("previous_close"),
                "extended_hours_quote": raw.get("extended_hours_quote"),
                "available": True,
            }
        )
    return quotes


def normalize_market_status(payload: dict[str, Any]) -> dict[str, Any]:
    markets = payload.get("markets")
    if not isinstance(markets, list):
        return {"label": "Market status unavailable"}

    preferred = None
    for market in markets:
        if not isinstance(market, dict):
            continue
        market_type = str(market.get("market_type", "")).lower()
        region = str(market.get("region", "")).lower()
        if market_type == "equity" and "united states" in region:
            preferred = market
            break
    preferred = preferred or next((item for item in markets if isinstance(item, dict)), {})
    current = str(preferred.get("current_status", "unknown")).strip().lower()
    label = f"US equities {current}" if current != "unknown" else "Market status unavailable"
    return {
        "label": label,
        "current_status": current,
        "local_open": preferred.get("local_open"),
        "local_close": preferred.get("local_close"),
        "primary_exchanges": preferred.get("primary_exchanges"),
        "notes": preferred.get("notes"),
    }


def normalize_movers(payload: dict[str, Any], generated_at: str) -> dict[str, Any]:
    return {
        "generated_at": payload.get("last_updated") or generated_at,
        "gainers": payload.get("top_gainers") if isinstance(payload.get("top_gainers"), list) else [],
        "losers": payload.get("top_losers") if isinstance(payload.get("top_losers"), list) else [],
        "most_active": payload.get("most_actively_traded")
        if isinstance(payload.get("most_actively_traded"), list)
        else [],
    }


def normalize_news(payload: dict[str, Any]) -> list[dict[str, Any]]:
    feed = payload.get("feed")
    if not isinstance(feed, list):
        return []

    articles: list[dict[str, Any]] = []
    for item in feed[:12]:
        if not isinstance(item, dict):
            continue
        articles.append(
            {
                "title": item.get("title"),
                "url": item.get("url"),
                "summary": item.get("summary"),
                "source": item.get("source"),
                "time_published": item.get("time_published"),
                "overall_sentiment_score": item.get("overall_sentiment_score"),
                "overall_sentiment_label": item.get("overall_sentiment_label"),
                "ticker_sentiment": item.get("ticker_sentiment", []),
            }
        )
    return articles


def load_previous() -> dict[str, Any]:
    try:
        data = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def write_snapshot(snapshot: dict[str, Any]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(snapshot, indent=2, sort_keys=False) + "\n"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=OUTPUT_PATH.parent, delete=False
    ) as handle:
        handle.write(serialized)
        temp_path = Path(handle.name)
    temp_path.replace(OUTPUT_PATH)


def should_refresh_now(premium_mode: bool) -> bool:
    if os.environ.get("GITHUB_EVENT_NAME") != "schedule":
        return True
    if premium_mode:
        return True
    return datetime.now(timezone.utc).hour in FREE_REFRESH_HOURS_UTC


def generate_snapshot(api_key: str, premium_mode: bool) -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc).isoformat()
    previous = load_previous()
    errors: list[str] = []
    notices: list[str] = []

    quotes: list[dict[str, Any]] = []
    try:
        bulk_payload = call_api(
            api_key,
            "REALTIME_BULK_QUOTES",
            symbol=",".join(WATCHLIST),
        )
        quotes = normalize_bulk_quotes(bulk_payload)
        if bulk_payload.get("message"):
            notices.append(sanitize_error(bulk_payload["message"], api_key))
    except FeedError as exc:
        errors.append(sanitize_error(exc, api_key))

    if not quotes:
        notices.append(
            "Realtime bulk quotes were unavailable; using quota-conscious GLOBAL_QUOTE fallbacks for the four priority symbols."
        )
        for symbol in FREE_FALLBACK_SYMBOLS:
            try:
                quote = normalize_global_quote(call_api(api_key, "GLOBAL_QUOTE", symbol=symbol))
                if quote:
                    quotes.append(quote)
            except FeedError as exc:
                errors.append(sanitize_error(exc, api_key))

    market_status = previous.get("market_status", {"label": "Market status unavailable"})
    try:
        market_status = normalize_market_status(call_api(api_key, "MARKET_STATUS"))
    except FeedError as exc:
        errors.append(sanitize_error(exc, api_key))

    movers = previous.get("movers", {"generated_at": None, "gainers": [], "losers": []})
    try:
        movers = normalize_movers(call_api(api_key, "TOP_GAINERS_LOSERS"), generated_at)
    except FeedError as exc:
        errors.append(sanitize_error(exc, api_key))

    news = previous.get("news", [])
    try:
        news = normalize_news(
            call_api(
                api_key,
                "NEWS_SENTIMENT",
                tickers=",".join(FREE_FALLBACK_SYMBOLS),
                sort="LATEST",
                limit=12,
            )
        )
    except FeedError as exc:
        errors.append(sanitize_error(exc, api_key))

    status = "healthy" if quotes and not errors else "partial" if quotes else "error"
    if not premium_mode:
        notices.append(
            "Free-tier mode limits scheduled refreshes to 13:00, 17:00, and 21:00 UTC on weekdays to control the 25-request daily quota."
        )

    return {
        "schema_version": 1,
        "status": status,
        "source": "Alpha Vantage",
        "generated_at": generated_at,
        "market_status": market_status,
        "quotes": quotes,
        "movers": movers,
        "news": news,
        "notices": notices,
        "errors": errors,
    }


def main() -> int:
    api_key = os.environ.get("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        print("ALPHA_VANTAGE_API_KEY is not configured; keeping the setup snapshot.")
        return 0

    premium_mode = is_true(os.environ.get("DASHBOARD_PREMIUM_MODE"))
    if not should_refresh_now(premium_mode):
        print("Skipping this hourly run to remain within the configured free-tier request budget.")
        return 0

    try:
        snapshot = generate_snapshot(api_key, premium_mode)
        write_snapshot(snapshot)
    except Exception as exc:  # Keep key material out of CI output on unexpected failures.
        print(f"Snapshot generation failed: {sanitize_error(exc, api_key)}", file=sys.stderr)
        return 1

    print(
        "Snapshot generated: "
        f"{len(snapshot['quotes'])} quotes, "
        f"{len(snapshot['news'])} news items, "
        f"{len(snapshot['errors'])} feed notices."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
