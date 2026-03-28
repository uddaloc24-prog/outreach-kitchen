import { getGmailClient } from "@/lib/gmail";
import { createServerSupabase } from "@/lib/supabase-server";

export async function checkReplies(input: { user_id: string }) {
  const { user_id } = input;
  const supabase = createServerSupabase();

  // Only check logs belonging to this user
  const { data: logs, error } = await supabase
    .from("outreach_log")
    .select("id, gmail_thread_id, sent_at, status")
    .eq("status", "sent")
    .eq("user_id", user_id)
    .not("gmail_thread_id", "is", null);

  if (error) {
    throw new Error(`Failed to fetch outreach logs: ${error.message}`);
  }

  if (!logs || logs.length === 0) {
    return { checked: 0, replied_count: 0, followup_count: 0 };
  }

  const gmail = await getGmailClient(user_id);

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
          return !from.toLowerCase().includes(user_id.toLowerCase());
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
