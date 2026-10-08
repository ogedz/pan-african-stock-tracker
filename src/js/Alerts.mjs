// Alerts.mjs
// Stores price alerts and checks them against current stock prices.
// Alert shape: { symbol, targetPrice, condition ("above" | "below"), created, notified }

import { getItem, setItem, KEYS } from "./Storage.mjs";
import { getStocks } from "./StockData.mjs";
import { showToast } from "./Toast.mjs";
import { currencySymbol } from "./Currency.mjs";

export function getAlerts() {
  return getItem(KEYS.ALERTS, []);
}

export function addAlert(symbol, targetPrice, condition) {
  const alerts = getAlerts();
  alerts.push({
    symbol,
    targetPrice: Number(targetPrice),
    condition,
    created: new Date().toISOString(),
    notified: false,
  });
  setItem(KEYS.ALERTS, alerts);
  return alerts;
}

export function removeAlert(index) {
  const alerts = getAlerts();
  alerts.splice(index, 1);
  setItem(KEYS.ALERTS, alerts);
  return alerts;
}

// Returns the alerts whose condition is currently met, given live stocks.
export function checkAlerts(stocks) {
  const alerts = getAlerts();
  const triggered = [];

  alerts.forEach((alert) => {
    const stock = stocks.find((s) => s.symbol === alert.symbol);
    if (!stock) return;
    const met =
      alert.condition === "above"
        ? stock.price >= alert.targetPrice
        : stock.price <= alert.targetPrice;
    if (met) triggered.push({ ...alert, currentPrice: stock.price });
  });

  return triggered;
}

// Called once per page load (from Utils.loadHeaderFooter, since every
// page loads the header). Checks all alerts against live prices, shows
// a toast for any newly-triggered one, and marks it notified so it
// doesn't fire again on the next page load.
export async function checkAndNotify() {
  const stocks = await getStocks();
  const alerts = getAlerts();
  let changed = false;

  alerts.forEach((alert) => {
    if (alert.notified) return;
    const stock = stocks.find((s) => s.symbol === alert.symbol);
    if (!stock) return;
    const met =
      alert.condition === "above"
        ? stock.price >= alert.targetPrice
        : stock.price <= alert.targetPrice;
    if (met) {
      const currency = currencySymbol(stock.currency);
      showToast(
        `\ud83d\udd14 ${alert.symbol} is now ${alert.condition} ${currency}${alert.targetPrice} (currently ${currency}${stock.price.toFixed(2)})`,
        "alert",
        7000,
      );
      alert.notified = true;
      changed = true;
    }
  });

  if (changed) setItem(KEYS.ALERTS, alerts);
}
