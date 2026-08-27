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

  constructor(
    message: string,
    provider: string,
    options: { readonly code?: string; readonly cause?: unknown } = {},
  ) {
    super(message, "request_failed", options.cause);
    this.name = "MediaProviderError";
    this.provider = provider;
    this.providerCode = options.code;
  }
}
