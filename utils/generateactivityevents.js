// jobs/generateActivityEvents.js
const ActivityEvent = require("../models/activity");

// ── provider pools ────────────────────────────────────────────────────────────

const RARE_PROVIDERS = [
  "FirstMillion",   // ultra-rare — XAUUSD only, special templates
  "CalvinTrade",
  "EchoFX",
  "VortexCapital",
  "LunaSignals",
];

const COMMON_PROVIDERS = [
  "AlphaSwing", "MaxTrade", "NovaFX", "ZenCapital", "PulseTrader",
  "ApexSignals", "OrionQuant", "BluePips", "DeltaEdge", "SentryTrades",
  "IronPips", "TitanFX", "CobraSignals", "StealthTrade", "CrestCapital",
  "SilverEdge", "AuroraFX", "SwiftPips", "NexusTrade", "PrimeFX",
  "RaptorQuant", "CipherFX", "ZephyrTrade", "PolarisFX", "OmegaSignals",
];

// ── data pools ────────────────────────────────────────────────────────────────

const ALL_PAIRS   = ["XAUUSD", "EURUSD", "GBPUSD", "US30", "NAS100", "GBPJPY", "USDJPY", "USDCAD", "AUDUSD", "BTCUSD", "USOIL", "SP500"];
const RISK_MODES  = ["Low", "Balanced", "Aggressive", "Conservative", "Dynamic"];
const COUNTRIES   = ["UAE", "UK", "Singapore", "Germany", "Malaysia", "USA", "India", "Canada", "Australia", "South Africa"];
const TIMEFRAMES  = ["M5", "M15", "H1", "H4", "D1"];
const ORDER_TYPES = ["Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop", "Market Buy", "Market Sell"];
const STRATEGIES  = ["Scalping", "Swing Trading", "News Trading", "Trend Following", "Mean Reversion", "Grid Strategy", "Breakout"];
const BADGES      = ["Elite Provider", "Top Performer", "Risk Controlled", "High Win Rate", "Consistent Returns"];

// ── helpers ───────────────────────────────────────────────────────────────────

const rand  = (min, max)          => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max, dp = 1)  => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const pick  = (arr)               => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n)            => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

// ── provider picker ───────────────────────────────────────────────────────────
// FirstMillion : 1.5%  (ultra-rare, memorable when it appears)
// Other rare   : 5%    combined
// Common       : rest

const pickProvider = () => {
  const roll = Math.random();
  if (roll < 0.015) return "FirstMillion";
  if (roll < 0.065) return pick(RARE_PROVIDERS.slice(1));
  return pick(COMMON_PROVIDERS);
};

// ── FirstMillion — XAUUSD only ────────────────────────────────────────────────

const firstMillionTemplates = () => [
  { category: "Signal",      message: `XAUUSD position opened at ${randF(1900, 2450, 2)}` },
  { category: "Signal",      message: `XAUUSD ${pick(["Buy", "Sell"])} executed — ${pick(TIMEFRAMES)} setup` },
  { category: "Signal",      message: `XAUUSD ${pick(ORDER_TYPES)} placed — precision entry` },
  { category: "Signal",      message: `XAUUSD breakout confirmed — position live` },
  { category: "Signal",      message: `XAUUSD SL moved to breakeven — trade secured` },
  { category: "Signal",      message: `XAUUSD partial close — ${rand(30, 60)}% profits locked` },
  { category: "Trade",       message: `XAUUSD order replicated across ${rand(80, 220)} elite followers` },
  { category: "Trade",       message: `XAUUSD position closed +${randF(0.8, 3.5, 1)}% in ${rand(2, 48)}h` },
  { category: "Trade",       message: `XAUUSD batch close — ${rand(2, 6)} positions settled` },
  { category: "Performance", message: `XAUUSD monthly return: +${randF(5, 18, 1)}%` },
  { category: "Performance", message: `XAUUSD win streak: ${rand(6, 22)} consecutive trades` },
  { category: "Performance", message: `XAUUSD profit factor reached ${randF(2.0, 4.5, 2)} this month` },
  { category: "Provider",    message: `${rand(3, 14)} new investors joined — XAUUSD strategy` },
  { category: "Provider",    message: `FirstMillion AUM crossed $${rand(500, 2000)}k` },
];

// ── common provider templates — rich variety ──────────────────────────────────

