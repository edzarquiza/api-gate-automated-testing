import { describe, expect, it } from "vitest";
import { api, createOrder, expectError, validOrderInput } from "./helpers";

// Cross-cutting regression checks: behavior every endpoint must share.
describe("error handling", () => {
  it("returns the standard 404 envelope for an unknown route", async () => {
    const res = await api("GET", "/api/does-not-exist");

    expectError(res, 404, "NOT_FOUND");
  });

  it("treats an unsupported method on a known path as an unknown route (documented: 404, not 405)", async () => {
    const order = await createOrder();

    const res = await api("DELETE", `/api/orders/${order.id}`);

    expectError(res, 404, "NOT_FOUND");
    expect((await api("GET", `/api/orders/${order.id}`)).status, "order must still exist").toBe(200);
  });

  it("uses one error envelope across 400, 404, 409 and 413 responses", async () => {
    const order = await createOrder();
    expectError(await api("POST", "/api/orders", { json: {} }), 400, "VALIDATION_ERROR");
    expectError(await api("GET", "/api/orders/ord_999999999"), 404, "NOT_FOUND");
    expectError(
      await api("PATCH", `/api/orders/${order.id}`, { json: { status: "delivered" } }),
      409,
      "INVALID_TRANSITION",
    );
    expectError(
      await api("POST", "/api/orders", { json: { ...validOrderInput, padding: "a".repeat(20_000) } }),
      413,
      "BAD_REQUEST",
    );
  });

  it("does not advertise the server framework", async () => {
    const res = await api("GET", "/health");

    expect(res.headers.get("x-powered-by")).toBeNull();
  });
});
