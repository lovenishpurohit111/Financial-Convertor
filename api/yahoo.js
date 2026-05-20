export default async function handler(req, res) {
  const { action, q, symbol } = req.query;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
    "Origin": "https://finance.yahoo.com",
  };

  try {
    if (action === "search") {
      const r = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=IN&quotesCount=8&newsCount=0&enableFuzzyQuery=false`,
        { headers }
      );
      const data = await r.json();
      const quotes = (data?.quotes || [])
        .filter(q => ["EQUITY", "ETF"].includes(q.quoteType))
        .map(q => ({ symbol: q.symbol, name: q.shortname || q.longname || q.symbol, exchange: q.exchange }));
      return res.json({ quotes });
    }

    if (action === "financials") {
      const modules = "incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory";
      
      // First get a crumb (Yahoo requires this for v10 API)
      const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers });
      const crumb = await crumbRes.text();

      const url = crumb && crumb.length < 50
        ? `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb.trim())}`
        : `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;

      const r = await fetch(url, { headers: { ...headers, Cookie: crumbRes.headers.get("set-cookie") || "" } });
      
      if (!r.ok) {
        // Fallback: try v11
        const r2 = await fetch(
          `https://query2.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`,
          { headers }
        );
        if (!r2.ok) return res.status(r2.status).json({ error: `Yahoo Finance ${r2.status}` });
        const d2 = await r2.json();
        return res.json(d2?.quoteSummary?.result?.[0] || {});
      }

      const data = await r.json();
      if (data?.quoteSummary?.error) return res.status(400).json({ error: data.quoteSummary.error.description });
      return res.json(data?.quoteSummary?.result?.[0] || {});
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
