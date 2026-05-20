// Proxy Yahoo Finance API calls to avoid CORS
export default async function handler(req, res) {
  const { action, q, symbol, statement } = req.query;

  try {
    if (action === "search") {
      // Search for company by name
      const r = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=IN&quotesCount=6&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const data = await r.json();
      const quotes = (data?.quotes || [])
        .filter(q => ["EQUITY","ETF"].includes(q.quoteType))
        .map(q => ({ symbol: q.symbol, name: q.shortname || q.longname, exchange: q.exchange }));
      return res.json({ quotes });
    }

    if (action === "financials") {
      // Fetch all 3 statements in parallel
      const modules = "incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory,incomeStatementHistoryQuarterly";
      const r = await fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const data = await r.json();
      if (data?.quoteSummary?.error) {
        return res.status(400).json({ error: data.quoteSummary.error.description });
      }
      return res.json(data?.quoteSummary?.result?.[0] || {});
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
