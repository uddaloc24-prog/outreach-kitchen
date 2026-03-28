import { z } from "zod";
import { callClaude, parseJsonResponse } from "../lib/anthropic.js";
import type { ResearchBrief } from "./types.js";

const userProfileSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  current_role: z.string(),
  summary: z.string(),
  experiences: z.array(z.object({
    role: z.string(),
    place: z.string(),
    period: z.string(),
    highlights: z.array(z.string()),
  })),
  education: z.string(),
  skills: z.array(z.string()),
  languages: z.array(z.string()),
});

export const generateResearchBriefInput = z.object({
  restaurant_name: z.string(),
  raw_research: z.object({
    philosophy: z.string(),
    menu_highlights: z.string(),
    chef_background: z.string(),
    recent_press: z.string(),
    sustainability_notes: z.string(),
    raw_text: z.string(),
  }),
  user_profile: userProfileSchema,
});

function formatProfile(profile: z.infer<typeof userProfileSchema>): string {
  const expLines = profile.experiences.map((e) => {
    const bullets = e.highlights.map((h) => `  — ${h}`).join("\n");
    return `${e.role}, ${e.place} (${e.period})\n${bullets}`;
  });
  return `${profile.name}\n\n${profile.summary}\n\nExperience:\n${expLines.join("\n\n")}\n\nEducation: ${profile.education}${profile.skills.length > 0 ? `\nSkills: ${profile.skills.join(", ")}` : ""}`.trim();
}

const SYSTEM_PROMPT = `You are a senior culinary talent analyst with 20 years of experience placing chefs at the world's finest restaurants. You are precise, honest, and never generic. You write like a human who has eaten at both restaurants and understands what each kitchen truly values.`;

export async function generateResearchBrief(
  input: z.infer<typeof generateResearchBriefInput>
): Promise<ResearchBrief> {
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

  const response = await callClaude(SYSTEM_PROMPT, userPrompt, 1024);
  return parseJsonResponse<ResearchBrief>(response);
}
