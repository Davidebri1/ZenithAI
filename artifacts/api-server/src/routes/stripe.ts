import { Router, type IRouter } from "express";
import { storage } from "../storage";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import type { Request, Response } from "express";

const router: IRouter = Router();

router.get("/stripe/config", async (_req: Request, res: Response) => {
  const publishableKey = await getStripePublishableKey();
  res.json({ publishableKey });
});

router.get("/stripe/products", async (req: Request, res: Response) => {
  try {
    const stripe = await getUncachableStripeClient();

    const stripeProducts = await stripe.products.list({ active: true, limit: 10 });
    const productsMap = new Map<string, any>();

    for (const product of stripeProducts.data) {
      const priceList = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
      productsMap.set(product.id, {
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        prices: priceList.data.map((p) => ({
          id: p.id,
          unit_amount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring ? { interval: p.recurring.interval } : null,
          active: p.active,
        })),
      });
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (err) {
    req.log.error({ err }, "listProducts error");
    res.status(500).json({ error: "Failed to load products" });
  }
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
