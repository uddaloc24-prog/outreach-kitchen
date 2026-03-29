import { getGmailClient, buildRfc2822Email } from "@/lib/gmail";
import { createServerSupabase } from "@/lib/supabase-server";

export async function sendEmail(input: {
  restaurant_id: string;
  to_email: string;
  subject: string;
  body: string;
  outreach_log_id: string;
  user_email: string;
  chef_name?: string;
}) {
  const { subject, body, outreach_log_id, user_email, chef_name } = input;

  const emailMatch = input.to_email.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  if (!emailMatch) {
    throw new Error(
      `Cannot extract a valid email from "${input.to_email}". ` +
      `Please check the restaurant's careers email in the database.`
    );
  }
  const to_email = emailMatch[0].toLowerCase();

  // In multi-user mode the sender is the authenticated user's own Gmail
  const senderEmail = user_email;

  const gmail = await getGmailClient(user_email);
  const supabase = createServerSupabase();

  // Attach CV PDF if one exists in storage (uploaded via PDF mode — optional)
  let attachment: { filename: string; data: Buffer; mimeType: string } | undefined;
  const { data: cvData } = await supabase.storage
    .from("cv-files")
    .download(`${user_email}/cv.pdf`);

  if (cvData) {
    const arrayBuffer = await cvData.arrayBuffer();
    const filename = chef_name ? `CV - ${chef_name}.pdf` : "CV.pdf";
    attachment = { filename, data: Buffer.from(arrayBuffer), mimeType: "application/pdf" };
  }

  const raw = buildRfc2822Email(to_email, subject, body, senderEmail, attachment);

  const sendRes = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  if (!sendRes.data.id) {
    throw new Error("Gmail API returned no message ID");
  }

  const sentAt = new Date().toISOString();
  const threadId = sendRes.data.threadId ?? sendRes.data.id;

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
    cv_attached: !!attachment,
  };
}
