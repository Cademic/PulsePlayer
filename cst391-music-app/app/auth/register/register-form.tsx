"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function RegisterForm({
  callbackUrl,
}: {
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      setErrorMessage(data.message ?? "Unable to create account.");
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      callbackUrl: callbackUrl ?? "/",
      redirect: false,
    });

    setIsSubmitting(false);
    if (signInResult?.error) {
      router.push("/auth/signin");
      return;
    }

    router.push(signInResult?.url ?? callbackUrl ?? "/");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleRegister}>
        <div className="mb-3">
          <label className="form-label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            className="form-control"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="register-name">
            Name
          </label>
          <input
            id="register-name"
            type="text"
            className="form-control"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="register-password">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            className="form-control"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="form-text">Use at least 8 characters.</div>
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-3 mb-0 text-center">
        Already have an account? <Link href="/auth/signin">Sign in</Link>
      </p>
      <p className="mt-4 mb-0 text-center">
        <Link href="/">← Back to home</Link>
      </p>
    </>
  );
}
