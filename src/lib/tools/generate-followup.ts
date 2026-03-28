import { callGroq, parseJsonResponse } from "@/lib/groq";

export async function generateFollowup(input: {
  restaurant_name: string;
  original_email_body: string;
  days_since_sent: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
}): Promise<{ subject: string; body: string }> {
  const { restaurant_name, original_email_body, days_since_sent, user_name, user_email, user_phone } = input;
  const signoff = `${user_name} / ${user_email}${user_phone ? ` / ${user_phone}` : ""}`;

  const userPrompt = `Write a 3-sentence follow-up email from ${user_name} to ${restaurant_name}. They sent an initial application ${days_since_sent} days ago and haven't received a reply.

The follow-up should:
- Open with one new piece of information (a new dish, a new development in their career, or a relevant observation about the restaurant)
- Reference that they reached out previously without dwelling on the lack of reply
- Close with the same ask: kitchen opportunities

Maximum 80 words. Confident, not needy.
Subject line: 'Re: Kitchen Opportunities — ${user_name}'
Sign-off: ${signoff}

Original email for context:
${original_email_body}

Return JSON: { "subject": string, "body": string }
No preamble. No markdown.`;

  const response = await callGroq(
    `You are writing on behalf of ${user_name}, a fine dining chef. Be direct, confident, human. No corporate language.`,
    userPrompt,
    512
  );

  return parseJsonResponse<{ subject: string; body: string }>(response);
}
