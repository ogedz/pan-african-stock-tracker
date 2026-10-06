// Storage.mjs
// Thin wrapper around localStorage so the rest of the app never touches
// JSON.stringify/parse or localStorage directly.

export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Storage: failed to read "${key}"`, error);
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Storage: failed to write "${key}"`, error);
    return false;
  }
}

export function removeItem(key) {
  localStorage.removeItem(key);
}

// Keys used across the app, kept in one place to avoid typos elsewhere.
export const KEYS = {
  PORTFOLIO: "pat-portfolio",
  WATCHLIST: "pat-watchlist",
  ALERTS: "pat-alerts",
  PREFERENCES: "pat-preferences",
};

// --- Time-boxed cache -------------------------------------------------
// Wraps getItem/setItem with a timestamp so callers (mainly StockData.mjs
// and Currency.mjs) can avoid re-hitting a rate-limited free-tier API on
// every page load. A miss (expired or never set) returns null so the
// caller knows to re-fetch.

export function getCached(key, ttlMs) {
  const entry = getItem(`cache-${key}`);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) return null;
  return entry.value;
}

export function setCached(key, value) {
  setItem(`cache-${key}`, { value, timestamp: Date.now() });
}
