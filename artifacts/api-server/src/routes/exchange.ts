import { Router, type IRouter } from "express";
import {
  GetExchangeRatesResponse,
  ConvertCurrencyQueryParams,
  ConvertCurrencyResponse,
} from "@workspace/api-zod";
import { fetchMetalPriceApi, getFxRates, MARKET_USD_TO_SYP } from "../services/metalpriceapi.js";
import { getActiveSypRate, getSypRateSettings } from "../services/sypRateService.js";

const router: IRouter = Router();

// Fallback rates in case API fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, SYP: 13500, EUR: 0.92, TRY: 38, GBP: 0.79,
  AED: 3.67, SAR: 3.75, EGP: 50, IQD: 1310, JOD: 0.71,
  KWD: 0.31, BHD: 0.38, QAR: 3.64, OMR: 0.38, LBP: 89500,
  // Arab world
  TND: 3.11, MAD: 10.05, DZD: 135, LYD: 4.87, SDG: 601, YER: 250,
  // Asia-Pacific
  JPY: 157, KRW: 1380, CNY: 7.25, INR: 83.5, PKR: 278, BDT: 110,
  IDR: 16200, MYR: 4.72, THB: 36.5, SGD: 1.35, HKD: 7.82, TWD: 32.3,
  // Americas & Oceania
  CAD: 1.37, AUD: 1.54, NZD: 1.63, BRL: 5.15, MXN: 17.2, ARS: 870,
  // Europe
  CHF: 0.91, NOK: 10.7, SEK: 10.6, DKK: 6.89, PLN: 4.02,
  CZK: 23.1, HUF: 360, RON: 4.58, UAH: 38.5, RUB: 90,
  // CIS & Caucasus
  GEL: 2.69, AZN: 1.70, AMD: 388, KZT: 447, UZS: 12700,
  // Africa
  NGN: 1580, ZAR: 18.7,
};

async function fetchRates(sypRate: number): Promise<{ rates: Record<string, number>; rawSypRate: number }> {
  const data = await fetchMetalPriceApi();
  const rawSypRate = typeof data.rates["SYP"] === "number" && data.rates["SYP"] > 0
    ? data.rates["SYP"]
    : MARKET_USD_TO_SYP;
  return { rates: getFxRates(data, sypRate), rawSypRate };
}

router.get("/exchange/rates", async (req, res): Promise<void> => {
  const [settings, usd_to_syp] = await Promise.all([getSypRateSettings(), getActiveSypRate()]);

  try {
    const { rates, rawSypRate } = await fetchRates(usd_to_syp);
    const try_rate = rates["TRY"] ?? 38;
    const try_to_syp = usd_to_syp / try_rate;

    const response = GetExchangeRatesResponse.parse({
      base: "USD",
      rates,
      usd_to_syp,
      try_to_syp,
      is_manual_rate: settings.isManual,
      manual_updated_at: settings.isManual ? settings.updatedAt : undefined,
      timestamp: new Date().toISOString(),
    });
    res.json({ ...response, global_usd_to_syp: rawSypRate });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch exchange rates — using fallback");
    const fallbackRates = { ...FALLBACK_RATES, SYP: usd_to_syp };
    const try_to_syp = usd_to_syp / (FALLBACK_RATES["TRY"] ?? 38);
    const response = GetExchangeRatesResponse.parse({
      base: "USD",
      rates: fallbackRates,
      usd_to_syp,
      try_to_syp,
      is_manual_rate: settings.isManual,
      manual_updated_at: settings.isManual ? settings.updatedAt : undefined,
      timestamp: new Date().toISOString(),
    });
    res.json({ ...response, global_usd_to_syp: MARKET_USD_TO_SYP });
  }
});

router.get("/exchange/convert", async (req, res): Promise<void> => {
  const parsed = ConvertCurrencyQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { from, to, amount } = parsed.data;
  const sypRate = await getActiveSypRate();

  try {
    const { rates } = await fetchRates(sypRate);

    function getRateSYP(code: string): number {
      if (code === "SYP") return 1;
      if (code === "USD") return sypRate;
      const codeVsUSD = rates[code];
      if (!codeVsUSD) return 0;
      return sypRate / codeVsUSD;
    }

    const fromSYP = getRateSYP(from);
    const toSYP = getRateSYP(to);

    if (!fromSYP || !toSYP) {
      res.status(400).json({ error: "Invalid currency code" });
      return;
    }

    const inSYP = amount * fromSYP;
    const result = inSYP / toSYP;
    const rate = result / amount;

    const response = ConvertCurrencyResponse.parse({
      from, to, amount, result, rate,
      timestamp: new Date().toISOString(),
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to convert currency");
    res.status(500).json({ error: "Conversion failed" });
  }
});

export default router;
