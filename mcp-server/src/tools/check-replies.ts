import { z } from "zod";
import { getGmailClient } from "../lib/gmail.js";
import { getSupabase } from "../lib/supabase.js";

export const checkRepliesInput = z.object({});

export async function checkReplies(_input: z.infer<typeof checkRepliesInput>) {
  const supabase = getSupabase();
  const senderEmail = process.env.GMAIL_SENDER_EMAIL ?? "";

  // Fetch all sent outreach logs with thread IDs
  const { data: logs, error } = await supabase
    .from("outreach_log")
    .select("id, gmail_thread_id, sent_at, status")
    .eq("status", "sent")
    .not("gmail_thread_id", "is", null);

  if (error) {
    throw new Error(`Failed to fetch outreach logs: ${error.message}`);
  }

  if (!logs || logs.length === 0) {
    return { checked: 0, replied_count: 0, followup_count: 0 };
  }

  const gmail = await getGmailClient();

  let repliedCount = 0;
  let followupCount = 0;
  const now = new Date();

  for (const log of logs) {
    if (!log.gmail_thread_id) continue;

    try {
      const threadRes = await gmail.users.threads.get({
        userId: "me",
        id: log.gmail_thread_id,
        format: "metadata",
        metadataHeaders: ["From"],
      });

      const messages = threadRes.data.messages ?? [];
      const hasReply = messages.length > 1 &&
        messages.some((msg) => {
          const fromHeader = msg.payload?.headers?.find((h) => h.name === "From");
          const from = fromHeader?.value ?? "";
          return !from.toLowerCase().includes(senderEmail.toLowerCase());
        });

      if (hasReply) {
        await supabase
          .from("outreach_log")
          .update({
            status: "replied",
            replied_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", log.id);
        repliedCount++;
        continue;
      }

      // Check if follow-up is due (21 days since sent)
      if (log.sent_at) {
        const sentDate = new Date(log.sent_at);
        const daysSince = (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince >= 21) {
          await supabase
            .from("outreach_log")
            .update({
              status: "followup_due",
              updated_at: now.toISOString(),
            })
            .eq("id", log.id);
          followupCount++;
        }
      }
    } catch (err) {
      console.error(`[check-replies] Failed to check thread ${log.gmail_thread_id}:`, err);
    }
  }

  return {
    checked: logs.length,
    replied_count: repliedCount,
    followup_count: followupCount,
  };
}
