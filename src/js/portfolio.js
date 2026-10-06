import { getStocks } from "./StockData.mjs";
import {
  getHoldings,
  calculatePositions,
  calculateTotals,
  removeHolding,
} from "./Portfolio.mjs";
import { formatNumber, formatPercent, loadHeaderFooter, qs } from "./Utils.mjs";
import { currencySymbol } from "./Currency.mjs";
import { showToast } from "./Toast.mjs";

// Note: holdings stay in the currency they were purchased in (a NGX
// stock's cost basis and current price are both NGN, a JSE stock's are
// both ZAR), so per-row gain/loss math never needs conversion. The
// header currency selector only affects the homepage, stock detail,
// and watchlist — converting a mixed-currency portfolio total would
// need its own clearly-labeled "converted total" row, not a silent
// swap, so it's left as a documented next step.

loadHeaderFooter();

const summaryEl = qs("#portfolioSummary");
const tableWrap = qs("#portfolioTableWrap");

async function render() {
  const holdings = getHoldings();

  if (holdings.length === 0) {
    summaryEl.innerHTML = "";
    tableWrap.innerHTML = `
      <div class="empty-state">
        <p>You haven't added any holdings yet.</p>
        <a class="btn btn-primary" href="/index.html">Search for a stock</a>
      </div>
    `;
    return;
  }

  const stocks = await getStocks();
  const positions = calculatePositions(holdings, stocks);
  const totals = calculateTotals(positions);
  const dir = totals.gain >= 0 ? "up" : "down";

  summaryEl.innerHTML = `
    <p>Total value: <strong class="mono">${formatNumber(totals.currentValue)}</strong>
    &middot; Total gain/loss: <strong class="mono ${dir}">${totals.gain >= 0 ? "+" : ""}${formatNumber(totals.gain)}</strong></p>
  `;

  tableWrap.innerHTML = `
    <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Shares</th>
          <th>Avg Cost</th>
          <th>Current</th>
          <th>Value</th>
          <th>Gain/Loss</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${positions
          .map((p) => {
            const dir = p.gain >= 0 ? "up" : "down";
            const symbol = currencySymbol(p.currency);
            return `
              <tr>
                <td><a href="/stock/index.html?symbol=${p.symbol}">${p.symbol}</a></td>
                <td>${p.shares}</td>
                <td class="mono">${symbol}${formatNumber(p.purchasePrice)}</td>
                <td class="mono">${symbol}${formatNumber(p.currentPrice)}</td>
                <td class="mono">${symbol}${formatNumber(p.currentValue)}</td>
                <td class="mono ${dir}">${p.gain >= 0 ? "+" : ""}${formatNumber(p.gain)} (${formatPercent(p.gainPercent)})</td>
                <td><button class="btn btn-secondary remove-btn" data-symbol="${p.symbol}">Remove</button></td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
    </div>
  `;

  tableWrap.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeHolding(btn.dataset.symbol);
      showToast(`Removed ${btn.dataset.symbol} from portfolio.`, "info");
      render();
    });
  });
}

render();
