// Watchlist.mjs
// Add, remove, and check membership of watched stocks (no shares owned).

import { getItem, setItem, KEYS } from "./Storage.mjs";

export function getWatchlist() {
  return getItem(KEYS.WATCHLIST, []);
}

export function isWatched(symbol) {
  return getWatchlist().some((w) => w.symbol === symbol);
}

export function addToWatchlist(symbol) {
  const list = getWatchlist();
  if (list.some((w) => w.symbol === symbol)) return list;
  list.push({ symbol, dateAdded: new Date().toISOString() });
  setItem(KEYS.WATCHLIST, list);
  return list;
}

export function removeFromWatchlist(symbol) {
  const list = getWatchlist().filter((w) => w.symbol !== symbol);
  setItem(KEYS.WATCHLIST, list);
  return list;
}
