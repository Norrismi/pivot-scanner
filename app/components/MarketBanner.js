'use client';

const REGIME_CONFIG = {
  UPTREND: {
    label: 'UPTREND',
    sub: 'Bias is long. Buy dips, wait for pullbacks to support.',
    dot: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    text: '#22c55e',
  },
  DOWNTREND: {
    label: 'DOWNTREND',
    sub: 'Do not go long. Sell rallies only.',
    dot: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    text: '#ef4444',
  },
  SIDEWAYS: {
    label: 'SIDEWAYS',
    sub: 'Stay out. Protect capital. Do not force trades.',
    dot: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.25)',
    text: '#eab308',
  },
  UNKNOWN: {
    label: 'LOADING',
    sub: 'Fetching SPY data...',
    dot: '#8888a8',
    bg: 'rgba(136,136,168,0.08)',
    border: 'rgba(136,136,168,0.25)',
    text: '#8888a8',
  },
};

export default function MarketBanner({ regime, spyPrice, dayChange, detail }) {
  const cfg = REGIME_CONFIG[regime] || REGIME_CONFIG.UNKNOWN;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '10px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: cfg.dot,
            boxShadow: `0 0 8px ${cfg.dot}`,
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
              MARKET REGIME
            </span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: cfg.text, letterSpacing: '0.04em' }}>
              {cfg.label}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {cfg.sub}
          </div>
        </div>
      </div>

      {spyPrice && (
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <span>SPY <strong style={{ color: 'var(--text-primary)' }}>${spyPrice}</strong></span>
          {dayChange && (
            <span style={{ color: parseFloat(dayChange) >= 0 ? '#22c55e' : '#ef4444' }}>
              {parseFloat(dayChange) >= 0 ? '+' : ''}{dayChange}% today
            </span>
          )}
          {detail && (
            <span style={{ color: 'var(--text-muted)' }}>{detail}</span>
          )}
        </div>
      )}
    </div>
  );
}
