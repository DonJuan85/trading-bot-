'use strict';

// Daily dry-run trading cycle - 2026-07-28
// get_portfolio returned HTTP 500; totalPortfolioValue computed from positions × premarket prices.

const { runTradingCycle } = require('./trader.js');

const timestamp = new Date().toISOString();

// Most-recent prices: premarket (venue_last_non_reg_trade_time = 2026-07-28) is
// more current than last_trade_price (2026-07-27 close) for every symbol.
const quotes = {
  QQQM:  278.671,
  SCHD:   33.741,
  VOO:   680.175,
  NVDA:  195.52,
  PLTR:  126.06,
  RKLB:   65.05,
  NBIS:  181.00,
  FLNC:   13.12,
  GLW:   117.00,
  INTC:   86.87,
  ORCL:  118.775,
};

// From get_equity_positions (average_buy_price → avgCost)
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

const totalPortfolioValue =
  (1.041845 * 195.52)  +  // NVDA
  (0.773639 * 126.06)  +  // PLTR
  (3.053108 *  13.12)  +  // FLNC
  (1.473319 *  65.05)  +  // RKLB
  (1.149980 * 278.671) +  // QQQM
  (6.638823 *  33.741) +  // SCHD
  (0.104123 * 117.00)  +  // GLW
  (0.363518 *  86.87)  +  // INTC
  (0.193364 * 118.775) +  // ORCL
  (0.299014 * 680.175);   // VOO

console.log(`[INFO] get_portfolio API returned HTTP 500; portfolio value estimated from positions: $${totalPortfolioValue.toFixed(2)}`);

runTradingCycle({
  timestamp,
  positions,
  quotes,
  totalPortfolioValue,
  dryRun: true,
}).then(() => {
  console.log('\n[DRY RUN COMPLETE - no real trades executed]');
}).catch((err) => {
  console.error('Trading cycle error:', err);
  process.exit(1);
});
