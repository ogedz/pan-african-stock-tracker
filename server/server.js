// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

// NGN Market
const NGN_API_KEY = process.env.NGN_API_KEY;
const NGN_BASE_URL = process.env.NGN_BASE_URL || "https://api.ngnmarket.com/v1";

// Finnhub
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      "https://pan-african-stock-tracker-1.onrender.com",
    ],
  }),
);

app.use(express.json());

// ============ HEALTH CHECK ============
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Pan-African Stocks API Proxy",
    apis: {
      ngnMarket: NGN_API_KEY ? "configured" : "missing",
      finnhub: FINNHUB_API_KEY ? "configured" : "missing",
    },
  });
});

// ============ NGN MARKET: Market Snapshot ============
app.get("/api/market/snapshot", async (req, res) => {
  try {
    const response = await fetch(`${NGN_BASE_URL}/market/snapshot`, {
      headers: {
        Authorization: `Bearer ${NGN_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NGN error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Market snapshot error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ FINNHUB: Stock Search ============
app.get("/api/stocks/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    if (!query) {
      return res.json({ count: 0, result: [] });
    }

    const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(
      query,
    )}&token=${FINNHUB_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Finnhub error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Stock search error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ FINNHUB: Stock Quote ============
app.get("/api/stocks/quote/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Stock quote error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ FINNHUB: Company Profile ============
app.get("/api/stocks/profile/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Profile error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ FINNHUB: Stock Candles (Price History) ============
app.get("/api/stocks/candles/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const now = Math.floor(Date.now() / 1000);
    const oneMonthAgo = now - 30 * 24 * 60 * 60;

    const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${oneMonthAgo}&to=${now}&token=${FINNHUB_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Candles error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
  console.log(
    `🔑 NGN API Key: ${NGN_API_KEY ? "YES" : "NO"} (length: ${
      NGN_API_KEY?.length || 0
    })`,
  );
  console.log(
    `🔑 Finnhub API Key: ${FINNHUB_API_KEY ? "YES" : "NO"} (length: ${
      FINNHUB_API_KEY?.length || 0
    })`,
  );
  console.log(`🌐 NGN Base URL: ${NGN_BASE_URL}`);
});
