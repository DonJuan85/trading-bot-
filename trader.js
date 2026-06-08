'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Component 1: Config & portfolio tier classification
// ---------------------------------------------------------------------------

const ACCOUNT_NUMBER = '647176189';

const PORTFOLIO = {
  QQQM: 'core_etf',
  SCHD: 'core_etf',
  BND: 'core_etf',
  NVDA: 'blue_chip',
  PLTR: 'blue_chip',
  RKLB: 'high_growth',
  NBIS: 'high_growth',
  FLNC: 'high_growth',
  CRWV: 'high_growth',
  IONQ: 'speculative',
  BBAI: 'speculative',
};

const TIER_RULES = {
  core_etf: { label: 'Core ETF (hold forever, never sell)', stopLossPercent: null },
  blue_chip: { label: 'Blue chip growth (active management)', stopLossPercent: 0.15 },
  high_growth: { label: 'High growth (wider stops)', stopLossPercent: 0.25 },
  speculative: { label: 'Speculative (widest stops)', stopLossPercent: 0.30 },
};

const TAKE_PROFIT_LADDER = [
  { key: 'tp_25', gainPercent: 0.25, sellPortion: 0.50 },
  { key: 'tp_50', gainPercent: 0.50, sellPortion: 0.25 },
];

const MAX_POSITION_PERCENT = 0.20;

function getTier(symbol) {
  return PORTFOLIO[symbol] || null;
}

function getTierRules(symbol) {
  const tier = getTier(symbol);
  return tier ? TIER_RULES[tier] : null;
}

// ---------------------------------------------------------------------------
// Component 2: Position evaluator (tiered stop-loss + take-profit ladder)
//
// Pure function: given a position and its current price, decide whether to
// hold, stop out entirely, or trim profits. `takeProfitState` records which
// rungs of the take-profit ladder have already been actioned for this
// position (e.g. { tp_25: true } once the +25%/sell-50% rung has fired), so
// repeated runs don't re-trigger the same sell. The orchestrator (built
// later) is responsible for persisting that state between runs.
// ---------------------------------------------------------------------------

function evaluatePosition({ symbol, avgCost, currentPrice, takeProfitState = {} }) {
  const tier = getTier(symbol);
  if (!tier) {
    return { symbol, action: 'hold', reason: `Unknown symbol ${symbol} - not in configured portfolio` };
  }

  const rules = TIER_RULES[tier];
  const changePercent = (currentPrice - avgCost) / avgCost;
  const pct = (n) => `${(n * 100).toFixed(1)}%`;

  if (tier === 'core_etf') {
    return {
      symbol, tier, action: 'hold', changePercent,
      reason: `${rules.label} - never sell regardless of price (currently ${pct(changePercent)})`,
    };
  }

  if (changePercent <= -rules.stopLossPercent) {
    return {
      symbol, tier, action: 'sell_all', changePercent,
      reason: `Stop loss triggered: down ${pct(changePercent)} breaches ${tier} threshold of -${(rules.stopLossPercent * 100).toFixed(0)}%`,
    };
  }

  for (const rung of TAKE_PROFIT_LADDER) {
    if (changePercent >= rung.gainPercent && !takeProfitState[rung.key]) {
      return {
        symbol, tier, action: 'sell_partial', changePercent,
        sellPortion: rung.sellPortion,
        takeProfitKey: rung.key,
        reason: `Take-profit triggered: up ${pct(changePercent)} crosses +${(rung.gainPercent * 100).toFixed(0)}% rung - sell ${(rung.sellPortion * 100).toFixed(0)}% of position`,
      };
    }
  }

  return {
    symbol, tier, action: 'hold', changePercent,
    reason: `${rules.label} - within normal range (${pct(changePercent)}, stop at -${(rules.stopLossPercent * 100).toFixed(0)}%)`,
  };
}

// ---------------------------------------------------------------------------
// Component 3: Position-sizing checker (max 20% of portfolio per position)
//
// Pure function: given a position's current dollar value and the total
// portfolio value, reports what fraction of the portfolio it represents and
// whether further buys should be blocked. This only gates new buys - it does
// not force a sell of an existing oversized position (the spec frames
// "maximum single position: 20%" as a constraint on new buying).
// ---------------------------------------------------------------------------

function checkPositionSizing({ symbol, positionValue, totalPortfolioValue }) {
  if (!totalPortfolioValue || totalPortfolioValue <= 0) {
    return { symbol, withinLimit: true, percentOfPortfolio: 0, reason: 'Portfolio value unknown - skipping sizing check' };
  }

  const percent = positionValue / totalPortfolioValue;
  const withinLimit = percent <= MAX_POSITION_PERCENT;
  const pct = (n) => `${(n * 100).toFixed(1)}%`;

  return {
    symbol,
    percentOfPortfolio: percent,
    withinLimit,
    reason: withinLimit
      ? `${symbol} is ${pct(percent)} of portfolio - within ${pct(MAX_POSITION_PERCENT)} limit, buys allowed`
      : `${symbol} is ${pct(percent)} of portfolio - EXCEEDS ${pct(MAX_POSITION_PERCENT)} limit, block further buys`,
  };
}

// ---------------------------------------------------------------------------
// Component 4: Signal interface (stubbed)
//
// Each function defines the SHAPE of data the decision engine expects from a
// given signal source and currently returns a neutral/empty result. Wiring
// these to real data means picking actual sources/APIs:
//   - Twitter/X: needs paid X API access to follow the named accounts
//   - News outlets: needs a news API - scraping these 11 sites directly is
//     fragile and likely violates their terms of service
//   - Stocktwits: has a public symbol-sentiment API
//   - Fear & Greed Index: published by CNN; needs a scraper or third-party API
//   - Macro events (Fed, jobs reports, CPI, geopolitics): needs an economic
//     calendar / news-event feed
// The rest of the pipeline (aggregateSignals, makeDecision) already knows how
// to consume this shape, so swapping a TODO body for a real fetch is enough.
//
// A "mention" (returned inside twitter/news results) has the shape:
//   { source, symbol, sentiment: 'positive'|'negative'|'neutral', type, detail,
//     stockDownFromHighPercent }
// `type` flags the special categories the spec calls out by name:
//   'trump_endorsement' | 'defense_contract' | 'earnings_beat' |
//   'earnings_miss' | 'earnings_miss_guidance_cut' | 'ceo_scandal'
// ---------------------------------------------------------------------------

