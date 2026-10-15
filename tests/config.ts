const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

export const API_BASE_URL = (process.env.API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * These tests create and modify data, so they only run against a local API.
 * ALLOW_NON_LOCAL_API=true is an explicit override for a disposable test environment.
 */
export function assertSafeTarget(): void {
  const { hostname } = new URL(API_BASE_URL);
  if (!LOOPBACK_HOSTS.has(hostname) && process.env.ALLOW_NON_LOCAL_API !== "true") {
    throw new Error(
      `Refusing to run mutating tests against non-local host '${hostname}'. ` +
        "Set ALLOW_NON_LOCAL_API=true only for a disposable test environment.",
    );
  }
}
