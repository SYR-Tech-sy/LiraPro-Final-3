import { Router, type IRouter } from "express";
import { GetGoldPricesResponse } from "@workspace/api-zod";
import { fetchMetalPriceApi, getGoldPriceUSD, MARKET_USD_TO_SYP } from "../services/metalpriceapi.js";
import { getActiveSypRate } from "../services/sypRateService.js";
import { getGoldOverride } from "../services/goldMetalRateService.js";

const router: IRouter = Router();

const KARATS = [
  { karat: 24, purity: 1.0 },
  { karat: 22, purity: 22 / 24 },
  { karat: 21, purity: 21 / 24 },
  { karat: 18, purity: 18 / 24 },
  { karat: 14, purity: 14 / 24 },
];

const TROY_OZ_TO_GRAM = 31.1035;

router.get("/gold/prices", async (req, res): Promise<void> => {
  const sypRate = await getActiveSypRate();
  const goldOvr = await getGoldOverride();

  try {
    const data = await fetchMetalPriceApi();
    const goldPricePerOzUSD = getGoldPriceUSD(data);
    const pricePerGramUSD = goldPricePerOzUSD / TROY_OZ_TO_GRAM;
    const apiPricePerGramSYP = pricePerGramUSD * sypRate;
    const pricePerGramSYP = goldOvr?.isManual ? goldOvr.pricePerGramSYP : apiPricePerGramSYP;

    const karats = KARATS.map(({ karat, purity }) => ({
      karat,
      purity,
      pricePerGramUSD: pricePerGramUSD * purity,
      pricePerGramSYP: pricePerGramSYP * purity,
    }));

    const response = GetGoldPricesResponse.parse({
      pricePerGramUSD,
      pricePerGramSYP,
      karats,
      timestamp: new Date().toISOString(),
      isManual: goldOvr?.isManual ?? false,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch gold prices — using fallback");
    const fallbackPricePerOz = 3200;
    const pricePerGramUSD = fallbackPricePerOz / TROY_OZ_TO_GRAM;
    const apiPricePerGramSYP = pricePerGramUSD * sypRate;
    const pricePerGramSYP = goldOvr?.isManual ? goldOvr.pricePerGramSYP : apiPricePerGramSYP;
    const karats = KARATS.map(({ karat, purity }) => ({
      karat,
      purity,
      pricePerGramUSD: pricePerGramUSD * purity,
      pricePerGramSYP: pricePerGramSYP * purity,
    }));
    const response = GetGoldPricesResponse.parse({
      pricePerGramUSD,
      pricePerGramSYP,
      karats,
      timestamp: new Date().toISOString(),
      isManual: goldOvr?.isManual ?? false,
    });
    res.json(response);
  }
});

export default router;
