// src/js/StockData.mjs
const PROXY_URL = import.meta.env.VITE_API_PROXY_URL || "http://localhost:3000";

export default class StockData {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async fetchFromProxy(endpoint) {
    // Check cache
    if (this.cache.has(endpoint)) {
      const cached = this.cache.get(endpoint);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const url = `${PROXY_URL}${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the result
    this.cache.set(endpoint, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  // Get market snapshot from NGN Market
  async getMarketSnapshot() {
    const response = await this.fetchFromProxy("/api/market/snapshot");
    return response.data;
  }

  // Search stocks via Finnhub
  async searchStocks(query) {
    if (!query || query.length < 1) return [];

    const response = await this.fetchFromProxy(
      `/api/stocks/search?q=${encodeURIComponent(query)}`
    );
    return response.result || [];
  }

  // Get stock quote via Finnhub
  async getStockQuote(symbol) {
    return this.fetchFromProxy(`/api/stocks/quote/${symbol}`);
  }

  // Get company profile via Finnhub
  async getCompanyProfile(symbol) {
    return this.fetchFromProxy(`/api/stocks/profile/${symbol}`);
  }

  // Get price history via Finnhub
  async getPriceHistory(symbol) {
    return this.fetchFromProxy(`/api/stocks/candles/${symbol}`);
  }

  // src/js/StockData.mjs

  async getAfricanMarkets() {
    const symbols = [
      { symbol: "EZA", name: "South Africa", flag: "🇿🇦" },
      { symbol: "EGY", name: "Egypt", flag: "🇪🇬" },
      { symbol: "MAR", name: "Morocco", flag: "🇲🇦" },
      { symbol: "AFK", name: "Pan-Africa", flag: "🌍" },
      { symbol: "DANGCEM.NL", name: "Dangote Cement", flag: "🇳🇬" },
    ];

    const results = await Promise.all(
      symbols.map(async (item) => {
        try {
          const quote = await this.getStockQuote(item.symbol);
          if (!quote.c || quote.c === 0) return null;
          return {
            ...item,
            price: quote.c,
            change: quote.d,
            changePercent: quote.dp,
          };
        } catch (error) {
          console.error(`Failed to load ${item.symbol}:`, error);
          return null;
        }
      })
    );

    return results.filter(Boolean);
  }
}

