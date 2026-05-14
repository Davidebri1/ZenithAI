import { users } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";

export class Storage {
  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} ORDER BY created DESC`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true) {
    const result = await db.execute(sql`
      WITH paginated_products AS (
        SELECT id, name, description, metadata, active
        FROM stripe.products
        WHERE active = ${active}
        ORDER BY created DESC
      )
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.active as product_active,
        p.metadata as product_metadata,
        pr.id as price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring,
        pr.active as price_active
      FROM paginated_products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      ORDER BY p.created DESC, pr.unit_amount
    `);
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async getCustomerByStripeId(stripeCustomerId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.customers WHERE id = ${stripeCustomerId}`
    );
    return result.rows[0] || null;
  }

  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async upsertUser(data: { id: string; email?: string | null }) {
    const [user] = await db
      .insert(users)
      .values({ id: data.id, email: data.email ?? null })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: data.email ?? null, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(
    userId: string,
    info: { stripeCustomerId?: string; stripeSubscriptionId?: string; plan?: string; promptsLimit?: number }
  ) {
    const [user] = await db
      .update(users)
      .set({ ...info, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async incrementPromptsUsed(userId: string) {
    const [user] = await db
      .update(users)
      .set({ promptsUsed: sql`${users.promptsUsed} + 1`, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async resetPromptsUsed(userId: string) {
    const [user] = await db
      .update(users)
      .set({ promptsUsed: 0, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new Storage();
