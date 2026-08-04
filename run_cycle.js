'use strict';

const { runTradingCycle } = require('./trader.js');

const quotes = {
  QQQM: { price: 291.37, previousClose: 288.27 },
  SCHD: { price: 33.54,  previousClose: 33.56  },
  VOO:  { price: 698.94, previousClose: 696.40  },
  NVDA: { price: 210.00, previousClose: 206.64  },
  PLTR: { price: 145.11, previousClose: 125.65  },
  RKLB: { price: 73.42,  previousClose: 70.43   },
  NBIS: { price: 215.78, previousClose: 212.58  },
  FLNC: { price: 15.78,  previousClose: 14.56   },
  GLW:  { price: 157.50, previousClose: 146.64  },
  INTC: { price: 95.21,  previousClose: 91.00   },
  ORCL: { price: 139.92, previousClose: 141.85  },
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

const totalPortfolioValue = 1506.373507947005;
const timestamp = new Date().toISOString();

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then(result => {
  console.log('\nCycle complete. dryRun=' + result.dryRun);
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exitCode = 1;
});
