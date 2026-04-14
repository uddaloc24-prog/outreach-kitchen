import { createServerSupabase } from "./supabase-server";

export interface SubscriptionStatus {
  allowed: boolean;
  remaining: number;
  tier: string | null;
  status: string | null;
}

/**
 * Check whether a user can send an application.
 *
 * Priority order:
 *   1. Institute users (allowed_users table) → always allowed
 *   2. Legacy Stripe users with applications_remaining on user_profiles → allowed if > 0
 *   3. Dodo subscription users (user_subscriptions) → allowed if active & under limit
 *   4. Free-trial users → allowed if applications_remaining > 0
 */
export async function canSendApplication(userEmail: string): Promise<SubscriptionStatus> {
  const supabase = createServerSupabase();

  // 1. Check if institute user (unlimited)
  const { data: allowed } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", userEmail)
    .single();

  if (allowed) {
    return { allowed: true, remaining: Infinity, tier: "institute", status: "active" };
  }

  // 2. Check Dodo subscription
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_email", userEmail)
    .eq("status", "active")
    .single();

  if (sub) {
    const remaining = sub.applications_limit - sub.applications_used;
    return {
      allowed: remaining > 0,
      remaining: Math.max(remaining, 0),
      tier: sub.tier,
      status: sub.status,
    };
  }

  // 3. Fallback to legacy user_profiles (Stripe one-time or free trial)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_type, plan, applications_remaining")
    .eq("user_id", userEmail)
    .single();

  if (profile) {
    // applications_remaining === null means unlimited (old unlimited plan or institute)
    if (profile.applications_remaining === null) {
      return { allowed: true, remaining: Infinity, tier: profile.plan ?? profile.user_type, status: "active" };
    }
    return {
      allowed: profile.applications_remaining > 0,
      remaining: Math.max(profile.applications_remaining, 0),
      tier: profile.plan ?? profile.user_type,
      status: "active",
    };
  }

  return { allowed: false, remaining: 0, tier: null, status: null };
}

/**
 * Atomically increment the applications_used counter for a Dodo subscriber.
 * Returns true if the increment succeeded (user was active & under limit).
 */
export async function incrementApplicationCount(userEmail: string): Promise<boolean> {
  const supabase = createServerSupabase();

  // Try Dodo subscription first
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("id, applications_used, applications_limit")
    .eq("user_email", userEmail)
    .eq("status", "active")
    .single();

  if (sub) {
    if (sub.applications_used >= sub.applications_limit) return false;

    const { error } = await supabase.rpc("increment_applications_used", {
      p_email: userEmail,
    });
    return !error;
  }

  // Fall back to legacy decrement on user_profiles
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("applications_remaining")
    .eq("user_id", userEmail)
    .single();

  if (!profile) return false;

  // null = unlimited (institute / old unlimited plan)
  if (profile.applications_remaining === null) return true;

  if (profile.applications_remaining <= 0) return false;

  const { data: updated } = await supabase
    .from("user_profiles")
    .update({ applications_remaining: profile.applications_remaining - 1 })
    .eq("user_id", userEmail)
    .gte("applications_remaining", 1)
    .select("applications_remaining")
    .single();

  return !!updated;
}
