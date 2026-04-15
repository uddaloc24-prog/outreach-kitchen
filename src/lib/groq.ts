import Groq from "groq-sdk";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MISTRAL_KEY = process.env.MISTRAL_API_KEY;

let _client: Groq | null = null;

function getClient(): Groq {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    _client = new Groq({ apiKey });
  }
  return _client;
}

// ── Gemini (free — 1M tokens/day) ──────────────────────────────────
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  jsonMode: boolean
): Promise<string> {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.1,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// Gemini with single retry on 429 (per-minute rate limit resets in ~30s)
async function callGeminiWithRetry(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  jsonMode: boolean
): Promise<string> {
  try {
    return await callGemini(systemPrompt, userPrompt, maxTokens, jsonMode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429")) {
      await new Promise((r) => setTimeout(r, 35000));
      return await callGemini(systemPrompt, userPrompt, maxTokens, jsonMode);
    }
    throw err;
  }
}

// ── Mistral (free tier) ────────────────────────────────────────────
async function callMistral(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  jsonMode: boolean
): Promise<string> {
  if (!MISTRAL_KEY) throw new Error("MISTRAL_API_KEY not configured");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MISTRAL_KEY}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      max_tokens: maxTokens,
      temperature: 0.1,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Fallback chain: Groq → Gemini → Mistral ───────────────────────
async function callWithFallback(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  jsonMode: boolean
): Promise<string> {
  // 1. Groq (free, fast)
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[AI] Groq failed:", err instanceof Error ? err.message : err);
  }

  // 2. Gemini (free, retries once on per-minute 429)
  try {
    return await callGeminiWithRetry(systemPrompt, userPrompt, maxTokens, jsonMode);
  } catch (err) {
    console.error("[AI] Gemini failed:", err instanceof Error ? err.message : err);
  }

  // 3. Mistral (free tier)
  try {
    return await callMistral(systemPrompt, userPrompt, maxTokens, jsonMode);
  } catch (err) {
    console.error("[AI] Mistral failed:", err instanceof Error ? err.message : err);
  }

  throw new Error("All free AI providers failed — please try again later");
}

export async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024
): Promise<string> {
  return callWithFallback(systemPrompt, userPrompt, maxTokens, true);
}

/** For prose generation — no JSON mode constraint so the model writes more naturally. */
export async function callGroqText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024
): Promise<string> {
  return callWithFallback(systemPrompt, userPrompt, maxTokens, false);
}

export function parseJsonResponse<T>(text: string): T {
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // Replace literal newlines/tabs inside JSON string values with their escape sequences.
  const fixed = stripped.replace(/"((?:[^"\\]|\\.|\n|\r)*)"/g, (_match, inner: string) => {
    return `"${inner
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    }"`;
  });

  return JSON.parse(fixed) as T;
}
