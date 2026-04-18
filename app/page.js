import { getMarketRegime } from './lib/finnhub';
import MarketBanner from './components/MarketBanner';
import ScannerTabs from './components/ScannerTabs';

export const revalidate = 300; // refresh every 5 minutes

export default async function Home() {
  const regime = await getMarketRegime();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '0 32px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.5px',
          }}>
            P
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Pivot Scanner
          </span>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 32px' }}>
        {/* Page title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            Your setups. Found before the open.
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Scanning US equities against the Livermore framework. Min 5M avg volume. Daily uptrend only.
          </p>
        </div>

        {/* Market regime banner */}
        <MarketBanner
          regime={regime.regime}
          spyPrice={regime.spyPrice}
          dayChange={regime.dayChange}
          detail={regime.detail}
        />

        {/* Scanner */}
        <ScannerTabs />
      </main>
    </div>
  );
}