const commonTemplates = () => [
  // Signal
  { category: "Signal", message: `${pick(ALL_PAIRS)} position opened at ${randF(0.8, 2500, 2)}` },
  { category: "Signal", message: `${pick(ALL_PAIRS)} ${pick(["Buy", "Sell"])} signal fired — ${pick(TIMEFRAMES)}` },
  { category: "Signal", message: `${pick(ALL_PAIRS)} ${pick(ORDER_TYPES)} placed` },
  { category: "Signal", message: `${pickN(ALL_PAIRS, 2).join(" & ")} simultaneous entries` },
  { category: "Signal", message: `${pick(ALL_PAIRS)} breakout detected — position opened` },
  { category: "Signal", message: `${pick(ALL_PAIRS)} SL moved to breakeven` },
  { category: "Signal", message: `${pick(ALL_PAIRS)} partial close — ${rand(30, 70)}% secured` },
  { category: "Signal", message: `${pick(ALL_PAIRS)} news setup triggered` },
  { category: "Signal", message: `${pick(ALL_PAIRS)} reversal signal — short entered` },
  { category: "Signal", message: `${pick(ALL_PAIRS)} position scaled in — ${rand(2, 5)}x lots` },

  // Trade
  { category: "Trade", message: `Order replicated across ${rand(5, 150)} followers` },
  { category: "Trade", message: `${rand(2, 8)} positions closed — +${randF(0.5, 4.0, 1)}% net` },
  { category: "Trade", message: `${pick(ALL_PAIRS)} trade closed in ${rand(1, 72)}h` },
  { category: "Trade", message: `Batch close: ${rand(3, 10)} ${pick(ALL_PAIRS)} orders` },
  { category: "Trade", message: `Trade history: ${rand(200, 2000)} total closed trades` },
  { category: "Trade", message: `${rand(5, 40)} followers synced on new ${pick(ALL_PAIRS)} entry` },
  { category: "Trade", message: `${pick(ALL_PAIRS)} TP1 hit — running for TP2` },
  { category: "Trade", message: `Hedged ${pick(ALL_PAIRS)} position — risk neutral` },
  { category: "Trade", message: `${rand(10, 80)} copy accounts executed simultaneously` },

  // Performance
  { category: "Performance", message: `+${randF(0.3, 3.5, 1)}% gain today` },
  { category: "Performance", message: `Weekly return: +${randF(1, 8, 1)}%` },
  { category: "Performance", message: `Monthly target hit: +${randF(5, 20, 1)}%` },
  { category: "Performance", message: `Win rate climbed to ${rand(58, 92)}%` },
  { category: "Performance", message: `Drawdown held under ${randF(1, 4, 1)}% this week` },
  { category: "Performance", message: `${rand(8, 30)} winning trades in a row` },
  { category: "Performance", message: `Profit factor: ${randF(1.4, 3.5, 2)}` },
  { category: "Performance", message: `Risk-adjusted return: +${randF(2, 12, 1)}% this month` },
  { category: "Performance", message: `Best trade: +${randF(1.5, 6.0, 1)}% on ${pick(ALL_PAIRS)}` },
  { category: "Performance", message: `Equity high watermark updated` },

  // Provider
  { category: "Provider", message: `New follower joined from ${pick(COUNTRIES)}` },
  { category: "Provider", message: `${rand(2, 15)} new investors this week` },
  { category: "Provider", message: `${rand(10, 200)} followers now copying this strategy` },
  { category: "Provider", message: `Earned "${pick(BADGES)}" badge` },
  { category: "Provider", message: `Copy ratio increased by ${rand(5, 25)}% this month` },
  { category: "Provider", message: `${rand(1, 8)} investors upgraded allocation` },
  { category: "Provider", message: `Strategy hit $${rand(10, 500)}k total managed funds` },
  { category: "Provider", message: `Profile verified — ${pick(COUNTRIES)} resident` },
  { category: "Provider", message: `${rand(1, 5)} investors increased lot multiplier` },

  // Risk
  { category: "Risk", message: `Risk mode changed to ${pick(RISK_MODES)}` },
  { category: "Risk", message: `Daily drawdown limit set to ${randF(1.0, 4.0, 1)}%` },
  { category: "Risk", message: `Max lot size adjusted to ${randF(0.5, 5.0, 1)}` },
  { category: "Risk", message: `Strategy: ${pick(STRATEGIES)} — rules updated` },
  { category: "Risk", message: `Exposure reduced — portfolio rebalanced` },
  { category: "Risk", message: `Hedge position opened on ${pick(ALL_PAIRS)}` },
  { category: "Risk", message: `Trailing stop activated on ${pick(ALL_PAIRS)}` },
  { category: "Risk", message: `Max daily trades capped at ${rand(3, 10)}` },
  { category: "Risk", message: `Correlated pair exposure reduced` },
];

// ── event factory ─────────────────────────────────────────────────────────────

const makeEvent = () => {
  const provider  = pickProvider();
  const templates = provider === "FirstMillion"
    ? firstMillionTemplates()
    : commonTemplates();
  const t = pick(templates);
  return { category: t.category, provider, message: t.message };
};

// ── market hours guard ────────────────────────────────────────────────────────

const isMarketClosed = () => {
  const now     = new Date();
  const dayUTC  = now.getUTCDay();
  const hourUTC = now.getUTCHours();

  if (dayUTC === 6) return true;                   // Saturday all day
  if (dayUTC === 0 && hourUTC < 22) return true;   // Sunday before 22:00
  if (dayUTC === 5 && hourUTC >= 22) return true;  // Friday after 22:00

  return false;
};

// ── main ──────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * When count > 1 (e.g. market-open burst), each event is inserted
 * individually with a 2–8 second random gap so they get distinct
 * createdAt timestamps and the frontend shows natural "Xm ago" variance.
 */
const generateActivityEvents = async (count = 1) => {
  if (isMarketClosed()) {
    console.log("[activityEvents] market closed — skipping");
    return;
  }

  try {
    for (let i = 0; i < count; i++) {
      await ActivityEvent.create(makeEvent());
      // stagger each insert by 2–8 seconds so timestamps differ
      if (i < count - 1) await sleep(rand(2000, 8000));
    }
    console.log(`[activityEvents] inserted ${count} event(s)`);
  } catch (err) {
    console.error("[activityEvents] insert failed:", err.message);
  }
};

module.exports = { generateActivityEvents, isMarketClosed };