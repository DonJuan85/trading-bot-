'use strict';
const { runTradingCycle } = require('./trader.js');

const quotes = {
  QQQM: { price: 285.52, previousClose: 281.68 },
  SCHD: { price: 33.31, previousClose: 33.29 },
  VOO:  { price: 684.92, previousClose: 679.14 },
  NVDA: { price: 208.12, previousClose: 206.84 },
  PLTR: { price: 125.20, previousClose: 122.92 },
  RKLB: { price: 66.20,  previousClose: 63.91  },
  NBIS: { price: 197.14, previousClose: 187.77 },
  FLNC: { price: 13.78,  previousClose: 13.44  },
  GLW:  { price: 148.32, previousClose: 146.65 },
  INTC: { price: 93.54,  previousClose: 92.32  },
  ORCL: { price: 117.99, previousClose: 114.99 },
};

const positions = {
  NVDA: { avgCost: 210.20, quantity: 1.041845 },
  PLTR: { avgCost: 142.19, quantity: 0.773639 },
  FLNC: { avgCost: 24.57,  quantity: 3.053108 },
  RKLB: { avgCost: 115.39, quantity: 1.473319 },
  QQQM: { avgCost: 295.66, quantity: 1.149980 },
  SCHD: { avgCost: 32.39,  quantity: 6.638823 },
  GLW:  { avgCost: 192.08, quantity: 0.104123 },
  INTC: { avgCost: 110.04, quantity: 0.363518 },
  ORCL: { avgCost: 206.86, quantity: 0.193364 },
  VOO:  { avgCost: 668.87, quantity: 0.299014 },
};

const totalPortfolioValue = 1279.84; // equity value from portfolio
const timestamp = '2026-07-27T12:38:00.000Z';

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then(() => process.exit(0))
  .catch(err => { console.error('ERROR:', err); process.exit(1); });
