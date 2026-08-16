import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Terrain
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Optional. The laboratory runs as a guest. Sign in only if you want a
          persisted identity on this instance.
        </p>
        <div className="mt-6 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
        <Link
          to="/"
          className="mt-6 inline-block text-xs uppercase tracking-[0.14em] text-muted hover:text-fg"
        >
          Back to workbench
        </Link>
      </div>
    </main>
  );
}
