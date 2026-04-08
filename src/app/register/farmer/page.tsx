import { Suspense } from "react";

import { FarmerRegistrationForm } from "@/components/register/farmer-registration-form";

function FarmerRegistrationFallback() {
  return (
    <div className="rounded-[2rem] border border-border/70 bg-card/90 px-6 py-8 text-sm text-muted-foreground">
      Loading registration form...
    </div>
  );
}

export default function FarmerRegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
          Farmer onboarding
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Save the farmer profile the messaging bots will use.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          This keeps the farmer journey intact before we wire Clerk. Once the
          form is saved, the same phone number can immediately use WhatsApp and
          SMS for crop intelligence.
        </p>
      </section>

      <Suspense fallback={<FarmerRegistrationFallback />}>
        <FarmerRegistrationForm />
      </Suspense>
    </main>
  );
}
