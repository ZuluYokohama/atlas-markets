import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { COMPLETION, GATES, PRODUCT_CLAIM, WHAT_ENTERED } from "@/lib/atlas/ledger/product";

export const Route = createFileRoute("/evidence")({ component: EvidencePage });

export function EvidencePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <p className="text-xs uppercase tracking-widest text-muted">Evidence chain</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          What you may claim
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-clay">{PRODUCT_CLAIM}</p>

        <dl className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries({
            Dataset: WHAT_ENTERED.dataset,
            Vendor: WHAT_ENTERED.vendor,
            PIT: WHAT_ENTERED.pitField,
            Confirmation: WHAT_ENTERED.confirmation,
            Orders: WHAT_ENTERED.orderAuthority ? "yes" : "none",
            Protocol: WHAT_ENTERED.protocol,
          }).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-t border-line py-2">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <ol className="mt-8 space-y-5">
          {COMPLETION.map((item, i) => (
            <li key={item.q} className="border-t border-line pt-4">
              <p className="text-xs uppercase tracking-widest text-muted">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-1 font-display text-xl tracking-tight">{item.q}</h2>
              <p className="mt-2 text-sm text-ink">{item.a}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 font-display text-2xl tracking-tight">Gate matrix</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {GATES.map((g) => (
            <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line py-2">
              <span>
                <span className="font-mono">{g.id}</span>
                <span className="text-muted"> · {g.evidence}</span>
              </span>
              <Badge tone={g.status === "FAIL" || g.status === "MIXED" ? "clay" : "paper"}>
                {g.status}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
