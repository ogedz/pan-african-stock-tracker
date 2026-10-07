import { findBySymbol } from "./StockData.mjs";
import { renderLineChart } from "./Charts.mjs";
import {
  addToWatchlist,
  removeFromWatchlist,
  isWatched,
} from "./Watchlist.mjs";
import { addHolding } from "./Portfolio.mjs";
import { addAlert } from "./Alerts.mjs";
import {
  getParam,
  formatNumber,
  loadHeaderFooter,
  qs,
  animateAllIn,
} from "./utils.mjs";
import { convertStockPrices, currencySymbol } from "./Currency.mjs";
import { showToast } from "./Toast.mjs";

loadHeaderFooter();

const main = qs("#stockMain");
const symbol = getParam("symbol");

// Sample history holds 90 points (~1 trading quarter). 1Y reuses the
// full array since the sample data doesn't go back a full year yet;
// swap in real per-range API data before relying on this for anything
// beyond a demo.
const RANGE_POINTS = { "1W": 7, "1M": 22, "3M": 66, "1Y": 90 };
const DEFAULT_RANGE = "1M";

let currentStock = null;

async function init() {
  if (!symbol) {
    main.innerHTML = "<p class=\"empty-state\">No stock selected. <a href=\"/index.html\">Go back to search.</a></p>";
    return;
  }

  const stock = await findBySymbol(symbol);
  if (!stock) {
    main.innerHTML = `<p class="empty-state">Stock "${symbol}" not found. <a href="/index.html">Go back to search.</a></p>`;
    return;
  }

  currentStock = stock;
  await render(stock);
}

async function render(stock) {
  const [display] = await convertStockPrices([stock]);
  const dir = stock.changePercent >= 0 ? "up" : "down";
  const currency = currencySymbol(display.displayCurrency);
  const watched = isWatched(stock.symbol);

  main.innerHTML = `
    <section class="stock-header">
      <div>
        <h1>${stock.symbol}</h1>
        <p class="stock-sub">${stock.name} &middot; ${stock.exchange}</p>
      </div>
      <div>
        <div class="price mono" data-animate="${display.displayPrice}" data-decimals="2" data-prefix="${currency}">${currency}0.00</div>
        <div class="${dir}">${display.displayChange >= 0 ? "+" : ""}${formatNumber(display.displayChange)} ${currency} today</div>
      </div>
    </section>

    <section>
      <div class="chart-container">
        <div id="chart"></div>
        <div class="range-buttons">
          ${Object.keys(RANGE_POINTS)
            .map(
              (r) =>
                `<button data-range="${r}" class="${r === DEFAULT_RANGE ? "active" : ""}">${r}</button>`,
            )
            .join("")}
        </div>
      </div>
      <div class="action-row">
        <button id="watchBtn" class="btn btn-secondary">${watched ? "\u2605 Watching" : "\u2606 Add to Watchlist"}</button>
        <button id="portfolioBtn" class="btn btn-primary">+ Add to Portfolio</button>
        <button id="alertBtn" class="btn btn-primary">\ud83d\udd14 Set Alert</button>
      </div>
    </section>

    <dialog id="portfolioDialog">
      <form method="dialog" id="portfolioForm">
        <h3>Add ${stock.symbol} to Portfolio</h3>
        <label>Shares<input type="number" name="shares" min="1" step="1" required /></label>
        <label>Purchase price (${stock.currency})<input type="number" name="purchasePrice" min="0" step="0.01" value="${stock.price}" required /></label>
        <div class="action-row">
          <button value="cancel" class="btn btn-secondary">Cancel</button>
          <button value="confirm" class="btn btn-primary">Add</button>
        </div>
      </form>
    </dialog>

    <dialog id="alertDialog">
      <form method="dialog" id="alertForm">
        <h3>Set price alert for ${stock.symbol}</h3>
        <label>Notify me when price is
          <select name="condition">
            <option value="above">above</option>
            <option value="below">below</option>
          </select>
        </label>
        <label>Target price (${stock.currency})<input type="number" name="targetPrice" min="0" step="0.01" value="${stock.price}" required /></label>
        <div class="action-row">
          <button value="cancel" class="btn btn-secondary">Cancel</button>
          <button value="confirm" class="btn btn-primary">Set Alert</button>
        </div>
      </form>
    </dialog>
  `;

  animateAllIn(main);
  renderLineChart(
    stock.history.slice(-RANGE_POINTS[DEFAULT_RANGE]),
    qs("#chart"),
  );
  wireRangeButtons(stock);
  wireActions(stock);
}

function wireRangeButtons(stock) {
  const buttons = document.querySelectorAll(".range-buttons button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const points = RANGE_POINTS[btn.dataset.range];
      renderLineChart(stock.history.slice(-points), qs("#chart"));
    });
  });
}

function wireActions(stock) {
  const watchBtn = qs("#watchBtn");
  watchBtn.addEventListener("click", () => {
    if (isWatched(stock.symbol)) {
      removeFromWatchlist(stock.symbol);
      watchBtn.textContent = "\u2606 Add to Watchlist";
      showToast(`Removed ${stock.symbol} from watchlist.`, "info");
    } else {
      addToWatchlist(stock.symbol);
      watchBtn.textContent = "\u2605 Watching";
      showToast(`Added ${stock.symbol} to watchlist.`, "success");
    }
  });

  const portfolioDialog = qs("#portfolioDialog");
  qs("#portfolioBtn").addEventListener("click", () =>
    portfolioDialog.showModal(),
  );
  qs("#portfolioForm").addEventListener("submit", (e) => {
    if (e.submitter?.value !== "confirm") return;
    const form = e.target;
    addHolding(stock.symbol, form.shares.value, form.purchasePrice.value);
    showToast(
      `Added ${form.shares.value} shares of ${stock.symbol} to your portfolio.`,
      "success",
    );
  });

  const alertDialog = qs("#alertDialog");
  qs("#alertBtn").addEventListener("click", () => alertDialog.showModal());
  qs("#alertForm").addEventListener("submit", (e) => {
    if (e.submitter?.value !== "confirm") return;
    const form = e.target;
    addAlert(stock.symbol, form.targetPrice.value, form.condition.value);
    showToast(
      `Alert set: notify when ${stock.symbol} goes ${form.condition.value} ${form.targetPrice.value}.`,
      "success",
    );
  });
}

window.addEventListener("currencychange", () => {
  if (currentStock) render(currentStock);
});

init();
