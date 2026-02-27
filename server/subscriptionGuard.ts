import { db } from "./db";
import { eq, and, gte } from "drizzle-orm";
import { savedDeals, savedPresentations, users } from "@shared/schema";

export const TIER_LIMITS = {
  free: {
    maxSavedDeals: 3,
    maxAiPresentationsPerMonth: 2,
  },
  basic: {
    maxSavedDeals: 10,
    maxAiPresentationsPerMonth: 5,
  },
  premium: {
    maxSavedDeals: Infinity,
    maxAiPresentationsPerMonth: Infinity,
  },
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;

function getTierLimits(tier: string | null | undefined) {
  const normalized = (tier || "free").toLowerCase();
  if (normalized in TIER_LIMITS) {
    return TIER_LIMITS[normalized as SubscriptionTier];
  }
  return TIER_LIMITS.free;
}

export async function getUserTier(userId: string): Promise<string> {
  const [user] = await db.select({ subscriptionTier: users.subscriptionTier }).from(users).where(eq(users.id, userId));
  return user?.subscriptionTier || "free";
}

export async function checkDealSaveLimit(userId: string): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);

  if (limits.maxSavedDeals === Infinity) {
    return { allowed: true };
  }

  const deals = await db.select({ id: savedDeals.id })
    .from(savedDeals)
    .where(and(
      eq(savedDeals.userId, userId),
      eq(savedDeals.dealStatus, "active")
    ));

  const currentCount = deals.length;

  if (currentCount >= limits.maxSavedDeals) {
    const upgradeHint = tier === "free"
      ? "Upgrade to Basic to save up to 10 deals"
      : "Upgrade to Premium for unlimited deals";
    return {
      allowed: false,
      message: `You've reached your limit of ${limits.maxSavedDeals} saved deals on the ${tier} plan. ${upgradeHint}.`,
      currentCount,
      limit: limits.maxSavedDeals,
    };
  }

  return { allowed: true, currentCount, limit: limits.maxSavedDeals };
}

export async function checkAiPresentationLimit(userId: string): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);

  if (limits.maxAiPresentationsPerMonth === Infinity) {
    return { allowed: true };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const presentations = await db.select({ id: savedPresentations.id })
    .from(savedPresentations)
    .where(and(
      eq(savedPresentations.userId, userId),
      gte(savedPresentations.createdAt, startOfMonth)
    ));

  const currentCount = presentations.length;

  if (currentCount >= limits.maxAiPresentationsPerMonth) {
    const upgradeHint = tier === "free"
      ? "Upgrade to Basic for 5 presentations per month"
      : "Upgrade to Premium for unlimited presentations";
    return {
      allowed: false,
      message: `You've reached your limit of ${limits.maxAiPresentationsPerMonth} AI presentations this month on the ${tier} plan. ${upgradeHint}.`,
      currentCount,
      limit: limits.maxAiPresentationsPerMonth,
    };
  }

  return { allowed: true, currentCount, limit: limits.maxAiPresentationsPerMonth };
}