const TWITTER_SOURCES = [
  '@theaiportfolios', '@BlackPantherCap', '@StockChaser_', '@AskLivermore',
  '@trevhesinvests', '@BullTheoryio', '@KobeissiLetter',
  'Trump Truth Social', 'White House announcements',
];

const NEWS_OUTLETS = [
  'CBS News', 'ABC News', 'NBC News', 'Yahoo Finance', 'Reuters', 'Bloomberg',
  'CNBC', 'MarketWatch', 'Stocktwits', 'Seeking Alpha', 'Benzinga',
];

function checkTwitterSignals(symbols) {
  // TODO: wire to X/Twitter API for TWITTER_SOURCES
  return { source: 'twitter', checkedSources: TWITTER_SOURCES, mentions: [] };
}

function checkNewsSignals(symbols) {
  // TODO: wire to a news API covering NEWS_OUTLETS
  return { source: 'news', checkedSources: NEWS_OUTLETS, mentions: [] };
}

function checkSentimentSignals(symbols) {
  // TODO: wire to the Stocktwits API (per-symbol bull/bear %) and CNN's Fear & Greed Index
  return { source: 'sentiment', stocktwits: {}, fearGreedIndex: null };
}

function checkMacroFilters() {
  // TODO: wire to an economic-calendar / news-event feed
  return {
    fedRateCut: false,
    jobsReport: null,         // 'beat' | 'miss' | null
    cpi: null,                // 'hot' | 'cool' | null
    geopoliticalEscalation: false,
    iranConflictEscalation: false,
    marketDownPercent: null,  // e.g. -3.2 if the broad market is down 3.2% today
    spaceXNews: false,
  };
}

function gatherSignalContext(symbols) {
  return {
    twitter: checkTwitterSignals(symbols),
    news: checkNewsSignals(symbols),
    sentiment: checkSentimentSignals(symbols),
    macro: checkMacroFilters(),
  };
}

// ---------------------------------------------------------------------------
// Component 5: Decision engine
//
// aggregateSignals() turns raw mentions/sentiment for ONE symbol into a single
// buy/sell verdict, applying the spec's source-counting rules in priority
// order (scandal > earnings > source-count > Stocktwits).
//
// getPortfolioWideDirectives() turns macro/sentiment context into portfolio-
// level directives (pause buying, trim winners, rotate to defense, etc.) that
// apply across symbols rather than to one stock.
//
// makeDecision() is the top-level call per symbol: risk management (stop-loss
// / take-profit) always wins; then sell signals; then buy signals, gated by
// pause directives and the 20% position-sizing cap.
// ---------------------------------------------------------------------------

function aggregateSignals(symbol, signalContext = {}) {
  const { twitter = {}, news = {}, sentiment = {} } = signalContext;
  const mentions = [...(twitter.mentions || []), ...(news.mentions || [])]
    .filter((m) => m.symbol === symbol);

  const positiveSources = new Set(mentions.filter((m) => m.sentiment === 'positive').map((m) => m.source));
  const negativeSources = new Set(mentions.filter((m) => m.sentiment === 'negative').map((m) => m.source));

  const trumpEndorsement = mentions.find((m) => m.type === 'trump_endorsement' && m.sentiment === 'positive');
  const defenseContract = mentions.find((m) => m.type === 'defense_contract');
  const earningsBeat = mentions.find((m) => m.type === 'earnings_beat');
  const earningsMissGuidanceCut = mentions.find((m) => m.type === 'earnings_miss_guidance_cut');
  const earningsMiss = mentions.find((m) => m.type === 'earnings_miss');
  const ceoScandal = mentions.find((m) => m.type === 'ceo_scandal');
  const downFromHigh = mentions.find((m) => m.sentiment === 'positive' && m.stockDownFromHighPercent >= 0.10);

  let sellSignal = null;
  if (ceoScandal) {
    sellSignal = { urgency: 'immediate', portion: 1.0, source: ceoScandal.source, reason: `CEO resignation/scandal reported for ${symbol} - sell immediately` };
  } else if (earningsMissGuidanceCut) {
    sellSignal = { urgency: 'high', portion: 0.75, source: earningsMissGuidanceCut.source, reason: `Earnings miss + guidance cut for ${symbol} - sell 75% of position` };
  } else if (earningsMiss) {
    sellSignal = { urgency: 'normal', portion: 0.50, source: earningsMiss.source, reason: `Earnings miss for ${symbol} - sell 50% of position` };
  } else if (negativeSources.size >= 2) {
    sellSignal = { urgency: 'normal', portion: null, source: [...negativeSources].join(', '), reason: `${negativeSources.size} sources mention ${symbol} negatively today` };
  }

  let buySignal = null;
  if (trumpEndorsement) {
    buySignal = { urgency: 'immediate', source: trumpEndorsement.source, reason: `Trump directly endorsed ${symbol} - immediate buy signal` };
  } else if (defenseContract) {
    buySignal = { urgency: 'immediate', source: defenseContract.source, reason: `Defense contract announced involving ${symbol} - buy signal` };
  } else if (earningsBeat) {
    buySignal = { urgency: 'next_morning', source: earningsBeat.source, reason: `Earnings beat + revenue growth for ${symbol} - add to position next morning` };
  } else if (positiveSources.size >= 3) {
    buySignal = { urgency: 'strong', source: [...positiveSources].join(', '), reason: `${positiveSources.size} sources mention ${symbol} positively today - strong buy` };
  } else if (positiveSources.size >= 2 && downFromHigh) {
    buySignal = { urgency: 'moderate', source: [...positiveSources].join(', '), reason: `${positiveSources.size} sources positive on ${symbol} and it's down 10%+ from its recent high - moderate buy` };
  }

  const stocktwits = sentiment.stocktwits ? sentiment.stocktwits[symbol] : null;
  if (stocktwits) {
    if (!sellSignal && stocktwits.bearishPercent >= 75) {
      sellSignal = { urgency: 'normal', portion: null, source: 'Stocktwits', reason: `Stocktwits bearish sentiment on ${symbol} at ${stocktwits.bearishPercent}% (>=75%) - sell signal` };
    }
    if (!buySignal && stocktwits.bullishPercent >= 75) {
      buySignal = { urgency: 'moderate', source: 'Stocktwits', reason: `Stocktwits bullish sentiment on ${symbol} at ${stocktwits.bullishPercent}% (>=75%) - buy signal` };
    }
  }

  return { symbol, mentions, positiveSourceCount: positiveSources.size, negativeSourceCount: negativeSources.size, buySignal, sellSignal };
}

