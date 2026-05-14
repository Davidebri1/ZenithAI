import { getStripeSync } from "./stripeClient";
import { storage } from "./storage";
import { logger } from "./lib/logger";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    let event: any;
    try {
      event = JSON.parse(payload.toString("utf8"));
    } catch {
      logger.warn("Webhook payload could not be parsed as JSON — skipping custom handling");
      return;
    }

    try {
      await WebhookHandlers.handleEvent(event);
    } catch (err) {
      logger.error({ err, eventType: event.type }, "Custom webhook handler error (non-fatal)");
    }
  }

  private static async handleEvent(event: any): Promise<void> {
    const type: string = event.type ?? "";
    const data = event.data?.object ?? {};

    if (
      type === "customer.subscription.created" ||
      type === "customer.subscription.updated"
    ) {
      const customerId = data.customer;
      if (!customerId) return;

      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        logger.warn({ customerId, eventType: type }, "No user found for Stripe customer — skipping quota update");
        return;
      }

      const status: string = data.status ?? "";
      if (ACTIVE_STATUSES.has(status)) {
        await storage.activateProPlan(user.id);
        await storage.updateUserStripeInfo(user.id, { stripeSubscriptionId: data.id });
        logger.info({ userId: user.id, status, eventType: type }, "Pro plan activated");
      } else {
        await storage.deactivateProPlan(user.id);
        logger.info({ userId: user.id, status, eventType: type }, "Pro plan deactivated");
      }
      return;
    }

    if (type === "customer.subscription.deleted") {
      const customerId = data.customer;
      if (!customerId) return;

      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) return;

      await storage.deactivateProPlan(user.id);
      logger.info({ userId: user.id }, "Subscription deleted — reverted to free plan");
      return;
    }

    if (type === "invoice.paid") {
      const billingReason: string = data.billing_reason ?? "";
      if (billingReason === "subscription_create") {
        return;
      }

      const customerId = data.customer;
      if (!customerId) return;

      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) return;

      if (user.plan === "pro") {
        await storage.resetMonthlyUsage(user.id);
        logger.info({ userId: user.id, billingReason }, "Monthly usage reset on invoice.paid");
      }
      return;
    }
  }
}
