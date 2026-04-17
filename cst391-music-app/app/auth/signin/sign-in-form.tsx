"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignInForm({
  callbackUrl,
}: {
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCredentialSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: callbackUrl ?? "/",
      redirect: false,
    });

    setIsSubmitting(false);
    if (result?.error) {
      setErrorMessage("Invalid email or password.");
      return;
    }

    router.push(result?.url ?? callbackUrl ?? "/");
    router.refresh();
  }

  return (
    <>
      <form className="mb-3" onSubmit={handleCredentialSignIn}>
        <div className="mb-3">
          <label className="form-label" htmlFor="signin-email">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            className="form-control"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="signin-password">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            className="form-control"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {errorMessage ? (
          <div className="alert alert-danger py-2" role="alert">
            {errorMessage}
          </div>
        ) : null}
        <button
          type="submit"
          className="btn btn-primary btn-lg w-100 rounded-pill wf-route-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in with Email"}
        </button>
      </form>
      <div className="text-center text-muted mb-3">or</div>
      <button
        type="button"
        className="btn btn-dark btn-lg w-100 rounded-pill wf-route-btn"
        disabled={isSubmitting}
        onClick={() =>
          signIn("github", { callbackUrl: callbackUrl ?? "/" })
        }
      >
        Continue with GitHub
      </button>
      <p className="mt-3 mb-0 text-center">
        Need an account? <Link href="/auth/register">Register</Link>
      </p>
      <p className="mt-4 mb-0 text-center">
        <Link href="/">← Back to home</Link>
      </p>
    </>
  );
}
