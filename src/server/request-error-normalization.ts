import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { normalizeHttpMethod } from "@/server/http-method-normalization";
import type { Logger } from "@/utils/logging/logger.utils";

export interface NormalizedRequestBodyParseError {
  readonly message: string;
  readonly error: string;
}

export const REQUEST_PARSING_SOURCE = {
  API_ROUTES: "api_routes",
  HEADLESS_SERVER: "headless_server",
  HOOK_IPC: "hook_ipc",
} as const;

export type RequestParsingSource =
  (typeof REQUEST_PARSING_SOURCE)[keyof typeof REQUEST_PARSING_SOURCE];

export interface RequestParsingFailureContext {
  readonly source: RequestParsingSource;
  readonly method: string;
  readonly pathname: string;
  readonly handler?: string;
}

const REQUEST_PARSING_FAILURE_LOG_MESSAGE = "Request parsing failed";

const isRequestBodyTooLargeError = (error: unknown): boolean =>
  error instanceof Error && error.message === SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE;

const isInvalidRequestError = (error: unknown): boolean => {
  if (error instanceof SyntaxError) {
    return true;
  }
  return error instanceof Error && error.message === SERVER_RESPONSE_MESSAGE.INVALID_REQUEST;
};

export const normalizeRequestBodyParseError = (error: unknown): string => {
  if (isRequestBodyTooLargeError(error)) {
    return SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE;
  }
  return SERVER_RESPONSE_MESSAGE.INVALID_REQUEST;
};

export const normalizeRequestBodyParseErrorDetails = (
  error: unknown
): NormalizedRequestBodyParseError => ({
  message: normalizeRequestBodyParseError(error),
  error: error instanceof Error ? error.message : String(error),
});

export const logRequestParsingFailure = (
  logger: Logger,
  context: RequestParsingFailureContext,
  details: NormalizedRequestBodyParseError
): void => {
  logger.warn(REQUEST_PARSING_FAILURE_LOG_MESSAGE, {
    source: context.source,
    method: normalizeHttpMethod(context.method),
    pathname: context.pathname.trim(),
    ...(context.handler ? { handler: context.handler } : {}),
    error: details.error,
    mappedMessage: details.message,
  });
};

export const classifyRequestParsingError = (error: unknown): string | null => {
  if (isRequestBodyTooLargeError(error)) {
    return SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE;
  }
  if (isInvalidRequestError(error)) {
    return SERVER_RESPONSE_MESSAGE.INVALID_REQUEST;
  }
  return null;
};
