'use strict';
// Daily dry-run cycle script — injests live Robinhood data passed as literals.
// LIVE_TRADING = false in trader.js; no orders are ever placed here.

const { runTradingCycle } = require('./trader.js');

// --- Live data from Robinhood MCP (fetched 2026-07-01 pre-market) ---

const timestamp = '2026-07-01T12:37:00.000Z';

// last_non_reg_trade_price (pre-market) is more recent than last_trade_price (June 30 close).
const quotes = {
  QQQM: { price: 300.79, previousClose: 302.97 },
  SCHD: { price: 31.70,  previousClose: 31.71  },
  VOO:  { price: 684.45, previousClose: 686.81  },
  NVDA: { price: 197.63, previousClose: 200.09  },
  PLTR: { price: 119.73, previousClose: 116.67  },
  RKLB: { price: 99.82,  previousClose: 101.65  },
  NBIS: { price: 263.00, previousClose: 276.17  },
  FLNC: { price: 20.32,  previousClose: 19.88   },
  GLW:  { price: 244.00, previousClose: 255.43  },
  INTC: { price: 136.15, previousClose: 139.63  },
  ORCL: { price: 147.48, previousClose: 146.55  },
};

// From get_equity_positions (account 647176189)
const positions = {
  NVDA: { quantity: 1.041845, avgCost: 210.20 },
  PLTR: { quantity: 0.773639, avgCost: 142.19 },
  FLNC: { quantity: 3.053108, avgCost: 24.57  },
  RKLB: { quantity: 1.473319, avgCost: 115.39 },
  QQQM: { quantity: 1.149980, avgCost: 295.66 },
  SCHD: { quantity: 6.638823, avgCost: 32.39  },
  GLW:  { quantity: 0.104123, avgCost: 192.08 },
  INTC: { quantity: 0.363518, avgCost: 110.04 },
  ORCL: { quantity: 0.193364, avgCost: 206.86 },
  VOO:  { quantity: 0.299014, avgCost: 668.87 },
};

// From get_portfolio (total_value field)
const totalPortfolioValue = 1538.99;

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then((result) => {
    console.log('\n[cycle complete] dryRun=' + result.dryRun + ' | decisions=' + result.reportData.decisions.length);
    process.exit(0);
  })
  .catch((err) => {
    console.error('[cycle error]', err);
    process.exit(1);
  });
