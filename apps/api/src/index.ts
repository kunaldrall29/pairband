import { buildServer } from "./server.js";
import { loadEnv } from "@pairband/config";

const env = loadEnv();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

const app = await buildServer(env);
await app.listen({ port, host });
app.log.info({ mode: env.PAIRBAND_MODE, port }, "pairband api listening");
