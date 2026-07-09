'use strict';

// Daily trading cycle runner - DRY RUN ONLY
// Uses live data fetched via Robinhood MCP tools

const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-09T07:30:00-05:00';

// Prices: using last_non_reg_trade_price (pre-market, more recent as of run time)
// Previous close included for spike filter calculation
const quotes = {
  QQQM: { price: 295.98, previousClose: 292.87 },
  SCHD: { price: 32.32,  previousClose: 32.34  },
  VOO:  { price: 687.52, previousClose: 685.26  },
  NVDA: { price: 206.30, previousClose: 204.12  },
  PLTR: { price: 128.45, previousClose: 132.22  },
  RKLB: { price: 86.30,  previousClose: 83.35   },
  NBIS: { price: 228.43, previousClose: 216.48  },
  FLNC: { price: 15.94,  previousClose: 15.34   },
  GLW:  { price: 196.23, previousClose: 184.03  },
  INTC: { price: 116.00, previousClose: 110.24  },
  ORCL: { price: 141.25, previousClose: 140.49  },
};

// Positions from get_equity_positions (account 647176189)
const positions = {
  NVDA: { quantity: 1.041845,  avgCost: 210.20  },
  PLTR: { quantity: 0.773639,  avgCost: 142.19  },
  FLNC: { quantity: 3.053108,  avgCost: 24.57   },
  RKLB: { quantity: 1.473319,  avgCost: 115.39  },
  QQQM: { quantity: 1.149980,  avgCost: 295.66  },
  SCHD: { quantity: 6.638823,  avgCost: 32.39   },
  GLW:  { quantity: 0.104123,  avgCost: 192.08  },
  INTC: { quantity: 0.363518,  avgCost: 110.04  },
  ORCL: { quantity: 0.193364,  avgCost: 206.86  },
  VOO:  { quantity: 0.299014,  avgCost: 668.87  },
};

// Total portfolio equity from get_portfolio (total_value includes crypto + cash)
const totalPortfolioValue = 1516.982056591085;

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then((result) => {
  console.log('\n[CYCLE COMPLETE] dryRun=' + result.dryRun);
  console.log('[ALERTS COUNT] ' + result.reportData.alerts.length);
}).catch((err) => {
  console.error('[CYCLE ERROR]', err);
  process.exitCode = 1;
});
