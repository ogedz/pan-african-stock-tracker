// Search.mjs
// Matches a query against stock symbols and names, with an optional
// exchange filter (NGX, JSE, EGX, ...).

export function searchStocks(stocks, query, exchange = "ALL") {
  const q = query.trim().toLowerCase();

  return stocks.filter((stock) => {
    const matchesExchange = exchange === "ALL" || stock.exchange === exchange;
    if (!matchesExchange) return false;
    if (!q) return true;
    return (
      stock.symbol.toLowerCase().includes(q) ||
      stock.name.toLowerCase().includes(q)
    );
  });
}

export function listExchanges(stocks) {
  return [...new Set(stocks.map((s) => s.exchange))].sort();
}
