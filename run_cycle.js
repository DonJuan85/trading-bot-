'use strict';

const { runTradingCycle } = require('./trader.js');

// Pre-market prices (more recent timestamp than regular session close)
const quotes = {
  QQQM: { price: 295.00,  previousClose: 297.52 },
  SCHD: { price: 32.44,   previousClose: 32.24  },
  VOO:  { price: 689.66,  previousClose: 690.62  },
  NVDA: { price: 192.4526,previousClose: 195.55  },
  PLTR: { price: 134.5533,previousClose: 132.54  },
  RKLB: { price: 91.70,   previousClose: 93.09   },
  NBIS: { price: 208.00,  previousClose: 213.02  },
  FLNC: { price: 17.4434, previousClose: 17.82   },
  GLW:  { price: 187.99,  previousClose: 194.80  },
  INTC: { price: 117.9999,previousClose: 122.20  },
  ORCL: { price: 145.25,  previousClose: 143.76  },
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

const totalPortfolioValue = 1525.84;
const timestamp = '2026-07-07T07:30:00-05:00';

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then(() => { console.log('\n[run_cycle] Done.'); })
  .catch((err) => { console.error('[run_cycle] ERROR:', err); process.exitCode = 1; });
