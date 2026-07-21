'use strict';

const { runTradingCycle } = require('./trader.js');

const quotes = {
  QQQM:  { price: 290.20,  previous_close: 286.58 },
  SCHD:  { price: 32.76,   previous_close: 32.75  },
  VOO:   { price: 684.63,  previous_close: 682.21 },
  NVDA:  { price: 205.71,  previous_close: 203.28 },
  PLTR:  { price: 133.67,  previous_close: 134.85 },
  RKLB:  { price: 67.03,   previous_close: 65.74  },
  NBIS:  { price: 194.50,  previous_close: 182.62 },
  FLNC:  { price: 14.62,   previous_close: 14.28  },
  GLW:   { price: 161.00,  previous_close: 153.10 },
  INTC:  { price: 102.08,  previous_close: 97.06  },
  ORCL:  { price: 122.77,  previous_close: 121.38 },
};

const positions = {
  NVDA:  { avgCost: 210.20, quantity: 1.041845  },
  PLTR:  { avgCost: 142.19, quantity: 0.773639  },
  FLNC:  { avgCost: 24.57,  quantity: 3.053108  },
  RKLB:  { avgCost: 115.39, quantity: 1.473319  },
  QQQM:  { avgCost: 295.66, quantity: 1.149980  },
  SCHD:  { avgCost: 32.39,  quantity: 6.638823  },
  GLW:   { avgCost: 192.08, quantity: 0.104123  },
  INTC:  { avgCost: 110.04, quantity: 0.363518  },
  ORCL:  { avgCost: 206.86, quantity: 0.193364  },
  VOO:   { avgCost: 668.87, quantity: 0.299014  },
};

const totalPortfolioValue = 1294.6486105237;
const timestamp = '2026-07-21T12:37:00Z';

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then((result) => {
  console.log('\nDRY RUN COMPLETE - no real orders placed.');
  process.exit(0);
}).catch((err) => {
  console.error('Trading cycle error:', err);
  process.exit(1);
});
