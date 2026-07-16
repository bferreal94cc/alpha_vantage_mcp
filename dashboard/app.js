const SNAPSHOT_URL = "data/market-snapshot.json";
const WATCHLIST = ["SPY", "QQQ", "XSP", "ONDS", "AAPL", "NVDA", "AMD", "TSLA"];

const elements = {
  statusDot: document.querySelector("#status-dot"),
  marketStatus: document.querySelector("#market-status"),
  heroTitle: document.querySelector("#hero-title"),
  heroMessage: document.querySelector("#hero-message"),
  lastUpdated: document.querySelector("#last-updated"),
  feedHealth: document.querySelector("#feed-health"),
  feedDetail: document.querySelector("#feed-detail"),
  coverageCount: document.querySelector("#coverage-count"),
  freshnessValue: document.querySelector("#freshness-value"),
  freshnessDetail: document.querySelector("#freshness-detail"),
  noticeCount: document.querySelector("#notice-count"),
  quoteGrid: document.querySelector("#quote-grid"),
  gainersList: document.querySelector("#gainers-list"),
  losersList: document.querySelector("#losers-list"),
  moversNote: document.querySelector("#movers-note"),
  newsList: document.querySelector("#news-list"),
  noticePanel: document.querySelector("#notice-panel"),
  noticeList: document.querySelector("#notice-list"),
  refreshButton: document.querySelector("#refresh-button"),
  installButton: document.querySelector("#install-button"),
  installGuideButton: document.querySelector("#install-guide-button"),
  installSheet: document.querySelector("#install-sheet"),
  themeButton: document.querySelector("#theme-button"),
  copyNoticesButton: document.querySelector("#copy-notices-button"),
  quoteTemplate: document.querySelector("#quote-card-template"),
  toast: document.querySelector("#toast"),
};

let deferredInstallPrompt = null;
let currentNotices = [];
let toastTimer = null;

function cleanNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[$,%+,]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value) {
  const number = cleanNumber(value);
  if (number === null) return "—";
  const digits = Math.abs(number) < 10 ? 3 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

function formatCompact(value) {
  const number = cleanNumber(value);
  if (number === null) return "Volume —";
  return `Vol ${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number)}`;
}

function formatPercent(value) {
  const number = cleanNumber(value);
  if (number === null) return "—";
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function formatSnapshotTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function ageInMinutes(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2400);
}

function normalizedQuote(raw = {}, fallbackSymbol = "") {
  const symbol = raw.symbol || raw.ticker || raw["01. symbol"] || fallbackSymbol;
  const changePercent =
    raw.change_percent ??
    raw.changePercentage ??
    raw.percent_change ??
    raw["10. change percent"] ??
    raw["change percentage"];

  return {
    symbol,
    name: raw.name || raw.company_name || raw.description || "Tracked symbol",
    price: raw.price ?? raw.close ?? raw.last ?? raw["05. price"],
    change: raw.change ?? raw["09. change"],
    changePercent,
    volume: raw.volume ?? raw["06. volume"],
    timestamp:
      raw.timestamp || raw.latest_trading_day || raw["07. latest trading day"] || raw.last_updated,
    available: raw.available !== false && cleanNumber(raw.price ?? raw.close ?? raw.last ?? raw["05. price"]) !== null,
  };
}

function renderQuotes(rawQuotes = []) {
  const bySymbol = new Map(
    rawQuotes.map((raw) => {
      const quote = normalizedQuote(raw);
      return [String(quote.symbol).toUpperCase(), quote];
    })
  );

  elements.quoteGrid.replaceChildren();
  let availableCount = 0;

  WATCHLIST.forEach((symbol) => {
    const quote = bySymbol.get(symbol) || normalizedQuote({ available: false }, symbol);
    const card = elements.quoteTemplate.content.firstElementChild.cloneNode(true);
    const percent = cleanNumber(quote.changePercent);

    card.querySelector(".quote-symbol").textContent = quote.symbol;
    card.querySelector(".quote-name").textContent = quote.name;
    card.querySelector(".quote-price").textContent = formatPrice(quote.price);
    card.querySelector(".quote-volume").textContent = formatCompact(quote.volume);
    card.querySelector(".quote-time").textContent = quote.timestamp ? String(quote.timestamp) : "Awaiting feed";

    const change = card.querySelector(".quote-change");
    change.textContent = formatPercent(quote.changePercent);
    if (percent !== null) change.classList.add(percent >= 0 ? "positive" : "negative");

    if (!quote.available) {
      card.classList.add("unavailable");
      card.querySelector(".quote-name").textContent = "No current quote";
    } else {
      availableCount += 1;
    }

    elements.quoteGrid.append(card);
  });

  elements.coverageCount.textContent = `${availableCount} / ${WATCHLIST.length}`;
  return availableCount;
}

function renderRankedList(container, items = [], direction) {
  container.replaceChildren();
  const visible = items.slice(0, 5);

  if (!visible.length) {
    container.innerHTML = '<div class="empty-state">No mover data in this snapshot.</div>';
    return;
  }

  visible.forEach((item, index) => {
    const symbol = item.ticker || item.symbol || "—";
    const price = item.price || item.last || item.close;
    const percent = item.change_percentage || item.change_percent || item.percent_change;
    const row = document.createElement("div");
    row.className = "rank-row";
    row.innerHTML = `
      <span class="rank-number">${String(index + 1).padStart(2, "0")}</span>
      <span><span class="rank-symbol">${escapeHtml(symbol)}</span><small class="rank-detail">${escapeHtml(formatPrice(price))}</small></span>
      <span class="rank-change ${direction}">${escapeHtml(formatPercent(percent))}</span>
    `;
    container.append(row);
  });
}

function sentimentClass(label = "") {
  const normalized = label.toLowerCase();
  if (normalized.includes("bull") || normalized.includes("positive")) return "positive";
  if (normalized.includes("bear") || normalized.includes("negative")) return "negative";
  return "";
}

function renderNews(items = []) {
  elements.newsList.replaceChildren();

  if (!items.length) {
    elements.newsList.innerHTML = '<div class="empty-state">News refresh is unavailable or has not run yet.</div>';
    return;
  }

  items.slice(0, 8).forEach((item) => {
    const article = document.createElement(item.url ? "a" : "article");
    article.className = "news-card";
    if (item.url) {
      article.href = item.url;
      article.target = "_blank";
      article.rel = "noopener noreferrer";
    }

    const sentiment = item.overall_sentiment_label || item.sentiment || "Unrated";
    article.innerHTML = `
      <div>
        <div class="news-meta"><span>${escapeHtml(item.source || "Market source")}</span><span>•</span><span>${escapeHtml(item.time_published || item.published_at || "Latest")}</span></div>
        <h3>${escapeHtml(item.title || "Untitled market update")}</h3>
        <p>${escapeHtml(item.summary || "Open the source for the complete update.")}</p>
      </div>
      <span class="sentiment-chip ${sentimentClass(sentiment)}">${escapeHtml(sentiment)}</span>
    `;
    elements.newsList.append(article);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderNotices(notices = []) {
  currentNotices = notices.filter(Boolean).map(String);
  elements.noticeCount.textContent = String(currentNotices.length);
  elements.noticePanel.hidden = currentNotices.length === 0;
  elements.noticeList.replaceChildren();

  currentNotices.forEach((notice) => {
    const item = document.createElement("li");
    item.textContent = notice;
    elements.noticeList.append(item);
  });
}

function renderHealth(snapshot, coverage) {
  const age = ageInMinutes(snapshot.generated_at);
  const status = snapshot.status || (snapshot.errors?.length ? "partial" : "healthy");
  const hasData = coverage > 0;

  elements.statusDot.classList.remove("healthy", "error");
  elements.lastUpdated.textContent = formatSnapshotTime(snapshot.generated_at);

  if (status === "setup_required") {
    elements.marketStatus.textContent = "GitHub data secret required";
    elements.heroTitle.textContent = "Dashboard installed — connect the feed next";
    elements.heroMessage.textContent = "Add ALPHA_VANTAGE_API_KEY to GitHub Actions secrets. The browser never receives the key.";
    elements.feedHealth.textContent = "Setup needed";
    elements.feedDetail.textContent = "Static shell is ready";
    elements.statusDot.classList.add("error");
  } else if (hasData && status === "healthy") {
    elements.marketStatus.textContent = snapshot.market_status?.label || "Feed snapshot available";
    elements.heroTitle.textContent = "Market data is connected";
    elements.heroMessage.textContent = "Review timestamps before trading. The dashboard does not describe snapshots as live unless the feed confirms it.";
    elements.feedHealth.textContent = "Connected";
    elements.feedDetail.textContent = snapshot.source || "Alpha Vantage";
    elements.statusDot.classList.add("healthy");
  } else if (hasData) {
    elements.marketStatus.textContent = snapshot.market_status?.label || "Partial market snapshot";
    elements.heroTitle.textContent = "Core data loaded with feed notices";
    elements.heroMessage.textContent = "Available cards remain visible while quota, entitlement, or endpoint errors are listed below.";
    elements.feedHealth.textContent = "Partial";
    elements.feedDetail.textContent = "Review feed notices";
  } else {
    elements.marketStatus.textContent = "Market feed unavailable";
    elements.heroTitle.textContent = "No current quotes in this snapshot";
    elements.heroMessage.textContent = "The dashboard is working, but Alpha Vantage did not return usable quote data. Review the feed notices.";
    elements.feedHealth.textContent = "Unavailable";
    elements.feedDetail.textContent = "Snapshot contains no quotes";
    elements.statusDot.classList.add("error");
  }

  if (age === null) {
    elements.freshnessValue.textContent = "Unknown";
    elements.freshnessDetail.textContent = "No valid timestamp";
  } else if (age < 2) {
    elements.freshnessValue.textContent = "Just now";
    elements.freshnessDetail.textContent = "Generated moments ago";
  } else if (age < 60) {
    elements.freshnessValue.textContent = `${age} min`;
    elements.freshnessDetail.textContent = "Snapshot age";
  } else {
    const hours = Math.floor(age / 60);
    elements.freshnessValue.textContent = `${hours}h ${age % 60}m`;
    elements.freshnessDetail.textContent = age > 180 ? "Stale for intraday use" : "Snapshot age";
  }
}

function renderSnapshot(snapshot) {
  const coverage = renderQuotes(snapshot.quotes || []);
  renderRankedList(elements.gainersList, snapshot.movers?.gainers || [], "positive");
  renderRankedList(elements.losersList, snapshot.movers?.losers || [], "negative");
  renderNews(snapshot.news || []);

  const notices = [
    ...(snapshot.errors || []),
    ...(snapshot.notices || []),
  ];
  renderNotices(notices);
  renderHealth(snapshot, coverage);
  elements.moversNote.textContent = snapshot.movers?.generated_at
    ? formatSnapshotTime(snapshot.movers.generated_at)
    : "Latest snapshot";
}

async function loadSnapshot({ announce = false } = {}) {
  elements.refreshButton.classList.add("spinning");
  try {
    const response = await fetch(`${SNAPSHOT_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Snapshot request failed with HTTP ${response.status}`);
    const snapshot = await response.json();
    renderSnapshot(snapshot);
    if (announce) showToast("Dashboard snapshot refreshed");
  } catch (error) {
    renderSnapshot({
      status: "error",
      generated_at: null,
      quotes: [],
      movers: {},
      news: [],
      errors: [error instanceof Error ? error.message : String(error)],
    });
    if (announce) showToast("Could not refresh the snapshot");
  } finally {
    elements.refreshButton.classList.remove("spinning");
  }
}

function openInstallGuide() {
  if (typeof elements.installSheet.showModal === "function") {
    elements.installSheet.showModal();
  } else {
    showToast("Safari: Share → Add to Home Screen");
  }
}

async function handleInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return;
  }
  openInstallGuide();
}

function setTheme(mode) {
  if (mode === "system") {
    document.documentElement.dataset.theme = "system";
    elements.themeButton.textContent = "Use dark theme";
  } else {
    delete document.documentElement.dataset.theme;
    elements.themeButton.textContent = "Use device theme";
  }
  localStorage.setItem("alpha-edge-theme", mode);
}

function initializeNavigation() {
  const links = [...document.querySelectorAll("[data-nav]")];
  const sections = links
    .map((link) => document.querySelector(`#${link.dataset.nav}`))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.classList.toggle("active", link.dataset.nav === visible.target.id));
    },
    { rootMargin: "-30% 0px -55%", threshold: [0.08, 0.3, 0.6] }
  );

  sections.forEach((section) => observer.observe(section));
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.hidden = false;
});

window.addEventListener("appinstalled", () => showToast("Alpha Edge added to your home screen"));
window.addEventListener("online", () => showToast("Connection restored"));
window.addEventListener("offline", () => showToast("Offline shell active — showing the last cached view"));

elements.refreshButton.addEventListener("click", () => loadSnapshot({ announce: true }));
elements.installButton.addEventListener("click", handleInstall);
elements.installGuideButton.addEventListener("click", openInstallGuide);
elements.themeButton.addEventListener("click", () => {
  const current = localStorage.getItem("alpha-edge-theme") || "dark";
  setTheme(current === "dark" ? "system" : "dark");
});
elements.copyNoticesButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentNotices.join("\n"));
    showToast("Feed notices copied");
  } catch {
    showToast("Copy is unavailable in this browser");
  }
});

setTheme(localStorage.getItem("alpha-edge-theme") || "dark");
initializeNavigation();
loadSnapshot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      showToast("Offline mode could not be registered");
    });
  });
}
