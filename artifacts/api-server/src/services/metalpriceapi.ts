// Shared MetalPriceAPI service — cached, used by exchange, gold, and metals routes.

const API_KEY = process.env.METAL_PRICE_API_KEY ?? "";

// Free-plan supported currencies (XCU and other industrial metals require paid plan)
const CURRENCIES = [
  // Major & regional FX
  "SYP","AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AZN","BAM","BBD","BDT","BGN","BHD","BIF",
  "BND","BOB","BRL","BSD","BTN","BWP","BYN","BZD","CAD","CDF","CHF","CLF","CLP","CNY","COP","CRC",
  "CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","GBP","GEL","GHS","GIP",
  "GMD","GNF","GTQ","GYD","HKD","HNL","HTG","HUF","IDR","INR","IQD","IRR","ISK","JMD","JOD","JPY",
  "KES","KGS","KHR","KMF","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL",
  "MGA","MKD","MMK","MNT","MOP","MRO","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK",
  "NPR","NZD","OMR","PAB","PEN","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SCR",
  "SDG","SEK","SGD","SHP","SLL","SOS","SRD","STN","SVC","SZL","THB","TJS","TMT","TND","TOP","TRY",
  "TTD","TWD","TZS","UAH","UGX","USD","UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XOF","XPF",
  "YER","ZAR","ZMK","ZMW",
  // Precious metals (free plan)
  "XAU","XAG","XPT","XPD",
  // Crypto (free plan)
  "BTC","ETH","ADA","BNB","DOGE","SOL","XRP","USDT","USDC",
].join(",");

const API_URL = `https://api.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=USD&currencies=${CURRENCIES}`;

// Default fallback constant (kept for reference)
export const MARKET_USD_TO_SYP = 13500;

export interface MetalPriceApiResponse {
  success: boolean;
  base: string;
  timestamp: number;
  rates: Record<string, number>;
}

let cache: MetalPriceApiResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours (3x daily)

export async function fetchMetalPriceApi(): Promise<MetalPriceApiResponse> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  const res = await fetch(API_URL, {
    headers: { "User-Agent": "LiraPro-Hub/1.0" },
  });
  if (!res.ok) throw new Error(`MetalPriceAPI HTTP error: ${res.status}`);

  const data = await res.json() as MetalPriceApiResponse;
  if (!data.success) {
    const errMsg = (data as any).error?.message ?? "unknown error";
    throw new Error(`MetalPriceAPI returned success=false: ${errMsg}`);
  }

  // Remove Israeli shekel
  delete data.rates["ILS"];
  delete data.rates["USDILS"];

  cache = data;
  cacheTime = now;
  return data;
}

/** Get all FX rates (currency units per 1 USD) — SYP uses active rate (manual or default) */
export function getFxRates(data: MetalPriceApiResponse, sypRate: number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(data.rates)) {
    // Skip USD-inverse keys (e.g. "USDEUR") — keep only "per USD" rates
    if (!k.startsWith("USD") && typeof v === "number") {
      result[k] = v;
    }
  }
  result["USD"] = 1;
  result["SYP"] = sypRate;
  return result;
}

/** Gold price per troy oz in USD */
export function getGoldPriceUSD(data: MetalPriceApiResponse): number {
  // MetalPriceAPI returns USDXAU = price of 1 troy oz in USD
  const usdxau = data.rates["USDXAU"];
  if (usdxau && usdxau > 100) return usdxau;
  // Fallback: XAU = troy oz per USD → invert
  const xau = data.rates["XAU"];
  if (xau && xau > 0) return 1 / xau;
  return 3200;
}

/** Metal price in USD per unit (troy oz for precious metals) */
export function getMetalPriceUSD(data: MetalPriceApiResponse, symbol: string): number {
  // Try the USD-inverse key first (e.g. USDXAU, USDXAG)
  const usdKey = `USD${symbol}`;
  const direct = data.rates[usdKey];
  if (direct && direct > 0) return direct;
  // Fallback: symbol = unit-per-USD → invert
  const inverse = data.rates[symbol];
  if (inverse && inverse > 0) return 1 / inverse;
  return 0;
}
