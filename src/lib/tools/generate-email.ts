import { callGroq, parseJsonResponse } from "@/lib/groq";
import type { GeneratedEmail, ResearchBrief, ParsedProfile } from "@/types";

function formatProfileForEmail(profile: ParsedProfile): string {
  const expLines = profile.experiences.slice(0, 4).map((e) => {
    const bullets = e.highlights.slice(0, 3).map((h) => `  — ${h}`).join("\n");
    return `${e.role}, ${e.place} (${e.period})\n${bullets}`;
  });
  return `${expLines.join("\n\n")}\n\nEducation: ${profile.education}`.trim();
}

export async function generateEmail(input: {
  restaurant_name: string;
  careers_email: string;
  head_chef?: string;
  research_brief: ResearchBrief;
  user_profile: ParsedProfile;
}): Promise<GeneratedEmail> {
  const { restaurant_name, research_brief, user_profile } = input;
  const profileText = formatProfileForEmail(user_profile);
  const signoff = [
    "Kind regards,",
    user_profile.name,
    user_profile.email,
    user_profile.phone || "",
  ].filter(Boolean).join("\n");
  const subjectLine = `Kitchen Application - ${user_profile.name}`;

  const systemPrompt = `You are a ghostwriter for elite culinary professionals. You write cover emails that get callbacks. Your emails are direct, specific, and human — never generic, never desperate, never corporate. Every word is chosen because it earns its place.`;

  const userPrompt = `Write a cover email for ${user_profile.name} applying to ${restaurant_name}.

MY CV:
${profileText}

WHAT I KNOW ABOUT THIS KITCHEN:
${research_brief.kitchen_identity}
${research_brief.what_they_hire_for}
WHY I FIT: ${research_brief.your_connection}

WRITE THE EMAIL EXACTLY LIKE THIS:

PARAGRAPH 1 — HOOK (2–3 sentences):
Do NOT open with "I am applying for" or "I am writing to". Instead, open with a specific observation about ${restaurant_name}'s kitchen identity or philosophy that shows you've done your research. Then state clearly who you are and what you bring.

PARAGRAPH 2 — PROOF (3–4 sentences):
Connect my specific experience directly to what ${restaurant_name} needs. Use real roles and places from my CV. Name concrete outcomes — not duties. Show exactly how my background fits what they hire for.

PARAGRAPH 3 — CLOSE (1–2 sentences):
End with confidence, not begging. Express genuine interest in joining their kitchen. Do not say "I would be grateful" or "I hope to hear from you."

SIGN-OFF (put this exactly at the end, on separate lines):
${signoff}

CONSTRAINTS:
- Under 200 words total (body only, not subject line)
- Tone: confident, precise, warm — like a chef who knows their worth
- Subject line: "${subjectLine}"
- No flattery, no desperation, no clichés
- Return JSON only: { "subject": string, "body": string, "word_count": number }
No preamble. No markdown. No code blocks.`;

  const response = await callGroq(systemPrompt, userPrompt, 1024);
  const parsed = parseJsonResponse<GeneratedEmail>(response);

  parsed.word_count = parsed.body.trim().split(/\s+/).filter(Boolean).length;
  return parsed;
}
