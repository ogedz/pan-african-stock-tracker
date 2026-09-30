// src/js/main.js
import StockData from "./StockData.mjs";
import { loadHeaderFooter } from "./utils.mjs";

const stockData = new StockData();

// ============ MARKET SNAPSHOT ============
async function loadMarketSnapshot() {
  const container = document.getElementById("market-snapshot");
  if (!container) return;

  try {
    const ngnData = await stockData.getMarketSnapshot();
    const africanMarkets = await stockData.getAfricanMarkets();

    container.innerHTML = `
      <div class="snapshot-grid">
        <div class="snapshot-card featured">
          <h3>🇳🇬 NGX All-Share</h3>
          <p class="value">${Math.round(ngnData.asi).toLocaleString()}</p>
          <p class="change ${ngnData.asi_change >= 0 ? "positive" : "negative"}">
            ${ngnData.asi_change >= 0 ? "▲" : "▼"} ${ngnData.asi_change.toFixed(2)} (${ngnData.asi_change_percent.toFixed(2)}%)
          </p>
        </div>

        ${africanMarkets
          .map(
            (market) => `
          <div class="snapshot-card">
            <h3>${market.flag} ${market.name}</h3>
            <p class="value">$${market.price.toFixed(2)}</p>
            <p class="change ${market.change >= 0 ? "positive" : "negative"}">
              ${market.change >= 0 ? "▲" : "▼"} ${Math.abs(market.change).toFixed(2)} (${Math.abs(market.changePercent).toFixed(2)}%)
            </p>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="market-stats">
        <div class="stat-item">
          <span class="stat-label">Market Cap:</span>
          <span class="stat-value">₦${(ngnData.market_cap.total / 1e12).toFixed(2)}T</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Volume:</span>
          <span class="stat-value">${(ngnData.volume / 1e6).toFixed(2)}M</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Breadth:</span>
          <span class="stat-value">
            <span class="positive">${ngnData.breadth.advancers}▲</span>
            <span class="negative">${ngnData.breadth.decliners}▼</span>
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Deals:</span>
          <span class="stat-value">${ngnData.deals.toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Securities:</span>
          <span class="stat-value">${ngnData.total_listed_securities}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Failed to load market snapshot:", error);
    container.innerHTML = "<p>Failed to load market data.</p>";
  }
}

// ============ STOCK SEARCH ============
function initSearch() {
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const stockList = document.getElementById("stock-list");

  if (!searchInput || !searchBtn || !stockList) return;

  async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      stockList.innerHTML = "<li>Enter a stock symbol to search.</li>";
      return;
    }

    stockList.innerHTML = "<li>Searching...</li>";

    try {
      const results = await stockData.searchStocks(query);

      if (!results || results.length === 0) {
        stockList.innerHTML = "<li>No stocks found.</li>";
        return;
      }

      stockList.innerHTML = results
        .slice(0, 10)
        .map(
          (stock) => `
        <li class="stock-card">
          <a href="/pages/stock/?symbol=${stock.symbol}">
            <div class="stock-info">
              <h3 class="stock-symbol">${stock.displaySymbol}</h3>
              <p class="stock-name">${stock.description}</p>
              <span class="stock-exchange">${stock.type}</span>
            </div>
          </a>
        </li>
      `
        )
        .join("");
    } catch (error) {
      console.error("Search error:", error);
      stockList.innerHTML = "<li>Error searching stocks.</li>";
    }
  }

  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });

  // Default search
  searchInput.value = "DANGCEM";
  performSearch();
}

// ============ TOP MOVERS ============
async function loadTopMovers() {
  const gainersEl = document.getElementById("top-gainers");
  const losersEl = document.getElementById("top-losers");

  if (!gainersEl || !losersEl) return;

  // Sample African stocks to check
  const symbols = [
    "DANGCEM.NL",
    "MTNN.NL",
    "ZENITHBANK.NL",
    "GTCO.NL",
    "ACCESS.NL",
    "EZA",
    "EGY",
    "MAR",
  ];

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await stockData.getStockQuote(symbol);
          if (!quote.c || quote.c === 0) return null;
          return {
            symbol,
            price: quote.c,
            change: quote.d || 0,
            changePercent: quote.dp || 0,
          };
        } catch {
          return null;
        }
      })
    );

    const valid = results.filter(Boolean);
    const sorted = valid.sort((a, b) => b.changePercent - a.changePercent);

    const gainers = sorted.slice(0, 5);
    const losers = sorted.slice(-5).reverse();

    const renderList = (items) =>
      items
        .map(
          (item) => `
        <li>
          <a href="/pages/stock/?symbol=${item.symbol}">
            <span class="symbol">${item.symbol.replace(".NL", "")}</span>
            <span class="change ${item.changePercent >= 0 ? "positive" : "negative"}">
              ${item.changePercent >= 0 ? "▲" : "▼"} ${Math.abs(item.changePercent).toFixed(2)}%
            </span>
          </a>
        </li>
      `
        )
        .join("");

    gainersEl.innerHTML = gainers.length ? renderList(gainers) : "<li>No data</li>";
    losersEl.innerHTML = losers.length ? renderList(losers) : "<li>No data</li>";
  } catch (error) {
    console.error("Failed to load top movers:", error);
  }
}

// ============ SIDEBAR TOGGLE (Mobile) ============
function initSidebar() {
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  if (!menuToggle || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent background scroll
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  menuToggle.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);

  // Close when a nav link is clicked
  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
}

// ============ THEME TOGGLE ============
function initTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

// ============ USER BUTTON ============
function initUserButton() {
  const userBtn = document.getElementById("user-btn");
  if (!userBtn) return;

  userBtn.addEventListener("click", () => {
    alert("👤 User account — coming soon!\n\nFuture features:\n• Sign in\n• Save portfolio to cloud\n• Sync across devices");
  });
}


async function init() {
  console.log("Pan-African Stock Tracker initialized");

  // Load header/footer FIRST (before anything else that might need the DOM)
  await loadHeaderFooter();

  initSidebar();
  initTheme();
  initUserButton();
  loadMarketSnapshot();
  loadTopMovers();
  initSearch();
}

init();

