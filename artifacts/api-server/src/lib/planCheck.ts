import { type Request, type Response } from "express";
import { storage } from "../storage";
import { getAuth } from "@clerk/express";

export type PlanTier = "free" | "pro" | "elite";

/** Returns true if the user meets the minimum plan requirement.
 *  Responds with 402 and returns false if not. */
export async function requirePlan(req: Request, res: Response, minPlan: PlanTier): Promise<boolean> {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "unauthenticated", message: "Sign in to access this model." });
    return false;
  }

  const user = await storage.getUser(userId);
  if (!user) {
    res.status(401).json({ error: "unauthenticated", message: "User not found." });
    return false;
  }

  const tierOrder: PlanTier[] = ["free", "pro", "elite"];
  const userTierIdx = tierOrder.indexOf((user.plan ?? "free") as PlanTier);
  const requiredTierIdx = tierOrder.indexOf(minPlan);

  if (userTierIdx < requiredTierIdx) {
    const label = minPlan === "elite" ? "Elite ($50/mo)" : "Pro ($20/mo)";
    res.status(402).json({
      error: "plan_required",
      message: `This model requires Zenith ${label}. Upgrade to unlock it.`,
      requiredPlan: minPlan,
      currentPlan: user.plan ?? "free",
    });
    return false;
  }

  return true;
}
