'use strict';

const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-20T12:37:00.000Z';

// Positions from Robinhood MCP get_equity_positions
const positions = {
  NVDA:  { quantity: 1.041845,  avgCost: 210.20 },
  PLTR:  { quantity: 0.773639,  avgCost: 142.19 },
  FLNC:  { quantity: 3.053108,  avgCost: 24.57  },
  RKLB:  { quantity: 1.473319,  avgCost: 115.39 },
  QQQM:  { quantity: 1.149980,  avgCost: 295.66 },
  SCHD:  { quantity: 6.638823,  avgCost: 32.39  },
  GLW:   { quantity: 0.104123,  avgCost: 192.08 },
  INTC:  { quantity: 0.363518,  avgCost: 110.04 },
  ORCL:  { quantity: 0.193364,  avgCost: 206.86 },
  VOO:   { quantity: 0.299014,  avgCost: 668.87 },
};

// Quotes from Robinhood MCP get_equity_quotes (pre-market prices, 2026-07-20)
// Using last_non_reg_trade_price (more recent than last_trade_price from 2026-07-17)
const quotes = {
  QQQM: { price: 289.01,  previousClose: 286.31 },
  SCHD: { price: 32.92,   previousClose: 32.91  },
  VOO:  { price: 686.24,  previousClose: 683.17 },
  NVDA: { price: 206.20,  previousClose: 202.81 },
  PLTR: { price: 130.45,  previousClose: 132.38 },
  RKLB: { price: 69.85,   previousClose: 67.62  },
  NBIS: { price: 185.74,  previousClose: 177.71 },
  FLNC: { price: 14.34,   previousClose: 14.07  },
  GLW:  { price: 159.25,  previousClose: 154.61 },
  INTC: { price: 97.98,   previousClose: 95.04  },
  ORCL: { price: 125.32,  previousClose: 126.41 },
};

// Total portfolio value from get_portfolio total_value
const totalPortfolioValue = 1472.35237969132;

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
