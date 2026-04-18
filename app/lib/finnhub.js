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

// Scan universe — mirrors EXCHANGE_MAP in exchangeMap.js exactly.
// When adding a new symbol, add it to both files.
export const SCAN_UNIVERSE = [
  // NASDAQ
  'AAPL','ABNB','ADBE','ADI','ADP','ADSK','AEP','ALNY','AMAT','AMD',
  'AMGN','AMZN','APP','ARM','ASML','AVGO','AXON','BKNG','BKR','CCEP',
  'CDNS','CEG','CHTR','CMCSA','COST','CPRT','CRWD','CSCO','CSGP','CSX',
  'CTAS','CTSH','DASH','DDOG','DXCM','EA','EXC','FANG','FAST','FER',
  'FTNT','GEHC','GILD','GOOG','GOOGL','HON','IDXX','INSM','INTC','INTU',
  'ISRG','KDP','KHC','KLAC','LIN','LRCX','MAR','MCHP','MDLZ','MELI',
  'META','MNST','MPWR','MRVL','MSFT','MU','NFLX','NVDA','NXPI','ODFL',
  'ORLY','PANW','PAYX','PCAR','PDD','PEP','PYPL','QCOM','REGN','ROP',
  'ROST','SBUX','SHOP','SNPS','STX','TEAM','TMUS','TRI','TSLA','TTWO',
  'TXN','VRSK','VRTX','WBD','WDAY','WDC','XEL','ZS',
  // NYSE
  'ABBV','AIG','ALL','AFL','ALLY','AMT','AMP','APD','AVB','AWK',
  'AXP','BA','BAC','BG','BK','BLK','BMY','BX','C','CAT',
  'CB','CCI','CFG','CI','CL','CLX','CMA','COF','COP','CPB',
  'CTVA','CVX','D','DAL','DE','DELL','DFS','DHR','DIS','DLR',
  'DUK','ECL','ED','EIX','ELV','EMR','EOG','EQIX','EQR','ESS',
  'ETN','EXR','F','FDX','FE','FITB','GD','GE','GIS','GM',
  'GS','HBAN','HCA','HD','HMC','IBM','ITW','INVH','JNJ',
  'JPM','K','KEY','KMB','KMI','KO','LHX','LLY','LMT','LOW',
  'LUV','MA','MAA','MCD','MDT','MET','MKC','MMM','MO','MPC',
  'MRK','MS','MTB','NCLH','NEE','NKE','NOC','O','OXY','PCG',
  'PEG','PFE','PG','PGR','PH','PLD','PM','PNC','PRU','PSA',
  'PSX','RCL','RF','RSG','RTX','SCHW','SHW','SLB','SO','SPG',
  'SPGI','SRE','STLA','SYF','SYK','T','TFC','TGT','TJX','TM',
  'TMO','UAL','UNH','UNP','UPS','USB','V','VICI','VLO','VST',
  'VZ','WEC','WFC','WM','WMB','WMT','XOM','ZION',
  // High-momentum / growth
  'MSTR','PLTR','AFRM','COIN','CRWV','DKNG','HOOD','LCID','PENN','RIVN',
  'SOFI','UPST','WISH','CHWY','RBLX','SNAP','U','W',
  // ETFs
  'SQQQ','TQQQ','ARKK','IWM','QQQ','SOXL','SOXS','SPY',
];


// Fetch earnings calendar for a date range
// Returns a Set of symbols reporting earnings within the next 5 days
export async function getUpcomingEarnings() {
  try {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 5);

    const from = today.toISOString().split('T')[0];
    const to   = future.toISOString().split('T')[0];

    const data = await finnFetch(`/calendar/earnings?from=${from}&to=${to}`);
    const symbols = new Set();
    (data.earningsCalendar || []).forEach(e => {
      if (e.symbol) symbols.add(e.symbol);
    });
    return symbols;
  } catch {
    return new Set();
  }
}
