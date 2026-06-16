'use strict';
const { runTradingCycle } = require('./trader.js');

// Prices from Robinhood MCP get_equity_quotes (last_trade_price = official close 2026-06-15)
const quotes = {
  QQQM: 306.27,
  SCHD: 32.62,
  VOO:  693.93,
  NVDA: 212.45,
  PLTR: 134.70,
  RKLB: 109.24,
  NBIS: 260.15,
  FLNC: 24.17,
  GLW:  187.92,
  INTC: 127.78,
  ORCL: 192.66,
};

// From Robinhood MCP get_equity_positions (account 647176189)
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

// From Robinhood MCP get_portfolio (account 647176189)
const totalPortfolioValue = 1634.07;

const timestamp = new Date().toISOString();

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then(() => { console.log('\n✅ Dry-run cycle complete.'); })
  .catch(err => { console.error('❌ Cycle error:', err); process.exitCode = 1; });
