import { Skeleton } from "@/components/ui/skeleton";

type DashboardLoadingShellProps = {
  title: string;
};

export function DashboardLoadingShell({ title }: DashboardLoadingShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1540px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-[0_35px_100px_-60px_rgba(20,72,44,0.2)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-14 w-full max-w-3xl" />
            <Skeleton className="h-5 w-full max-w-2xl" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Skeleton className="h-24 rounded-[1.5rem]" />
            <Skeleton className="h-24 rounded-[1.5rem]" />
            <Skeleton className="h-24 rounded-[1.5rem]" />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-4">
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-24 min-w-[220px] rounded-[1.35rem]" />
          <Skeleton className="h-24 min-w-[220px] rounded-[1.35rem]" />
          <Skeleton className="h-24 min-w-[220px] rounded-[1.35rem]" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-card/88 p-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-96 max-w-full" />
          <Skeleton className="h-[340px] rounded-[1.6rem]" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-card/88 p-6">
        <Skeleton className="h-6 w-48" />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 rounded-[1.4rem]" />
          <Skeleton className="h-40 rounded-[1.4rem]" />
        </div>
      </section>

      <p className="text-sm text-muted-foreground">{title}</p>
    </main>
  );
}
