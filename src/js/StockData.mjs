// StockData.mjs — uses backend proxy for secure API access
import { getCached, setCached } from "./Storage.mjs";

const PROXY_URL = import.meta.env.VITE_API_PROXY_URL || "http://localhost:3000";
const STOCKS_PATH = "/json/stocks.json";
const INDICES_PATH = "/json/indices.json";
const CACHE_TTL_MS = 2 * 60 * 1000;

let stocksCache = null;
let indicesCache = null;
let dataSourceStatus = { stocks: "live", indices: "live" };

export function getDataSourceStatus() {
  return { ...dataSourceStatus };
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function fetchFromProxy(endpoint, retries = 1) {
  try {
    const res = await fetch(`${PROXY_URL}${endpoint}`);
    if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
    return await res.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchFromProxy(endpoint, retries - 1);
    }
    throw error;
  }
}

export function normalizeStock(raw) {
  return {
    symbol: String(raw.symbol || raw.ticker || "").toUpperCase(),
    name: raw.name || raw.companyName || raw.symbol,
    exchange: raw.exchange || "NGX",
    currency: raw.currency || "NGN",
    price: Number(raw.price ?? raw.current_price ?? 0),
    change: Number(raw.change ?? 0),
    changePercent: Number(raw.changePercent ?? 0),
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

export async function getStocks() {
  if (stocksCache) return stocksCache;

  const cached = getCached("stocks", CACHE_TTL_MS);
  if (cached) {
    stocksCache = cached;
    return cached;
  }

  // Start with sample data
  let stocks = await fetchJson(STOCKS_PATH);
  dataSourceStatus.stocks = "sample";

  // Try to enrich with live data from backend proxy
  try {
    const markets = [
      "DANGCEM.NL",
      "MTNN.NL",
      "ZENITHBANK.NL",
      "GTCO.NL",
      "ACCESS.NL",
    ];
    const live = await Promise.all(
      markets.map(async (symbol) => {
        try {
          const quote = await fetchFromProxy(`/api/stocks/quote/${symbol}`);
          if (!quote.c || quote.c === 0) return null;
          return {
            symbol: symbol.replace(".NL", ""),
            name: symbol.replace(".NL", ""),
            exchange: "NGX",
            currency: "NGN",
            price: quote.c,
            change: quote.d || 0,
            changePercent: quote.dp || 0,
          };
        } catch {
          return null;
        }
      }),
    );

    const validLive = live.filter(Boolean);
    if (validLive.length > 0) {
      const bySymbol = new Map(validLive.map((s) => [s.symbol, s]));
      stocks = stocks.map((s) => {
        const l = bySymbol.get(s.symbol);
        return l ? { ...s, ...l } : s;
      });
      dataSourceStatus.stocks = "live";
    }
  } catch (error) {
    console.warn("Live data unavailable, using sample:", error.message);
  }

  stocksCache = stocks;
  setCached("stocks", stocks);
  return stocks;
}

export async function getIndices() {
  if (indicesCache) return indicesCache;

  const cached = getCached("indices", CACHE_TTL_MS);
  if (cached) {
    indicesCache = cached;
    return cached;
  }

  let indices = await fetchJson(INDICES_PATH);
  dataSourceStatus.indices = "sample";

  try {
    const snapshot = await fetchFromProxy("/api/market/snapshot");
    if (snapshot?.data?.asi) {
      indices = indices.map((idx) =>
        idx.exchange === "NGX"
          ? {
              ...idx,
              value: snapshot.data.asi,
              changePercent: snapshot.data.asi_change_percent,
            }
          : idx,
      );
      dataSourceStatus.indices = "live";
    }
  } catch (error) {
    console.warn("NGN snapshot unavailable:", error.message);
  }

  indicesCache = indices;
  setCached("indices", indices);
  return indices;
}

export async function findBySymbol(symbol) {
  const stocks = await getStocks();
  return stocks.find((s) => s.symbol === String(symbol).toUpperCase()) || null;
}

export async function getTopGainers(count = 5) {
  const stocks = await getStocks();
  return [...stocks]
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, count);
}

export async function getTopLosers(count = 5) {
  const stocks = await getStocks();
  return [...stocks]
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, count);
}
