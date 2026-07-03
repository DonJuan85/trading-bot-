'use strict';

const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-03T07:00:00-05:00';

const quotes = {
  QQQM: 293.4425,
  SCHD: 32.385,
  VOO:  684.6199,
  NVDA: 194.51,
  PLTR: 129.17,
  RKLB: 100.50,
  NBIS: 215.62,
  FLNC: 17.01,
  GLW:  196.67,
  INTC: 120.41,
  ORCL: 140.285,
  // watchlist (pass minimal placeholders so engine 3 can run)
  MU:   null,
  AVGO: null,
  KTOS: null,
  MP:   null,
  OKLO: null,
  VST:  null,
  APP:  null,
  SOUN: null,
  AMD:  null,
  LMT:  null,
  DELL: null,
};

const positions = {
  NVDA: { quantity: 1.041845,  avgCost: 210.20 },
  PLTR: { quantity: 0.773639,  avgCost: 142.19 },
  FLNC: { quantity: 3.053108,  avgCost: 24.57  },
  RKLB: { quantity: 1.473319,  avgCost: 115.39 },
  QQQM: { quantity: 1.149980,  avgCost: 295.66 },
  SCHD: { quantity: 6.638823,  avgCost: 32.39  },
  GLW:  { quantity: 0.104123,  avgCost: 192.08 },
  INTC: { quantity: 0.363518,  avgCost: 110.04 },
  ORCL: { quantity: 0.193364,  avgCost: 206.86 },
  VOO:  { quantity: 0.299014,  avgCost: 668.87 },
};

const totalPortfolioValue = 1531.099317714135;

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then(({ reportText }) => {
  console.log('\n[run_cycle.js] Cycle complete. trading_log.txt and trader_state.json updated.');
}).catch((err) => {
  console.error('[run_cycle.js] ERROR:', err);
  process.exitCode = 1;
});
