const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

// Rate-limit safe fetch — Finnhub free tier: 60 calls/min
export async function finnFetch(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}token=${FINNHUB_KEY}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Finnhub ${path} failed: ${res.status}`);
  return res.json();
}

// Calculate EMA for a series of closing prices
export function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

// Determine market regime using free-tier endpoints only:
// SPY quote (current price vs prev close) + basic financials (52W data)
export async function getMarketRegime() {
  try {
    const [quote, fins] = await Promise.all([
      finnFetch('/quote?symbol=SPY'),
      finnFetch('/stock/metric?symbol=SPY&metric=all'),
    ]);

    const price = quote.c;
    const prevClose = quote.pc;
    const m = fins.metric || {};

    const high52 = m['52WeekHigh'];
    const low52 = m['52WeekLow'];
    const return13w = m['13WeekPriceReturnDaily'];  // ~3 month trend
    const return26w = m['26WeekPriceReturnDaily'];  // ~6 month trend

    if (!price || !high52 || !low52) {
      return { regime: 'UNKNOWN', spyPrice: null, detail: null };
    }

    // Position in 52-week range (0 = at low, 1 = at high)
    const rangePosition = (price - low52) / (high52 - low52);

    // Regime logic using trend returns and range position
    let regime = 'SIDEWAYS';
    if (return13w > 2 && return26w > 5 && rangePosition > 0.5) {
      regime = 'UPTREND';
    } else if (return13w < -2 && return26w < -5 && rangePosition < 0.5) {
      regime = 'DOWNTREND';
    }

    const dayChange = prevClose ? (((price - prevClose) / prevClose) * 100).toFixed(2) : null;

    return {
      regime,
      spyPrice: price?.toFixed(2),
      detail: `13W: ${return13w?.toFixed(1)}%  |  26W: ${return26w?.toFixed(1)}%  |  52W range: ${(rangePosition * 100).toFixed(0)}th pct`,
      dayChange,
    };
  } catch (e) {
    console.error('getMarketRegime error:', e.message);
    return { regime: 'UNKNOWN', spyPrice: null, detail: null };
  }
}

// Fetch a real-time quote for a symbol
// Returns: { symbol, price, change, changePercent, volume, open, previousClose }
export async function getQuote(symbol) {
  try {
    const d = await finnFetch(`/quote?symbol=${symbol}`);
    return {
      symbol,
      price: d.c,
      change: d.d,
      changePercent: d.dp,
      volume: d.v,        // current day volume (not available in free quote, will be 0)
      open: d.o,
      previousClose: d.pc,
      high: d.h,
      low: d.l,
    };
  } catch {
    return null;
  }
}

// Fetch basic financials (52-week return, avg volume) for a symbol
export async function getBasicFinancials(symbol) {
  try {
    const d = await finnFetch(`/stock/metric?symbol=${symbol}&metric=all`);
    const m = d.metric || {};
    return {
      symbol,
      avgVolume10Day: m['10DayAverageTradingVolume'],   // in millions
      avgVolume3Month: m['3MonthAverageTradingVolume'], // in millions
      weekReturn52: m['52WeekPriceReturnDaily'],
      weekHigh52: m['52WeekHigh'],
      weekLow52: m['52WeekLow'],
    };
  } catch {
    return null;
  }
}

// Curated watchlist of high-liquidity US stocks to scan
// These are well-known liquid names across sectors — easily extendable
export const SCAN_UNIVERSE = [
// Mega Cap Tech
'AAPL', 'AMZN', 'AVGO', 'GOOGL', 'META', 'MSFT', 'NVDA', 'ORCL', 'TSLA',

// Semiconductors & Hardware
'ADI', 'ALAB', 'AMD', 'ARMK', 'AEHR', 'FN', 'ICHR', 'MCHP', 'MPWR', 
'VIAV', 'VSAT', 'VSH',

// Financials
'AXP', 'BAC', 'BLK', 'C', 'GS', 'JPM', 'MA', 'MS', 'SCHW', 'V', 'WFC',

// Healthcare / Biotech
'ABBV', 'AMGN', 'BIIB', 'GILD', 'JNJ', 'LLY', 'MRK', 'MRNA', 'PFE', 'UNH',

// Energy
'COP', 'CVX', 'MPC', 'OXY', 'PSX', 'SLB', 'VLO', 'XOM',

// Consumer / Retail
'COST', 'HD', 'LOW', 'MCD', 'NKE', 'SBUX', 'TGT', 'WMT',

// Growth / High Momentum
'ABNB', 'AFRM', 'ASTS', 'BE', 'CHWY', 'CIEN', 'COIN', 'CRDO', 
'CRWV', 'DKNG', 'ENPH', 'FORM', 'GME', 'HOOD', 'HUT', 'IBRX', 'KULR', 
'LCID', 'LGN', 'NET', 'NOW', 'PL', 'PLTR', 'POWL', 'RBLX', 'RIVN', 
'RKLB', 'RLAY', 'SNAP', 'SOFI', 'STZ', 'U', 'UPST', 'W', 'WISH',

// Industrials / Other
'ASX', 'BW', 'CE', 'FDX', 'HUN', 'JBHT', 'KB', 'LAMR', 'MTZ', 'NOK', 
'SEI', 'SKYQ',

// Small / Speculative
'AXIA', 'JKS', 'NBIS', 'SNDK',

// ETFs & Leveraged
'ARKK', 'IWM', 'QQQ', 'SOXL', 'SOXS', 'SPY', 'SQQQ', 'TQQQ'
];

