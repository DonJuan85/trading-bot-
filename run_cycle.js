'use strict';

const { runTradingCycle } = require('./trader.js');

// Data from Robinhood MCP tools — 2026-07-06 pre-market
// Quotes: using last_non_reg_trade_price (more recent timestamp, Jul 6)
const quotes = {
  QQQM: { price: 297.08,   previousClose: 293.42 },
  SCHD: { price: 32.359,   previousClose: 32.39  },
  VOO:  { price: 687.62,   previousClose: 684.84 },
  NVDA: { price: 195.32,   previousClose: 194.83 },
  PLTR: { price: 128.649,  previousClose: 129.30 },
  RKLB: { price: 101.39,   previousClose: 100.46 },
  NBIS: { price: 221.75,   previousClose: 215.62 },
  FLNC: { price: 17.44,    previousClose: 17.00  },
  GLW:  { price: 200.549,  previousClose: 196.79 },
  INTC: { price: 123.989,  previousClose: 120.35 },
  ORCL: { price: 143.89,   previousClose: 140.27 },
};

// Positions from get_equity_positions
const positions = {
  NVDA: { avgCost: 210.20,  quantity: 1.041845  },
  PLTR: { avgCost: 142.19,  quantity: 0.773639  },
  FLNC: { avgCost: 24.57,   quantity: 3.053108  },
  RKLB: { avgCost: 115.39,  quantity: 1.473319  },
  QQQM: { avgCost: 295.66,  quantity: 1.149980  },
  SCHD: { avgCost: 32.39,   quantity: 6.638823  },
  GLW:  { avgCost: 192.08,  quantity: 0.104123  },
  INTC: { avgCost: 110.04,  quantity: 0.363518  },
  ORCL: { avgCost: 206.86,  quantity: 0.193364  },
  VOO:  { avgCost: 668.87,  quantity: 0.299014  },
};

// Total account equity from get_portfolio total_value
const totalPortfolioValue = 1543.09;

const timestamp = '2026-07-06T12:37:00.000Z';

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
  process.exit(1);
});
