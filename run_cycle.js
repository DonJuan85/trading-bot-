'use strict';
const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-16T12:36:00Z';

// Pre-market prices (last_non_reg_trade_price, 2026-07-16) paired with previous close
const quotes = {
  QQQM: { price: 292.50,  previousClose: 295.56 },
  SCHD: { price: 32.4999, previousClose: 32.34  },
  VOO:  { price: 691.15,  previousClose: 693.80  },
  NVDA: { price: 208.95,  previousClose: 212.50  },
  PLTR: { price: 133.44,  previousClose: 133.76  },
  RKLB: { price: 73.72,   previousClose: 76.20   },
  NBIS: { price: 190.00,  previousClose: 199.51  },
  FLNC: { price: 15.00,   previousClose: 15.37   },
  GLW:  { price: 166.50,  previousClose: 174.41  },
  INTC: { price: 99.79,   previousClose: 102.99  },
  ORCL: { price: 133.00,  previousClose: 132.49  },
};

// Positions from get_equity_positions (account 647176189)
const positions = {
  NVDA: { avgCost: 210.20,  quantity: 1.041845  },
  PLTR: { avgCost: 142.19,  quantity: 0.773639  },
  FLNC: { avgCost: 24.57,   quantity: 3.053108  },
  RKLB: { avgCost: 115.39,  quantity: 1.473319  },
  QQQM: { avgCost: 295.66,  quantity: 1.149980  },
  SCHD: { avgCost: 32.39,   quantity: 6.638823  },
  GLW:  { avgCost: 192.08,  quantity: 0.104123  },
  INTC: { avgCost: 110.04,  quantity: 0.363518  },
  ORCL: { avgCost: 206.86,  quantity: 0.193364  },
  VOO:  { avgCost: 668.87,  quantity: 0.299014  },
};

// Total portfolio equity from get_portfolio
const totalPortfolioValue = 1313.46; // equity_value only (no crypto)

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then((result) => {
  console.log('\n[CYCLE COMPLETE] dryRun=' + result.dryRun);
  process.exit(0);
}).catch((err) => {
  console.error('[CYCLE ERROR]', err);
  process.exit(1);
});
