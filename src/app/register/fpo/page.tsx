import { Suspense } from "react";

import { FpoRegistrationForm } from "@/components/register/fpo-registration-form";

function FpoRegistrationFallback() {
  return (
    <div className="rounded-[2rem] border border-border/70 bg-card/90 px-6 py-8 text-sm text-muted-foreground">
      Loading registration form...
    </div>
  );
}

export default function FpoRegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
          Trader Registration
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Set up your trading profile.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Add your business details and the areas you operate in. Once set up, you'll 
          get access to live route mapping and farmer market inventory matching.
        </p>
      </section>

      <Suspense fallback={<FpoRegistrationFallback />}>
        <FpoRegistrationForm />
      </Suspense>
    </main>
  );
}