function getPortfolioWideDirectives(signalContext = {}) {
  const { sentiment = {}, macro = {} } = signalContext;
  const directives = [];

  if (typeof sentiment.fearGreedIndex === 'number') {
    if (sentiment.fearGreedIndex < 25) {
      directives.push({ type: 'buying_opportunity', reason: `Fear & Greed Index at ${sentiment.fearGreedIndex} (<25) - buying opportunity across the portfolio` });
    }
    if (sentiment.fearGreedIndex > 80) {
      directives.push({ type: 'trim_winners_add_bnd', reason: `Fear & Greed Index at ${sentiment.fearGreedIndex} (>80) - trim winners and increase BND` });
    }
  }
  if (typeof macro.marketDownPercent === 'number' && macro.marketDownPercent <= -3) {
    directives.push({ type: 'pause_new_buying', reason: `Broad market down ${Math.abs(macro.marketDownPercent).toFixed(1)}% today - pause all new buying` });
  }
  if (macro.geopoliticalEscalation || macro.iranConflictEscalation) {
    directives.push({ type: 'increase_defense_safe_haven', reason: 'Geopolitical/Iran conflict escalation - increase PLTR/BBAI defense positions and add BND as safe haven' });
  }
  if (macro.fedRateCut) {
    directives.push({ type: 'aggressive_growth_buy', reason: 'Fed rate cut announced - aggressively increase QQQM and growth stocks' });
  }
  if (macro.jobsReport === 'miss') {
    directives.push({ type: 'pause_new_buying_24h', reason: 'Jobs report missed badly - pause new buys for 24 hours' });
  }
  if (macro.cpi === 'hot') {
    directives.push({ type: 'increase_bnd_hedge', reason: 'CPI inflation hot - increase BND position as a hedge' });
  }
  if (macro.cpi === 'cool') {
    directives.push({ type: 'aggressive_growth_buy', reason: 'CPI inflation cool - buy growth stocks aggressively' });
  }
  if (macro.spaceXNews) {
    directives.push({ type: 'add_rklb', reason: 'SpaceX/space sector news - add to RKLB position' });
  }

  return directives;
}

function makeDecision({ symbol, position, currentPrice, totalPortfolioValue, takeProfitState, signalContext, directives = [] }) {
  // 1. Risk management always wins - executes regardless of any signal
  if (position) {
    const risk = evaluatePosition({ symbol, avgCost: position.avgCost, currentPrice, takeProfitState });
    if (risk.action !== 'hold') {
      return {
        symbol, decision: risk.action, sellPortion: risk.sellPortion, takeProfitKey: risk.takeProfitKey,
        source: 'risk_management', reason: risk.reason,
      };
    }
  }

  const signals = aggregateSignals(symbol, signalContext);

  // 2. Sell signals next - safety overrides opportunity
  if (signals.sellSignal) {
    return {
      symbol, decision: 'sell_signal', sellPortion: signals.sellSignal.portion,
      source: `signal:${signals.sellSignal.source}`, reason: signals.sellSignal.reason,
    };
  }

  // 3. Buy signals - gated by macro pause directives and the 20% sizing cap
  if (signals.buySignal) {
    const pauseDirective = directives.find((d) => d.type === 'pause_new_buying' || d.type === 'pause_new_buying_24h');
    if (pauseDirective) {
      return { symbol, decision: 'hold', source: 'macro_filter', reason: `Buy signal present (${signals.buySignal.reason}) but new buying is paused: ${pauseDirective.reason}` };
    }

    if (position && totalPortfolioValue) {
      const sizing = checkPositionSizing({ symbol, positionValue: position.quantity * currentPrice, totalPortfolioValue });
      if (!sizing.withinLimit) {
        return { symbol, decision: 'hold', source: 'position_sizing', reason: `Buy signal present (${signals.buySignal.reason}) but blocked: ${sizing.reason}` };
      }
    }

    return { symbol, decision: 'buy', urgency: signals.buySignal.urgency, source: `signal:${signals.buySignal.source}`, reason: signals.buySignal.reason };
  }

  return { symbol, decision: 'hold', source: 'no_signal', reason: 'No risk trigger and no actionable signal today' };
}

