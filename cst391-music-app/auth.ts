import NextAuth from "next-auth";
import authConfig from "./auth.config";

/**
 * Auth.js returns 500 on /api/auth/session if `secret` is missing (MissingSecret).
 * See: https://errors.authjs.dev — "There was a problem with the server configuration"
 */
function resolveAuthSecret(): string | undefined {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.NODE_ENV !== "production") {
    if (typeof console !== "undefined") {
      console.warn(
        "[auth] AUTH_SECRET is not set. Using a dev-only placeholder. Add AUTH_SECRET to .env.local (openssl rand -base64 32) before deploying."
      );
    }
    return "dev-only-placeholder-secret-do-not-use-in-production-32chars";
  }
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: resolveAuthSecret(),
});
