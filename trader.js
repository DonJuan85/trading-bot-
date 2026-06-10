'use strict';

const fs = require('fs');
const path = require('path');

// =============================================================================
// Component 1: Config - portfolio, watchlist, ladders, milestones, engines
// =============================================================================

const ACCOUNT_NUMBER = '647176189';

const PORTFOLIO = {
  QQQM: { tier: 'core_etf', stopLossPercent: null, label: 'Core ETF - NEVER SELL', target2026: 600 },
  SCHD: { tier: 'core_etf', stopLossPercent: null, label: 'Core ETF - NEVER SELL', target2026: 400 },
  NVDA: { tier: 'blue_chip', stopLossPercent: 0.15, label: 'AI Chips', target2026: 300 },
  PLTR: { tier: 'blue_chip', stopLossPercent: 0.15, label: 'Gov AI', target2026: 200 },
  ORCL: { tier: 'blue_chip', stopLossPercent: 0.15, label: 'Trump Stargate', target2026: 150 },
  INTC: { tier: 'blue_chip', stopLossPercent: 0.15, label: 'Trump Gov Stake', target2026: 100 },
  RKLB: { tier: 'high_growth', stopLossPercent: 0.25, label: 'Space', target2026: 200 },
  FLNC: { tier: 'high_growth', stopLossPercent: 0.25, label: 'Energy Storage', target2026: 100 },
  GLW: { tier: 'high_growth', stopLossPercent: 0.25, label: 'Optical Fiber', target2026: 100 },
};

const WATCHLIST = ['MU', 'AVGO', 'KTOS', 'MP', 'OKLO', 'VST', 'APP', 'SOUN', 'AMD', 'LMT', 'DELL'];

// Take-profit ladders. `sellPortion` of the position is sold once `gainPercent`
// is crossed and the rung's `key` hasn't already fired (tracked per-symbol in
// trader_state.json so a rung doesn't re-fire every run). Whatever isn't sold
// across all rungs for a tier rides indefinitely (e.g. blue_chip 50%+25%=75%
// sold, 25% rides).
const TAKE_PROFIT_LADDERS = {
  core_etf: [],
  blue_chip: [
    { key: 'tp1', gainPercent: 0.25, sellPortion: 0.50 },
    { key: 'tp2', gainPercent: 0.50, sellPortion: 0.25 },
  ],
  high_growth: [
    { key: 'tp1', gainPercent: 0.30, sellPortion: 0.50 },
    { key: 'tp2', gainPercent: 0.60, sellPortion: 0.25 },
  ],
  catalyst: [
    { key: 'tp1', gainPercent: 0.40, sellPortion: 1.00 },
  ],
};

const CATALYST_STOP_LOSS_PERCENT = 0.25;

const MILESTONES = [
  { value: 3000, year: 2026 },
  { value: 6500, year: 2027 },
  { value: 12000, year: 2028 },
  { value: 20000, year: 2029 },
  { value: 30000, year: 2030 },
  { value: 50000, year: 2032 },
  { value: 100000, year: 2036 },
];

// ENGINE 1 - Foundation (QQQM/SCHD allocation + deposit discipline)
const ENGINE1 = {
  QQQM_TARGET_PERCENT: 0.50,
  SCHD_TARGET_PERCENT: 0.20,
  QQQM_ALERT_BELOW_PERCENT: 0.40,
  ON_TRACK_TOLERANCE: 0.05,
  DEPOSIT_QQQM_PERCENT: 0.70,
};

// ENGINE 2 - Active trading (blue_chip/high_growth positions)
const ENGINE2 = {
  MAX_TRADES_PER_WEEK: 3,
  MIN_POSITION_USD: 100,
  SPIKE_FILTER_PERCENT: 0.05,
  LONG_TERM_HOLD_DAYS: 365,
};

// ENGINE 3 - Catalyst plays (from WATCHLIST)
const ENGINE3 = {
  MAX_PLAYS_PER_QUARTER: 2,
  MIN_POSITION_USD: 200,
  CATALYST_WINDOW_DAYS: 30,
  MIN_CONFIRMING_SOURCES: 2,
  MAX_RECENT_GAIN_PERCENT: 0.50,
};

function getPortfolioConfig(symbol) {
  return PORTFOLIO[symbol] || null;
}

function getRequiredSymbols() {
  return [...new Set([...Object.keys(PORTFOLIO), ...WATCHLIST])];
}

// =============================================================================
// Component 2: Generic utilities - cache + retry-with-backoff
//
// These wrap the live HTTP calls this script makes itself (Stocktwits,
// Fear & Greed). Robinhood data is NOT fetched here - the caller (Claude,
// via the Robinhood MCP tools) batches get_portfolio/get_equity_positions/
// get_equity_quotes(getRequiredSymbols()) into single calls per cycle and
// passes the results in as plain data (efficiency optimization #1).
// =============================================================================

const CACHE_TTL_MS = 60 * 1000;
const _cache = new Map();

function cacheGet(key) {
  const hit = _cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.time > CACHE_TTL_MS) {
    _cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key, value) {
  _cache.set(key, { value, time: Date.now() });
  return value;
}

function clearCache() {
  _cache.clear();
}

