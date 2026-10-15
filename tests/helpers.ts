import { expect } from "vitest";
import { API_BASE_URL } from "./config";

export type Status = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

/** The Order contract as the tests expect it (deliberately independent of src/types.ts). */
export interface TestOrder {
  id: string;
  customerEmail: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  status: Status;
  createdAt: string;
}

export interface TestError {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

export interface ApiResponse {
  status: number;
  headers: Headers;
  /** Parsed JSON body (undefined when the body is not JSON). */
  // Justified `any`: responses are untrusted JSON that each test asserts field by field.
  body: any;
  text: string;
}

/** Sends a real HTTP request. Pass `rawBody` to send bytes that are not valid JSON. */
export async function api(
  method: string,
  path: string,
  options: { json?: unknown; rawBody?: string } = {},
): Promise<ApiResponse> {
  const raw = options.rawBody ?? (options.json === undefined ? undefined : JSON.stringify(options.json));
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: raw === undefined ? {} : { "Content-Type": "application/json" },
    body: raw,
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, headers: response.headers, body, text };
}

export const validOrderInput = {
  customerEmail: "buyer@example.com",
  sku: "TEST-SKU-1",
  quantity: 2,
  unitPriceCents: 1250,
} as const;

/** Creates a fresh order for the calling test, so no test depends on seed data or other tests. */
export async function createOrder(overrides: Record<string, unknown> = {}): Promise<TestOrder> {
  const res = await api("POST", "/api/orders", { json: { ...validOrderInput, ...overrides } });
  expect(res.status, `setup: POST /api/orders should return 201, got ${res.status}: ${res.text}`).toBe(201);
  return res.body;
}

const NEXT_STEPS: Record<Exclude<Status, "pending" | "cancelled">, Status[]> = {
  paid: ["paid"],
  shipped: ["paid", "shipped"],
  delivered: ["paid", "shipped", "delivered"],
};

/** Creates a new order and walks it through legal transitions until it reaches `target`. */
export async function createOrderInStatus(target: Status): Promise<TestOrder> {
  let order = await createOrder();
  const path = target === "pending" ? [] : target === "cancelled" ? ["cancelled"] : NEXT_STEPS[target];
  for (const status of path) {
    const res = await api("PATCH", `/api/orders/${order.id}`, { json: { status } });
    expect(res.status, `setup: moving ${order.id} to '${status}' returned ${res.status}: ${res.text}`).toBe(200);
    order = res.body;
  }
  return order;
}

const ORDER_KEYS = [
  "createdAt",
  "customerEmail",
  "id",
  "quantity",
  "sku",
  "status",
  "totalCents",
  "unitPriceCents",
];

/** Contract check for an Order: exact key set, types and server-side invariants. */
export function expectValidOrder(order: TestOrder): void {
  expect(order, "order must be a JSON object").toBeTypeOf("object");
  expect(Object.keys(order).sort(), "order must have exactly the documented fields").toEqual(ORDER_KEYS);
  expect(order.id).toMatch(/^ord_\d+$/);
  expect(order.customerEmail).toBeTypeOf("string");
  expect(order.sku).toBeTypeOf("string");
  expect(Number.isInteger(order.quantity), "quantity must be an integer").toBe(true);
  expect(Number.isInteger(order.unitPriceCents), "unitPriceCents must be an integer").toBe(true);
  expect(Number.isInteger(order.totalCents), "totalCents must be an integer").toBe(true);
  expect(order.totalCents, "totalCents must equal quantity * unitPriceCents").toBe(
    order.quantity * order.unitPriceCents,
  );
  expect(["pending", "paid", "shipped", "delivered", "cancelled"]).toContain(order.status);
  expect(order.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
}

export function expectJson(res: ApiResponse): void {
  expect(res.headers.get("content-type") ?? "", "Content-Type header").toContain("application/json");
}

/** Contract check for the shared error envelope. Returns the error object for further assertions. */
export function expectError(res: ApiResponse, status: number, code: string): TestError {
  expect(res.status, `expected HTTP ${status} but got ${res.status}: ${res.text}`).toBe(status);
  expectJson(res);
  expect(Object.keys(res.body ?? {}), "error responses must contain only an 'error' key").toEqual(["error"]);
  expect(res.body.error.code, "error.code").toBe(code);
  expect(res.body.error.message, "error.message must be a non-empty string").toBeTypeOf("string");
  expect(res.body.error.message.length).toBeGreaterThan(0);
  expect(res.text, "error body must not leak a stack trace or file path").not.toMatch(/stack|node_modules|\.ts:|\.js:/i);
  return res.body.error;
}

export function detailFields(error: TestError): string[] {
  expect(Array.isArray(error.details), "validation errors must include a details array").toBe(true);
  return (error.details ?? []).map((d) => {
    expect(d.message).toBeTypeOf("string");
    return d.field;
  });
}
