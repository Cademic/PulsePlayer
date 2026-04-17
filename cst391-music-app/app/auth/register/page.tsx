import Image from "next/image";
import RegisterForm from "./register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="wf-auth-page">
      <div className="wf-auth-card">
        <div className="text-center">
          <p className="wf-auth-kicker">Create account</p>
          <h1 className="h3 mb-2">Register to</h1>
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
          Register with your email, name, and password.
        </p>
        <RegisterForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
