import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { to: "/", label: "Workbench" },
  { to: "/geometry", label: "Geometry" },
  { to: "/strategy", label: "Strategy" },
  { to: "/essn", label: "ESSN" },
  { to: "/gates", label: "V&V" },
  { to: "/evidence", label: "Evidence" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 md:px-6">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-lg tracking-tight">Atlas</span>
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted sm:inline">
              Markets
            </span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-sm px-2.5 py-2 text-xs uppercase tracking-[0.12em] transition-colors duration-150",
                    active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-1 lg:flex">
            <Badge tone="paper">E0 operator</Badge>
            <Badge tone="clay">F0 unsupported</Badge>
            <Badge tone="mute">shadow · no orders</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isPending ? (
              <div className="h-8 w-20 animate-pulse rounded-sm bg-elevated" />
            ) : user ? (
              <SignedIn>
                <UserButton />
              </SignedIn>
            ) : (
              <SignedOut>
                <Link
                  to="/login"
                  className="rounded-sm px-3 py-2 text-xs uppercase tracking-[0.12em] text-muted hover:text-fg"
                >
                  Sign in
                </Link>
              </SignedOut>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
