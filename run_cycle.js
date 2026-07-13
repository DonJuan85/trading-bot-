'use strict';

const { runTradingCycle } = require('./trader.js');

// --- Live data from Robinhood MCP (2026-07-13 pre-market) ---
// Prices: last_non_reg_trade_price (most recent, pre-market session)
const timestamp = '2026-07-13T12:37:00.000Z';

const quotes = {
  QQQM:  { price: 295.83, previousClose: 298.72 },
  SCHD:  { price: 32.47,  previousClose: 32.40  },
  VOO:   { price: 690.80, previousClose: 693.86  },
  NVDA:  { price: 207.44, previousClose: 210.96  },
  PLTR:  { price: 127.25, previousClose: 126.79  },
  RKLB:  { price: 79.82,  previousClose: 81.04   },
  NBIS:  { price: 210.78, previousClose: 219.65  },
  FLNC:  { price: 15.57,  previousClose: 16.16   },
  GLW:   { price: 183.97, previousClose: 190.89  },
  INTC:  { price: 105.61, previousClose: 109.84  },
  ORCL:  { price: 139.70, previousClose: 140.64  },
};

const positions = {
  NVDA:  { quantity: 1.041845, avgCost: 210.20  },
  PLTR:  { quantity: 0.773639, avgCost: 142.19  },
  FLNC:  { quantity: 3.053108, avgCost: 24.57   },
  RKLB:  { quantity: 1.473319, avgCost: 115.39  },
  QQQM:  { quantity: 1.149980, avgCost: 295.66  },
  SCHD:  { quantity: 6.638823, avgCost: 32.39   },
  GLW:   { quantity: 0.104123, avgCost: 192.08  },
  INTC:  { quantity: 0.363518, avgCost: 110.04  },
  ORCL:  { quantity: 0.193364, avgCost: 206.86  },
  VOO:   { quantity: 0.299014, avgCost: 668.87  },
};

const totalPortfolioValue = 1499.46; // from get_portfolio total_value

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then((result) => {
  console.log('\n[cycle complete] dryRun=' + result.dryRun);
}).catch((err) => {
  console.error('Cycle error:', err);
  process.exitCode = 1;
});
