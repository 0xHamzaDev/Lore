import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
// Function imports — currently just the background-agents debouncer; more
// functions register here as future phases need event-driven work.
import { runBackgroundAgents } from "@/inngest/agents-run";

// The signing key lives on the Inngest client (see ./client.ts); inngest@4's
// `serve()` no longer accepts it here.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runBackgroundAgents],
});
