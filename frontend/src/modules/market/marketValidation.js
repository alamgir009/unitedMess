export const MARKET_ITEMS_ERROR = 'Items purchased must contain at least 4 letters.';

export const hasValidMarketItems = (items) =>
  typeof items === 'string' && (items.trim().match(/\p{L}/gu)?.length ?? 0) >= 4;
