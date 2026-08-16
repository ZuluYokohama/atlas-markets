import { createFileRoute } from "@tanstack/react-router";
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
      <AtlasWorkstation payload={payload} />
    </AppShell>
  );
}
