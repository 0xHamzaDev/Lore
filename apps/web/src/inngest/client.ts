import { Inngest } from "inngest";

// Single shared client. In dev (no eventKey) Inngest defaults to the local
// dev server at http://localhost:8288. In prod set INNGEST_EVENT_KEY from
// the Inngest dashboard. The id pins this app's namespace within Inngest.
//
// Both keys are conditionally spread: under `exactOptionalPropertyTypes` we
// must omit the property entirely rather than pass `undefined`, so when the
// env var is unset Inngest falls back to its own env lookup / dev defaults.
// The signing key proves inbound requests came from Inngest's edge in prod;
// in dev the local dev server signs requests itself.
const eventKey = process.env["INNGEST_EVENT_KEY"];
const signingKey = process.env["INNGEST_SIGNING_KEY"];

export const inngest = new Inngest({
  id: "lore-web",
  ...(eventKey ? { eventKey } : {}),
  ...(signingKey ? { signingKey } : {}),
});
