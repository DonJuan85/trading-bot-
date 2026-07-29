'use strict';

const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-29T12:38:00.000Z';

// Pre-market prices (last_non_reg_trade_price, most recent as of ~12:38 UTC today)
const quotes = {
  QQQM: { price: 277.7128, previousClose: 278.14 },
  SCHD: { price: 34.0215,  previousClose: 33.89  },
  VOO:  { price: 680.69,   previousClose: 680.96  },
  NVDA: { price: 196.60,   previousClose: 197.01  },
  PLTR: { price: 123.8792, previousClose: 123.53  },
  RKLB: { price: 63.193,   previousClose: 63.89   },
  NBIS: { price: 169.00,   previousClose: 169.69  },
  FLNC: { price: 12.6408,  previousClose: 12.62   },
  GLW:  { price: 125.2709, previousClose: 126.01  },
  INTC: { price: 86.61,    previousClose: 86.30   },
  ORCL: { price: 119.8721, previousClose: 119.96  },
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

const totalPortfolioValue = 1422.57353753981;

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then((result) => {
  console.log('\n[CYCLE COMPLETE] dryRun=' + result.dryRun);
}).catch((err) => {
  console.error('[CYCLE ERROR]', err);
  process.exitCode = 1;
});
