import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { WorkbenchLab } from "@/components/workbench/lab";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <WorkbenchLab />
    </AppShell>
  );
}
