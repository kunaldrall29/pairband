export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    retryable: boolean;
    details?: unknown;
  };
};

export function apiError(
  code: string,
  message: string,
  requestId: string,
  opts: { retryable?: boolean; details?: unknown; statusCode?: number } = {},
): { statusCode: number; body: ApiErrorBody } {
  return {
    statusCode: opts.statusCode ?? 400,
    body: {
      error: {
        code,
        message,
        requestId,
        retryable: opts.retryable ?? false,
        ...(opts.details !== undefined ? { details: opts.details } : {}),
      },
    },
  };
}

/** Redact secrets from log-bound objects. */
export function redactForLogs(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (/api[_-]?key|secret|password|private/i.test(value)) return "[redacted]";
    return value;
  }
  if (Array.isArray(value)) return value.map(redactForLogs);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/secret|password|apikey|api_key|authorization|cookie|signature|private/i.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = redactForLogs(v);
      }
    }
    return out;
  }
  return value;
}
