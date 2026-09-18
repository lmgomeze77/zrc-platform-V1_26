export const MARKET_SYMBOLS = [
  "EUR/USD",
  "IBEX 35",
  "BRENT Crude",
  "WTI Crude",
  "GOLD (XAU/USD)",
  "BTC/USD",
  "VIX",
  "US 10Y Yield",
  "S&P 500",
  "DAX 40",
  "EUR/GBP",
  "DXY Dollar Index",
  "Natural Gas",
  "Copper",
  "USD/CNY",
];

const PERCENT_CHANGE = /^[+-](?:\d+(?:\.\d+)?|\.\d+)%$/;

function fail(label, errors) {
  throw new Error(`${label} schema invalid: ${errors.join("; ")}`);
}

export function assertMarketTicker(value, label = "market_ticker") {
  const errors = [];
  if (!Array.isArray(value)) fail(label, ["must be an array"]);
  if (value.length !== MARKET_SYMBOLS.length) {
    errors.push(`must contain ${MARKET_SYMBOLS.length} instruments (received ${value.length})`);
  }

  value.forEach((item, index) => {
    const expectedSymbol = MARKET_SYMBOLS[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`[${index}] must be an object`);
      return;
    }
    if (item.symbol !== expectedSymbol) errors.push(`[${index}].symbol must be "${expectedSymbol}"`);
    if (typeof item.value !== "string" || item.value.trim() === "") errors.push(`[${index}].value must be a non-empty string`);
    if (typeof item.change !== "string" || !PERCENT_CHANGE.test(item.change)) {
      errors.push(`[${index}].change must be a signed percentage`);
    }
    if (typeof item.up !== "boolean") errors.push(`[${index}].up must be boolean`);
    if (typeof item.change === "string" && PERCENT_CHANGE.test(item.change)) {
      const positive = item.change.startsWith("+");
      if (item.up !== positive) errors.push(`[${index}].up conflicts with change sign`);
    }
  });

  if (errors.length) fail(label, errors);
  return value;
}

export function assertHeadlinesDocument(value) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("headlines document", ["must be an object"]);
  try {
    assertMarketTicker(value.market_ticker);
  } catch (error) {
    errors.push(error.message);
  }
  if (!Array.isArray(value.headlines)) errors.push("headlines must be an array");
  if (typeof value.generated_at !== "string" || Number.isNaN(Date.parse(value.generated_at))) {
    errors.push("generated_at must be an ISO date string");
  }
  if (typeof value.market_updated_at !== "string" || Number.isNaN(Date.parse(value.market_updated_at))) {
    errors.push("market_updated_at must be an ISO date string");
  }
  if (errors.length) fail("headlines document", errors);
  return value;
}
