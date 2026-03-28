import { callGroq, parseJsonResponse } from "@/lib/groq";
import type { ResearchBrief, ParsedProfile } from "@/types";

interface RawResearchInput {
  philosophy: string;
  menu_highlights: string;
  chef_background: string;
  recent_press: string;
  sustainability_notes: string;
  raw_text: string;
}

function formatProfile(profile: ParsedProfile): string {
  const expLines = profile.experiences.map((e) => {
    const bullets = e.highlights.map((h) => `  — ${h}`).join("\n");
    return `${e.role}, ${e.place} (${e.period})\n${bullets}`;
  });
  return `${profile.name}\n\n${profile.summary}\n\nExperience:\n${expLines.join("\n\n")}\n\nEducation: ${profile.education}${profile.skills.length > 0 ? `\nSkills: ${profile.skills.join(", ")}` : ""}`.trim();
}

const SYSTEM_PROMPT = `You are a senior culinary talent analyst with 20 years of experience placing chefs at the world's finest restaurants. You are precise, honest, and never generic. You write like a human who has eaten at both restaurants and understands what each kitchen truly values.`;

export async function generateResearchBrief(input: {
  restaurant_name: string;
  raw_research: RawResearchInput;
  user_profile: ParsedProfile;
}): Promise<ResearchBrief> {
  const { restaurant_name, raw_research, user_profile } = input;
  const profileText = formatProfile(user_profile);

  const userPrompt = `Analyse this restaurant and this chef's profile. Produce a structured research brief in JSON format with exactly these three fields:

kitchen_identity: In 2 sentences, what defines this kitchen's philosophy and what does it value above all else? Be specific — name dishes, techniques, or the chef's stated beliefs if available.

what_they_hire_for: In 2 sentences, what kind of chef thrives here? Reference their cooking style and kitchen culture. What mindset do they need?

your_connection: In 3 sentences, make the specific case for why this chef belongs in this kitchen. Reference real details from BOTH their career AND the restaurant's menu/philosophy. Do not flatter. Find the genuine intersection. If there is no strong connection, say so honestly.

Restaurant: ${restaurant_name}
Restaurant data: ${JSON.stringify(raw_research, null, 2)}

Chef profile:
${profileText}

Return only valid JSON. No preamble. No markdown.`;

  const response = await callGroq(SYSTEM_PROMPT, userPrompt, 1024);
  return parseJsonResponse<ResearchBrief>(response);
}
