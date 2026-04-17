import Image from "next/image";
import SignInForm from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="wf-auth-page">
      <div className="wf-auth-card">
        <div className="text-center">
          <p className="wf-auth-kicker">Welcome back</p>
          <h1 className="h3 mb-2">Sign in to</h1>
          <Image
            src="/pulse-player-logo.png"
            alt="PulsePlayer"
            width={320}
            height={160}
            priority
            className="img-fluid mb-2"
          />
        </div>
        <p className="text-muted mb-4 text-center">
          Sign in with your email and password, or continue with GitHub.
        </p>
        <SignInForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
