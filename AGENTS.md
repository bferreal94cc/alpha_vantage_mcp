# Agent Instructions

## Market-data source policy

For every market-related request, use the Alpha Vantage MCP tools as the primary data source before forming conclusions.

- Use `GLOBAL_QUOTE`, `REALTIME_BULK_QUOTES`, or `TIME_SERIES_INTRADAY` for equity prices and volume.
- Use `REALTIME_OPTIONS`, `REALTIME_OPTIONS_FMV`, put/call-ratio, and volume/open-interest tools for options analysis.
- Use the named indicator tools such as `RSI`, `MACD`, `VWAP`, `BBANDS`, and `ATR` rather than calculating from remembered prices.
- Use Alpha Vantage fundamentals, earnings, institutional holdings, insider transactions, macroeconomic, index, commodity, forex, crypto, and market-news tools when those datasets are relevant.
- Verify timestamps, session status, interval, adjustment setting, and data entitlement before describing data as current or realtime.
- Clearly identify delayed, end-of-day, historical, incomplete, throttled, or unavailable data.
- Never substitute model memory for a requested market quote, option chain, technical reading, or current market statistic.
- Use external sources only to supplement information not covered by Alpha Vantage, and keep Alpha Vantage as the numerical market-data source whenever its endpoint applies.

## Credential safety

Read the API key only from `ALPHA_VANTAGE_API_KEY` or an approved secret store. Never commit, print, log, or place a real key in commands saved to repository files.
