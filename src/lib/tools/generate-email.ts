import { callGroqText, parseJsonResponse } from "@/lib/groq";
import type { GeneratedEmail, ResearchBrief, ParsedProfile } from "@/types";

function buildProfileNarrative(profile: ParsedProfile): string {
  const topExp = profile.experiences.slice(0, 5).map((e) => {
    const highlights = e.highlights.slice(0, 4).join(" | ");
    return `${e.role} at ${e.place} (${e.period})${highlights ? ` — ${highlights}` : ""}`;
  });
  return topExp.join("\n");
}

export async function generateEmail(input: {
  restaurant_name: string;
  careers_email: string;
  head_chef?: string;
  research_brief: ResearchBrief;
  user_profile: ParsedProfile;
}): Promise<GeneratedEmail> {
  const { restaurant_name, research_brief, user_profile, head_chef } = input;
  const profileNarrative = buildProfileNarrative(user_profile);
  const signoff = [
    user_profile.name,
    user_profile.email,
    user_profile.phone || "",
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are writing a kitchen application email on behalf of ${user_profile.name}. Your job is to write something that makes the chef de cuisine stop, feel something, and immediately want to meet this person.

The email must sound like a real human wrote it — someone with a specific point of view, genuine memories, and real hunger to be in this particular kitchen. It must not sound like a template, a cover letter, or a LinkedIn message.

What separates a great chef application email from a generic one:
- It opens with a specific, earned observation — not praise, not "I am applying"
- It makes ONE strong, clear argument for why this person belongs there, not a list of credentials
- It references something real and specific about the restaurant that only someone who truly cares would know
- It sounds like the chef has a voice — direct, a little proud, genuinely curious
- It ends without grovelling — the tone is "I think we'd make interesting work together", never "I hope you consider me"

You must return a JSON object and nothing else. No markdown, no preamble.`;

  const userPrompt = `Write a kitchen application email from ${user_profile.name} to ${restaurant_name}${head_chef ? ` (head chef: ${head_chef})` : ""}.

CHEF'S CAREER:
${profileNarrative}

WHAT THIS KITCHEN IS ABOUT:
${research_brief.kitchen_identity}

WHAT THEY LOOK FOR IN A HIRE:
${research_brief.what_they_hire_for}

THE GENUINE CONNECTION — make this the spine of the email:
${research_brief.your_connection}

RULES — follow every one exactly:
1. Body must be 150–180 words. Count carefully.
2. Do NOT open with: "I am writing", "I am applying", "My name is", "I would love to", or any variation.
3. Open sentence: a specific, concrete observation about ${restaurant_name}'s cooking or philosophy — something that proves real thought went into this, not generic praise.
4. Build exactly ONE clear argument for why ${user_profile.name} belongs here. Draw from the genuine connection above.
5. Name at least one real place or role from their career — but only in service of the argument, not as credential-dropping.
6. Final sentence: direct and confident. No "I hope", "I would be grateful", "please consider me".
7. Subject line: specific to this restaurant — not "Kitchen Application". Make it feel like it was written for ${restaurant_name} alone.
8. Tone: unhurried, precise, and human. Like a chef who knows what they're worth and doesn't need to oversell.

SIGN-OFF (place exactly at the end of the body, on new lines):
${signoff}

Return ONLY this JSON object, with no other text before or after:
{ "subject": "<subject line>", "body": "<full email body including sign-off>", "word_count": <number> }`;

  const response = await callGroqText(systemPrompt, userPrompt, 1200);

  const cleaned = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  const parsed = parseJsonResponse<GeneratedEmail>(cleaned);
  parsed.word_count = parsed.body.trim().split(/\s+/).filter(Boolean).length;
  return parsed;
}