// ---------------------------------------------------------------------------
// LIVE_TRADING is the ONLY thing that gates real order placement. It starts
// false (dry run) and stays false until a human reviews trading_log.txt and
// flips it by hand - this script never flips it itself, regardless of how
// many consecutive dry-run days accumulate. The "5 successful dry run days"
// rule from the spec is tracked (see dryRunStreak below) purely as
// information for that human decision, not as an auto-trigger.
// ---------------------------------------------------------------------------
const LIVE_TRADING = false;

const LOG_FILE = path.join(__dirname, 'trading_log.txt');
const STATE_FILE = path.join(__dirname, 'trader_state.json');

// ---------------------------------------------------------------------------
// Component 6: Logger
//
// Appends one line per decision to trading_log.txt (timestamp, symbol,
// action, price, reason, signal source - exactly the fields the spec asks
// for) and persists small bits of cross-run state (take-profit ladder
// progress per symbol, dry-run day count) to trader_state.json so the bot
// doesn't re-trigger the same trim every morning or lose track of its
// dry-run streak.
// ---------------------------------------------------------------------------

function formatLogLine({ timestamp, symbol, action, sellPortion, price, reason, source, dryRun }) {
  const tag = dryRun ? '[DRY RUN]' : '[LIVE]';
  const portionPart = sellPortion ? ` portion=${(sellPortion * 100).toFixed(0)}%` : '';
  const pricePart = price != null ? `$${Number(price).toFixed(2)}` : 'n/a';
  return `[${timestamp}] ${tag} ${symbol} | action=${action}${portionPart} | price=${pricePart} | source=${source} | reason="${reason}"\n`;
}

function logEntry(entry, logFile = LOG_FILE) {
  const line = formatLogLine(entry);
  fs.appendFileSync(logFile, line);
  return line;
}

function loadState(stateFile = STATE_FILE) {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    return { takeProfitState: {}, dryRunDates: [] };
  }
}

function saveState(state, stateFile = STATE_FILE) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Component 7: Daily summary printer
//
// Prints a console report after each run: how many positions were checked,
// the breakdown of actions taken, any portfolio-wide directives in effect,
// the actionable (non-hold) decisions in detail, and - while in dry-run mode
// - the running dry-run streak toward the 5-day human-review checkpoint.
// ---------------------------------------------------------------------------

function printDailySummary({ timestamp, decisions, directives = [], dryRun, dryRunStreak }) {
  const counts = {};
  for (const d of decisions) counts[d.decision] = (counts[d.decision] || 0) + 1;

  console.log('');
  console.log('='.repeat(64));
  console.log(`DAILY SUMMARY - ${timestamp} ${dryRun ? '[DRY RUN MODE]' : '[LIVE TRADING]'}`);
  console.log('='.repeat(64));
  console.log(`Positions checked: ${decisions.length}`);
  console.log(`Action breakdown: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`);

  if (directives.length) {
    console.log('Portfolio-wide directives in effect:');
    for (const d of directives) console.log(`  - [${d.type}] ${d.reason}`);
  } else {
    console.log('Portfolio-wide directives in effect: none');
  }

  const actionable = decisions.filter((d) => d.decision !== 'hold' && d.decision !== 'skip');
  if (actionable.length) {
    console.log('Actionable decisions:');
    for (const d of actionable) {
      const portion = d.sellPortion ? ` (${(d.sellPortion * 100).toFixed(0)}%)` : '';
      console.log(`  - ${d.symbol}: ${d.decision}${portion} @ $${Number(d.price).toFixed(2)} - ${d.reason} [${d.source}]`);
    }
  } else {
    console.log('Actionable decisions: none - holding steady');
  }

  if (dryRun && typeof dryRunStreak === 'number') {
    const note = dryRunStreak >= 5
      ? 'threshold reached - review trading_log.txt; switch to live trading is a manual decision, the bot will not do it automatically'
      : `${5 - dryRunStreak} more day(s) until the 5-day review checkpoint`;
    console.log(`Dry-run streak: ${dryRunStreak} day(s) - ${note}`);
  }
  console.log('='.repeat(64));
}

// ---------------------------------------------------------------------------
// Component 8: Orchestrator
//
// The single entry point for a trading cycle. It does NOT talk to Robinhood
// itself - the caller (Claude, running on the 7:30 AM CT weekday schedule)
// fetches quotes/positions/account value via the Robinhood MCP tools and
// passes them in as plain data. This keeps the decision logic pure/testable
// and keeps a checkpoint between "the bot decided X" and "an order was placed".
//
// For each configured symbol it: evaluates risk + signals via makeDecision,
// logs the decision, persists any newly-fired take-profit-ladder state, then
// prints the daily summary. Returns the full decision report so the caller
// can act on it (in dry run: nothing further; once LIVE_TRADING is true and
// a human has wired real order placement: place the recommended orders).
// ---------------------------------------------------------------------------

function runTradingCycle({
  timestamp,
  positions = {},
  quotes = {},
  totalPortfolioValue = null,
  signalContext = null,
  dryRun = !LIVE_TRADING,
  logFile = LOG_FILE,
  stateFile = STATE_FILE,
}) {
  const state = loadState(stateFile);
  state.takeProfitState = state.takeProfitState || {};
  state.dryRunDates = state.dryRunDates || [];

  const ctx = signalContext || gatherSignalContext(Object.keys(PORTFOLIO));
  const directives = getPortfolioWideDirectives(ctx);
  const decisions = [];

  for (const symbol of Object.keys(PORTFOLIO)) {
    const currentPrice = quotes[symbol];
    if (currentPrice == null) {
      decisions.push({ symbol, decision: 'skip', source: 'no_quote', reason: 'No quote available - skipping this symbol', price: null });
      continue;
    }

    const position = positions[symbol] || null;
    const decision = makeDecision({
      symbol,
      position,
      currentPrice,
      totalPortfolioValue,
      takeProfitState: state.takeProfitState[symbol] || {},
      signalContext: ctx,
      directives,
    });

    const entry = { ...decision, price: currentPrice };
    decisions.push(entry);
    logEntry({ timestamp, symbol, action: decision.decision, sellPortion: decision.sellPortion, price: currentPrice, reason: decision.reason, source: decision.source, dryRun }, logFile);

    if (decision.takeProfitKey) {
      state.takeProfitState[symbol] = { ...(state.takeProfitState[symbol] || {}), [decision.takeProfitKey]: true };
    }
  }

  let dryRunStreak = state.dryRunDates.length;
  if (dryRun) {
    const day = timestamp.slice(0, 10);
    if (!state.dryRunDates.includes(day)) state.dryRunDates.push(day);
    dryRunStreak = state.dryRunDates.length;
  }

  saveState(state, stateFile);
  printDailySummary({ timestamp, decisions, directives, dryRun, dryRunStreak });

  return { timestamp, dryRun, dryRunStreak, directives, decisions };
}