async function withRetry(fn, { retries = 3, baseDelayMs = 300 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}

// =============================================================================
// Component 3: Live signal sources (Stocktwits + Fear & Greed)
// =============================================================================

const FETCH_HEADERS = { 'User-Agent': 'trader-bot/2.0 (personal portfolio monitor)' };

async function fetchStocktwitsSentiment(symbol) {
  const cacheKey = `stocktwits:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const result = await withRetry(async () => {
    const res = await fetch(`https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(symbol)}.json`, { headers: FETCH_HEADERS });
    if (!res.ok) throw new Error(`Stocktwits HTTP ${res.status}`);
    return res.json();
  });

  let bullish = 0;
  let bearish = 0;
  for (const msg of result.messages || []) {
    const basic = msg.entities && msg.entities.sentiment && msg.entities.sentiment.basic;
    if (basic === 'Bullish') bullish += 1;
    else if (basic === 'Bearish') bearish += 1;
  }
  const tagged = bullish + bearish;
  const sentiment = tagged === 0
    ? { bullishPercent: null, bearishPercent: null, sampleSize: 0 }
    : {
      bullishPercent: Math.round((bullish / tagged) * 1000) / 10,
      bearishPercent: Math.round((bearish / tagged) * 1000) / 10,
      sampleSize: tagged,
    };

  return cacheSet(cacheKey, sentiment);
}

async function fetchFearGreedIndex() {
  const cacheKey = 'fear_greed';
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const result = await withRetry(async () => {
    const res = await fetch('https://api.alternative.me/fng/', { headers: FETCH_HEADERS });
    if (!res.ok) throw new Error(`Fear & Greed HTTP ${res.status}`);
    return res.json();
  });

  const point = result.data && result.data[0];
  if (!point) return null;
  return cacheSet(cacheKey, { value: Number(point.value), classification: point.value_classification });
}

// One Stocktwits fetch per symbol, all in flight together; one bad symbol
// gets a neutral/error entry rather than aborting the whole batch.
async function gatherMarketSentiment(symbols) {
  const entries = await Promise.all(symbols.map(async (symbol) => {
    try {
      return [symbol, await fetchStocktwitsSentiment(symbol)];
    } catch (err) {
      return [symbol, { bullishPercent: null, bearishPercent: null, sampleSize: 0, error: err.message }];
    }
  }));
  return Object.fromEntries(entries);
}

// =============================================================================
// Component 4: Stub signal sources (Twitter/X, news, Trump/Truth Social)
//
// Wired with the SHAPE the decision engine expects. A "mention" looks like:
//   { source, symbol, sentiment: 'positive'|'negative', type, detail,
//     daysUntil, stockDownFromHighPercent }
// `type` covers: 'trump_endorsement' | 'catalyst' | 'earnings_beat' |
//   'earnings_miss' | 'earnings_miss_guidance_cut' | 'ceo_scandal'
// =============================================================================

const TWITTER_SOURCES = [
  '@theaiportfolios', '@BlackPantherCap', '@StockChaser_', '@AskLivermore',
  '@trevhesinvests', '@BullTheoryio', '@KobeissiLetter',
];

const NEWS_OUTLETS = [
  'CBS News', 'ABC News', 'NBC News', 'Reuters', 'Bloomberg', 'CNBC', 'Yahoo Finance',
];

function checkTwitterSignals(symbols) {
  // TODO: wire to X/Twitter API for TWITTER_SOURCES
  return { source: 'twitter', checkedSources: TWITTER_SOURCES, mentions: [] };
}

function checkNewsSignals(symbols) {
  // TODO: wire to a news API covering NEWS_OUTLETS
  return { source: 'news', checkedSources: NEWS_OUTLETS, mentions: [] };
}

function checkTrumpMentions(symbols) {
  // TODO: wire to Truth Social monitoring. Per spec: a Trump mention =
  // immediate/automatic watchlist add, surfaced via mention.type = 'trump_endorsement'.
  return { source: 'trump_truth_social', mentions: [] };
}

async function gatherSignalContext(symbols = getRequiredSymbols()) {
  const [stocktwits, fearGreed] = await Promise.all([
    gatherMarketSentiment(symbols),
    fetchFearGreedIndex().catch(() => null),
  ]);
  return {
    stocktwits,
    fearGreed,
    twitter: checkTwitterSignals(symbols),
    news: checkNewsSignals(symbols),
    trump: checkTrumpMentions(symbols),
  };
}

function getAllMentions(signalContext, symbol) {
  const { twitter = {}, news = {}, trump = {} } = signalContext || {};
  return [...(twitter.mentions || []), ...(news.mentions || []), ...(trump.mentions || [])]
    .filter((m) => m.symbol === symbol);
}

// =============================================================================
// Component 5: Quote helpers
//
// `quotes[symbol]` may be a plain number (price) or an object with
// `price`/`previousClose` (accepts Robinhood's last_trade_price /
// previous_close field names too) so callers can pass MCP results directly.
// =============================================================================

function normalizeQuote(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return { price: raw, previousClose: null };
  const price = raw.price ?? raw.last_trade_price ?? raw.lastTradePrice ?? null;
  const previousClose = raw.previousClose ?? raw.previous_close ?? null;
  return { price: price != null ? Number(price) : null, previousClose: previousClose != null ? Number(previousClose) : null };
}

function getQuotePrice(raw) {
  const q = normalizeQuote(raw);
  return q ? q.price : null;
}

function getQuoteChangePercent(raw) {
  const q = normalizeQuote(raw);
  if (!q || q.price == null || !q.previousClose) return null;
  return (q.price - q.previousClose) / q.previousClose;
}

// =============================================================================
// Component 6: Position evaluator (stop-loss + tiered take-profit ladder)
// =============================================================================

function getTierConfig(symbol, position = {}) {
  if (PORTFOLIO[symbol]) return PORTFOLIO[symbol];
  if (position && position.isCatalystPlay) {
    return { tier: 'catalyst', stopLossPercent: CATALYST_STOP_LOSS_PERCENT, label: 'Catalyst Play', target2026: null };
  }
  return null;
}

function evaluatePosition({ symbol, avgCost, currentPrice, position = {}, takeProfitState = {} }) {
  const config = getTierConfig(symbol, position);
  const pct = (n) => `${(n * 100).toFixed(1)}%`;

  if (!config) {
    return { symbol, tier: null, action: 'hold', changePercent: null, reason: `Unknown symbol ${symbol} - not configured` };
  }

  const { tier, stopLossPercent, label } = config;
  const changePercent = (currentPrice - avgCost) / avgCost;

  if (tier === 'core_etf') {
    return { symbol, tier, action: 'hold', changePercent, reason: `${label} (currently ${pct(changePercent)})` };
  }

  if (stopLossPercent != null && changePercent <= -stopLossPercent) {
    return {
      symbol, tier, action: 'sell_all', changePercent,
      reason: `Stop loss: down ${pct(changePercent)} breaches -${(stopLossPercent * 100).toFixed(0)}% (${label})`,
    };
  }

  for (const rung of TAKE_PROFIT_LADDERS[tier] || []) {
    if (changePercent >= rung.gainPercent && !takeProfitState[rung.key]) {
      return {
        symbol, tier, action: rung.sellPortion >= 1 ? 'sell_all' : 'sell_partial', changePercent,
        sellPortion: rung.sellPortion, takeProfitKey: rung.key,
        reason: `Take-profit: up ${pct(changePercent)} crosses +${(rung.gainPercent * 100).toFixed(0)}% - sell ${(rung.sellPortion * 100).toFixed(0)}% (${label})`,
      };
    }
  }

  return { symbol, tier, action: 'hold', changePercent, reason: `${label} - within range (${pct(changePercent)})` };
}

// =============================================================================
// Component 7: Engine 1 - Foundation (QQQM/SCHD allocation + deposits)
// =============================================================================

function evaluateFoundation({ positions, quotes, totalPortfolioValue }) {
  const out = {};
  for (const symbol of ['QQQM', 'SCHD']) {
    const pos = positions[symbol];
    const price = getQuotePrice(quotes[symbol]);
    const value = pos && price != null ? pos.quantity * price : 0;
    const percent = totalPortfolioValue > 0 ? value / totalPortfolioValue : 0;
    const target = symbol === 'QQQM' ? ENGINE1.QQQM_TARGET_PERCENT : ENGINE1.SCHD_TARGET_PERCENT;
    out[symbol] = {
      value, percent, target,
      status: percent >= target - ENGINE1.ON_TRACK_TOLERANCE ? 'ON_TRACK' : 'NEEDS_ATTENTION',
    };
  }

  const alerts = [];
  if (out.QQQM.percent < ENGINE1.QQQM_ALERT_BELOW_PERCENT) {
    alerts.push(`QQQM below 40% (${(out.QQQM.percent * 100).toFixed(1)}%) - add to rebalance`);
  }
  return { QQQM: out.QQQM, SCHD: out.SCHD, alerts };
}

function checkMonthlyDeposit(state) {
  return { made: !!state.monthlyDepositMade, month: state.depositMonth };
}

function recordMonthlyDeposit(state, amount) {
  state.monthlyDepositMade = true;
  state.lastDepositAmount = amount != null ? amount : state.lastDepositAmount;
  return state;
}

function splitDepositAllocation(amount) {
  const qqqm = Math.round(amount * ENGINE1.DEPOSIT_QQQM_PERCENT * 100) / 100;
  return { qqqm, other: Math.round((amount - qqqm) * 100) / 100 };
}

// =============================================================================
// Component 8: Engine 2 - Active trading (sizing, spikes, trade cadence, tax)
// =============================================================================

function checkWeeklyTradeLimit(state) {
  const remaining = Math.max(0, ENGINE2.MAX_TRADES_PER_WEEK - state.weeklyTradeCount);
  return {
    count: state.weeklyTradeCount,
    max: ENGINE2.MAX_TRADES_PER_WEEK,
    remaining,
    atLimit: state.weeklyTradeCount >= ENGINE2.MAX_TRADES_PER_WEEK,
    approaching: remaining === 1,
  };
}

function recordTrade(state) {
  state.weeklyTradeCount += 1;
  return state;
}

function checkPositionSize(positionValue) {
  const tooSmall = positionValue < ENGINE2.MIN_POSITION_USD;
  return {
    value: positionValue, tooSmall,
    reason: tooSmall
      ? `Position value $${positionValue.toFixed(2)} is below the $${ENGINE2.MIN_POSITION_USD} minimum - consider consolidating`
      : `Position value $${positionValue.toFixed(2)} meets the $${ENGINE2.MIN_POSITION_USD} minimum`,
  };
}

function checkSpikeFilter(quote) {
  const changePercent = getQuoteChangePercent(quote);
  if (changePercent == null) {
    return { blocked: false, changePercent: null, reason: 'No previous-close data - spike filter skipped' };
  }
  const blocked = changePercent >= ENGINE2.SPIKE_FILTER_PERCENT;
  return {
    blocked, changePercent,
    reason: blocked
      ? `Up ${(changePercent * 100).toFixed(1)}% today - spike filter blocks new buys`
      : `Up ${(changePercent * 100).toFixed(1)}% today - within spike filter, buys allowed`,
  };
}

// Position open dates can't be derived from a quotes/positions snapshot alone
// (no purchase-date field), so the FIRST run that sees a symbol stamps
// "opened today" in trader_state.json. From then on, holding-period and tax
// classification are accurate. This is a documented limitation, not a stub.
function trackPositionOpenDates(positions, state, now) {
  const today = now.toISOString().slice(0, 10);
  for (const symbol of Object.keys(positions)) {
    if (!state.positionOpenDates[symbol]) state.positionOpenDates[symbol] = today;
  }
  for (const symbol of Object.keys(state.positionOpenDates)) {
    if (!positions[symbol]) delete state.positionOpenDates[symbol];
  }
  return state;
}

function getHoldingPeriod(symbol, state, now) {
  const openedAt = state.positionOpenDates[symbol];
  if (!openedAt) return null;
  const days = Math.floor((now - new Date(`${openedAt}T00:00:00Z`)) / 86400000);
  return { days, longTerm: days >= ENGINE2.LONG_TERM_HOLD_DAYS };
}

// =============================================================================
// Component 9: Engine 3 - Catalyst plays (from WATCHLIST)
// =============================================================================

function checkQuarterlyPlayLimit(state) {
  const remaining = Math.max(0, ENGINE3.MAX_PLAYS_PER_QUARTER - state.quarterlyBigPlays);
  return {
    count: state.quarterlyBigPlays, max: ENGINE3.MAX_PLAYS_PER_QUARTER,
    remaining, atLimit: state.quarterlyBigPlays >= ENGINE3.MAX_PLAYS_PER_QUARTER,
  };
}

function recordCatalystPlay(state) {
  state.quarterlyBigPlays += 1;
  return state;
}

function evaluateCatalystCandidate({ symbol, mentions = [], recentGainPercent = null, state }) {
  const trumpMention = mentions.find((m) => m.type === 'trump_endorsement');
  const catalystMentions = mentions.filter((m) => m.type === 'catalyst' && (m.daysUntil == null || m.daysUntil <= ENGINE3.CATALYST_WINDOW_DAYS));
  const confirmingSources = new Set(catalystMentions.map((m) => m.source));

  const reasons = [];
  let eligible = true;

  const quarterly = checkQuarterlyPlayLimit(state);
  if (quarterly.atLimit) {
    eligible = false;
    reasons.push(`Quarterly catalyst play limit reached (${quarterly.count}/${quarterly.max})`);
  }
  if (catalystMentions.length === 0) {
    eligible = false;
    reasons.push('No confirmed catalyst within 30 days');
  }
  if (confirmingSources.size < ENGINE3.MIN_CONFIRMING_SOURCES) {
    eligible = false;
    reasons.push(`Only ${confirmingSources.size} confirming source(s) - need ${ENGINE3.MIN_CONFIRMING_SOURCES}+`);
  }
  if (typeof recentGainPercent === 'number' && recentGainPercent >= ENGINE3.MAX_RECENT_GAIN_PERCENT) {
    eligible = false;
    reasons.push(`Already up ${(recentGainPercent * 100).toFixed(0)}% in 30 days (>= ${(ENGINE3.MAX_RECENT_GAIN_PERCENT * 100).toFixed(0)}% cap)`);
  }
  if (trumpMention) {
    reasons.push('Trump-backed - automatic watchlist add');
  }

  return { symbol, eligible, addToWatchlist: !!trumpMention, confirmingSources: [...confirmingSources], reasons };
}

function classifySetup(changePercent, mentions = []) {
  if (mentions.some((m) => m.type === 'catalyst' || m.type === 'trump_endorsement')) return 'CATALYST';
  if (changePercent != null && changePercent <= -0.05) return 'DIP';
  if (changePercent != null && changePercent >= 0.05) return 'MOMENTUM';
  return 'WATCH';
}

// =============================================================================
// Component 10: Milestone tracker
// =============================================================================

function recordPortfolioValue(state, now, value) {
  const date = now.toISOString().slice(0, 10);
  state.portfolioValueHistory = state.portfolioValueHistory || [];
  const idx = state.portfolioValueHistory.findIndex((e) => e.date === date);
  if (idx >= 0) state.portfolioValueHistory[idx].value = value;
  else state.portfolioValueHistory.push({ date, value });
  if (state.portfolioValueHistory.length > 90) state.portfolioValueHistory = state.portfolioValueHistory.slice(-90);
  return state;
}

function getPreviousPortfolioValue(state, now) {
  const today = now.toISOString().slice(0, 10);
  const history = (state.portfolioValueHistory || []).filter((e) => e.date < today);
  return history.length ? history[history.length - 1].value : null;
}

function estimateMonthlyGrowthRate(state) {
  const history = state.portfolioValueHistory || [];
  if (history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  const days = (new Date(last.date) - new Date(first.date)) / 86400000;
  if (days <= 0) return null;
  return ((last.value - first.value) / days) * 30;
}

function getMilestoneProgress(currentValue, state) {
  const next = MILESTONES.find((m) => m.value > currentValue);
  if (!next) {
    const last = MILESTONES[MILESTONES.length - 1];
    return { current: currentValue, next: null, message: `All milestones reached (latest target: $${last.value} by ${last.year})` };
  }
  const prev = [...MILESTONES].reverse().find((m) => m.value <= currentValue);
  const prevValue = prev ? prev.value : 0;
  const range = next.value - prevValue;
  const percentThere = range > 0 ? ((currentValue - prevValue) / range) * 100 : 0;

  const monthlyRate = estimateMonthlyGrowthRate(state);
  const estMonths = monthlyRate != null && monthlyRate > 0 ? Math.ceil((next.value - currentValue) / monthlyRate) : null;

  return { current: currentValue, next: next.value, year: next.year, percentThere, estMonths, monthlyRate };
}

// =============================================================================
// Component 11: State management - trader_state.json + discipline trackers
// =============================================================================

const LOG_FILE = path.join(__dirname, 'trading_log.txt');
const STATE_FILE = path.join(__dirname, 'trader_state.json');

function defaultState() {
  return {
    weeklyTradeCount: 0,
    weekStartDate: null,
    monthlyDepositMade: false,
    depositMonth: null,
    lastDepositAmount: null,
    quarterlyBigPlays: 0,
    quarterKey: null,
    takeProfitState: {},
    positionOpenDates: {},
    portfolioValueHistory: [],
    dryRunDates: [],
  };
}

function getISOWeekMonday(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function getMonthKey(date) {
  return date.toISOString().slice(0, 7);
}

function getQuarterKey(date) {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

function applyStateResets(state, now) {
  const monday = getISOWeekMonday(now);
  if (state.weekStartDate !== monday) {
    state.weekStartDate = monday;
    state.weeklyTradeCount = 0;
  }
  const month = getMonthKey(now);
  if (state.depositMonth !== month) {
    state.depositMonth = month;
    state.monthlyDepositMade = false;
  }
  const quarter = getQuarterKey(now);
  if (state.quarterKey !== quarter) {
    state.quarterKey = quarter;
    state.quarterlyBigPlays = 0;
  }
  return state;
}

function loadState(stateFile = STATE_FILE) {
  try {
    return { ...defaultState(), ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) };
  } catch (err) {
    return defaultState();
  }
}

function saveState(state, stateFile = STATE_FILE) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// =============================================================================
// Component 12: Logger
// =============================================================================

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

// =============================================================================
// Component 13: Daily report
// =============================================================================

function buildReportData({ timestamp, positions = {}, quotes = {}, totalPortfolioValue, signalContext = {}, state }) {
  const date = timestamp.slice(0, 10);
  const now = new Date(`${date}T00:00:00Z`);
  const previousPortfolioValue = getPreviousPortfolioValue(state, now);
  const dailyChange = previousPortfolioValue != null ? totalPortfolioValue - previousPortfolioValue : null;
  const dailyChangePercent = previousPortfolioValue ? dailyChange / previousPortfolioValue : null;

  const foundation = evaluateFoundation({ positions, quotes, totalPortfolioValue });
  const deposit = checkMonthlyDeposit(state);
  const tradeLimit = checkWeeklyTradeLimit(state);

  const activePositions = [];
  const decisions = [];
  for (const [symbol, config] of Object.entries(PORTFOLIO)) {
    if (config.tier === 'core_etf') continue;
    const pos = positions[symbol];
    const price = getQuotePrice(quotes[symbol]);
    if (!pos || price == null) continue;

    const evalResult = evaluatePosition({ symbol, avgCost: pos.avgCost, currentPrice: price, position: pos, takeProfitState: state.takeProfitState[symbol] || {} });
    const action = evalResult.action === 'sell_all' ? 'SELL' : evalResult.action === 'sell_partial' ? 'TRIM' : 'HOLD';
    const positionValue = pos.quantity * price;

    activePositions.push({ symbol, price, avgCost: pos.avgCost, changePercent: evalResult.changePercent, target2026: config.target2026, action, positionValue, evalResult });
    decisions.push({ symbol, ...evalResult, price });
  }

  const watchlistRows = [];
  for (const symbol of WATCHLIST) {
    const price = getQuotePrice(quotes[symbol]);
    if (price == null) continue;
    const changePercent = getQuoteChangePercent(quotes[symbol]);
    const mentions = getAllMentions(signalContext, symbol);
    const sentiment = signalContext.stocktwits ? signalContext.stocktwits[symbol] : null;
    let sources = mentions.length;
    if (sentiment && (sentiment.bullishPercent >= 75 || sentiment.bearishPercent >= 75)) sources += 1;
    watchlistRows.push({ symbol, price, changePercent, setup: classifySetup(changePercent, mentions), sources });
  }

  const milestone = getMilestoneProgress(totalPortfolioValue, state);

  const shortTerm = [];
  const longTerm = [];
  for (const symbol of Object.keys(positions)) {
    const holding = getHoldingPeriod(symbol, state, now);
    if (!holding) continue;
    (holding.longTerm ? longTerm : shortTerm).push(symbol);
  }

  const alerts = [];
  for (const ap of activePositions) {
    if (ap.evalResult.action === 'sell_all' && !ap.evalResult.takeProfitKey) {
      alerts.push(`STOP LOSS: ${ap.symbol} - ${ap.evalResult.reason}`);
    } else if (ap.evalResult.takeProfitKey) {
      alerts.push(`TAKE PROFIT: ${ap.symbol} - ${ap.evalResult.reason}`);
    }
    const sizing = checkPositionSize(ap.positionValue);
    if (sizing.tooSmall) alerts.push(`SMALL POSITION: ${ap.symbol} - ${sizing.reason}`);
  }
  alerts.push(...foundation.alerts.map((a) => `FOUNDATION: ${a}`));
  if (tradeLimit.approaching || tradeLimit.atLimit) {
    alerts.push(`TRADE LIMIT: ${tradeLimit.count}/${tradeLimit.max} weekly trades used${tradeLimit.atLimit ? ' - at limit, no new trades this week' : ' - approaching limit'}`);
  }
  if (!deposit.made) {
    alerts.push(`DEPOSIT: monthly QQQM deposit not yet recorded for ${deposit.month}`);
  }

  return {
    date, accountNumber: ACCOUNT_NUMBER, totalPortfolioValue, dailyChange, dailyChangePercent,
    foundation, deposit, activePositions, tradeLimit, watchlistRows, milestone,
    shortTerm, longTerm, alerts, decisions, fearGreed: signalContext.fearGreed,
  };
}

function formatDailyReport(data) {
  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const pct1 = (n) => `${(n * 100).toFixed(1)}%`;
  const lines = [];

  lines.push('=== TRADER BOT DAILY REPORT ===');
  lines.push(`Date: ${data.date} | Account: ${data.accountNumber}`);
  const changeStr = data.dailyChange != null
    ? `${data.dailyChange >= 0 ? '+' : '-'}$${Math.abs(data.dailyChange).toFixed(2)} (${data.dailyChangePercent >= 0 ? '+' : ''}${(data.dailyChangePercent * 100).toFixed(2)}%)`
    : 'n/a (no prior value recorded yet)';
  lines.push(`Portfolio Value: ${fmt(data.totalPortfolioValue)} | Daily Change: ${changeStr}`);
  lines.push('');

  lines.push('ENGINE 1 - FOUNDATION:');
  const q = data.foundation.QQQM;
  const s = data.foundation.SCHD;
  lines.push(`QQQM: ${fmt(q.value)} (${pct1(q.percent)} of portfolio) → Target 50% [${q.status === 'ON_TRACK' ? 'ON TRACK' : 'NEEDS ATTENTION'}]`);
  lines.push(`SCHD: ${fmt(s.value)} (${pct1(s.percent)} of portfolio) → Target 20% [${s.status === 'ON_TRACK' ? 'ON TRACK' : 'NEEDS ATTENTION'}]`);
  lines.push(`Monthly deposit: ${data.deposit.made ? 'DONE ✅' : 'PENDING ⚠️'}`);
  lines.push('70/30 reminder: 70% next deposit → QQQM');
  lines.push('');

  lines.push('ENGINE 2 - ACTIVE POSITIONS:');
  if (data.activePositions.length === 0) {
    lines.push('(no active positions with quotes available)');
  } else {
    for (const p of data.activePositions) {
      const pl = `${p.changePercent >= 0 ? '+' : ''}${(p.changePercent * 100).toFixed(1)}%`;
      lines.push(`${p.symbol} | ${fmt(p.price)} | Avg: ${fmt(p.avgCost)} | P&L: ${pl} | Target: $${p.target2026} | Action: ${p.action}`);
    }
  }
  lines.push(`Trades this week: ${data.tradeLimit.count}/${data.tradeLimit.max}`);
  lines.push('');

  lines.push('ENGINE 3 - CATALYST WATCHLIST:');
  if (data.watchlistRows.length === 0) {
    lines.push('(no watchlist quotes available)');
  } else {
    for (const w of data.watchlistRows) {
      const chg = w.changePercent != null ? `${w.changePercent >= 0 ? '+' : ''}${(w.changePercent * 100).toFixed(1)}%` : 'n/a';
      lines.push(`${w.symbol} | ${fmt(w.price)} | Change: ${chg} | Setup: ${w.setup} | Sources: ${w.sources}`);
    }
  }
  lines.push('');

  lines.push('MILESTONE PROGRESS:');
  lines.push(`Current: ${fmt(data.milestone.current)}`);
  if (data.milestone.next) {
    const est = data.milestone.estMonths != null ? `${data.milestone.estMonths} months` : 'insufficient history yet';
    lines.push(`Next: $${data.milestone.next} in ${data.milestone.year} → ${data.milestone.percentThere.toFixed(1)}% there → est. ${est} at current rate`);
  } else {
    lines.push(data.milestone.message);
  }
  lines.push('');

  lines.push('TAX AWARENESS:');
  lines.push(`Short term (<1yr): ${data.shortTerm.length ? data.shortTerm.join(', ') : 'none'} → High tax rate if sold`);
  lines.push(`Long term (1yr+): ${data.longTerm.length ? data.longTerm.join(', ') : 'none'} → Lower tax rate ✅`);
  lines.push('');

  lines.push('ALERTS 🚨:');
  if (data.alerts.length === 0) lines.push('(none)');
  else lines.push(...data.alerts);
  lines.push('================================');

  return lines.join('\n');
}

// =============================================================================
// Component 14: Orchestrator - single entry point
//
// Caller (Claude) batches Robinhood MCP calls once per cycle:
//   get_portfolio (account 647176189) -> totalPortfolioValue
//   get_equity_positions               -> positions
//   get_equity_quotes(getRequiredSymbols()) -> quotes (single batched call)
// and passes the results in here as plain data. This function does the
// Stocktwits + Fear & Greed fetches itself (in parallel, cached/retried).
//
// LIVE_TRADING gates real order placement and is never auto-flipped by this
// script - place_equity_order is never called here regardless of dryRun.
// =============================================================================

const LIVE_TRADING = false;

async function runTradingCycle({
  timestamp = new Date().toISOString(),
  positions = {},
  quotes = {},
  totalPortfolioValue = 0,
  signalContext = null,
  dryRun = !LIVE_TRADING,
  logFile = LOG_FILE,
  stateFile = STATE_FILE,
} = {}) {
  const now = new Date(`${timestamp.slice(0, 10)}T00:00:00Z`);
  const state = loadState(stateFile);
  applyStateResets(state, now);
  trackPositionOpenDates(positions, state, now);

  const ctx = signalContext || await gatherSignalContext(getRequiredSymbols());
  const reportData = buildReportData({ timestamp, positions, quotes, totalPortfolioValue, signalContext: ctx, state });

  for (const decision of reportData.decisions) {
    logEntry({
      timestamp, symbol: decision.symbol, action: decision.action, sellPortion: decision.sellPortion,
      price: decision.price, reason: decision.reason, source: 'risk_management', dryRun,
    }, logFile);
    if (decision.takeProfitKey) {
      state.takeProfitState[decision.symbol] = { ...(state.takeProfitState[decision.symbol] || {}), [decision.takeProfitKey]: true };
    }
  }

  recordPortfolioValue(state, now, totalPortfolioValue);
  if (dryRun) {
    const day = timestamp.slice(0, 10);
    if (!state.dryRunDates.includes(day)) state.dryRunDates.push(day);
  }
  saveState(state, stateFile);

  const reportText = formatDailyReport(reportData);
  console.log(reportText);

  return { timestamp, dryRun, reportData, reportText, signalContext: ctx };
}

// =============================================================================
// Self-tests (run with: node trader.js)
// =============================================================================

let testsRun = 0;
let testsPassed = 0;

function check(label, condition, detail) {
  testsRun += 1;
  if (condition) {
    testsPassed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    console.log(`  ❌ ${label}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runSelfTests() {
  console.log('=== Component 1: Config ===');
  check('PORTFOLIO has 9 symbols', Object.keys(PORTFOLIO).length === 9);
  check('WATCHLIST has 11 symbols', WATCHLIST.length === 11);
  check('QQQM/SCHD are core_etf with null stop loss', PORTFOLIO.QQQM.tier === 'core_etf' && PORTFOLIO.SCHD.stopLossPercent === null);
  check('NVDA blue_chip stop -15%', PORTFOLIO.NVDA.tier === 'blue_chip' && PORTFOLIO.NVDA.stopLossPercent === 0.15);
  check('RKLB high_growth stop -25%', PORTFOLIO.RKLB.tier === 'high_growth' && PORTFOLIO.RKLB.stopLossPercent === 0.25);
  check('getRequiredSymbols() = portfolio + watchlist, deduped', getRequiredSymbols().length === Object.keys(PORTFOLIO).length + WATCHLIST.length);
  check('MILESTONES has 7 targets', MILESTONES.length === 7 && MILESTONES[0].value === 3000 && MILESTONES[6].value === 100000);

  console.log('\n=== Component 6: Position evaluator ===');
  check('Core ETF deep red -> hold (never sell)', evaluatePosition({ symbol: 'QQQM', avgCost: 80, currentPrice: 60 }).action === 'hold');
  check('Blue chip down 16% -> sell_all (stop -15%)', evaluatePosition({ symbol: 'NVDA', avgCost: 100, currentPrice: 84 }).action === 'sell_all');
  check('Blue chip down 10% -> hold', evaluatePosition({ symbol: 'PLTR', avgCost: 50, currentPrice: 45 }).action === 'hold');
  check('High growth down 26% -> sell_all (stop -25%)', evaluatePosition({ symbol: 'RKLB', avgCost: 20, currentPrice: 14.8 }).action === 'sell_all');

  let r = evaluatePosition({ symbol: 'NVDA', avgCost: 100, currentPrice: 130 });
  check('Blue chip +30% no prior trims -> sell_partial 50% (tp1)', r.action === 'sell_partial' && r.sellPortion === 0.5 && r.takeProfitKey === 'tp1');
  r = evaluatePosition({ symbol: 'NVDA', avgCost: 100, currentPrice: 130, takeProfitState: { tp1: true } });
  check('Blue chip +30% tp1 already fired -> hold', r.action === 'hold');
  r = evaluatePosition({ symbol: 'PLTR', avgCost: 50, currentPrice: 77.5, takeProfitState: { tp1: true } });
  check('Blue chip +55% tp1 done -> sell_partial 25% (tp2)', r.action === 'sell_partial' && r.sellPortion === 0.25 && r.takeProfitKey === 'tp2');
  r = evaluatePosition({ symbol: 'PLTR', avgCost: 50, currentPrice: 77.5, takeProfitState: { tp1: true, tp2: true } });
  check('Blue chip +55% both done -> hold (let 25% ride)', r.action === 'hold');

  r = evaluatePosition({ symbol: 'RKLB', avgCost: 20, currentPrice: 26 });
  check('High growth +30% -> sell_partial 50% (tp1)', r.action === 'sell_partial' && r.sellPortion === 0.5 && r.takeProfitKey === 'tp1');
  r = evaluatePosition({ symbol: 'RKLB', avgCost: 20, currentPrice: 32, takeProfitState: { tp1: true } });
  check('High growth +60% tp1 done -> sell_partial 25% (tp2)', r.action === 'sell_partial' && r.sellPortion === 0.25 && r.takeProfitKey === 'tp2');

  r = evaluatePosition({ symbol: 'OKLO', avgCost: 10, currentPrice: 14.5, position: { isCatalystPlay: true } });
  check('Catalyst +45% -> sell_all 100% (tp1)', r.action === 'sell_all' && r.sellPortion === 1 && r.takeProfitKey === 'tp1');
  r = evaluatePosition({ symbol: 'OKLO', avgCost: 10, currentPrice: 7.4, position: { isCatalystPlay: true } });
  check('Catalyst -26% -> sell_all (stop -25%)', r.action === 'sell_all' && !r.takeProfitKey);
  r = evaluatePosition({ symbol: 'ZZZZ', avgCost: 10, currentPrice: 5 });
  check('Unconfigured symbol -> hold, flagged', r.action === 'hold' && r.tier === null);

  console.log('\n=== Component 7: Engine 1 - Foundation ===');
  let f = evaluateFoundation({
    positions: { QQQM: { quantity: 25, avgCost: 190 }, SCHD: { quantity: 15, avgCost: 26 } },
    quotes: { QQQM: 200, SCHD: 27 },
    totalPortfolioValue: 10000,
  });
  check('QQQM at 50% -> ON_TRACK', f.QQQM.status === 'ON_TRACK' && Math.abs(f.QQQM.percent - 0.5) < 1e-9);
  check('SCHD at 4.05% -> NEEDS_ATTENTION (target 20%)', f.SCHD.status === 'NEEDS_ATTENTION');
  f = evaluateFoundation({
    positions: { QQQM: { quantity: 5, avgCost: 190 }, SCHD: { quantity: 0, avgCost: 26 } },
    quotes: { QQQM: 200, SCHD: 27 },
    totalPortfolioValue: 10000,
  });
  check('QQQM at 10% -> below 40% alert fires', f.alerts.some((a) => a.includes('QQQM below 40%')));

  let st = defaultState();
  check('Fresh state: monthly deposit not made', checkMonthlyDeposit(st).made === false);
  recordMonthlyDeposit(st, 500);
  check('recordMonthlyDeposit() marks done', checkMonthlyDeposit(st).made === true);
  const split = splitDepositAllocation(500);
  check('70/30 split of $500 -> $350 QQQM / $150 other', split.qqqm === 350 && split.other === 150);

  console.log('\n=== Component 8: Engine 2 - Active trading ===');
  st = defaultState();
  let tl = checkWeeklyTradeLimit(st);
  check('Fresh state: 0/3 trades, not approaching', tl.count === 0 && !tl.approaching && !tl.atLimit);
  recordTrade(st); recordTrade(st);
  tl = checkWeeklyTradeLimit(st);
  check('After 2 trades: approaching limit (1 remaining)', tl.approaching === true && tl.remaining === 1);
  recordTrade(st);
  tl = checkWeeklyTradeLimit(st);
  check('After 3 trades: at limit', tl.atLimit === true);

  check('$50 position flagged too small', checkPositionSize(50).tooSmall === true);
  check('$150 position OK (>= $100 min)', checkPositionSize(150).tooSmall === false);

  let spike = checkSpikeFilter({ price: 105, previousClose: 100 });
  check('Up 5% same day -> spike filter blocks buy', spike.blocked === true);
  spike = checkSpikeFilter({ price: 102, previousClose: 100 });
  check('Up 2% same day -> buy allowed', spike.blocked === false);

  st = defaultState();
  const day0 = new Date('2026-06-09T00:00:00Z');
  trackPositionOpenDates({ NVDA: { quantity: 1, avgCost: 100 } }, st, day0);
  check('First sighting of NVDA stamps open date', st.positionOpenDates.NVDA === '2026-06-09');
  let hold = getHoldingPeriod('NVDA', st, day0);
  check('Same-day holding -> short term (0 days)', hold.days === 0 && hold.longTerm === false);
  st.positionOpenDates.NVDA = '2024-01-01';
  hold = getHoldingPeriod('NVDA', st, day0);
  check('Held since 2024-01-01 -> long term (>=365 days)', hold.longTerm === true);

  console.log('\n=== Component 9: Engine 3 - Catalyst plays ===');
  st = defaultState();
  let cand = evaluateCatalystCandidate({ symbol: 'OKLO', mentions: [], state: st });
  check('No mentions -> not eligible (no catalyst, <2 sources)', cand.eligible === false);
  cand = evaluateCatalystCandidate({
    symbol: 'OKLO', state: st,
    mentions: [
      { source: 'CNBC', symbol: 'OKLO', sentiment: 'positive', type: 'catalyst', daysUntil: 10 },
      { source: 'Reuters', symbol: 'OKLO', sentiment: 'positive', type: 'catalyst', daysUntil: 20 },
    ],
  });
  check('2 sources confirm catalyst within 30d -> eligible', cand.eligible === true);
  cand = evaluateCatalystCandidate({
    symbol: 'OKLO', state: st, recentGainPercent: 0.55,
    mentions: [
      { source: 'CNBC', symbol: 'OKLO', sentiment: 'positive', type: 'catalyst', daysUntil: 10 },
      { source: 'Reuters', symbol: 'OKLO', sentiment: 'positive', type: 'catalyst', daysUntil: 20 },
    ],
  });
  check('Already +55% in 30d -> not eligible (>=50% cap)', cand.eligible === false && cand.reasons.some((r2) => r2.includes('50%')));
  cand = evaluateCatalystCandidate({
    symbol: 'KTOS', state: st,
    mentions: [{ source: 'Trump Truth Social', symbol: 'KTOS', sentiment: 'positive', type: 'trump_endorsement' }],
  });
  check('Trump endorsement -> automatic watchlist add', cand.addToWatchlist === true);

  st = defaultState();
  let ql = checkQuarterlyPlayLimit(st);
  check('Fresh state: 0/2 quarterly plays', ql.count === 0 && !ql.atLimit);
  recordCatalystPlay(st); recordCatalystPlay(st);
  ql = checkQuarterlyPlayLimit(st);
  check('After 2 plays: at quarterly limit', ql.atLimit === true);

  check('classifySetup: down 6% -> DIP', classifySetup(-0.06, []) === 'DIP');
  check('classifySetup: up 7% -> MOMENTUM', classifySetup(0.07, []) === 'MOMENTUM');
  check('classifySetup: catalyst mention -> CATALYST', classifySetup(0.01, [{ type: 'catalyst' }]) === 'CATALYST');
  check('classifySetup: flat, no mentions -> WATCH', classifySetup(0.01, []) === 'WATCH');

  console.log('\n=== Component 10: Milestones ===');
  st = defaultState();
  let m = getMilestoneProgress(1500, st);
  check('At $1500 -> next milestone $3000/2026, 50% there', m.next === 3000 && Math.abs(m.percentThere - 50) < 1e-9);
  check('No history yet -> estMonths null', m.estMonths === null);
  recordPortfolioValue(st, new Date('2026-05-10T00:00:00Z'), 1000);
  recordPortfolioValue(st, new Date('2026-06-09T00:00:00Z'), 1500);
  m = getMilestoneProgress(1500, st);
  check('30 days, +$500 -> ~$500/mo growth rate', Math.abs(m.monthlyRate - 500) < 1);
  check('estMonths to $3000 at $500/mo ~= 3', m.estMonths === 3);
  m = getMilestoneProgress(150000, st);
  check('Above all milestones -> next is null with summary message', m.next === null && /All milestones reached/.test(m.message));

  console.log('\n=== Component 11: State management - resets ===');
  st = defaultState();
  st.weekStartDate = '2026-06-01'; st.weeklyTradeCount = 3;
  st.depositMonth = '2026-05'; st.monthlyDepositMade = true;
  st.quarterKey = '2026-Q1'; st.quarterlyBigPlays = 2;
  applyStateResets(st, new Date('2026-06-09T00:00:00Z'));
  check('New week (Mon 2026-06-08) resets weeklyTradeCount', st.weekStartDate === '2026-06-08' && st.weeklyTradeCount === 0);
  check('New month resets monthlyDepositMade', st.depositMonth === '2026-06' && st.monthlyDepositMade === false);
  check('New quarter resets quarterlyBigPlays', st.quarterKey === '2026-Q2' && st.quarterlyBigPlays === 0);

  console.log('\n=== Component 3: Live signal sources (Stocktwits + Fear & Greed) ===');
  const liveSentiment = await gatherMarketSentiment(['NVDA', 'PLTR']);
  for (const symbol of ['NVDA', 'PLTR']) {
    const sm = liveSentiment[symbol];
    check(`Stocktwits sentiment fetched for ${symbol}`, sm && sm.error === undefined, sm && sm.error);
  }
  const cacheStart = Date.now();
  await gatherMarketSentiment(['NVDA', 'PLTR']);
  check('Second fetch served from 60s cache (fast)', Date.now() - cacheStart < 200);

  const fg = await fetchFearGreedIndex();
  check('Fear & Greed index fetched', fg !== null && typeof fg.value === 'number', fg);

  console.log('\n=== Components 12-14: Logger, report, orchestrator (scratch files) ===');
  const testLogFile = path.join(__dirname, 'trading_log.selftest.txt');
  const testStateFile = path.join(__dirname, 'trader_state.selftest.json');
  for (const f of [testLogFile, testStateFile]) {
    try { fs.unlinkSync(f); } catch (err) { /* may not exist */ }
  }

  logEntry({ timestamp: '2026-06-09T07:30:00-05:00', symbol: 'NVDA', action: 'sell_all', price: 84, reason: 'Stop loss -16%', source: 'risk_management', dryRun: true }, testLogFile);
  const logged = fs.readFileSync(testLogFile, 'utf8').trim();
  check('Logger writes a line to trading_log.txt', logged.includes('NVDA') && logged.includes('[DRY RUN]'));

  saveState({ ...defaultState(), weeklyTradeCount: 2 }, testStateFile);
  check('State save/reload round-trips', loadState(testStateFile).weeklyTradeCount === 2);
  check('loadState() on missing file returns defaults', loadState(path.join(__dirname, 'does_not_exist.json')).weeklyTradeCount === 0);

  const mockSignalContext = {
    stocktwits: {}, fearGreed: { value: 45, classification: 'Neutral' },
    twitter: { mentions: [] }, news: { mentions: [] }, trump: { mentions: [] },
  };
  const mockPositions = {
    QQQM: { quantity: 25, avgCost: 190 },
    SCHD: { quantity: 15, avgCost: 26 },
    NVDA: { quantity: 8, avgCost: 100 },   // -16% -> stop loss
    PLTR: { quantity: 10, avgCost: 100 },  // +30% -> tp1
    RKLB: { quantity: 50, avgCost: 20 },
  };
  const mockQuotes = {
    QQQM: { price: 200, previousClose: 199 }, SCHD: { price: 27, previousClose: 26.9 },
    NVDA: 84, PLTR: 130, RKLB: 21, FLNC: 12, GLW: 30, ORCL: 180, INTC: 25,
    MU: { price: 130, previousClose: 124 }, AVGO: 250, KTOS: 60, MP: 35, OKLO: 60,
    VST: 180, APP: 400, SOUN: 15, AMD: 180, LMT: 500, DELL: 130,
  };

  console.log('\n  --- Day 1 ---');
  let cycle = await runTradingCycle({
    timestamp: '2026-06-09T07:30:00-05:00', positions: mockPositions, quotes: mockQuotes,
    totalPortfolioValue: 50000, signalContext: mockSignalContext, dryRun: true,
    logFile: testLogFile, stateFile: testStateFile,
  });
  check('Day 1 report contains header', cycle.reportText.includes('=== TRADER BOT DAILY REPORT ==='));
  check('Day 1: NVDA stop loss alert present', cycle.reportData.alerts.some((a) => a.includes('STOP LOSS: NVDA')));
  check('Day 1: PLTR take-profit alert present', cycle.reportData.alerts.some((a) => a.includes('TAKE PROFIT: PLTR')));
  check('Day 1: deposit pending alert present', cycle.reportData.alerts.some((a) => a.startsWith('DEPOSIT:')));
  check('Day 1: PLTR action = TRIM', cycle.reportData.activePositions.find((p) => p.symbol === 'PLTR').action === 'TRIM');
  check('Day 1: NVDA action = SELL', cycle.reportData.activePositions.find((p) => p.symbol === 'NVDA').action === 'SELL');

  console.log('\n  --- Day 2 (same prices): PLTR tp1 should not re-fire ---');
  cycle = await runTradingCycle({
    timestamp: '2026-06-10T07:30:00-05:00', positions: mockPositions, quotes: mockQuotes,
    totalPortfolioValue: 50500, signalContext: mockSignalContext, dryRun: true,
    logFile: testLogFile, stateFile: testStateFile,
  });
  check('Day 2: PLTR downgraded to HOLD (tp1 already fired)', cycle.reportData.activePositions.find((p) => p.symbol === 'PLTR').action === 'HOLD');
  check('Day 2: daily change computed vs day 1 value', cycle.reportData.dailyChange !== null && Math.abs(cycle.reportData.dailyChange - 500) < 1e-9);

  const finalState = loadState(testStateFile);
  check('takeProfitState.PLTR.tp1 persisted across runs', finalState.takeProfitState.PLTR && finalState.takeProfitState.PLTR.tp1 === true);
  check('portfolioValueHistory has 2 entries', finalState.portfolioValueHistory.length === 2);
  check('dryRunDates accumulated both days', finalState.dryRunDates.length === 2);

  for (const f of [testLogFile, testStateFile]) {
    try { fs.unlinkSync(f); } catch (err) { /* best effort cleanup */ }
  }

  console.log('\n' + '='.repeat(64));
  console.log(`TEST RESULTS: ${testsPassed}/${testsRun} passed`);
  console.log(`LIVE_TRADING = ${LIVE_TRADING} (dry run - place_equity_order is never called)`);
  console.log('='.repeat(64));

  if (testsPassed !== testsRun) process.exitCode = 1;
}

if (require.main === module) {
  runSelfTests().catch((err) => {
    console.error('Self-test run failed:', err);
    process.exitCode = 1;
  });
}

module.exports = {
  ACCOUNT_NUMBER,
  PORTFOLIO,
  WATCHLIST,
  TAKE_PROFIT_LADDERS,
  CATALYST_STOP_LOSS_PERCENT,
  MILESTONES,
  ENGINE1,
  ENGINE2,
  ENGINE3,
  getPortfolioConfig,
  getRequiredSymbols,
  cacheGet,
  cacheSet,
  clearCache,
  withRetry,
  fetchStocktwitsSentiment,
  fetchFearGreedIndex,
  gatherMarketSentiment,
  TWITTER_SOURCES,
  NEWS_OUTLETS,
  checkTwitterSignals,
  checkNewsSignals,
  checkTrumpMentions,
  gatherSignalContext,
  getAllMentions,
  normalizeQuote,
  getQuotePrice,
  getQuoteChangePercent,
  getTierConfig,
  evaluatePosition,
  evaluateFoundation,
  checkMonthlyDeposit,
  recordMonthlyDeposit,
  splitDepositAllocation,
  checkWeeklyTradeLimit,
  recordTrade,
  checkPositionSize,
  checkSpikeFilter,
  trackPositionOpenDates,
  getHoldingPeriod,
  checkQuarterlyPlayLimit,
  recordCatalystPlay,
  evaluateCatalystCandidate,
  classifySetup,
  recordPortfolioValue,
  getPreviousPortfolioValue,
  estimateMonthlyGrowthRate,
  getMilestoneProgress,
  defaultState,
  getISOWeekMonday,
  getMonthKey,
  getQuarterKey,
  applyStateResets,
  loadState,
  saveState,
  formatLogLine,
  logEntry,
  buildReportData,
  formatDailyReport,
  LIVE_TRADING,
  LOG_FILE,
  STATE_FILE,
  runTradingCycle,
};
