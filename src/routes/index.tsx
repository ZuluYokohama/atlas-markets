import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AtlasWorkstation } from "@/components/atlas/workstation";
import { buildWorkstationPayload } from "@/lib/atlas/session/build";

export const Route = createFileRoute("/")({
  loader: () => ({ payload: buildWorkstationPayload() }),
  component: Home,
});

function Home() {
  const { payload } = Route.useLoaderData();
  return (
    <AppShell>
      <p className="mx-auto max-w-[1600px] px-3 pt-3 text-xs text-muted md:px-6">
        Analysis lab. Predictive claim UNSUPPORTED.{" "}
        <Link to="/evidence" className="text-ink underline-offset-2 hover:underline">
          Read what you may claim
        </Link>
        .
      </p>
      <AtlasWorkstation payload={payload} />
    </AppShell>
  );
}
