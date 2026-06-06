import { Router, type IRouter } from "express";
import { getSypRateSettings, setSypRateSettings } from "../services/sypRateService.js";
import {
  getGoldOverride, setGoldOverride, clearGoldOverride,
  getAllMetalOverrides, setMetalOverride, clearMetalOverride,
} from "../services/goldMetalRateService.js";

const router: IRouter = Router();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function checkAdmin(req: import("express").Request, res: import("express").Response): boolean {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) {
    res.status(403).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ── SYP Rate ──────────────────────────────────────────────────────────────────

router.get("/settings/syp-rate", async (_req, res): Promise<void> => {
  res.json(await getSypRateSettings());
});

router.post("/settings/syp-rate", async (req, res): Promise<void> => {
  if (!checkAdmin(req, res)) return;
  const { rate, isManual } = req.body as { rate: unknown; isManual: unknown };
  const rateNum = Number(rate);
  if (!Number.isFinite(rateNum) || rateNum <= 0) {
    res.status(400).json({ error: "rate must be a positive number" });
    return;
  }
  const updated = await setSypRateSettings(rateNum, !!isManual);
  req.log.info({ rate: rateNum, isManual }, "SYP rate settings updated");
  res.json(updated);
});

// ── Gold Override ─────────────────────────────────────────────────────────────

router.get("/settings/gold-rate", async (_req, res): Promise<void> => {
  const ovr = await getGoldOverride();
  res.json({ override: ovr, isManual: ovr?.isManual ?? false });
});

router.post("/settings/gold-rate", async (req, res): Promise<void> => {
  if (!checkAdmin(req, res)) return;
  const { pricePerGramSYP } = req.body as { pricePerGramSYP: unknown };
  const price = Number(pricePerGramSYP);
  if (!Number.isFinite(price) || price <= 0) {
    res.status(400).json({ error: "pricePerGramSYP must be a positive number" });
    return;
  }
  const updated = await setGoldOverride(price);
  req.log.info({ pricePerGramSYP: price }, "Gold price override set");
  res.json(updated);
});

router.delete("/settings/gold-rate", async (req, res): Promise<void> => {
  if (!checkAdmin(req, res)) return;
  await clearGoldOverride();
  req.log.info("Gold price override cleared");
  res.json({ ok: true });
});

// ── Metals Override ───────────────────────────────────────────────────────────

router.get("/settings/metal-rates", async (_req, res): Promise<void> => {
  res.json(await getAllMetalOverrides());
});

router.post("/settings/metal-rates/:symbol", async (req, res): Promise<void> => {
  if (!checkAdmin(req, res)) return;
  const symbol = req.params.symbol.toUpperCase();
  const { priceSYP } = req.body as { priceSYP: unknown };
  const price = Number(priceSYP);
  if (!Number.isFinite(price) || price <= 0) {
    res.status(400).json({ error: "priceSYP must be a positive number" });
    return;
  }
  const updated = await setMetalOverride(symbol, price);
  req.log.info({ symbol, priceSYP: price }, "Metal price override set");
  res.json(updated);
});

router.delete("/settings/metal-rates/:symbol", async (req, res): Promise<void> => {
  if (!checkAdmin(req, res)) return;
  const symbol = req.params.symbol.toUpperCase();
  await clearMetalOverride(symbol);
  req.log.info({ symbol }, "Metal price override cleared");
  res.json({ ok: true });
});

export default router;
