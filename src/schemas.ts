import { z } from "zod";
import { AppError, type ErrorDetail } from "./errors";
import { ORDER_STATUSES } from "./types";

// Unknown keys are rejected, so clients cannot send server-owned fields such as totalCents.
export const createOrderSchema = z.strictObject({
  customerEmail: z.email(),
  sku: z.string().regex(/^[A-Z0-9-]{1,32}$/, "must be 1-32 characters of A-Z, 0-9 or '-'"),
  quantity: z.number().int().min(1).max(100),
  unitPriceCents: z.number().int().min(1).max(100_000_000),
});

export const updateOrderSchema = z.strictObject({
  status: z.enum(ORDER_STATUSES),
});

export const ORDER_ID_PATTERN = /^ord_\d+$/;

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  // Express 5 leaves req.body undefined when no JSON body was sent; validate it as an empty object.
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;

  const details: ErrorDetail[] = result.error.issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({ field: key, message: "unknown field" }));
    }
    return [{ field: issue.path.join(".") || "body", message: issue.message }];
  });
  throw new AppError(400, "VALIDATION_ERROR", "Request body failed validation", details);
}
