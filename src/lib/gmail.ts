import { google } from "googleapis";
import { createServerSupabase } from "./supabase-server";

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
}

export async function getGmailClient(userId: string) {
  const supabase = createServerSupabase();

  const { data: tokenRow, error } = await supabase
    .from("user_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) {
    throw new Error(
      "No Gmail tokens found for this user. Please sign out and sign back in to grant Gmail access."
    );
  }

  const tokens = tokenRow as StoredTokens;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expires_at ? tokens.expires_at * 1000 : undefined,
  });

  // Refresh token if within 5 minutes of expiry
  if (tokens.expires_at && Date.now() / 1000 > tokens.expires_at - 300) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await supabase
      .from("user_tokens")
      .update({
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date
          ? Math.floor(credentials.expiry_date / 1000)
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    oauth2Client.setCredentials(credentials);
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

export function buildRfc2822Email(
  to: string,
  subject: string,
  body: string,
  from: string,
  attachment?: { filename: string; data: Buffer; mimeType: string }
): string {
  const boundary = `boundary_${Date.now()}`;
  const encodedSubject = encodeSubject(subject);

  let email: string;

  if (attachment) {
    const attachmentB64 = attachment.data.toString("base64");
    email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      body,
      ``,
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      attachmentB64,
      `--${boundary}--`,
    ].join("\r\n");
  } else {
    email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      body,
    ].join("\r\n");
  }

  return Buffer.from(email).toString("base64url");
}
