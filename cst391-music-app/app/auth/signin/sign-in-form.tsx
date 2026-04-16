"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInForm({
  callbackUrl,
}: {
  callbackUrl?: string;
}) {
  return (
    <>
      <button
        type="button"
        className="btn btn-dark btn-lg w-100 rounded-pill wf-route-btn"
        onClick={() =>
          signIn("github", { callbackUrl: callbackUrl ?? "/" })
        }
      >
        Continue with GitHub
      </button>
      <p className="mt-4 mb-0 text-center">
        <Link href="/">← Back to home</Link>
      </p>
    </>
  );
}
