import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createServerSupabase } from "./supabase-server";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user }) {
      // Invite-only: reject sign-in if email is not in allowed_users table
      if (!user.email) return false;
      try {
        const supabase = createServerSupabase();
        const { data } = await supabase
          .from("allowed_users")
          .select("email")
          .eq("email", user.email)
          .single();
        if (!data) return "/auth/error?error=AccessDenied";
      } catch {
        // If table doesn't exist yet (pre-migration), block sign-in to be safe
        return "/auth/error?error=AccessDenied";
      }
      return true;
    },

    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        // Capture email on first sign-in (user object is only available then)
        if (user?.email) token.email = user.email;

        // Persist tokens per user so gmail.ts can fetch by user_id
        try {
          const supabase = createServerSupabase();
          await supabase.from("user_tokens").upsert(
            {
              user_id: token.email,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        } catch (err) {
          console.error("[auth] Failed to persist tokens to Supabase:", err);
        }
      }

      // Token refresh if within 5 minutes of expiry
      if (token.expiresAt && Date.now() / 1000 > (token.expiresAt as number) - 300) {
        try {
          const refreshed = await refreshAccessToken(token.refreshToken as string);
          token.accessToken = refreshed.access_token;
          token.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
          token.error = undefined;

          // Update refreshed token in DB
          const supabase = createServerSupabase();
          await supabase
            .from("user_tokens")
            .update({
              access_token: refreshed.access_token,
              expires_at: token.expiresAt,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", token.email);
        } catch (err) {
          console.error("[auth] Token refresh failed:", err);
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
  }>;
}
