import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { generateSlug } from "@/lib/slug";
import Groq from "groq-sdk";
import type { ParsedProfile } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Try pdf-parse v2 (PDFParse class, getText() returns a string directly)
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = String(result);
    if (text.trim().length > 10) return text;
  } catch {
    // pdf-parse failed — fall through to raw extraction
  }

  // Fallback: extract readable text directly from PDF binary
  const raw = buffer
    .toString("latin1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "");

  // Extract text between BT...ET blocks (PDF text objects)
  const btBlocks = raw.match(/BT[\s\S]*?ET/g) || [];
  const lines: string[] = [];
  for (const block of btBlocks) {
    const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
    const tdMatches = block.match(/\[([^\]]*)\]\s*TJ/g) || [];
    for (const m of tjMatches) {
      const inner = m.match(/\(([^)]*)\)/)?.[1];
      if (inner) lines.push(inner);
    }
    for (const m of tdMatches) {
      const parts = m.match(/\(([^)]*)\)/g) || [];
      const joined = parts.map((p) => p.slice(1, -1)).join("");
      if (joined) lines.push(joined);
    }
  }

  const extracted = lines.join("\n").trim();
  if (extracted.length < 20) {
    throw new Error("Could not extract text from this PDF");
  }
  return extracted;
}

async function parseCvWithClaude(cv_text: string): Promise<ParsedProfile> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content: "You are a professional CV parser for fine dining and hospitality careers. Extract structured information from the CV text. Return valid JSON only — no preamble, no markdown code blocks.",
      },
      {
        role: "user",
        content: `Parse this CV and return a JSON object with exactly these fields:

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
${cv_text}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  // Strip markdown code fences and any leading/trailing non-JSON chars
  const clean = text
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?\s*```$/, "")
    .trim();

  // Find the first { and last } to extract the JSON object
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("CV parsing returned an invalid response — please try again");
  }
  const jsonStr = clean.slice(start, end + 1);

  try {
    return JSON.parse(jsonStr) as ParsedProfile;
  } catch {
    throw new Error("CV parsing returned an invalid response — please try again");
  }
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
      parsed = await parseCvWithClaude(cv_text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse CV";
      return NextResponse.json({ error: message }, { status: 500 });
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
