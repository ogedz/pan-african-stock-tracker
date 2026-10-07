import { getStocks } from "./StockData.mjs";
import { getWatchlist, removeFromWatchlist } from "./Watchlist.mjs";
import {
  formatPercent,
  loadHeaderFooter,
  qs,
  animateAllIn,
  renderBreadcrumb,
} from "./utils.mjs";
import { convertStockPrices, currencySymbol } from "./Currency.mjs";
import { showToast } from "./Toast.mjs";

renderBreadcrumb([
  { label: "Home", href: "/index.html" },
  { label: "Watchlist" },
]);

loadHeaderFooter();

const list = qs("#watchlistItems");

async function render() {
  const watched = getWatchlist();

  if (watched.length === 0) {
    list.innerHTML = `
      <li class="empty-state" style="grid-column: 1 / -1">
        <p>Your watchlist is empty.</p>
        <a class="btn btn-primary" href="/index.html">Search for a stock</a>
      </li>
    `;
    return;
  }

  const stocks = await getStocks();
  const matched = watched
    .map((w) => stocks.find((s) => s.symbol === w.symbol))
    .filter(Boolean);
  const display = await convertStockPrices(matched);

  list.innerHTML = display
    .map((stock) => {
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
          <button class="btn btn-secondary remove-btn" data-symbol="${stock.symbol}" style="margin-top:.6rem; width:100%">Remove</button>
        </li>
      `;
    })
    .join("");

  animateAllIn(list);

  list.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromWatchlist(btn.dataset.symbol);
      showToast(`Removed ${btn.dataset.symbol} from watchlist.`, "info");
      render();
    });
  });
}

window.addEventListener("currencychange", render);

render();
