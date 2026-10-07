import { loadHeaderFooter, qs } from "./utils.mjs";
import {
  getPreferredCurrency,
  setPreferredCurrency,
  listSupportedCurrencies,
} from "./Currency.mjs";
import { getItem, setItem, removeItem, KEYS } from "./Storage.mjs";
import { showToast } from "./Toast.mjs";

loadHeaderFooter();

const form = qs("#settingsForm");
const themeSelect = qs("#settingsTheme");
const currencySelect = qs("#settingsCurrency");
const refreshSelect = qs("#settingsRefresh");
const statusEl = qs("#settingsStatus");
const clearBtn = qs("#clearCacheBtn");

const prefs = getItem(KEYS.PREFERENCES, {});
const storedTheme = localStorage.getItem("pat-theme") || "light";

themeSelect.value = storedTheme;
currencySelect.innerHTML = listSupportedCurrencies()
  .map((c) => `<option value="${c}">${c}</option>`)
  .join("");
currencySelect.value = getPreferredCurrency();
refreshSelect.value = String(prefs.refreshInterval ?? 120000);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const theme = themeSelect.value;
  const currency = currencySelect.value;
  const refreshInterval = Number(refreshSelect.value);

  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pat-theme", theme);

  setPreferredCurrency(currency);
  window.dispatchEvent(new CustomEvent("currencychange", { detail: currency }));

  setItem(KEYS.PREFERENCES, { theme, currency, refreshInterval });

  // Sync header controls if present
  const headerTheme = qs("#themeToggle");
  if (headerTheme) {
    headerTheme.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  const headerCurrency = qs("#currencySelector");
  if (headerCurrency) headerCurrency.value = currency;

  statusEl.textContent = "Preferences saved.";
  showToast("Settings saved", "success");
});

clearBtn.addEventListener("click", () => {
  // Clear time-boxed market caches only
  ["stocks", "indices", "fx-rates"].forEach((k) => removeItem(`cache-${k}`));
  statusEl.textContent =
    "Cached market data cleared. Reload any page to fetch fresh data.";
  showToast("Cache cleared", "info");
});
