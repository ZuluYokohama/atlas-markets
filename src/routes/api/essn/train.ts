import { createFileRoute } from "@tanstack/react-router";
import { seedGenome } from "@/lib/atlas/essn/genome";
import { trainLocal } from "@/lib/atlas/essn/train";
import { parseTrainPath, type TrainPath } from "@/lib/atlas/essn/trainPath";

export const Route = createFileRoute("/api/essn/train")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Partial<TrainPath>;
          const path = parseTrainPath(body);
          const report = trainLocal(path, seedGenome());
          return Response.json({
            ...report,
            artifact: report.artifact.replace(/^\/workspace\//, ""),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "TRAIN_FAILED";
          return Response.json({ error: msg }, { status: 400 });
        }
      },
    },
  },
});
