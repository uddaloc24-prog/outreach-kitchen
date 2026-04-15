import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { generateSlug } from "@/lib/slug";
import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedProfile } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MISTRAL_KEY = process.env.MISTRAL_API_KEY;

async function extractPdfText(buffer: Buffer): Promise<string> {
  // unpdf — pure JS, works in serverless (Vercel) without native modules
  const { extractText } = await import("unpdf");
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
  const text = typeof result === "string"
    ? result
    : (result as { text?: string })?.text ?? "";
  if (text.trim().length < 20) {
    throw new Error("Could not extract text from this PDF");
  }
  return text;
}

const CV_SYSTEM_PROMPT =
  "You are a professional CV parser for fine dining and hospitality careers. Extract structured information from the CV text. Return valid JSON only — no preamble, no markdown code blocks.";

function buildCvUserPrompt(cv_text: string): string {
  return `Parse this CV and return a JSON object with exactly these fields:

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
  "education": "Education summary",
  "skills": ["skill 1", "skill 2"],
  "languages": ["language 1", "language 2"]
}

CV TEXT:
${cv_text}`;
}

function extractJson(raw: string): ParsedProfile {
  const clean = raw
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?\s*```$/, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("CV parsing returned an invalid response — please try again");
  }
  return JSON.parse(clean.slice(start, end + 1)) as ParsedProfile;
}

// ── Provider 1: Groq (free — 100k tokens/day) ───────────────────────
async function parseCvWithGroq(cv_text: string): Promise<ParsedProfile> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 2048,
    messages: [
      { role: "system", content: CV_SYSTEM_PROMPT },
      { role: "user", content: buildCvUserPrompt(cv_text) },
    ],
  });
  return extractJson(response.choices[0]?.message?.content ?? "");
}

// ── Provider 2: Google Gemini (free — 1M tokens/day) ─────────────────
async function callGeminiOnce(cv_text: string): Promise<ParsedProfile> {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: CV_SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: buildCvUserPrompt(cv_text) }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return extractJson(text);
}

async function parseCvWithGemini(cv_text: string): Promise<ParsedProfile> {
  // Gemini free tier has per-minute limits; retry once after a short wait
  try {
    return await callGeminiOnce(cv_text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429")) {
      await new Promise((r) => setTimeout(r, 35000)); // wait 35s for rate limit reset
      return await callGeminiOnce(cv_text);
    }
    throw err;
  }
}

// ── Provider 3: Mistral (free tier) ──────────────────────────────────
async function parseCvWithMistral(cv_text: string): Promise<ParsedProfile> {
  if (!MISTRAL_KEY) throw new Error("MISTRAL_API_KEY not configured");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MISTRAL_KEY}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      max_tokens: 2048,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CV_SYSTEM_PROMPT },
        { role: "user", content: buildCvUserPrompt(cv_text) },
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
  return extractJson(data.choices?.[0]?.message?.content ?? "");
}

// ── Provider 4: Anthropic Claude (PAID — last resort only) ──────────
async function parseCvWithAnthropic(cv_text: string): Promise<ParsedProfile> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: CV_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildCvUserPrompt(cv_text) }],
  });
  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";
  return extractJson(text);
}

// ── Fallback: Groq → Gemini → Mistral → Anthropic (last) ───────────
async function parseCv(cv_text: string): Promise<ParsedProfile> {
  const providers = [
    { name: "Groq", fn: parseCvWithGroq },
    { name: "Gemini", fn: parseCvWithGemini },
    { name: "Mistral", fn: parseCvWithMistral },
    { name: "Anthropic", fn: parseCvWithAnthropic },
  ];
  let lastErr: Error | null = null;
  for (const { name, fn } of providers) {
    try {
      return await fn(cv_text);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.error(`[parseCv] ${name} failed:`, lastErr.message);
    }
  }
  throw lastErr ?? new Error("All AI providers failed — please try again later");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let cv_text: string;
    let pdfBuffer: Buffer | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Only PDF files are supported. Please convert your CV to PDF first." },
          { status: 400 }
        );
      }

      if (file.size > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File is too large. Please use a PDF under 4 MB." },
          { status: 400 }
        );
      }

      pdfBuffer = Buffer.from(await file.arrayBuffer());

      if (pdfBuffer.length < 100) {
        return NextResponse.json(
          { error: "File appears to be empty or corrupted. Please try a different PDF." },
          { status: 400 }
        );
      }

      try {
        cv_text = await extractPdfText(pdfBuffer);
      } catch (err) {
        console.error("[profile/upload] PDF extraction failed:", err instanceof Error ? err.message : err);
        return NextResponse.json(
          { error: "Could not read this PDF — try pasting your CV text instead." },
          { status: 400 }
        );
      }
    } else {
      let body: { cv_text: string };
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      cv_text = body.cv_text ?? "";
    }

    if (!cv_text || cv_text.trim().length < 50) {
      return NextResponse.json(
        { error: "CV text is too short — ensure the PDF was parsed correctly" },
        { status: 400 }
      );
    }

    let parsed: ParsedProfile;
    try {
      parsed = await parseCv(cv_text);
    } catch {
      return NextResponse.json(
        { error: "AI services are temporarily busy. Please try again in a minute." },
        { status: 503 }
      );
    }

    const supabase = createServerSupabase();

    // Store PDF in Supabase Storage (path: {email}/cv.pdf — attached to every sent email)
    if (pdfBuffer) {
      // Ensure bucket exists (creates it if missing)
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === "cv-files");
      if (!bucketExists) {
        await supabase.storage.createBucket("cv-files", { public: false });
      }

      const { error: storageErr } = await supabase.storage
        .from("cv-files")
        .upload(`${session.user.email}/cv.pdf`, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (storageErr) {
        return NextResponse.json(
          { error: `Failed to store CV: ${storageErr.message}` },
          { status: 500 }
        );
      }
    }

    // Preserve existing slug; generate one if this is the first upload
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("slug")
      .eq("user_id", session.user.email)
      .single();

    const slug =
      existing?.slug ||
      generateSlug(parsed.name || session.user.name || session.user.email);

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: session.user.email,
          name: parsed.name || session.user.name || "",
          email: parsed.email || session.user.email,
          phone: parsed.phone || "",
          raw_cv_text: cv_text,
          parsed_profile: parsed,
          slug,
          avatar_url: session.user.image || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
