import { z } from "zod";
import { callClaude, parseJsonResponse } from "../lib/anthropic.js";

const userProfileSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional().default(""),
  current_role: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  experiences: z.array(z.any()).optional().default([]),
  education: z.string().optional().default(""),
  skills: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default([]),
});

export const generateFollowupInput = z.object({
  restaurant_name: z.string(),
  original_email_body: z.string(),
  days_since_sent: z.number().int().min(1),
  user_profile: userProfileSchema,
});

export async function generateFollowup(
  input: z.infer<typeof generateFollowupInput>
) {
  const { restaurant_name, original_email_body, days_since_sent, user_profile } = input;
  const signoff = `${user_profile.name} / ${user_profile.email}${user_profile.phone ? ` / ${user_profile.phone}` : ""}`;

  const userPrompt = `Write a 3-sentence follow-up email from ${user_profile.name} to ${restaurant_name}. They sent an initial application ${days_since_sent} days ago and haven't received a reply.

The follow-up should:
- Open with one new piece of information (a new dish, a new development in their career, or a relevant observation about the restaurant)
- Reference that they reached out previously without dwelling on the lack of reply
- Close with the same ask: kitchen opportunities

Maximum 80 words. Confident, not needy.
Subject line: 'Re: Kitchen Opportunities — ${user_profile.name}'
Sign-off: ${signoff}

Original email for context:
${original_email_body}

Return JSON: { "subject": string, "body": string }
No preamble. No markdown.`;

  const response = await callClaude(
    `You are writing on behalf of ${user_profile.name}, a fine dining chef. Be direct, confident, human. No corporate language.`,
    userPrompt,
    512
  );

  return parseJsonResponse<{ subject: string; body: string }>(response);
}
