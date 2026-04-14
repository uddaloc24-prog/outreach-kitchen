import Link from "next/link";
import Image from "next/image";
import type { ParsedProfile, ParsedProfileExperience } from "@/types";

interface ChefProfileProps {
  name: string;
  avatar_url: string | null;
  profile: ParsedProfile | null;
}

function AvatarOrInitial({
  name,
  avatar_url,
}: {
  name: string;
  avatar_url: string | null;
}) {
  if (avatar_url) {
    return (
      <Image
        src={avatar_url}
        alt={name}
        width={80}
        height={80}
        className="w-20 h-20 rounded-full object-cover border border-warm-border"
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className="w-20 h-20 rounded-full border border-warm-border bg-parchment flex items-center justify-center">
      <span className="font-display text-3xl text-ink">{initial}</span>
    </div>
  );
}

function ExperienceTimeline({
  experiences,
}: {
  experiences: ParsedProfileExperience[];
}) {
  if (!experiences || experiences.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="font-display text-[13px] tracking-widest uppercase text-muted mb-6 border-b border-warm-border pb-2">
        Experience
      </h2>
      <div className="space-y-8">
        {experiences.map((exp, i) => (
          <div key={i} className="flex gap-6 sm:gap-10">
            <div className="w-28 sm:w-36 shrink-0 text-right">
              <span className="text-[12px] text-muted tracking-wide leading-relaxed">
                {exp.period}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-ink">{exp.role}</p>
              <p className="text-[13px] text-muted mb-2">{exp.place}</p>
              {exp.highlights && exp.highlights.length > 0 && (
                <ul className="space-y-1">
                  {exp.highlights.map((h, j) => (
                    <li
                      key={j}
                      className="text-[13px] text-ink/80 pl-3 border-l border-warm-border"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TagList({ items, label }: { items: string[]; label: string }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="font-display text-[11px] tracking-widest uppercase text-muted mb-3">
        {label}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="text-[12px] text-ink border border-warm-border px-2 py-0.5"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChefProfile({ name, avatar_url, profile }: ChefProfileProps) {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 pt-16 pb-10">
        <div className="flex items-start gap-6 mb-8">
          <AvatarOrInitial name={name} avatar_url={avatar_url} />
          <div className="min-w-0">
            <h1 className="font-display text-[28px] sm:text-[36px] font-light text-ink leading-tight">
              {name}
            </h1>
            {profile?.current_role && (
              <p className="text-[14px] text-muted mt-1 tracking-wide">
                {profile.current_role}
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        {profile?.summary && (
          <p className="text-[15px] text-ink/90 leading-relaxed border-l-2 border-warm-border pl-4 italic">
            {profile.summary}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10">
        <hr className="border-warm-border" />
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10">
        {/* Experience */}
        {profile?.experiences && (
          <ExperienceTimeline experiences={profile.experiences} />
        )}

        {/* Skills / Languages / Education grid */}
        {(profile?.skills?.length ||
          profile?.languages?.length ||
          profile?.education) && (
          <section className="mb-10">
            <h2 className="font-display text-[13px] tracking-widest uppercase text-muted mb-6 border-b border-warm-border pb-2">
              Background
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {profile.skills?.length ? (
                <TagList items={profile.skills} label="Skills" />
              ) : null}
              {profile.languages?.length ? (
                <TagList items={profile.languages} label="Languages" />
              ) : null}
              {profile.education && (
                <div>
                  <h3 className="font-display text-[11px] tracking-widest uppercase text-muted mb-3">
                    Education
                  </h3>
                  <p className="text-[13px] text-ink">{profile.education}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="border border-warm-border p-6 text-center mb-10">
          <p className="text-[13px] text-muted mb-4 tracking-wide">
            Interested in this chef's work?
          </p>
          <Link
            href="/"
            className="inline-block text-[13px] border border-ink px-6 py-2.5 text-ink hover:bg-ink hover:text-parchment transition-colors tracking-wide"
          >
            Contact via Kitchen Applications
          </Link>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-warm-border">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-6 text-center">
          <p className="text-[11px] text-muted tracking-widest uppercase">
            Powered by{" "}
            <Link href="/" className="hover:text-ink transition-colors">
              Kitchen Applications
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
