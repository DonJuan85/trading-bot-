'use strict';

const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-22T07:30:00-05:00';

const positions = {
  NVDA: { avgCost: 210.20, quantity: 1.041845 },
  PLTR: { avgCost: 142.19, quantity: 0.773639 },
  FLNC: { avgCost: 24.57, quantity: 3.053108 },
  RKLB: { avgCost: 115.39, quantity: 1.473319 },
  QQQM: { avgCost: 295.66, quantity: 1.14998 },
  SCHD: { avgCost: 32.39, quantity: 6.638823 },
  GLW: { avgCost: 192.08, quantity: 0.104123 },
  INTC: { avgCost: 110.04, quantity: 0.363518 },
  ORCL: { avgCost: 206.86, quantity: 0.193364 },
  VOO: { avgCost: 668.87, quantity: 0.299014 },
};

// Quotes: last_trade_price (official prior-session close) + previousClose
const quotes = {
  QQQM:  { price: 291.84,  previousClose: 291.90 },
  SCHD:  { price: 32.815,  previousClose: 32.820 },
  VOO:   { price: 687.84,  previousClose: 687.87 },
  NVDA:  { price: 207.18,  previousClose: 207.29 },
  PLTR:  { price: 132.61,  previousClose: 132.66 },
  RKLB:  { price: 69.13,   previousClose: 69.12  },
  NBIS:  { price: 217.01,  previousClose: 216.92 },
  FLNC:  { price: 15.28,   previousClose: 15.28  },
  GLW:   { price: 162.43,  previousClose: 162.41 },
  INTC:  { price: 105.45,  previousClose: 105.45 },
  ORCL:  { price: 127.07,  previousClose: 127.05 },
  MU:    { price: 969.65,  previousClose: 970.82 },
  AVGO:  { price: 386.13,  previousClose: 386.50 },
  KTOS:  { price: 48.215,  previousClose: 48.21  },
  MP:    { price: 46.31,   previousClose: 46.30  },
  OKLO:  { price: 44.15,   previousClose: 44.13  },
  VST:   { price: 162.27,  previousClose: 162.33 },
  APP:   { price: 428.36,  previousClose: 428.69 },
  SOUN:  { price: 6.55,    previousClose: 6.555  },
  AMD:   { price: 544.46,  previousClose: 544.43 },
  LMT:   { price: 506.84,  previousClose: 507.09 },
  DELL:  { price: 404.05,  previousClose: 404.15 },
};

// Total portfolio value (total_value from get_portfolio including equity + crypto + cash)
const totalPortfolioValue = 1486.85;

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then(() => {
    console.log('\n[run_cycle] Dry run complete. trading_log.txt and trader_state.json updated.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[run_cycle] ERROR:', err);
    process.exit(1);
  });
