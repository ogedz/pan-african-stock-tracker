import { getAlerts, removeAlert, checkAlerts } from "./Alerts.mjs";
import { getStocks } from "./StockData.mjs";
import { formatNumber, loadHeaderFooter, qs } from "./Utils.mjs";
import { showToast } from "./Toast.mjs";

loadHeaderFooter();

const listEl = qs("#alertsList");

async function render() {
  const alerts = getAlerts();
  const stocks = await getStocks();
  const triggered = checkAlerts(stocks);

  if (alerts.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p>No price alerts yet.</p>
        <p>Open any stock and use <strong>Set Alert</strong> to create one.</p>
        <a class="btn btn-primary" href="/index.html">Browse stocks</a>
      </div>`;
    return;
  }

  const rows = alerts
    .map((alert, index) => {
      const stock = stocks.find((s) => s.symbol === alert.symbol);
      const current = stock ? stock.price : null;
      const isTriggered = triggered.some(
        (t) =>
          t.symbol === alert.symbol &&
          t.targetPrice === alert.targetPrice &&
          t.condition === alert.condition,
      );
      const status = alert.notified || isTriggered ? "Triggered" : "Watching";
      const statusClass = alert.notified || isTriggered ? "up" : "";
      return `
        <tr>
          <td><a href="/stock/index.html?symbol=${encodeURIComponent(alert.symbol)}"><strong>${alert.symbol}</strong></a></td>
          <td>${alert.condition === "above" ? "Above" : "Below"}</td>
          <td class="mono">${formatNumber(alert.targetPrice)}</td>
          <td class="mono">${current != null ? formatNumber(current) : "—"}</td>
          <td class="${statusClass}">${status}</td>
          <td><button type="button" class="btn btn-secondary btn-sm" data-remove="${index}">Remove</button></td>
        </tr>`;
    })
    .join("");

  listEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Condition</th>
          <th>Target</th>
          <th>Current</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  listEl.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-remove"));
      removeAlert(idx);
      showToast("Alert removed", "info");
      render();
    });
  });
}

render();
