import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js v5 reads `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` from env by default.
 * Legacy NextAuth v4 names (`GITHUB_ID`, `GITHUB_SECRET`) are supported here.
 */
const githubProvider = GitHub({
  clientId: process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_ID,
  clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_SECRET,
});

const credentialsProvider = Credentials({
  name: "Email and Password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = String(credentials?.email ?? "").trim();
    const password = String(credentials?.password ?? "");
    if (!email || !password) {
      return null;
    }

    const { getUserByEmailForAuth } = await import("@/lib/user-repository");
    const { verifyPassword } = await import("@/lib/password");
    const user = await getUserByEmailForAuth(email);
    if (!user?.password_hash) {
      return null;
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    };
  },
});

/**
 * Edge-safe auth config: no top-level imports of `pg` / Node-only modules.
 * DB access runs only inside the JWT callback via dynamic import (Node route handlers only).
 */
export default {
  providers: [githubProvider, credentialsProvider],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "github" && user?.email) {
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
      if (account?.provider === "credentials" && user) {
        token.sub = user.id;
        token.role = user.role;
        token.email = user.email ?? token.email;
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
