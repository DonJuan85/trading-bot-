'use strict';
const { runTradingCycle } = require('./trader.js');

const quotes = {
  QQQM: 285.46,
  SCHD: 33.15,
  VOO:  684.08,
  NVDA: 202.19,
  PLTR: 130.78,
  RKLB: 66.03,
  NBIS: 167.14,
  FLNC: 13.93,
  GLW:  151.45,
  INTC: 92.72,
  ORCL: 120.91,
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

const totalPortfolioValue = 1451.63;
const timestamp = '2026-07-17T12:37:00.000Z';

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
