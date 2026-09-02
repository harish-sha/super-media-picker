export type MediaPickerErrorCode =
  | "provider_unavailable"
  | "invalid_response"
  | "request_failed"
  | "configuration_error";

export class MediaPickerError extends Error {
  readonly code: MediaPickerErrorCode;
  override readonly cause?: unknown;

  constructor(message: string, code: MediaPickerErrorCode, cause?: unknown) {
    super(message);
    this.name = "MediaPickerError";
    this.code = code;
    this.cause = cause;
  }
}

export class MediaProviderError extends MediaPickerError {
  readonly provider: string;
  readonly providerCode: string | undefined;
  readonly status: number | undefined;
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;
  readonly requestId: string | undefined;

  constructor(
    message: string,
    provider: string,
    options: {
      readonly code?: string;
      readonly cause?: unknown;
      readonly status?: number;
      readonly retryable?: boolean;
      readonly retryAfterMs?: number;
      readonly requestId?: string;
    } = {},
  ) {
    super(message, "request_failed", options.cause);
    this.name = "MediaProviderError";
    this.provider = provider;
    this.providerCode = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
    this.requestId = options.requestId;
  }
}
