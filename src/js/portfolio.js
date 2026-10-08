// src/js/portfolio.js
import { getStocks } from "./StockData.mjs";
import {
  getHoldings,
  calculatePositions,
  removeHolding,
} from "./Portfolio.mjs";
import {
  formatNumber,
  formatPercent,
  loadHeaderFooter,
  qs,
  renderBreadcrumb,
} from "./utils.mjs";
import { currencySymbol, getPreferredCurrency, convert } from "./Currency.mjs";
import { showToast } from "./Toast.mjs";
import { renderLineChart } from "./Charts.mjs";

renderBreadcrumb([
  { label: "Home", href: "/index.html" },
  { label: "Portfolio" },
]);

loadHeaderFooter();

const statsEl = qs("#portfolioStats");
const performanceSection = qs("#performanceSection");
const performanceChart = qs("#performanceChart");
const performanceRanges = qs("#performanceRanges");
const summaryEl = qs("#portfolioSummary");
const tableWrap = qs("#portfolioTableWrap");

let cachedPositions = null;
let cachedStocks = null;

const RANGE_POINTS = { "1W": 7, "1M": 22, "3M": 66, "1Y": 90 };
let currentRange = "1M";

async function render() {
  const holdings = getHoldings();

  if (holdings.length === 0) {
    statsEl.innerHTML = "";
    performanceSection.hidden = true;
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
  cachedStocks = stocks;
  const positions = calculatePositions(holdings, stocks);

  // Convert every position to the display currency
  const preferred = getPreferredCurrency();
  const convertedPositions = await Promise.all(
    positions.map(async (p) => {
      const currentValueDisplay = await convert(
        p.currentValue,
        p.currency,
        preferred,
      );
      const gainDisplay = await convert(p.gain, p.currency, preferred);
      const purchasePriceDisplay = await convert(
        p.purchasePrice,
        p.currency,
        preferred,
      );
      const currentPriceDisplay = await convert(
        p.currentPrice,
        p.currency,
        preferred,
      );
      return {
        ...p,
        displayCurrency: preferred,
        displayPurchasePrice: purchasePriceDisplay,
        displayCurrentPrice: currentPriceDisplay,
        displayCurrentValue: currentValueDisplay,
        displayGain: gainDisplay,
      };
    }),
  );

  cachedPositions = convertedPositions;

  // Calculate totals from converted values
  const totals = convertedPositions.reduce(
    (acc, p) => {
      acc.currentValue += p.displayCurrentValue;
      acc.invested += p.shares * p.displayPurchasePrice;
      acc.gain += p.displayGain;
      return acc;
    },
    { currentValue: 0, invested: 0, gain: 0 },
  );

  renderStats(convertedPositions, totals, preferred);
  renderPerformanceChart(convertedPositions, preferred);
  renderSummary(totals, preferred);
  renderTable(convertedPositions);

  wireRangeButtons();
}

// ============ STATS CARDS ============
function renderStats(positions, totals, preferred) {
  const dir = totals.gain >= 0 ? "up" : "down";
  const gainPercent =
    totals.invested > 0 ? (totals.gain / totals.invested) * 100 : 0;
  const currency = currencySymbol(preferred);

  const sorted = [...positions].sort((a, b) => b.gainPercent - a.gainPercent);
  const best = sorted[0];

  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Value (${preferred})</div>
      <div class="stat-value mono">${currency}${formatNumber(totals.currentValue)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Gain/Loss</div>
      <div class="stat-value mono ${dir}">
        ${totals.gain >= 0 ? "+" : ""}${currency}${formatNumber(totals.gain)}
      </div>
      <div class="stat-change ${dir}">${formatPercent(gainPercent)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Holdings</div>
      <div class="stat-value mono">${positions.length}</div>
    </div>
    ${
      positions.length >= 2
        ? `
    <div class="stat-card">
      <div class="stat-label">Best Performer</div>
      <div class="stat-value mono">${best.symbol}</div>
      <div class="stat-change up">${formatPercent(best.gainPercent)}</div>
    </div>
    `
        : ""
    }
  `;
}

// ============ PERFORMANCE CHART ============
function renderPerformanceChart(positions, preferred) {
  performanceSection.hidden = false;

  const points = RANGE_POINTS[currentRange];

  const maxDays = Math.min(
    points,
    ...positions.map((p) => {
      const stock = cachedStocks.find((s) => s.symbol === p.symbol);
      return stock?.history?.length || 0;
    }),
  );

  if (maxDays < 2) {
    performanceChart.innerHTML =
      "<p style='opacity:.6'>Not enough history data yet.</p>";
    return;
  }

  const dailyTotals = [];
  for (let i = -maxDays; i < 0; i++) {
    let dayTotal = 0;
    for (const p of positions) {
      const stock = cachedStocks.find((s) => s.symbol === p.symbol);
      if (stock?.history && stock.history.length > 0) {
        const histIndex = stock.history.length + i;
        if (histIndex >= 0 && histIndex < stock.history.length) {
          const nativePrice = stock.history[histIndex];
          // Convert each day's price to preferred currency
          // (using current conversion rate as approximation)
          const conversionFactor = p.displayCurrentPrice / p.currentPrice;
          dayTotal += nativePrice * p.shares * conversionFactor;
        }
      }
    }
    dailyTotals.push(dayTotal);
  }

  renderLineChart(dailyTotals, performanceChart, {
    width: 600,
    height: 220,
  });
}

// ============ RANGE BUTTONS ============
function wireRangeButtons() {
  if (!performanceRanges || performanceRanges.dataset.wired === "true") return;
  performanceRanges.dataset.wired = "true";

  performanceRanges.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      performanceRanges
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = btn.dataset.range;
      const preferred = getPreferredCurrency();
      if (cachedPositions) renderPerformanceChart(cachedPositions, preferred);
    });
  });
}

// ============ SUMMARY + TABLE ============
function renderSummary(totals, preferred) {
  const dir = totals.gain >= 0 ? "up" : "down";
  const currency = currencySymbol(preferred);
  summaryEl.innerHTML = `
    <p>Total value: <strong class="mono">${currency}${formatNumber(totals.currentValue)}</strong>
    &middot; Total gain/loss: <strong class="mono ${dir}">${totals.gain >= 0 ? "+" : ""}${currency}${formatNumber(totals.gain)}</strong>
    <span class="stat-label">(converted to ${preferred})</span></p>
  `;
}

function renderTable(positions) {
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
            const displaySymbol = currencySymbol(p.displayCurrency);
            const nativeSymbol = currencySymbol(p.currency);
            return `
              <tr>
                <td><a href="/stock/index.html?symbol=${p.symbol}">${p.symbol}</a></td>
                <td>${p.shares}</td>
                <td class="mono">${nativeSymbol}${formatNumber(p.purchasePrice)}<br><small>(${displaySymbol}${formatNumber(p.displayPurchasePrice)})</small></td>
                <td class="mono">${nativeSymbol}${formatNumber(p.currentPrice)}<br><small>(${displaySymbol}${formatNumber(p.displayCurrentPrice)})</small></td>
                <td class="mono">${displaySymbol}${formatNumber(p.displayCurrentValue)}</td>
                <td class="mono ${dir}">${p.gain >= 0 ? "+" : ""}${displaySymbol}${formatNumber(p.displayGain)} (${formatPercent(p.gainPercent)})</td>
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

window.addEventListener("currencychange", () => {
  render();
});
