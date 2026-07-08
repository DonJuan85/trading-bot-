'use strict';

const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-08T12:36:00.000Z';

// Prices: use last_non_reg_trade_price (pre-market, more recent timestamp today)
// with previous_close for change% calculation
const quotes = {
  QQQM:  { price: 289.83, previousClose: 292.14 },
  SCHD:  { price: 32.588, previousClose: 32.54  },
  VOO:   { price: 683.36, previousClose: 687.08 },
  NVDA:  { price: 194.89, previousClose: 196.93 },
  PLTR:  { price: 130.85, previousClose: 134.37 },
  RKLB:  { price: 86.10,  previousClose: 83.41  },
  NBIS:  { price: 189.70, previousClose: 195.19 },
  FLNC:  { price: 15.721, previousClose: 16.20  },
  GLW:   { price: 180.97, previousClose: 185.38 },
  INTC:  { price: 108.72, previousClose: 110.39 },
  ORCL:  { price: 139.68, previousClose: 141.60 },
};

const positions = {
  NVDA:  { quantity: 1.041845, avgCost: 210.20 },
  PLTR:  { quantity: 0.773639, avgCost: 142.19 },
  FLNC:  { quantity: 3.053108, avgCost: 24.57  },
  RKLB:  { quantity: 1.473319, avgCost: 115.39 },
  QQQM:  { quantity: 1.149980, avgCost: 295.66 },
  SCHD:  { quantity: 6.638823, avgCost: 32.39  },
  GLW:   { quantity: 0.104123, avgCost: 192.08 },
  INTC:  { quantity: 0.363518, avgCost: 110.04 },
  ORCL:  { quantity: 0.193364, avgCost: 206.86 },
  VOO:   { quantity: 0.299014, avgCost: 668.87 },
};

// Total equity from get_portfolio (equity_value only, not including crypto/cash)
// Using total_value as totalPortfolioValue per spec
const totalPortfolioValue = 1493.369965;

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then((result) => {
  console.log('\n[run_cycle.js] Cycle complete. dryRun=' + result.dryRun);
}).catch((err) => {
  console.error('[run_cycle.js] ERROR:', err);
  process.exitCode = 1;
});
