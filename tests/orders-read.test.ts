import { describe, expect, it } from "vitest";
import { api, createOrder, expectError, expectJson, expectValidOrder } from "./helpers";

describe("GET /api/orders", () => {
  it("returns the { data, count } envelope with contract-valid orders, including a newly created one", async () => {
    const created = await createOrder();

    const res = await api("GET", "/api/orders");

    expect(res.status).toBe(200);
    expectJson(res);
    expect(Object.keys(res.body).sort(), "list envelope keys").toEqual(["count", "data"]);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count, "count must equal data.length").toBe(res.body.data.length);
    res.body.data.forEach(expectValidOrder);
    expect(res.body.data.map((o: { id: string }) => o.id)).toContain(created.id);
  });
});

describe("GET /api/orders/:id", () => {
  it("returns the order that was created, identical to the creation response", async () => {
    const created = await createOrder();

    const res = await api("GET", `/api/orders/${created.id}`);

    expect(res.status).toBe(200);
    expectJson(res);
    expectValidOrder(res.body);
    expect(res.body).toEqual(created);
  });

  it("returns 404 NOT_FOUND for a well-formed id that does not exist", async () => {
    const res = await api("GET", "/api/orders/ord_999999999");

    expectError(res, 404, "NOT_FOUND");
  });

  it.each(["abc", "1001", "ORD_1001", "ord_", "ord_12x", "ord_-1"])(
    "returns 400 INVALID_ID for the malformed id '%s'",
    async (id) => {
      const res = await api("GET", `/api/orders/${id}`);

      expectError(res, 400, "INVALID_ID");
    },
  );
});
