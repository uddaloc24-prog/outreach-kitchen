import { z } from "zod";
import { callClaude, parseJsonResponse } from "../lib/anthropic.js";
import type { ParsedProfile } from "./types.js";

export const parseCvInput = z.object({
  cv_text: z.string().min(50),
});

const SYSTEM_PROMPT = `You are a professional CV parser for fine dining and hospitality careers. Extract structured information from the CV text provided. Be precise and accurate — only include what is explicitly stated. Return valid JSON only.`;

export async function parseCv(
  input: z.infer<typeof parseCvInput>
): Promise<ParsedProfile> {
  const { cv_text } = input;

  const userPrompt = `Parse this CV and return a JSON object with exactly these fields:

{
  "name": "Full name",
  "email": "Email address (empty string if not found)",
  "phone": "Phone number (empty string if not found)",
  "current_role": "Current job title and employer",
  "summary": "2-3 sentences summarising this person's culinary identity, strengths, and what makes them distinctive as a chef",
  "experiences": [
    {
      "role": "Job title",
      "place": "Restaurant/company name",
      "period": "Date range",
      "highlights": ["key achievement 1", "key achievement 2"]
    }
  ],
  "education": "Education summary (school, qualification, year)",
  "skills": ["skill 1", "skill 2"],
  "languages": ["language 1", "language 2"]
}

CV TEXT:
${cv_text}

Return only valid JSON. No preamble. No markdown code blocks.`;

  const response = await callClaude(SYSTEM_PROMPT, userPrompt, 2048);
  return parseJsonResponse<ParsedProfile>(response);
}
