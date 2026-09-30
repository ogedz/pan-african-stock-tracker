// src/js/Search.mjs
export default class Search {
  constructor(stockData) {
    this.stockData = stockData;
    this.searchInput = null;
    this.searchBtn = null;
    this.stockList = null;
  }

  init() {
    this.searchInput = document.getElementById("search-input");
    this.searchBtn = document.getElementById("search-btn");
    this.stockList = document.getElementById("stock-list");

    if (!this.searchInput || !this.searchBtn || !this.stockList) {
      console.warn("Search elements not found");
      return;
    }

    // Search on button click
    this.searchBtn.addEventListener("click", () => this.performSearch());

    // Search on Enter key
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.performSearch();
    });

    // Load all stocks initially
    this.performSearch("");
  }

  async performSearch() {
    const query = this.searchInput.value.trim();

    try {
      const results = await this.stockData.searchStocks(query);
      this.renderResults(results);
    } catch (error) {
      console.error("Search error:", error);
      this.stockList.innerHTML = "<li>Error loading stocks.</li>";
    }
  }

  renderResults(stocks) {
    if (!stocks || stocks.length === 0) {
      this.stockList.innerHTML = "<li>No stocks found.</li>";
      return;
    }

    this.stockList.innerHTML = stocks
      .map(
        (stock) => `
      <li class="stock-card">
        <a href="/pages/stock/?symbol=${stock.symbol}">
          <div class="stock-info">
            <h3 class="stock-symbol">${stock.symbol}</h3>
            <p class="stock-name">${stock.name}</p>
            <span class="stock-exchange">${stock.exchange}</span>
          </div>
          <div class="stock-price">
            <p class="price">₦${stock.price.toFixed(2)}</p>
            <p class="change ${stock.change >= 0 ? "positive" : "negative"}">
              ${stock.change >= 0 ? "▲" : "▼"} ${Math.abs(stock.change).toFixed(2)}%
            </p>
          </div>
        </a>
      </li>
    `
      )
      .join("");
  }
}