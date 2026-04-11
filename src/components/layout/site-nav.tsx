"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";
import { Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useI18n } from "@/lib/i18n/context";
import type { SupportedLang } from "@/lib/i18n/dictionaries";

const NAV_LINKS = [
  { href: "/dashboard", labelKey: "farmer" as const },
  { href: "/dashboard/fpo", labelKey: "fpo" as const },
  { href: "/register", labelKey: "register" as const },
];

const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function AuthControls() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{ elements: { avatarBox: "size-8" } }}
      />
    );
  }

  return (
    <SignInButton mode="redirect">
      <Button variant="outline" size="sm">Sign in</Button>
    </SignInButton>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const { dict, lang, setLang } = useI18n();

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-primary"
        >
          <Wheat className="size-5" />
          <span>AgriFlow</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {dict.nav[link.labelKey]}
            </Link>
          ))}
        </nav>

        {/* Auth and Lang */}
        <div className="flex items-center gap-2">
          <select
            title="Language"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
            value={lang}
            onChange={(e) => setLang(e.target.value as SupportedLang)}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (HI)</option>
            <option value="te">తెలుగు (TE)</option>
          </select>
          {hasClerkKey ? (
            <AuthControls />
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
