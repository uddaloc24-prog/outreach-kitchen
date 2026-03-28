"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { CVUploadModal } from "@/components/CVUploadModal";
import { Loader2, RefreshCw } from "lucide-react";
import type { UserProfile } from "@/types";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => setProfile(d.profile))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-parchment">
        <TopBar />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      </div>
    );
  }

  const parsed = profile?.parsed_profile;

  return (
    <div className="min-h-screen bg-parchment">
      <TopBar />

      {showUpload && (
        <CVUploadModal
          onComplete={(p) => {
            setProfile(p);
            setShowUpload(false);
          }}
        />
      )}

      <div className="max-w-2xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-h1 text-ink">My Profile</h1>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 border border-warm-border px-4 py-2 text-small text-muted hover:border-ink hover:text-ink transition-colors"
          >
            <RefreshCw size={12} />
            Update CV
          </button>
        </div>

        {!parsed ? (
          <div className="text-center py-16 border border-dashed border-warm-border">
            <p className="text-body text-muted mb-4">No CV uploaded yet.</p>
            <button
              onClick={() => setShowUpload(true)}
              className="border border-ink px-6 py-2.5 text-small text-ink hover:bg-ink hover:text-parchment transition-colors"
            >
              Upload CV
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Identity */}
            <section className="border border-warm-border p-6">
              <h2 className="text-label text-muted mb-4">Identity</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-small text-muted">Name</p>
                  <p className="text-body text-ink">{parsed.name || "—"}</p>
                </div>
                <div>
                  <p className="text-small text-muted">Email</p>
                  <p className="text-body text-ink">{parsed.email || session?.user?.email || "—"}</p>
                </div>
                {parsed.phone && (
                  <div>
                    <p className="text-small text-muted">Phone</p>
                    <p className="text-body text-ink">{parsed.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-small text-muted">Current Role</p>
                  <p className="text-body text-ink">{parsed.current_role || "—"}</p>
                </div>
              </div>
            </section>

            {/* Summary */}
            {parsed.summary && (
              <section className="border border-warm-border p-6">
                <h2 className="text-label text-muted mb-3">Profile Summary</h2>
                <p className="text-body text-muted leading-relaxed">{parsed.summary}</p>
              </section>
            )}

            {/* Experience */}
            {parsed.experiences?.length > 0 && (
              <section className="border border-warm-border p-6">
                <h2 className="text-label text-muted mb-4">Experience</h2>
                <div className="space-y-4">
                  {parsed.experiences.map((exp, i) => (
                    <div key={i} className="border-l border-warm-border pl-4">
                      <p className="text-body text-ink font-medium">{exp.role}</p>
                      <p className="text-small text-muted">{exp.place} · {exp.period}</p>
                      {exp.highlights?.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {exp.highlights.map((h, j) => (
                            <li key={j} className="text-small text-muted">— {h}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education & Skills */}
            <div className="grid grid-cols-2 gap-4">
              {parsed.education && (
                <section className="border border-warm-border p-6">
                  <h2 className="text-label text-muted mb-3">Education</h2>
                  <p className="text-body text-ink">{parsed.education}</p>
                </section>
              )}
              {parsed.skills?.length > 0 && (
                <section className="border border-warm-border p-6">
                  <h2 className="text-label text-muted mb-3">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {parsed.skills.map((s, i) => (
                      <span key={i} className="text-small text-muted border border-warm-border px-2 py-0.5">
                        {s}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <p className="text-small text-muted/60">
              Last updated: {new Date(profile.updated_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
