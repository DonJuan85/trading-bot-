'use strict';

const { runTradingCycle } = require('./trader.js');

// Live data fetched from Robinhood MCP (premarket 2026-08-03, prices as of ~12:37 UTC)
// Using last_non_reg_trade_price (premarket) as current price since regular session
// closed 2026-07-31; previous_close from prior session for % change calculations.

const quotes = {
  QQQM:  { price: 283.73, previousClose: 283.29 },
  SCHD:  { price: 33.68,  previousClose: 33.47  },
  VOO:   { price: 690.25, previousClose: 686.65  },
  NVDA:  { price: 198.25, previousClose: 200.75  },
  PLTR:  { price: 126.70, previousClose: 123.06  },
  RKLB:  { price: 64.32,  previousClose: 64.95   },
  NBIS:  { price: 185.98, previousClose: 190.41  },
  FLNC:  { price: 13.96,  previousClose: 13.93   },
  GLW:   { price: 137.73, previousClose: 138.25  },
  INTC:  { price: 87.80,  previousClose: 90.20   },
  ORCL:  { price: 132.90, previousClose: 129.87  },
  MU:    { price: 791.12, previousClose: 823.03  },
  AVGO:  { price: 385.99, previousClose: 389.28  },
  KTOS:  { price: 47.15,  previousClose: 46.60   },
  MP:    { price: 41.61,  previousClose: 41.37   },
  OKLO:  { price: 38.95,  previousClose: 38.83   },
  VST:   { price: 148.46, previousClose: 148.19  },
  APP:   { price: 403.49, previousClose: 395.90  },
  SOUN:  { price: 6.20,   previousClose: 6.13    },
  AMD:   { price: 464.89, previousClose: 476.15  },
  LMT:   { price: 584.79, previousClose: 582.74  },
  DELL:  { price: 398.00, previousClose: 405.37  },
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

// Total account value from get_portfolio (equity + crypto + cash)
const totalPortfolioValue = 1441.82;

const timestamp = new Date().toISOString();

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then(result => {
  console.log('\n[CYCLE COMPLETE] dryRun=' + result.dryRun);
}).catch(err => {
  console.error('[CYCLE ERROR]', err);
  process.exitCode = 1;
});
