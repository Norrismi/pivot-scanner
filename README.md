# Pivot Scanner

Pre-market stock scanner built on the Livermore framework.
Your setups, found before the open.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add your Finnhub API key

Open `.env.local` and replace the placeholder:

```
FINNHUB_API_KEY=your_actual_key_here
```

Get a free key at https://finnhub.io — no credit card required.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000

---

## How it works

### Market Regime Banner
Fetches 60 days of SPY daily candles and calculates 9 EMA and 21 EMA.
- UPTREND: 9 EMA above 21 EMA, price above 9 EMA
- DOWNTREND: 9 EMA below 21 EMA, price below 9 EMA
- SIDEWAYS: anything in between

Check this before looking at any individual stock.

### Three Scans (Part 8 of the trading plan)

**Buyable Gap Ups** — Gapped up 1.5%+ at open, still up on the day, 5M+ avg volume.

**Recent Doublers** — Up 80%+ over 52 weeks, positive today. Proven momentum names.

**Strong Movers** — Up 3%+ today, 10M+ avg volume. Clear institutional activity.

### Scan Universe
Defined in `app/lib/finnhub.js` under `SCAN_UNIVERSE`.
Add or remove symbols there to customize.

---

## Data

Finnhub free tier. 2 API calls per symbol (quote + basic financials).
Refreshes every 5 minutes. Well within 60 calls/min free limit.

---

## Stack

- Next.js 16, App Router
- Tailwind CSS v4
- Finnhub REST API (free tier)
