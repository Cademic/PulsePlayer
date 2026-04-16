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
        <p className="wf-auth-kicker">Welcome back</p>
        <h1 className="h3 mb-2">Sign in to your music space</h1>
        <p className="text-muted mb-4">
          Use GitHub to save playlists, open album pages, and build your own vibe.
        </p>
        <SignInForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
