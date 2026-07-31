'use strict';
const { runTradingCycle } = require('./trader.js');

const timestamp = '2026-07-31T12:37:00.000Z';

const quotes = {
  QQQM:  { price: 283.992800, previousClose: 281.350000 },
  SCHD:  { price: 33.398500,  previousClose: 33.410000 },
  VOO:   { price: 683.220000, previousClose: 681.790000 },
  NVDA:  { price: 196.799700, previousClose: 195.040000 },
  PLTR:  { price: 122.540000, previousClose: 122.260000 },
  RKLB:  { price: 66.000000,  previousClose: 64.680000 },
  NBIS:  { price: 202.300000, previousClose: 188.430000 },
  FLNC:  { price: 14.768700,  previousClose: 13.470000 },
  GLW:   { price: 140.140000, previousClose: 135.220000 },
  INTC:  { price: 94.580000,  previousClose: 91.130000 },
  ORCL:  { price: 129.507900, previousClose: 127.560000 },
  MU:    { price: 906.128800, previousClose: 874.660000 },
  AVGO:  { price: 390.733600, previousClose: 387.840000 },
  KTOS:  { price: 46.750000,  previousClose: 46.170000 },
  MP:    { price: 42.400000,  previousClose: 41.660000 },
  OKLO:  { price: 41.700000,  previousClose: 41.090000 },
  VST:   { price: 151.300000, previousClose: 148.620000 },
  APP:   { price: 401.131900, previousClose: 403.870000 },
  SOUN:  { price: 6.160100,   previousClose: 6.140000 },
  AMD:   { price: 502.750000, previousClose: 485.390000 },
  LMT:   { price: 571.560000, previousClose: 574.110000 },
  DELL:  { price: 410.990000, previousClose: 404.810000 },
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

const totalPortfolioValue = 1441.42536052804;

runTradingCycle({ timestamp, positions, quotes, totalPortfolioValue, dryRun: true })
  .then(({ reportText }) => { console.log('\n--- CYCLE COMPLETE ---'); })
  .catch((err) => { console.error('Cycle error:', err); process.exit(1); });
