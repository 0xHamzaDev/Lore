import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.json({ status: "ok", service: "lore-api" }));

export default app;
