'use strict';

const { runTradingCycle } = require('./trader.js');

const quotes = {
  QQQM: { price: 285.36, previousClose: 284.98 },
  SCHD: { price: 32.86, previousClose: 32.80 },
  VOO:  { price: 680.28, previousClose: 678.61 },
  NVDA: { price: 208.26, previousClose: 208.76 },
  PLTR: { price: 124.75, previousClose: 123.37 },
  RKLB: { price: 70.55,  previousClose: 69.99  },
  NBIS: { price: 223.63, previousClose: 220.97 },
  FLNC: { price: 14.55,  previousClose: 14.42  },
  GLW:  { price: 156.00, previousClose: 156.06 },
  INTC: { price: 103.54, previousClose: 100.23 },
  ORCL: { price: 122.62, previousClose: 120.04 },
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

const totalPortfolioValue = 1467.02;
const timestamp = new Date().toISOString();

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then(() => { console.log('\n[Cycle complete]'); })
  .catch((err) => { console.error('Cycle error:', err); process.exitCode = 1; });
