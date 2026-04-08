import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Authentication Not Configured</h1>
          <p className="text-muted-foreground text-sm">
            The application is currently running in demo mode. Please configure your Clerk API keys in the environment variables to enable authentication.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "rounded-2xl shadow-lg",
          },
        }}
      />
    </main>
  );
}
