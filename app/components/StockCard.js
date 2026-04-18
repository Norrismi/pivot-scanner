'use client';

// NYSE-listed stocks in our scan universe — everything else defaults to NASDAQ
const NYSE_SYMBOLS = new Set([
  'JPM','BAC','GS','MS','WFC','BLK','C','AXP','V','MA',
  'XOM','CVX','COP','SLB','OXY','MPC','PSX','VLO',
  'UNH','JNJ','PFE','MRK',
  'WMT','HD','TGT','NKE','MCD','LOW',
  'SPY','IWM',
]);

function getTVSymbol(symbol) {
  const exchange = NYSE_SYMBOLS.has(symbol) ? 'NYSE' : 'NASDAQ';
  return `${exchange}:${symbol}`;
}

const TV_CHART_ID = 'wXQvtdE5';
const TV_INTERVAL = '15';

export default function StockCard({ stock }) {
  const change = stock.change ?? 0;
  const changePercent = stock.changePercent ?? 0;
  const isPositive = change >= 0;

  const changeColor = isPositive ? '#22c55e' : '#ef4444';
  const changeBg = isPositive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';

  const avgVol = stock.avgVolume10Day != null
    ? `${stock.avgVolume10Day.toFixed(1)}M`
    : stock.avgVolume3Month != null
    ? `${stock.avgVolume3Month.toFixed(1)}M`
    : 'N/A';

  const weekReturn = stock.weekReturn52;
  const gapPct = stock.gapPercent != null ? parseFloat(stock.gapPercent) : null;

  const openChart = () => {
    const tvSymbol = getTVSymbol(stock.symbol);
    const url = `https://www.tradingview.com/chart/${TV_CHART_ID}/?symbol=${tvSymbol}&interval=${TV_INTERVAL}`;
    window.open(url, '_blank');
  };

  return (
    <div
      onClick={openChart}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#f97316';
        e.currentTarget.style.background = 'var(--surface-2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--surface)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
              {stock.symbol}
            </div>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.35, flexShrink: 0 }}>
              <path d="M2 10L10 2M10 2H4M10 2V8" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {stock.weekHigh52 && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              52W: ${stock.weekLow52?.toFixed(2)} - ${stock.weekHigh52?.toFixed(2)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {stock.price ? `$${Number(stock.price).toFixed(2)}` : 'N/A'}
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: changeColor,
              background: changeBg,
              padding: '1px 6px',
              borderRadius: '4px',
              marginTop: '3px',
              display: 'inline-block',
            }}
          >
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Stat label="Avg Vol" value={avgVol} />
        {gapPct != null && (
          <Stat label="Gap" value={`+${gapPct.toFixed(2)}%`} color="#f97316" />
        )}
        {weekReturn != null && (
          <Stat
            label="52W Return"
            value={`${weekReturn > 0 ? '+' : ''}${weekReturn.toFixed(0)}%`}
            color={weekReturn >= 0 ? '#22c55e' : '#ef4444'}
          />
        )}
        {stock.high && stock.low && (
          <Stat label="Day Range" value={`$${stock.low.toFixed(2)} - $${stock.high.toFixed(2)}`} />
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '8px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isPositive ? '#22c55e' : '#ef4444',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isPositive ? 'Trending up today' : 'Down today'}
            {stock.open && stock.previousClose && (
              <span> &middot; Open ${stock.open.toFixed(2)} vs prev close ${stock.previousClose.toFixed(2)}</span>
            )}
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          15m chart
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: color || 'var(--text-secondary)', marginTop: '1px' }}>
        {value}
      </div>
    </div>
  );
}