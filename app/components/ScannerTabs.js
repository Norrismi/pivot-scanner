'use client';

import { useState, useEffect, useCallback } from 'react';
import StockCard from './StockCard';

const TABS = [
  {
    id: 'gap-ups',
    label: 'Buyable Gap Ups',
    desc: 'Stocks gapping up on strong volume. Institutional conviction before the bell.',
  },
  {
    id: 'doublers',
    label: 'Recent Doublers',
    desc: 'Stocks up 80%+ over 52 weeks with momentum still intact.',
  },
  {
    id: 'strong-movers',
    label: 'Strong Movers',
    desc: 'High-volume stocks making aggressive price moves. Institutional activity confirmed.',
  },
];

export default function ScannerTabs() {
  const [activeTab, setActiveTab] = useState('gap-ups');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchScan = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scan?tab=${tab}`);
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      setResults(data.results || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Unable to load scan results. Check your API key.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScan(activeTab);
  }, [activeTab, fetchScan]);

  const activeConfig = TABS.find(t => t.id === activeTab);

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#f97316' : 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #f97316' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}

        {/* Refresh button */}
        <button
          onClick={() => fetchScan(activeTab)}
          style={{
            marginLeft: 'auto',
            padding: '8px 14px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            alignSelf: 'center',
            marginBottom: '8px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          Refresh
        </button>
      </div>

      {/* Scan description */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {activeConfig?.desc}
        </p>
        {lastUpdated && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Last updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                height: '130px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{
          padding: '20px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px',
          color: '#ef4444',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '14px',
          border: '1px dashed var(--border)',
          borderRadius: '10px',
        }}>
          No results found for this scan right now.
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {results.length} results found
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '12px',
          }}>
            {results.map(stock => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
