// Portfolio.mjs
// CRUD operations on the user's holdings, plus gain/loss math.
// Holdings shape: { symbol, shares, purchasePrice, dateAdded }

import { getItem, setItem, KEYS } from "./Storage.mjs";

export function getHoldings() {
  return getItem(KEYS.PORTFOLIO, []);
}

export function addHolding(symbol, shares, purchasePrice) {
  const holdings = getHoldings();
  holdings.push({
    symbol,
    shares: Number(shares),
    purchasePrice: Number(purchasePrice),
    dateAdded: new Date().toISOString(),
  });
  setItem(KEYS.PORTFOLIO, holdings);
  return holdings;
}

export function removeHolding(symbol) {
  const holdings = getHoldings().filter((h) => h.symbol !== symbol);
  setItem(KEYS.PORTFOLIO, holdings);
  return holdings;
}

// Combines stored holdings with live stock data to compute current
// value, gain/loss amount, and gain/loss percentage per holding.
export function calculatePositions(holdings, stocks) {
  return holdings.map((holding) => {
    const stock = stocks.find((s) => s.symbol === holding.symbol);
    const currentPrice = stock ? stock.price : holding.purchasePrice;
    const costBasis = holding.shares * holding.purchasePrice;
    const currentValue = holding.shares * currentPrice;
    const gain = currentValue - costBasis;
    const gainPercent = costBasis ? (gain / costBasis) * 100 : 0;

    return {
      ...holding,
      currentPrice,
      currentValue,
      gain,
      gainPercent,
      exchange: stock?.exchange,
      currency: stock?.currency,
      name: stock?.name,
    };
  });
}

export function calculateTotals(positions) {
  return positions.reduce(
    (totals, p) => ({
      currentValue: totals.currentValue + p.currentValue,
      gain: totals.gain + p.gain,
    }),
    { currentValue: 0, gain: 0 },
  );
}
