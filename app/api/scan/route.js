import { getQuote, getBasicFinancials, SCAN_UNIVERSE } from '@/app/lib/finnhub';

// Fetch quote + financials for a symbol in parallel
async function enrichSymbol(symbol) {
  const [quote, fins] = await Promise.all([
    getQuote(symbol),
    getBasicFinancials(symbol),
  ]);
  if (!quote || !fins) return null;
  return { ...quote, ...fins };
}

// Batch-fetch with concurrency cap to stay under 60 calls/min
// Each symbol = 2 calls, so 20 concurrent = 40 calls/batch, well within limits
async function batchFetch(symbols, concurrency = 20) {
  const results = [];
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(enrichSymbol));
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
  }
  return results;
}

// Filter helpers — straight from the trading plan
const hasMinVolume = (s) => (s.avgVolume10Day ?? 0) >= 5;         // 5M+ avg daily volume
const isUpToday = (s) => (s.changePercent ?? 0) > 0;
const isGappingUp = (s) => {
  if (!s.open || !s.previousClose) return false;
  return ((s.open - s.previousClose) / s.previousClose) * 100 >= 1.5;
};
const isDoubler = (s) => (s.weekReturn52 ?? 0) >= 80;
const isStrongMover = (s) => (s.changePercent ?? 0) >= 3 && (s.avgVolume10Day ?? 0) >= 10;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'gap-ups';

  const ETFs = new Set(['SPY', 'QQQ', 'IWM', 'ARKK', 'SOXS', 'SOXL', 'TQQQ', 'SQQQ']);
  const stocks = SCAN_UNIVERSE.filter(s => !ETFs.has(s));

  try {
    const all = await batchFetch(stocks);
    const liquid = all.filter(hasMinVolume);

    let results = [];

    if (tab === 'gap-ups') {
      results = liquid
        .filter(s => isGappingUp(s) && isUpToday(s))
        .sort((a, b) => {
          const gA = ((a.open - a.previousClose) / a.previousClose) * 100;
          const gB = ((b.open - b.previousClose) / b.previousClose) * 100;
          return gB - gA;
        });
    } else if (tab === 'doublers') {
      results = liquid
        .filter(s => isDoubler(s) && isUpToday(s))
        .sort((a, b) => (b.weekReturn52 ?? 0) - (a.weekReturn52 ?? 0));
    } else if (tab === 'strong-movers') {
      results = liquid
        .filter(isStrongMover)
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    }

    const enriched = results.slice(0, 20).map(s => ({
      ...s,
      gapPercent: s.open && s.previousClose
        ? (((s.open - s.previousClose) / s.previousClose) * 100).toFixed(2)
        : null,
    }));

    return Response.json({ results: enriched, tab, total: enriched.length });
  } catch (err) {
    console.error('Scan route error:', err.message);
    return Response.json({ results: [], tab, error: err.message }, { status: 500 });
  }
}
