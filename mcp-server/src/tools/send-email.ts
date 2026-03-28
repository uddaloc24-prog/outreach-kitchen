import { z } from "zod";
import { getGmailClient, buildRfc2822Email } from "../lib/gmail.js";
import { getSupabase } from "../lib/supabase.js";

export const sendEmailInput = z.object({
  restaurant_id: z.string(),
  to_email: z.string().min(3),
  subject: z.string(),
  body: z.string(),
  outreach_log_id: z.string(),
  user_email: z.string().optional(),
  chef_name: z.string().optional(),
});

export async function sendEmail(input: z.infer<typeof sendEmailInput>) {
  const { subject, body, outreach_log_id, user_email, chef_name } = input;

  // Extract the email address from the raw input — ignores surrounding HTML,
  // quotes, angle brackets, and invisible characters that break Gmail headers.
  const emailMatch = input.to_email.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  if (!emailMatch) {
    throw new Error(
      `Cannot extract a valid email from "${input.to_email}". ` +
      `Please check the restaurant's careers email in the database.`
    );
  }
  const to_email = emailMatch[0].toLowerCase();

  const senderEmail = process.env.GMAIL_SENDER_EMAIL;
  if (!senderEmail) {
    throw new Error("GMAIL_SENDER_EMAIL env variable is not set");
  }

  const gmail = await getGmailClient();
  const supabase = getSupabase();

  // Fetch CV from Supabase Storage — required for every send
  if (!user_email) {
    throw new Error("user_email is required to attach CV");
  }

  const { data: cvData, error: cvError } = await supabase.storage
    .from("cv-files")
    .download(`${user_email}/cv.pdf`);

  if (cvError || !cvData) {
    throw new Error("CV not found in storage — please re-upload your CV from My Profile before sending");
  }

  const arrayBuffer = await cvData.arrayBuffer();
  const filename = chef_name ? `CV - ${chef_name}.pdf` : "CV.pdf";
  const attachment = {
    filename,
    data: Buffer.from(arrayBuffer),
    mimeType: "application/pdf",
  };

  // Build and encode the RFC 2822 email (with or without attachment)
  const raw = buildRfc2822Email(to_email, subject, body, senderEmail, attachment);

  // Send via Gmail API
  const sendRes = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  if (!sendRes.data.id) {
    throw new Error("Gmail API returned no message ID");
  }

  const sentAt = new Date().toISOString();
  const threadId = sendRes.data.threadId ?? sendRes.data.id;

  // Update outreach_log
  const { error: updateErr } = await supabase
    .from("outreach_log")
    .update({
      status: "sent",
      sent_at: sentAt,
      gmail_thread_id: threadId,
      followup_due_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: sentAt,
    })
    .eq("id", outreach_log_id);

  if (updateErr) {
    console.error("[send-email] Failed to update outreach_log:", updateErr);
  }

  return {
    success: true,
    message_id: sendRes.data.id,
    thread_id: threadId,
    sent_at: sentAt,
    cv_attached: true,
  };
}
