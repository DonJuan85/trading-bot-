'use strict';
const { runTradingCycle } = require('./trader.js');

const quotes = {
  QQQM: { price: 300.91, previousClose: 298.61 },
  SCHD: { price: 31.96,  previousClose: 31.85  },
  VOO:  { price: 688.82, previousClose: 685.46  },
  NVDA: { price: 198.48, previousClose: 197.58  },
  PLTR: { price: 128.06, previousClose: 125.73  },
  RKLB: { price: 102.60, previousClose: 100.07  },
  NBIS: { price: 238.47, previousClose: 229.18  },
  FLNC: { price: 18.75,  previousClose: 18.36   },
  GLW:  { price: 227.80, previousClose: 220.63  },
  INTC: { price: 130.67, previousClose: 127.02  },
  ORCL: { price: 143.60, previousClose: 142.50  },
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

const totalPortfolioValue = 1377.433681253; // equity_value from get_portfolio

runTradingCycle({
  timestamp: '2026-07-02T07:36:00-05:00',
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then(() => {
  console.log('\n[DRY RUN COMPLETE] LIVE_TRADING=false — no orders placed.');
}).catch((err) => {
  console.error('Cycle error:', err);
  process.exitCode = 1;
});
