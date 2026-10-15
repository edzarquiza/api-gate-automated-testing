import { describe, expect, it } from "vitest";
import { api, createOrderInStatus, detailFields, expectError, expectJson, expectValidOrder, type Status } from "./helpers";

// Documented state machine (ARCHITECTURE.md section 6). delivered and cancelled are terminal.
const ALLOWED: Record<Status, Status[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
const ALL_STATUSES = Object.keys(ALLOWED) as Status[];

const legal = ALL_STATUSES.flatMap((from) => ALLOWED[from].map((to) => [from, to] as const));
const illegal = ALL_STATUSES.flatMap((from) =>
  ALL_STATUSES.filter((to) => !ALLOWED[from].includes(to)).map((to) => [from, to] as const),
);

// Every case creates its own order, so cases are independent and may run in any order.
describe("PATCH /api/orders/:id - legal transitions", () => {
  it.each(legal)("allows %s -> %s", async (from, to) => {
    const before = await createOrderInStatus(from);

    const res = await api("PATCH", `/api/orders/${before.id}`, { json: { status: to } });

    expect(res.status).toBe(200);
    expectJson(res);
    expectValidOrder(res.body);
    expect(res.body, "only status may change").toEqual({ ...before, status: to });

    const reread = await api("GET", `/api/orders/${before.id}`);
    expect(reread.body.status, "the new status must be persisted").toBe(to);
  });
});

describe("PATCH /api/orders/:id - illegal transitions", () => {
  it.each(illegal)("rejects %s -> %s with 409 and leaves the order unchanged", async (from, to) => {
    const before = await createOrderInStatus(from);

    const res = await api("PATCH", `/api/orders/${before.id}`, { json: { status: to } });

    expectError(res, 409, "INVALID_TRANSITION");
    const reread = await api("GET", `/api/orders/${before.id}`);
    expect(reread.body, "a rejected transition must not modify the order").toEqual(before);
  });
});

describe("PATCH /api/orders/:id - request errors", () => {
  it.each([
    ["an unknown status value", { status: "flying" }, "status"],
    ["a non-string status", { status: 1 }, "status"],
    ["a missing status", {}, "status"],
    ["a client attempt to change quantity", { status: "paid", quantity: 5 }, "quantity"],
    ["a client attempt to change totalCents", { status: "paid", totalCents: 1 }, "totalCents"],
  ])("rejects %s", async (_label, json, field) => {
    const order = await createOrderInStatus("pending");

    const res = await api("PATCH", `/api/orders/${order.id}`, { json });

    expect(detailFields(expectError(res, 400, "VALIDATION_ERROR"))).toContain(field);
    const reread = await api("GET", `/api/orders/${order.id}`);
    expect(reread.body, "a rejected request must not modify the order").toEqual(order);
  });

  it("returns 400 MALFORMED_JSON for invalid JSON", async () => {
    const order = await createOrderInStatus("pending");

    const res = await api("PATCH", `/api/orders/${order.id}`, { rawBody: '{"status":' });

    expectError(res, 400, "MALFORMED_JSON");
  });

  it("returns 404 NOT_FOUND for an order that does not exist", async () => {
    const res = await api("PATCH", "/api/orders/ord_999999999", { json: { status: "paid" } });

    expectError(res, 404, "NOT_FOUND");
  });

  it("returns 400 INVALID_ID for a malformed id", async () => {
    const res = await api("PATCH", "/api/orders/not-an-id", { json: { status: "paid" } });

    expectError(res, 400, "INVALID_ID");
  });
});
