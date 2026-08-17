import { createFileRoute } from "@tanstack/react-router";
import { seedGenome } from "@/lib/atlas/essn/genome";
import { trainLocal } from "@/lib/atlas/essn/train";
import { parseTrainPath, type TrainPath } from "@/lib/atlas/essn/trainPath";

let trainingInProgress = false;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

export const Route = createFileRoute("/api/essn/train")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   "unknown";

        if (!checkRateLimit(ip)) {
          return Response.json(
            { error: "RATE_LIMIT_EXCEEDED" },
            { status: 429 },
          );
        }

        if (trainingInProgress) {
          return Response.json(
            { error: "TRAINING_IN_PROGRESS" },
            { status: 429 },
          );
        }
        try {
          trainingInProgress = true;
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
        } finally {
          trainingInProgress = false;
        }
      },
    },
  },
});
