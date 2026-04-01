import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { UpgradeClient } from "./UpgradeClient";

export default async function UpgradePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const supabase = createServerSupabase();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan, applications_remaining")
    .eq("user_id", session.user.email)
    .single();

  return (
    <UpgradeClient
      currentPlan={(profile?.plan as string | null) ?? null}
      applicationsRemaining={profile?.applications_remaining ?? null}
    />
  );
}
