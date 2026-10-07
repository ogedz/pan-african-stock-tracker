import {
  getStocks,
  getIndices,
  getTopGainers,
  getTopLosers,
  getDataSourceStatus,
} from "./StockData.mjs";
import { searchStocks, listExchanges } from "./Search.mjs";
import { formatPercent, loadHeaderFooter, qs, animateAllIn } from "./utils.mjs";
import { convertStockPrices, currencySymbol } from "./Currency.mjs";

loadHeaderFooter();

const snapshotGrid = qs("#snapshotGrid");
const searchInput = qs("#searchInput");
const exchangeFilter = qs("#exchangeFilter");
const searchSection = qs("#searchResultsSection");
const searchResultsList = qs("#searchResultsList");
const gainersLosersSection = qs("#gainersLosersSection");
const gainersList = qs("#gainersList");
const losersList = qs("#losersList");

function indexCardTemplate(index) {
  const dir = index.changePercent >= 0 ? "up" : "down";
  return `
    <div class="snapshot-card fade-in">
      <div class="exchange">${index.exchange}</div>
      <div class="index-name">${index.name}</div>
      <div class="value mono" data-animate="${index.value}" data-decimals="2">0.00</div>
      <div class="${dir}">${formatPercent(index.changePercent)}</div>
    </div>
  `;
}

// Expects stocks already enriched by convertStockPrices (displayPrice,
// displayChange, displayCurrency present).
function stockCardTemplate(stock) {
  const dir = stock.changePercent >= 0 ? "up" : "down";
  const symbol = currencySymbol(stock.displayCurrency);
  return `
    <li class="stock-card fade-in">
      <a href="/stock/index.html?symbol=${stock.symbol}">
        <div class="symbol">${stock.symbol}</div>
        <div class="name">${stock.name} &middot; ${stock.exchange}</div>
        <div class="price-row">
          <span class="mono" data-animate="${stock.displayPrice}" data-decimals="2" data-prefix="${symbol}">${symbol}0.00</span>
          <span class="${dir}">${formatPercent(stock.changePercent)}</span>
        </div>
      </a>
    </li>
  `;
}

function renderDataSourceBadge() {
  const status = getDataSourceStatus();
  let existing = qs("#dataSourceBadge");
  if (!existing) {
    existing = document.createElement("p");
    existing.id = "dataSourceBadge";
    existing.className = "data-source-badge";
    const section = qs("#snapshotSection");
    if (section)
      section.insertBefore(existing, section.firstChild?.nextSibling || null);
    // place after h2
    const h2 = section?.querySelector("h2");
    if (h2) h2.insertAdjacentElement("afterend", existing);
  }
  const stocksLive = status.stocks === "live";
  const indicesLive = status.indices === "live";
  if (stocksLive || indicesLive) {
    existing.innerHTML = "<span class=\"badge-live\">Live data</span> — prices refreshed from API (cached up to 2 min).";
    existing.classList.remove("is-sample");
  } else {
    const reasons = [status.ngnError, status.finnhubError]
      .filter(Boolean)
      .join(" · ");
    existing.innerHTML = `<span class="badge-sample">Sample data</span> — API keys missing or rejected. ${reasons ? `<span class="badge-detail">${reasons}</span>` : "Add valid keys to <code>.env</code> and restart."}`;
    existing.classList.add("is-sample");
  }
}

async function renderSnapshot() {
  try {
    const indices = await getIndices();
    snapshotGrid.innerHTML = indices.map(indexCardTemplate).join("");
    animateAllIn(snapshotGrid);
    renderDataSourceBadge();
  } catch (error) {
    console.error("Failed to load market snapshot:", error);
    snapshotGrid.innerHTML = "<p>Unable to load market snapshot right now.</p>";
  }
}

async function renderGainersLosers() {
  try {
    const [gainers, losers] = await Promise.all([
      getTopGainers(5),
      getTopLosers(5),
    ]);
    const [gainersDisplay, losersDisplay] = await Promise.all([
      convertStockPrices(gainers),
      convertStockPrices(losers),
    ]);
    gainersList.innerHTML = gainersDisplay.map(stockCardTemplate).join("");
    losersList.innerHTML = losersDisplay.map(stockCardTemplate).join("");
    animateAllIn(gainersList);
    animateAllIn(losersList);
  } catch (error) {
    console.error("Failed to load gainers/losers:", error);
  }
}

async function populateExchangeFilter() {
  const stocks = await getStocks();
  const exchanges = listExchanges(stocks);
  exchangeFilter.innerHTML =
    "<option value=\"ALL\">All exchanges</option>" +
    exchanges.map((ex) => `<option value="${ex}">${ex}</option>`).join("");
}

async function runSearch() {
  const query = searchInput.value.trim();
  const exchange = exchangeFilter.value;

  if (!query && exchange === "ALL") {
    searchSection.hidden = true;
    gainersLosersSection.hidden = false;
    return;
  }

  const stocks = await getStocks();
  const results = searchStocks(stocks, query, exchange);
  const resultsDisplay = await convertStockPrices(results);

  gainersLosersSection.hidden = true;
  searchSection.hidden = false;
  searchResultsList.innerHTML = resultsDisplay.length
    ? resultsDisplay.map(stockCardTemplate).join("")
    : `<li class="empty-state">No stocks match "${query || exchange}".</li>`;
  animateAllIn(searchResultsList);
}

let searchTimeout;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(runSearch, 200);
});
exchangeFilter.addEventListener("change", runSearch);

window.addEventListener("currencychange", () => {
  renderGainersLosers();
  if (!searchSection.hidden) runSearch();
});

renderSnapshot();
renderGainersLosers();
populateExchangeFilter();
