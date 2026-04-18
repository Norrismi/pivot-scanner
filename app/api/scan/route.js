import { getQuote, getBasicFinancials } from '@/app/lib/finnhub';

// ─── Per-scan universes ───────────────────────────────────────────────────────
// Each scan targets only the names that realistically produce that setup.
// Keeping these lists tight eliminates dead API calls and speeds up results.

// Buyable Gap Ups: volatile growth, momentum, and high-beta tech.
// Blue chips rarely gap 1.5%+ meaningfully — skip them.
const GAP_UP_UNIVERSE = [
  'NVDA','AMD','META','TSLA','AMZN','GOOGL','MSFT','AAPL','AVGO','NFLX',
  'CRWD','PANW','DDOG','PLTR','APP','MELI','SHOP','DASH','AXON','FTNT',
  'COIN','HOOD','MSTR','AFRM','SOFI','UPST','DKNG','RBLX','SNAP','U',
  'RIVN','LCID','CRWV','PENN','CHWY','W','WISH',
  'PYPL','INTU','ADBE','ISRG','REGN','VRTX','AMGN','GILD','MRNA',
  'SOXL','TQQQ','ARKK',
];

// Recent Doublers: growth and momentum names capable of 80%+ 52W returns.
// Utilities, staples, and financials almost never qualify.
const DOUBLERS_UNIVERSE = [
  'NVDA','AMD','META','TSLA','AVGO','NFLX','AMZN','GOOGL',
  'CRWD','PANW','DDOG','PLTR','APP','MELI','SHOP','DASH','AXON','FTNT',
  'COIN','HOOD','MSTR','AFRM','SOFI','UPST','DKNG','RBLX','SNAP','U',
  'RIVN','LCID','CRWV','PENN','CHWY','W',
  'PYPL','INTU','ADBE','ISRG','REGN','VRTX','KLAC','LRCX','MRVL','MPWR',
  'CELH','SMCI','FICO','DECK','BLDR','SOXL','TQQQ','ARKK',
];

// Strong Movers: broad universe including large caps — big names move on
// earnings, macro events, and news. Volume filter does the heavy lifting here.
const STRONG_MOVERS_UNIVERSE = [
  // Mega cap
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','AMD','AVGO','NFLX',
  // Growth / tech
  'CRWD','PANW','DDOG','PLTR','APP','MELI','SHOP','DASH','AXON','FTNT',
  'PYPL','INTU','ADBE','ISRG','KLAC','LRCX','MRVL','MPWR','QCOM','INTC',
  // Momentum
  'COIN','HOOD','MSTR','AFRM','SOFI','UPST','DKNG','RBLX','SNAP','U',
  'RIVN','LCID','CRWV','PENN','CHWY',
  // Large cap movers
  'JPM','BAC','GS','MS','WFC','V','MA','UNH','LLY','JNJ',
  'XOM','CVX','COP','SLB','OXY','BA','CAT','DE','GE',
  'WMT','HD','TGT','NKE','MCD','COST',
  // Leveraged ETFs — move big every day
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

const hasMinVolume   = (s) => (s.avgVolume10Day ?? 0) >= 5;
const isUpToday      = (s) => (s.changePercent ?? 0) > 0;
const isGappingUp    = (s) => {
  if (!s.open || !s.previousClose) return false;
  return ((s.open - s.previousClose) / s.previousClose) * 100 >= 1.5;
};
const isDoubler      = (s) => (s.weekReturn52 ?? 0) >= 80;
const isStrongMover  = (s) => (s.changePercent ?? 0) >= 3 && (s.avgVolume10Day ?? 0) >= 10;

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'gap-ups';

  // Pick the right universe for this scan
  const universeMap = {
    'gap-ups':       GAP_UP_UNIVERSE,
    'doublers':      DOUBLERS_UNIVERSE,
    'strong-movers': STRONG_MOVERS_UNIVERSE,
  };
  const universe = universeMap[tab] ?? GAP_UP_UNIVERSE;

  try {
    const all    = await batchFetch(universe);
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