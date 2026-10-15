import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { AppError } from "./errors";
import { createOrderStore } from "./orders";
import { createOrderSchema, parseBody, updateOrderSchema } from "./schemas";

const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${req.path} was not found`));
};

function readField(err: unknown, key: string): unknown {
  return typeof err === "object" && err !== null && key in err ? (err as Record<string, unknown>)[key] : undefined;
}

// Converts every failure into the documented error envelope. Internal details are logged, never returned.
const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(err.toBody());
    return;
  }
  if (readField(err, "type") === "entity.parse.failed") {
    res.status(400).json(new AppError(400, "MALFORMED_JSON", "Request body is not valid JSON").toBody());
    return;
  }
  const status = Number(readField(err, "status"));
  if (status >= 400 && status < 500) {
    res.status(status).json(new AppError(status, "BAD_REQUEST", "Request could not be processed").toBody());
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json(new AppError(500, "INTERNAL_ERROR", "Internal server error").toBody());
};

export function createApp() {
  const app = express();
  const store = createOrderStore();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/orders", (_req, res) => {
    const data = store.list();
    res.json({ data, count: data.length });
  });

  app.get("/api/orders/:id", (req, res) => {
    res.json(store.get(req.params.id));
  });

  app.post("/api/orders", (req, res) => {
    const input = parseBody(createOrderSchema, req.body);
    res.status(201).json(store.create(input));
  });

  app.patch("/api/orders/:id", (req, res) => {
    const { status } = parseBody(updateOrderSchema, req.body);
    res.json(store.updateStatus(req.params.id, status));
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
