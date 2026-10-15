export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_ID"
  | "MALFORMED_JSON"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: ErrorDetail[] };
}

/** An error whose message is safe to show to API consumers. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
  }

  toBody(): ErrorBody {
    const error: ErrorBody["error"] = { code: this.code, message: this.message };
    if (this.details) error.details = this.details;
    return { error };
  }
}
