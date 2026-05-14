import { getUncachableStripeClient } from "./stripeClient";

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log("Checking for existing Zenith products...");

  const existing = await stripe.products.search({ query: "name:'Zenith Pro' AND active:'true'" });
  if (existing.data.length > 0) {
    console.log("Zenith Pro already exists:", existing.data[0].id);
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    prices.data.forEach((p) => {
      console.log(`  Price: ${p.id} — $${(p.unit_amount ?? 0) / 100}/${(p.recurring as any)?.interval}`);
    });
    return;
  }

  const pro = await stripe.products.create({
    name: "Zenith Pro",
    description: "Unlimited prompts across all 8 AI models — GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Llama, Qwen",
    metadata: { plan: "pro", promptsLimit: "9999" },
  });
  console.log("Created product:", pro.id, pro.name);

  const monthly = await stripe.prices.create({
    product: pro.id,
    unit_amount: 1499,
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log("Monthly price:", monthly.id, "— $14.99/month");

  const yearly = await stripe.prices.create({
    product: pro.id,
    unit_amount: 11900,
    currency: "usd",
    recurring: { interval: "year" },
  });
  console.log("Yearly price:", yearly.id, "— $119/year");

  console.log("\nDone. Webhooks will sync to DB automatically.");
}

createProducts().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
