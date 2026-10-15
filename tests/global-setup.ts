import { API_BASE_URL, assertSafeTarget } from "./config";

// The API runs as a SEPARATE process (npm start locally, a background step in CI).
// Fail fast with an actionable message instead of dozens of connection errors.
export default async function setup(): Promise<void> {
  assertSafeTarget();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
  } catch (cause) {
    throw new Error(
      `API is not reachable at ${API_BASE_URL}/health. Build and start it first ` +
        "(npm run build && npm start) or set API_BASE_URL.",
      { cause },
    );
  }
  if (!response.ok) {
    throw new Error(`API at ${API_BASE_URL}/health answered ${response.status}; expected 200.`);
  }
}
