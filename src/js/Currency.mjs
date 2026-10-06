// Currency.mjs
// Converts between African currencies for display purposes (portfolio
// cost basis and alerts stay in the currency you entered them in — see
// the comment in Portfolio.mjs for why). Live rates come from
// open.er-api.com, a free, keyless exchange-rate API; sample rates are
// the fallback when offline or unreachable.

import { getItem, setItem, getCached, setCached, KEYS } from "./Storage.mjs";

const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const RATES_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — exchange rates don't need to be fresher than that here

// Fallback: approximate units of each currency per 1 USD, used only
// when the live API is unreachable (offline, or blocked in a
// restricted network).
const SAMPLE_RATES_PER_USD = {
  NGN: 1580,
  ZAR: 18.4,
  EGP: 49.2,
  KES: 129,
  USD: 1,
};

const SUPPORTED = ["NGN", "ZAR", "EGP", "KES", "USD"];

export async function fetchLiveRates() {
  const cached = getCached("fx-rates", RATES_TTL_MS);
  if (cached) return cached;

  try {
    const res = await fetch(RATES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates = {};
    SUPPORTED.forEach((code) => {
      rates[code] = data.rates?.[code] ?? SAMPLE_RATES_PER_USD[code];
    });
    setCached("fx-rates", rates);
    return rates;
  } catch (error) {
    console.warn(
      "Live exchange rates unavailable, using sample rates:",
      error.message,
    );
    return SAMPLE_RATES_PER_USD;
  }
}

function convertSync(amount, from, to, rates) {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return (amount / fromRate) * toRate;
}

export async function convert(amount, fromCurrency, toCurrency) {
  const rates = await fetchLiveRates();
  return convertSync(amount, fromCurrency, toCurrency, rates);
}

// Converts price/change on a list of stocks to the user's preferred
// display currency, in one batch (one rate fetch instead of one per
// stock). changePercent is currency-agnostic and passes through as-is.
export async function convertStockPrices(stocks) {
  const preferred = getPreferredCurrency();
  const rates = await fetchLiveRates();
  return stocks.map((stock) => ({
    ...stock,
    displayPrice: convertSync(stock.price, stock.currency, preferred, rates),
    displayChange: convertSync(stock.change, stock.currency, preferred, rates),
    displayCurrency: preferred,
  }));
}

export function currencySymbol(code) {
  const symbols = {
    NGN: "\u20a6",
    ZAR: "R",
    EGP: "E\u00a3",
    KES: "KSh",
    USD: "$",
  };
  return symbols[code] || code;
}

export function getPreferredCurrency() {
  const prefs = getItem(KEYS.PREFERENCES, {});
  return prefs.currency || "NGN";
}

export function setPreferredCurrency(code) {
  const prefs = getItem(KEYS.PREFERENCES, {});
  prefs.currency = code;
  setItem(KEYS.PREFERENCES, prefs);
}

export function listSupportedCurrencies() {
  return SUPPORTED;
}
