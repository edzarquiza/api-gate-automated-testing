import { describe, expect, it } from "vitest";
import { api, expectJson } from "./helpers";

describe("GET /health", () => {
  it("reports a healthy service as JSON", async () => {
    const res = await api("GET", "/health");

    expect(res.status).toBe(200);
    expectJson(res);
    expect(res.body).toEqual({ status: "ok" });
  });
});
