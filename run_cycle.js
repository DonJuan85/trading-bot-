'use strict';

const { runTradingCycle } = require('./trader.js');

const timestamp = new Date().toISOString();

// Pre-market prices from Robinhood get_equity_quotes (last_non_reg_trade_price, July 30 timestamps)
const quotes = {
  QQQM: 276.45,
  SCHD: 33.59,
  VOO:  675.04,
  NVDA: 194.00,
  PLTR: 122.05,
  RKLB: 60.87,
  NBIS: 162.62,
  FLNC: 12.42,
  GLW:  130.00,
  INTC: 85.56,
  ORCL: 120.80,
};

// From get_equity_positions (account 647176189)
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

// From get_portfolio total_value (account 647176189)
const totalPortfolioValue = 1409.49;

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then(() => {
  console.log('\n[DRY RUN COMPLETE] trading_log.txt and trader_state.json updated.');
}).catch((err) => {
  console.error('Trading cycle failed:', err);
  process.exitCode = 1;
});
