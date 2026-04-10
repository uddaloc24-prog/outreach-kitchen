"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { EmployerDashboard } from "@/components/EmployerDashboard";
import type { EmployerRestaurant } from "@/types";

type RestaurantResponse = {
  restaurant: (EmployerRestaurant & { employer_role?: string }) | null;
  error?: string;
};

export default function EmployerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<(EmployerRestaurant & { employer_role?: string }) | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }
    if (status !== "authenticated") return;

    async function checkRestaurant() {
      try {
        const res = await fetch("/api/employer/restaurant");
        const data = await res.json() as RestaurantResponse;
        if (!data.restaurant) {
          router.replace("/employer/setup");
          return;
        }
        setRestaurant(data.restaurant);
      } catch {
        router.replace("/employer/setup");
      } finally {
        setLoading(false);
      }
    }

    checkRestaurant();
  }, [status, router]);

  if (status === "loading" || loading || restaurant === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!restaurant) {
    return null; // redirect in progress
  }

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />
      <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-2">
            Employer
          </p>
          <h1 className="font-display text-[28px] sm:text-[38px] font-light text-ink leading-tight">
            Applications inbox
          </h1>
        </div>

        <EmployerDashboard restaurant={restaurant} />
      </div>
    </div>
  );
}
