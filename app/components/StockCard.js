'use client';
import { getTVSymbol } from '@/app/lib/exchangeMap';

const TV_CHART_ID = 'wXQvtdE5';
const TV_INTERVAL = '15';

function getSessionInfo() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const isWeekday = day >= 1 && day <= 5;
  if (!isWeekday) return 'closed';

  const preMarketStart  = 4  * 60;       // 4:00am ET
  const marketOpen      = 9  * 60 + 30;  // 9:30am ET
  const marketClose     = 16 * 60;       // 4:00pm ET
  const afterHoursEnd   = 20 * 60;       // 8:00pm ET

  if (timeInMinutes >= preMarketStart && timeInMinutes < marketOpen)  return 'premarket';
  if (timeInMinutes >= marketOpen     && timeInMinutes < marketClose)  return 'open';
  if (timeInMinutes >= marketClose    && timeInMinutes < afterHoursEnd) return 'afterhours';
  return 'closed';
}

const SESSION_CONFIG = {
  premarket:  { label: 'PRE-MARKET',  bg: 'rgba(234,179,8,0.13)',   border: 'rgba(234,179,8,0.25)',   dot: '#eab308', text: '#eab308' },
  afterhours: { label: 'AFTER HOURS', bg: 'rgba(139,92,246,0.13)',  border: 'rgba(139,92,246,0.25)',  dot: '#8b5cf6', text: '#8b5cf6' },
  closed:     { label: 'MARKET CLOSED', bg: 'rgba(136,136,168,0.08)', border: 'rgba(136,136,168,0.2)', dot: '#55556a', text: '#8888a8' },
};

export default function StockCard({ stock }) {
  const session = getSessionInfo();
  const isExtended = session === 'premarket' || session === 'afterhours';
  const isClosed   = session === 'closed';
  const showBanner = isExtended || isClosed;

  const cfg = SESSION_CONFIG[session];

  const change = stock.change ?? 0;
  const changePercent = stock.changePercent ?? 0;
  const isPositive = change >= 0;

  const changeColor = isPositive ? '#22c55e' : '#ef4444';
  const changeBg    = isPositive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';

  const pmChange    = stock.price && stock.previousClose ? stock.price - stock.previousClose : null;
  const pmChangePct = pmChange != null && stock.previousClose ? (pmChange / stock.previousClose) * 100 : null;
  const pmPositive  = pmChange != null ? pmChange >= 0 : true;

  const avgVol = stock.avgVolume10Day != null
    ? `${stock.avgVolume10Day.toFixed(1)}M`
    : stock.avgVolume3Month != null
    ? `${stock.avgVolume3Month.toFixed(1)}M`
    : 'N/A';

  const weekReturn = stock.weekReturn52;
  const gapPct     = stock.gapPercent != null ? parseFloat(stock.gapPercent) : null;

  const openChart = () => {
    const tvSymbol = getTVSymbol(stock.symbol);
    window.open(`https://www.tradingview.com/chart/${TV_CHART_ID}/?symbol=${tvSymbol}&interval=${TV_INTERVAL}`, '_blank');
  };

  return (
    <div
      onClick={openChart}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
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
      {/* Session banner */}
      {showBanner && (
        <div style={{
          background: cfg.bg,
          borderBottom: `1px solid ${cfg.border}`,
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: cfg.dot,
              boxShadow: isClosed ? 'none' : `0 0 6px ${cfg.dot}`,
            }} />
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: cfg.text }}>
              {cfg.label}
            </span>
          </div>

          {/* Extended hours: show current price vs prev close */}
          {isExtended && pmChangePct != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                ${Number(stock.price).toFixed(2)}
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: pmPositive ? cfg.text : '#ef4444',
                background: pmPositive ? cfg.bg : 'rgba(239,68,68,0.12)',
                padding: '1px 6px', borderRadius: '4px',
              }}>
                {pmPositive ? '+' : ''}{pmChangePct.toFixed(2)}% vs prev close
              </span>
            </div>
          )}

          {/* Closed: show last close price */}
          {isClosed && stock.previousClose && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Last close ${Number(stock.previousClose).toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

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
            <div style={{ fontSize: '15px', fontWeight: 600, color: isClosed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
              {stock.price ? `$${Number(stock.price).toFixed(2)}` : 'N/A'}
            </div>
            <div style={{
              fontSize: '12px', fontWeight: 600,
              color: changeColor, background: changeBg,
              padding: '1px 6px', borderRadius: '4px',
              marginTop: '3px', display: 'inline-block',
            }}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Earnings warning badge */}
        {stock.hasEarnings && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '6px',
            padding: '5px 10px',
          }}>
            <span style={{ fontSize: '13px' }}>⚠️</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.04em' }}>
              EARNINGS WITHIN 5 DAYS
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              — binary event risk, trade with caution
            </span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Stat label="Avg Vol" value={avgVol} />
          {stock.rvol != null && (
            <Stat
              label="RVOL"
              value={`${stock.rvol.toFixed(2)}x`}
              color={stock.rvol >= 2 ? '#22c55e' : stock.rvol >= 1 ? '#eab308' : 'var(--text-muted)'}
            />
          )}
          {gapPct != null && (
            <Stat label="Gap" value={`+${gapPct.toFixed(2)}%`} color="#eab308" />
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: '8px', borderTop: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isClosed ? 'var(--text-muted)' : isPositive ? '#22c55e' : '#ef4444',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isClosed ? 'Last session data' : isPositive ? 'Trending up today' : 'Down today'}
              {!isClosed && stock.open && stock.previousClose && (
                <span> &middot; Open ${stock.open.toFixed(2)} vs prev close ${stock.previousClose.toFixed(2)}</span>
              )}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            15m chart
          </span>
        </div>

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
