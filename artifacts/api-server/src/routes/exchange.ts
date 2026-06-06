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