// ---------------------------------------------------------------------------
// Self-tests (run with: node trader.js)
// ---------------------------------------------------------------------------

function runSelfTests() {
  console.log('=== Component 1: Config & tier classification ===');
  const symbols = [...Object.keys(PORTFOLIO), 'AAPL'];
  for (const symbol of symbols) {
    const tier = getTier(symbol);
    const rules = getTierRules(symbol);
    if (!tier) {
      console.log(`  ${symbol.padEnd(6)} -> not in configured portfolio`);
    } else {
      const stop = rules.stopLossPercent === null ? 'never sells' : `stop loss at -${(rules.stopLossPercent * 100).toFixed(0)}%`;
      console.log(`  ${symbol.padEnd(6)} -> tier=${tier.padEnd(12)} (${rules.label}) | ${stop}`);
    }
  }

  console.log('\n=== Component 2: Position evaluator (stop-loss / take-profit) ===');
  const scenarios = [
    { label: 'Core ETF deep in the red -> still hold',         symbol: 'BND',  avgCost: 80,  currentPrice: 60 },
    { label: 'Blue chip down 16% -> stop loss (limit -15%)',   symbol: 'NVDA', avgCost: 100, currentPrice: 84 },
    { label: 'Blue chip down 10% -> within range, hold',       symbol: 'PLTR', avgCost: 50,  currentPrice: 45 },
    { label: 'High growth down 26% -> stop loss (limit -25%)', symbol: 'RKLB', avgCost: 20,  currentPrice: 14.8 },
    { label: 'Speculative down 28% -> within range, hold',     symbol: 'IONQ', avgCost: 10,  currentPrice: 7.2 },
    { label: 'Speculative down 31% -> stop loss (limit -30%)', symbol: 'BBAI', avgCost: 10,  currentPrice: 6.9 },
    { label: 'Up 30%, no prior trims -> trim 50% (+25% rung)', symbol: 'NVDA', avgCost: 100, currentPrice: 130 },
    { label: 'Up 30%, +25% rung already fired -> hold',        symbol: 'NVDA', avgCost: 100, currentPrice: 130, takeProfitState: { tp_25: true } },
    { label: 'Up 55%, both rungs pending -> trim 50% first',   symbol: 'PLTR', avgCost: 50,  currentPrice: 77.5 },
    { label: 'Up 55%, +25% done -> trim 25% (+50% rung)',      symbol: 'PLTR', avgCost: 50,  currentPrice: 77.5, takeProfitState: { tp_25: true } },
    { label: 'Up 55%, both rungs done -> let it ride, hold',   symbol: 'PLTR', avgCost: 50,  currentPrice: 77.5, takeProfitState: { tp_25: true, tp_50: true } },
    { label: 'Unconfigured symbol -> hold, flagged',           symbol: 'AAPL', avgCost: 150, currentPrice: 100 },
  ];

  for (const s of scenarios) {
    const result = evaluatePosition(s);
    console.log(`  [${s.label}]`);
    console.log(`    -> action=${result.action}${result.sellPortion ? ` (${(result.sellPortion * 100).toFixed(0)}%)` : ''} | ${result.reason}`);
  }

  console.log('\n=== Component 3: Position-sizing checker (max 20% per position) ===');
  const sizingScenarios = [
    { label: 'Position at 12% of portfolio -> within limit',        symbol: 'NVDA', positionValue: 1200,  totalPortfolioValue: 10000 },
    { label: 'Position at exactly 20% -> still within limit',       symbol: 'PLTR', positionValue: 2000,  totalPortfolioValue: 10000 },
    { label: 'Position at 24% -> exceeds limit, block buys',        symbol: 'RKLB', positionValue: 2400,  totalPortfolioValue: 10000 },
    { label: 'Tiny position at 0.5% -> within limit',               symbol: 'IONQ', positionValue: 50,    totalPortfolioValue: 10000 },
    { label: 'Portfolio value unknown -> skip check gracefully',    symbol: 'BBAI', positionValue: 500,   totalPortfolioValue: 0 },
  ];

  for (const s of sizingScenarios) {
    const result = checkPositionSizing(s);
    console.log(`  [${s.label}]`);
    console.log(`    -> withinLimit=${result.withinLimit} | ${result.reason}`);
  }

  console.log('\n=== Component 4: Signal interface stubs (should be neutral/empty) ===');
  const twitterResult = checkTwitterSignals(['NVDA']);
  const newsResult = checkNewsSignals(['NVDA']);
  const sentimentResult = checkSentimentSignals(['NVDA']);
  const macroResult = checkMacroFilters();
  console.log(`  checkTwitterSignals()   -> source=${twitterResult.source}, watching ${twitterResult.checkedSources.length} sources, mentions=${twitterResult.mentions.length} (empty until wired)`);
  console.log(`  checkNewsSignals()      -> source=${newsResult.source}, watching ${newsResult.checkedSources.length} outlets, mentions=${newsResult.mentions.length} (empty until wired)`);
  console.log(`  checkSentimentSignals() -> stocktwits=${JSON.stringify(sentimentResult.stocktwits)}, fearGreedIndex=${sentimentResult.fearGreedIndex} (neutral until wired)`);
  console.log(`  checkMacroFilters()     -> ${JSON.stringify(macroResult)} (all-clear/neutral until wired)`);

  console.log('\n=== Component 5: Decision engine ===');

  console.log('\n  -- aggregateSignals(): per-symbol buy/sell verdicts from mock mentions --');
  const aggScenarios = [
    {
      label: '3 sources positive same day -> strong buy',
      symbol: 'NVDA',
      ctx: { twitter: { mentions: [
        { source: '@theaiportfolios', symbol: 'NVDA', sentiment: 'positive' },
        { source: '@trevhesinvests', symbol: 'NVDA', sentiment: 'positive' },
      ] }, news: { mentions: [
        { source: 'CNBC', symbol: 'NVDA', sentiment: 'positive' },
      ] } },
    },
    {
      label: '2 sources positive + down 10% from high -> moderate buy',
      symbol: 'PLTR',
      ctx: { twitter: { mentions: [
        { source: '@StockChaser_', symbol: 'PLTR', sentiment: 'positive', stockDownFromHighPercent: 0.12 },
        { source: '@AskLivermore', symbol: 'PLTR', sentiment: 'positive' },
      ] }, news: { mentions: [] } },
    },
    {
      label: 'Trump endorsement -> immediate buy',
      symbol: 'RKLB',
      ctx: { twitter: { mentions: [
        { source: 'Trump Truth Social', symbol: 'RKLB', sentiment: 'positive', type: 'trump_endorsement', detail: 'praised RKLB by name' },
      ] }, news: { mentions: [] } },
    },
    {
      label: 'Defense contract announced -> immediate buy',
      symbol: 'PLTR',
      ctx: { twitter: { mentions: [] }, news: { mentions: [
        { source: 'Reuters', symbol: 'PLTR', sentiment: 'positive', type: 'defense_contract', detail: 'DoD awards PLTR new contract' },
      ] } },
    },
    {
      label: '2 sources negative -> sell signal',
      symbol: 'IONQ',
      ctx: { twitter: { mentions: [
        { source: '@BlackPantherCap', symbol: 'IONQ', sentiment: 'negative' },
      ] }, news: { mentions: [
        { source: 'Benzinga', symbol: 'IONQ', sentiment: 'negative' },
      ] } },
    },
    {
      label: 'CEO scandal -> sell immediately, 100%',
      symbol: 'BBAI',
      ctx: { twitter: { mentions: [] }, news: { mentions: [
        { source: 'Reuters', symbol: 'BBAI', sentiment: 'negative', type: 'ceo_scandal', detail: 'CEO resigns amid investigation' },
      ] } },
    },
    {
      label: 'Earnings miss + guidance cut -> sell 75%',
      symbol: 'NVDA',
      ctx: { twitter: { mentions: [] }, news: { mentions: [
        { source: 'Bloomberg', symbol: 'NVDA', sentiment: 'negative', type: 'earnings_miss_guidance_cut' },
      ] } },
    },
    {
      label: 'Stocktwits 80% bullish -> moderate buy (fills gap)',
      symbol: 'CRWV',
      ctx: { twitter: { mentions: [] }, news: { mentions: [] }, sentiment: { stocktwits: { CRWV: { bullishPercent: 80, bearishPercent: 10 } } } },
    },
    {
      label: 'No mentions -> no signal',
      symbol: 'QQQM',
      ctx: { twitter: { mentions: [] }, news: { mentions: [] } },
    },
  ];

  for (const s of aggScenarios) {
    const result = aggregateSignals(s.symbol, s.ctx);
    const verdict = result.sellSignal
      ? `SELL (${result.sellSignal.urgency}${result.sellSignal.portion ? `, ${(result.sellSignal.portion * 100).toFixed(0)}%` : ''}) - ${result.sellSignal.reason}`
      : result.buySignal
        ? `BUY (${result.buySignal.urgency}) - ${result.buySignal.reason}`
        : 'no signal';
    console.log(`  [${s.label}]`);
    console.log(`    -> ${verdict}`);
  }

  console.log('\n  -- getPortfolioWideDirectives(): macro/sentiment -> portfolio-level directives --');
  const directiveScenarios = [
    { label: 'Fear & Greed at 18 (<25)', ctx: { sentiment: { fearGreedIndex: 18 }, macro: checkMacroFilters() } },
    { label: 'Fear & Greed at 88 (>80)', ctx: { sentiment: { fearGreedIndex: 88 }, macro: checkMacroFilters() } },
    { label: 'Broad market down 3.5% today', ctx: { sentiment: {}, macro: { ...checkMacroFilters(), marketDownPercent: -3.5 } } },
    { label: 'Iran conflict escalates', ctx: { sentiment: {}, macro: { ...checkMacroFilters(), iranConflictEscalation: true } } },
    { label: 'Fed announces rate cut', ctx: { sentiment: {}, macro: { ...checkMacroFilters(), fedRateCut: true } } },
    { label: 'Jobs report misses badly', ctx: { sentiment: {}, macro: { ...checkMacroFilters(), jobsReport: 'miss' } } },
    { label: 'CPI inflation hot', ctx: { sentiment: {}, macro: { ...checkMacroFilters(), cpi: 'hot' } } },
    { label: 'CPI inflation cool', ctx: { sentiment: {}, macro: { ...checkMacroFilters(), cpi: 'cool' } } },
    { label: 'SpaceX/space sector news breaks', ctx: { sentiment: {}, macro: { ...checkMacroFilters(), spaceXNews: true } } },
    { label: 'All quiet - no triggers', ctx: { sentiment: { fearGreedIndex: 50 }, macro: checkMacroFilters() } },
  ];
  for (const s of directiveScenarios) {
    const directives = getPortfolioWideDirectives(s.ctx);
    console.log(`  [${s.label}]`);
    if (directives.length === 0) {
      console.log('    -> (no directives)');
    } else {
      for (const d of directives) console.log(`    -> [${d.type}] ${d.reason}`);
    }
  }

  console.log('\n  -- makeDecision(): full pipeline (risk management > sell signal > buy signal) --');
  const decisionScenarios = [
    {
      label: 'Stop-loss breached AND a buy signal present -> risk management wins',
      input: {
        symbol: 'NVDA', currentPrice: 84, totalPortfolioValue: 10000,
        position: { avgCost: 100, quantity: 10 },
        signalContext: { twitter: { mentions: [
          { source: '@theaiportfolios', symbol: 'NVDA', sentiment: 'positive' },
          { source: '@trevhesinvests', symbol: 'NVDA', sentiment: 'positive' },
          { source: '@BullTheoryio', symbol: 'NVDA', sentiment: 'positive' },
        ] }, news: { mentions: [] }, sentiment: {} },
        directives: [],
      },
    },
    {
      label: 'Strong buy signal, no position yet, no pause -> buy',
      input: {
        symbol: 'CRWV', currentPrice: 50, totalPortfolioValue: 10000, position: null,
        signalContext: { twitter: { mentions: [
          { source: '@theaiportfolios', symbol: 'CRWV', sentiment: 'positive' },
          { source: '@trevhesinvests', symbol: 'CRWV', sentiment: 'positive' },
          { source: '@BullTheoryio', symbol: 'CRWV', sentiment: 'positive' },
        ] }, news: { mentions: [] }, sentiment: {} },
        directives: [],
      },
    },
    {
      label: 'Buy signal present but market down 3%+ pause is active -> hold',
      input: {
        symbol: 'CRWV', currentPrice: 50, totalPortfolioValue: 10000, position: null,
        signalContext: { twitter: { mentions: [
          { source: '@theaiportfolios', symbol: 'CRWV', sentiment: 'positive' },
          { source: '@trevhesinvests', symbol: 'CRWV', sentiment: 'positive' },
          { source: '@BullTheoryio', symbol: 'CRWV', sentiment: 'positive' },
        ] }, news: { mentions: [] }, sentiment: {} },
        directives: [{ type: 'pause_new_buying', reason: 'Broad market down 3.5% today - pause all new buying' }],
      },
    },
    {
      label: 'Buy signal present but position already exceeds 20% cap -> hold',
      input: {
        symbol: 'PLTR', currentPrice: 100, totalPortfolioValue: 10000,
        position: { avgCost: 90, quantity: 25 }, // 25 * 100 = $2500 = 25% of portfolio
        signalContext: { twitter: { mentions: [
          { source: '@theaiportfolios', symbol: 'PLTR', sentiment: 'positive' },
          { source: '@trevhesinvests', symbol: 'PLTR', sentiment: 'positive' },
          { source: '@BullTheoryio', symbol: 'PLTR', sentiment: 'positive' },
        ] }, news: { mentions: [] }, sentiment: {} },
        directives: [],
      },
    },
    {
      label: 'No risk trigger, no signals -> hold (no_signal)',
      input: {
        symbol: 'QQQM', currentPrice: 200, totalPortfolioValue: 10000,
        position: { avgCost: 190, quantity: 5 },
        signalContext: { twitter: { mentions: [] }, news: { mentions: [] }, sentiment: {} },
        directives: [],
      },
    },
  ];

  for (const s of decisionScenarios) {
    const result = makeDecision(s.input);
    console.log(`  [${s.label}]`);
    console.log(`    -> decision=${result.decision}${result.sellPortion ? ` (${(result.sellPortion * 100).toFixed(0)}%)` : ''} | source=${result.source}`);
    console.log(`       reason: ${result.reason}`);
  }

  // -------------------------------------------------------------------------
  // Components 6-8 use scratch files so the self-test never touches the real
  // trading_log.txt / trader_state.json. We clean them up at the end.
  // -------------------------------------------------------------------------
  const testLogFile = path.join(__dirname, 'trading_log.selftest.txt');
  const testStateFile = path.join(__dirname, 'trader_state.selftest.json');
  for (const f of [testLogFile, testStateFile]) {
    try { fs.unlinkSync(f); } catch (err) { /* file may not exist yet */ }
  }

  console.log('\n=== Component 6: Logger (trading_log.txt + trader_state.json) ===');
  logEntry({ timestamp: '2026-06-08T07:30:00-05:00', symbol: 'NVDA', action: 'sell_all', price: 84, reason: 'Stop loss triggered: down -16.0%', source: 'risk_management', dryRun: true }, testLogFile);
  logEntry({ timestamp: '2026-06-08T07:30:00-05:00', symbol: 'PLTR', action: 'sell_partial', sellPortion: 0.5, price: 130, reason: 'Take-profit +25% rung', source: 'risk_management', dryRun: true }, testLogFile);
  logEntry({ timestamp: '2026-06-08T07:30:00-05:00', symbol: 'CRWV', action: 'buy', price: 50, reason: '3 sources positive - strong buy', source: 'signal:@theaiportfolios, @trevhesinvests, @BullTheoryio', dryRun: true }, testLogFile);
  console.log('  Wrote 3 entries to a scratch log file. Contents:');
  for (const line of fs.readFileSync(testLogFile, 'utf8').trim().split('\n')) {
    console.log(`    ${line}`);
  }

  saveState({ takeProfitState: { PLTR: { tp_25: true } }, dryRunDates: ['2026-06-05', '2026-06-06'] }, testStateFile);
  const reloaded = loadState(testStateFile);
  console.log(`  Saved + reloaded state: ${JSON.stringify(reloaded)}`);
  console.log(`  loadState() on a missing file returns a safe default: ${JSON.stringify(loadState(path.join(__dirname, 'does_not_exist.json')))}`);

  console.log('\n=== Component 7: Daily summary printer ===');
  printDailySummary({
    timestamp: '2026-06-08T07:30:00-05:00',
    dryRun: true,
    dryRunStreak: 3,
    directives: [
      { type: 'pause_new_buying', reason: 'Broad market down 3.5% today - pause all new buying' },
      { type: 'trim_winners_add_bnd', reason: 'Fear & Greed Index at 88 (>80) - trim winners and increase BND' },
    ],
    decisions: [
      { symbol: 'QQQM', decision: 'hold', source: 'risk_management', reason: 'Core ETF - never sell', price: 200 },
      { symbol: 'NVDA', decision: 'sell_all', source: 'risk_management', reason: 'Stop loss triggered: down -16.0%', price: 84 },
      { symbol: 'PLTR', decision: 'sell_partial', sellPortion: 0.5, source: 'risk_management', reason: 'Take-profit +25% rung - sell 50%', price: 130 },
      { symbol: 'CRWV', decision: 'buy', source: 'signal:@theaiportfolios, @trevhesinvests, @BullTheoryio', reason: '3 sources positive - strong buy', price: 50 },
      { symbol: 'IONQ', decision: 'hold', source: 'no_signal', reason: 'No risk trigger and no actionable signal today', price: 9 },
      { symbol: 'BBAI', decision: 'skip', source: 'no_quote', reason: 'No quote available - skipping this symbol', price: null },
    ],
  });
  console.log('  (Note the dry-run streak line above reflects the mock streak=3 passed in for this test.)');

  console.log('\n=== Component 8: Orchestrator (full trading-cycle dry run, two simulated days) ===');
  const mockPositions = {
    QQQM: { avgCost: 190, quantity: 10 },
    NVDA: { avgCost: 100, quantity: 8 },   // -16% -> stop loss
    PLTR: { avgCost: 100, quantity: 10 },  // +30% -> take-profit +25% rung
    RKLB: { avgCost: 20, quantity: 50 },
    IONQ: { avgCost: 10, quantity: 100 },
  };
  const mockQuotes = {
    QQQM: 195, SCHD: 27, BND: 72,
    NVDA: 84,    // down 16% from avgCost 100 -> stop loss
    PLTR: 130,   // up 30% from avgCost 100 -> take-profit
    RKLB: 21, NBIS: 15, FLNC: 12, CRWV: 50, IONQ: 9.5,
    // BBAI intentionally omitted -> exercises the "no quote, skip" path
  };
  const mockSignalContext = {
    twitter: { mentions: [
      { source: '@theaiportfolios', symbol: 'CRWV', sentiment: 'positive' },
      { source: '@trevhesinvests', symbol: 'CRWV', sentiment: 'positive' },
      { source: '@BullTheoryio', symbol: 'CRWV', sentiment: 'positive' },
    ] },
    news: { mentions: [] },
    sentiment: { fearGreedIndex: 50, stocktwits: {} },
    macro: { ...checkMacroFilters() },
  };
  const totalPortfolioValue = 50000;

  console.log('\n  --- Day 1 (2026-06-08) ---');
  runTradingCycle({
    timestamp: '2026-06-08T07:30:00-05:00',
    positions: mockPositions, quotes: mockQuotes, totalPortfolioValue,
    signalContext: mockSignalContext, dryRun: true,
    logFile: testLogFile, stateFile: testStateFile,
  });

  console.log('\n  --- Day 2 (2026-06-09): same prices -> PLTR take-profit rung should NOT re-fire ---');
  runTradingCycle({
    timestamp: '2026-06-09T07:30:00-05:00',
    positions: mockPositions, quotes: mockQuotes, totalPortfolioValue,
    signalContext: mockSignalContext, dryRun: true,
    logFile: testLogFile, stateFile: testStateFile,
  });

  const finalState = loadState(testStateFile);
  console.log(`\n  Persisted state after both runs: ${JSON.stringify(finalState)}`);
  console.log('  -> takeProfitState.PLTR.tp_25=true carried over, so day 2 correctly downgraded PLTR to "hold" instead of trimming again.');
  console.log(`  -> dryRunDates accumulated both days: streak is now ${finalState.dryRunDates.length}.`);

  console.log('\n  Full scratch log file after both days:');
  for (const line of fs.readFileSync(testLogFile, 'utf8').trim().split('\n')) {
    console.log(`    ${line}`);
  }

  for (const f of [testLogFile, testStateFile]) {
    try { fs.unlinkSync(f); } catch (err) { /* best effort cleanup */ }
  }
  console.log('\n  (scratch files cleaned up - real trading_log.txt / trader_state.json untouched)');
}

if (require.main === module) {
  runSelfTests();
}

module.exports = {
  ACCOUNT_NUMBER,
  PORTFOLIO,
  TIER_RULES,
  TAKE_PROFIT_LADDER,
  MAX_POSITION_PERCENT,
  getTier,
  getTierRules,
  evaluatePosition,
  checkPositionSizing,
  TWITTER_SOURCES,
  NEWS_OUTLETS,
  checkTwitterSignals,
  checkNewsSignals,
  checkSentimentSignals,
  checkMacroFilters,
  gatherSignalContext,
  aggregateSignals,
  getPortfolioWideDirectives,
  makeDecision,
  LIVE_TRADING,
  LOG_FILE,
  STATE_FILE,
  formatLogLine,
  logEntry,
  loadState,
  saveState,
  printDailySummary,
  runTradingCycle,
};
