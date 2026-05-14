import { Router, type IRouter } from "express";
import { storage } from "../storage";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import type { Request, Response } from "express";

const router: IRouter = Router();

router.get("/stripe/config", async (_req: Request, res: Response) => {
  const publishableKey = await getStripePublishableKey();
  res.json({ publishableKey });
});

router.get("/stripe/products", async (_req: Request, res: Response) => {
  const rows = await storage.listProductsWithPrices();

  const productsMap = new Map<string, any>();
  for (const row of rows as any[]) {
    if (!productsMap.has(row.product_id)) {
      productsMap.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        description: row.product_description,
        active: row.product_active,
        metadata: row.product_metadata,
        prices: [],
      });
    }
    if (row.price_id) {
      productsMap.get(row.product_id).prices.push({
        id: row.price_id,
        unit_amount: row.unit_amount,
        currency: row.currency,
        recurring: row.recurring,
        active: row.price_active,
      });
    }
  }

  res.json({ data: Array.from(productsMap.values()) });
});

router.get("/stripe/subscription", async (req: any, res: Response) => {
  const user = await storage.getUser(req.auth.userId);
  if (!user?.stripeSubscriptionId) {
    return res.json({ subscription: null, plan: user?.plan ?? "free" });
  }
  const subscription = await storage.getSubscription(user.stripeSubscriptionId);
  res.json({ subscription, plan: user.plan });
});

router.post("/stripe/checkout", async (req: any, res: Response) => {
  const { priceId } = req.body as { priceId: string };
  if (!priceId) return res.status(400).json({ error: "priceId required" });

  let user = await storage.getUser(req.auth.userId);
  if (!user) {
    user = await storage.upsertUser({ id: req.auth.userId });
  }

  const stripe = await getUncachableStripeClient();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });
    await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
    customerId = customer.id;
  }

  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${baseUrl}/?checkout=success`,
    cancel_url: `${baseUrl}/?checkout=cancel`,
  });

  res.json({ url: session.url });
});

router.post("/stripe/portal", async (req: any, res: Response) => {
  const user = await storage.getUser(req.auth.userId);
  if (!user?.stripeCustomerId) {
    return res.status(400).json({ error: "No Stripe customer found" });
  }

  const stripe = await getUncachableStripeClient();
  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: baseUrl,
  });

  res.json({ url: session.url });
});

router.get("/stripe/quota", async (req: any, res: Response) => {
  let user = await storage.getUser(req.auth.userId);
  if (!user) {
    user = await storage.upsertUser({ id: req.auth.userId });
  }
  res.json({
    promptsUsed: user.promptsUsed,
    promptsLimit: user.promptsLimit,
    plan: user.plan,
    remaining: Math.max(0, user.promptsLimit - user.promptsUsed),
  });
});

export default router;
