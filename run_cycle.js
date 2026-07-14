'use strict';

const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-14T12:37:00.000Z';

// Prices: using last_non_reg_trade_price (premarket 2026-07-14, more recent than yesterday close)
// with previousClose from official settled close (2026-07-13)
const quotes = {
  QQQM: { price: 296.89,  previousClose: 293.06 },
  SCHD: { price: 32.62,   previousClose: 32.56  },
  VOO:  { price: 691.28,  previousClose: 688.50  },
  NVDA: { price: 207.165, previousClose: 203.53  },
  PLTR: { price: 123.687, previousClose: 130.04  },
  RKLB: { price: 79.50,   previousClose: 76.73   },
  NBIS: { price: 219.10,  previousClose: 210.51  },
  FLNC: { price: 15.72,   previousClose: 15.16   },
  GLW:  { price: 193.68,  previousClose: 183.11  },
  INTC: { price: 107.45,  previousClose: 103.12  },
  ORCL: { price: 129.94,  previousClose: 131.54  },
};

// Positions from get_equity_positions
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

// equity_value from get_portfolio (excludes crypto/options, tracks equity positions only)
const totalPortfolioValue = 1325.67;

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Cycle error:', err);
  process.exit(1);
});
