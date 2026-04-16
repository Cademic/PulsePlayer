import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js v5 reads `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` from env by default.
 * Legacy NextAuth v4 names (`GITHUB_ID`, `GITHUB_SECRET`) are supported here.
 */
const githubProvider = GitHub({
  clientId: process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_ID,
  clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_SECRET,
});

/**
 * Edge-safe auth config: no top-level imports of `pg` / Node-only modules.
 * DB access runs only inside the JWT callback via dynamic import (Node route handlers only).
 */
export default {
  providers: [githubProvider],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        const { upsertUserFromOAuth } = await import("@/lib/user-repository");
        const row = await upsertUserFromOAuth({
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        });
        token.sub = row.id;
        token.role = row.role;
        token.email = row.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "user" | "admin") ?? "user";
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  trustHost: true,
} satisfies NextAuthConfig;
