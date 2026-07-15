// Import surface for consumers embedding the agent run functions directly
// (e.g. the Next.js web app's API routes) instead of talking to the
// node:http server in ./index.ts. Deliberately excludes index.ts — importing
// this file must never pull in the http server or its `PORT`/env side effects.

export {
  type AgentRunSummary,
  type BackgroundAgent,
  type BackgroundInput,
  type BackgroundResult,
  runBackgroundAgents,
} from "./agents/background";
export {
  buildFieldPrompt,
  type FieldStreamResult,
  type GenerateFieldPayload,
  runGenerateFieldStream,
} from "./generate-field";
export { logAiRun } from "./logger";
export {
  buildQueryPrompt,
  type QueryPayload,
  type QueryStreamResult,
  runQueryStream,
} from "./query";
export { type AgentRunInput, type AgentType, runAgent } from "./run-agent";
export {
  buildWizardPrompt,
  runWizardStream,
  type WizardPayload,
  type WizardStreamResult,
} from "./wizard";
