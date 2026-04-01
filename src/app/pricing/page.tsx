import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { PricingClient } from "./PricingClient";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);

  // Check if the signed-in user is an institute user (unlimited access)
  let isInstituteUser = false;
  if (session?.user?.email) {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("allowed_users")
      .select("email")
      .eq("email", session.user.email)
      .single();
    if (data) isInstituteUser = true;
  }

  return (
    <Suspense>
      <PricingClient isInstituteUser={isInstituteUser} />
    </Suspense>
  );
}
