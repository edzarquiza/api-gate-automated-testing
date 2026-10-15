import { describe, expect, it } from "vitest";
import { api, createOrder, detailFields, expectError, expectJson, expectValidOrder, validOrderInput } from "./helpers";

describe("POST /api/orders - valid requests", () => {
  it("creates a pending order, returns 201 and echoes the submitted fields", async () => {
    const res = await api("POST", "/api/orders", { json: validOrderInput });

    expect(res.status).toBe(201);
    expectJson(res);
    expectValidOrder(res.body);
    expect(res.body).toMatchObject({ ...validOrderInput, status: "pending" });
  });

  it("computes totalCents on the server as quantity * unitPriceCents", async () => {
    const order = await createOrder({ quantity: 7, unitPriceCents: 1250 });

    expect(order.totalCents).toBe(8750);
  });

  it("assigns a distinct id to every order and a valid ISO creation timestamp", async () => {
    const first = await createOrder();
    const second = await createOrder();

    expect(first.id).not.toBe(second.id);
    expect(Number.isNaN(Date.parse(first.createdAt)), "createdAt must parse as a date").toBe(false);
  });

  it.each([
    ["minimum quantity", { quantity: 1 }],
    ["maximum quantity", { quantity: 100 }],
    ["minimum unit price", { unitPriceCents: 1 }],
    ["32-character sku", { sku: "A".repeat(32) }],
  ])("accepts the boundary value: %s", async (_label, overrides) => {
    const order = await createOrder(overrides);

    expectValidOrder(order);
  });
});

describe("POST /api/orders - validation", () => {
  it.each(["customerEmail", "sku", "quantity", "unitPriceCents"])(
    "rejects a body missing the required field '%s'",
    async (field) => {
      const { [field]: _omitted, ...incomplete } = validOrderInput as Record<string, unknown>;

      const res = await api("POST", "/api/orders", { json: incomplete });

      expect(detailFields(expectError(res, 400, "VALIDATION_ERROR"))).toEqual([field]);
    },
  );

  it.each([
    ["quantity as a string", { quantity: "2" }, "quantity"],
    ["quantity of zero", { quantity: 0 }, "quantity"],
    ["quantity above the maximum", { quantity: 101 }, "quantity"],
    ["non-integer quantity", { quantity: 1.5 }, "quantity"],
    ["unit price of zero", { unitPriceCents: 0 }, "unitPriceCents"],
    ["negative unit price", { unitPriceCents: -5 }, "unitPriceCents"],
    ["invalid e-mail address", { customerEmail: "not-an-email" }, "customerEmail"],
    ["lower-case sku", { sku: "abc" }, "sku"],
    ["sku longer than 32 characters", { sku: "A".repeat(33) }, "sku"],
  ])("rejects %s", async (_label, overrides, field) => {
    const res = await api("POST", "/api/orders", { json: { ...validOrderInput, ...overrides } });

    expect(detailFields(expectError(res, 400, "VALIDATION_ERROR"))).toEqual([field]);
  });

  it.each([
    ["totalCents", 1],
    ["id", "ord_1"],
    ["status", "paid"],
    ["createdAt", "2020-01-01T00:00:00.000Z"],
    ["unexpectedField", true],
  ])("rejects the client-supplied field '%s' instead of silently ignoring it", async (field, value) => {
    const res = await api("POST", "/api/orders", { json: { ...validOrderInput, [field]: value } });

    expect(detailFields(expectError(res, 400, "VALIDATION_ERROR"))).toEqual([field]);
  });

  it("reports every invalid field in one response", async () => {
    const res = await api("POST", "/api/orders", {
      json: { customerEmail: "bad", sku: "bad", quantity: 0, unitPriceCents: 0 },
    });

    expect(detailFields(expectError(res, 400, "VALIDATION_ERROR")).sort()).toEqual(
      ["customerEmail", "quantity", "sku", "unitPriceCents"],
    );
  });

  it.each([
    ["an empty request body", undefined],
    ["a JSON array", []],
  ])("rejects %s with VALIDATION_ERROR", async (_label, json) => {
    const res = await api("POST", "/api/orders", { json });

    expectError(res, 400, "VALIDATION_ERROR");
  });
});

describe("POST /api/orders - request errors", () => {
  it.each(['{"customerEmail":', "not json at all", "{'single':'quotes'}"])(
    "returns 400 MALFORMED_JSON for invalid JSON: %s",
    async (rawBody) => {
      const res = await api("POST", "/api/orders", { rawBody });

      expectError(res, 400, "MALFORMED_JSON");
    },
  );

  it("returns 413 with the standard error envelope for a body over the 10 kB limit", async () => {
    const res = await api("POST", "/api/orders", { json: { ...validOrderInput, padding: "a".repeat(20_000) } });

    expectError(res, 413, "BAD_REQUEST");
  });
});
