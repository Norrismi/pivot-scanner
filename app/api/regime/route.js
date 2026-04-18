import { getQuote, getBasicFinancials, getUpcomingEarnings } from '@/app/lib/finnhub';

// ─── Per-scan universes ───────────────────────────────────────────────────────

const GAP_UP_UNIVERSE = [
  'NVDA','AMD','META','TSLA','AMZN','GOOGL','MSFT','AAPL','AVGO','NFLX',
  'CRWD','PANW','DDOG','PLTR','APP','MELI','SHOP','DASH','AXON','FTNT',
  'COIN','HOOD','MSTR','AFRM','SOFI','UPST','DKNG','RBLX','SNAP','U',
  'RIVN','LCID','CRWV','PENN','CHWY','W','WISH',
  'PYPL','INTU','ADBE','ISRG','REGN','VRTX','AMGN','GILD','MRNA',
  'SOXL','TQQQ','ARKK',
];

const DOUBLERS_UNIVERSE = [
  'NVDA','AMD','META','TSLA','AVGO','NFLX','AMZN','GOOGL',
  'CRWD','PANW','DDOG','PLTR','APP','MELI','SHOP','DASH','AXON','FTNT',
  'COIN','HOOD','MSTR','AFRM','SOFI','UPST','DKNG','RBLX','SNAP','U',
  'RIVN','LCID','CRWV','PENN','CHWY','W',
  'PYPL','INTU','ADBE','ISRG','REGN','VRTX','KLAC','LRCX','MRVL','MPWR',
  'SOXL','TQQQ','ARKK',
];

const STRONG_MOVERS_UNIVERSE = [
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','AMD','AVGO','NFLX',
  'CRWD','PANW','DDOG','PLTR','APP','MELI','SHOP','DASH','AXON','FTNT',
  'PYPL','INTU','ADBE','ISRG','KLAC','LRCX','MRVL','MPWR','QCOM','INTC',
  'COIN','HOOD','MSTR','AFRM','SOFI','UPST','DKNG','RBLX','SNAP','U',
  'RIVN','LCID','CRWV','PENN','CHWY',
  'JPM','BAC','GS','MS','WFC','V','MA','UNH','LLY','JNJ',
  'XOM','CVX','COP','SLB','OXY','BA','CAT','DE','GE',
  'WMT','HD','TGT','NKE','MCD','COST',
  'SOXL','SOXS','TQQQ','SQQQ','ARKK',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function enrichSymbol(symbol) {
  const [quote, fins] = await Promise.all([
    getQuote(symbol),
    getBasicFinancials(symbol),
  ]);
  if (!quote || !fins) return null;
  return { ...quote, ...fins };
}

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

// ─── Filters ──────────────────────────────────────────────────────────────────

const hasMinVolume  = (s) => (s.avgVolume10Day ?? 0) >= 5;
const isUpToday     = (s) => (s.changePercent ?? 0) > 0;
const isGappingUp   = (s) => {
  if (!s.open || !s.previousClose) return false;
  return ((s.open - s.previousClose) / s.previousClose) * 100 >= 1.5;
};
const isDoubler     = (s) => (s.weekReturn52 ?? 0) >= 80;
const isStrongMover = (s) => (s.changePercent ?? 0) >= 3 && (s.avgVolume10Day ?? 0) >= 10;

// ─── RVOL calculation ─────────────────────────────────────────────────────────
// volume from quote is intraday units; avgVolume10Day is in millions.
// We compare today's volume (also in millions) vs the 10-day average.
function calcRVOL(stock) {
  const avg = stock.avgVolume10Day;
  const todayVol = stock.volume; // raw shares from Finnhub quote
  if (!avg || !todayVol || avg === 0) return null;
  const todayVolM = todayVol / 1_000_000;
  return todayVolM / avg;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'gap-ups';

  const universeMap = {
    'gap-ups':       GAP_UP_UNIVERSE,
    'doublers':      DOUBLERS_UNIVERSE,
    'strong-movers': STRONG_MOVERS_UNIVERSE,
  };
  const universe = universeMap[tab] ?? GAP_UP_UNIVERSE;

  try {
    // Fetch stock data and earnings calendar in parallel
    const [all, earningsSymbols] = await Promise.all([
      batchFetch(universe),
      getUpcomingEarnings(),
    ]);

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

    // Attach RVOL and earnings flag to each result
    const enriched = results.slice(0, 20).map(s => ({
      ...s,
      gapPercent: s.open && s.previousClose
        ? (((s.open - s.previousClose) / s.previousClose) * 100).toFixed(2)
        : null,
      rvol: calcRVOL(s),
      hasEarnings: earningsSymbols.has(s.symbol),
    }));

    return Response.json({ results: enriched, tab, total: enriched.length });
  } catch (err) {
    console.error('Scan route error:', err.message);
    return Response.json({ results: [], tab, error: err.message }, { status: 500 });
  }
}
