import { createApp } from "./app";

const HOST = process.env.HOST ?? "127.0.0.1";
const rawPort = process.env.PORT ?? "3000";
const PORT = Number(rawPort);

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  console.error(`Invalid PORT '${rawPort}': expected an integer between 0 and 65535`);
  process.exit(1);
}

const server = createApp().listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error(`Failed to start API: ${err.message}`);
  process.exit(1);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
