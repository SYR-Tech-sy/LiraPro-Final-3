import { Router, type IRouter } from "express";
import { GetMetalPricesResponse } from "@workspace/api-zod";
import { fetchMetalPriceApi, getMetalPriceUSD, MARKET_USD_TO_SYP } from "../services/metalpriceapi.js";
import { getActiveSypRate } from "../services/sypRateService.js";
import { getMetalOverride } from "../services/goldMetalRateService.js";

const router: IRouter = Router();

const METALS = [
  { name: "Gold",      nameAr: "الذهب",    symbol: "XAU", unit: "أوقية" },
  { name: "Silver",    nameAr: "الفضة",    symbol: "XAG", unit: "أوقية" },
  { name: "Platinum",  nameAr: "البلاتين", symbol: "XPT", unit: "أوقية" },
  { name: "Palladium", nameAr: "البلاديوم", symbol: "XPD", unit: "أوقية" },
  { name: "Copper",    nameAr: "النحاس",   symbol: "XCU", unit: "رطل" },
];

const FALLBACK_PRICES_USD: Record<string, number> = {
  XAU: 4700, XAG: 77, XPT: 2070, XPD: 1540, XCU: 4.5,
};

router.get("/metals", async (req, res): Promise<void> => {
  const sypRate = getActiveSypRate();

  try {
    const data = await fetchMetalPriceApi();

    const metalOverrides = await Promise.all(
      METALS.map(({ symbol }) => getMetalOverride(symbol)),
    );

    const metals = METALS.map(({ name, nameAr, symbol, unit }, i) => {
      let priceUSD = getMetalPriceUSD(data, symbol);
      if (!priceUSD || priceUSD <= 0) priceUSD = FALLBACK_PRICES_USD[symbol] ?? 100;
      const ovr = metalOverrides[i];
      const priceSYP = ovr?.isManual ? ovr.priceSYP : priceUSD * sypRate;
      return { name, nameAr, symbol, unit, priceUSD, priceSYP, isManual: ovr?.isManual ?? false };
    });

    const response = GetMetalPricesResponse.parse({
      metals,
      timestamp: new Date().toISOString(),
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch metal prices — using fallback");

    const metalOverrides = await Promise.all(
      METALS.map(({ symbol }) => getMetalOverride(symbol)),
    );

    const fallback = {
      metals: METALS.map(({ name, nameAr, symbol, unit }, i) => {
        const ovr = metalOverrides[i];
        const priceUSD = FALLBACK_PRICES_USD[symbol] ?? 100;
        const priceSYP = ovr?.isManual ? ovr.priceSYP : priceUSD * sypRate;
        return { name, nameAr, symbol, unit, priceUSD, priceSYP, isManual: ovr?.isManual ?? false };
      }),
      timestamp: new Date().toISOString(),
    };
    res.json(fallback);
  }
});

export default router;
