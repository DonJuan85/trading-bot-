'use strict';
const { runTradingCycle } = require('./trader.js');

// Premarket prices as of 2026-07-15 ~12:36 UTC (most recent non-reg trade)
const timestamp = '2026-07-15T07:36:00-05:00';

const quotes = {
  QQQM: { price: 297.83, previousClose: 296.31 },
  SCHD: { price: 32.26,  previousClose: 32.20  },
  VOO:  { price: 692.60, previousClose: 691.10  },
  NVDA: { price: 211.50, previousClose: 211.80  },
  PLTR: { price: 134.14, previousClose: 133.72  },
  RKLB: { price: 79.84,  previousClose: 78.81   },
  NBIS: { price: 200.00, previousClose: 194.09  },
  FLNC: { price: 15.79,  previousClose: 15.61   },
  GLW:  { price: 188.78, previousClose: 187.64  },
  INTC: { price: 110.20, previousClose: 107.76  },
  ORCL: { price: 129.55, previousClose: 127.94  },
};

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

const totalPortfolioValue = 1517.47;

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
