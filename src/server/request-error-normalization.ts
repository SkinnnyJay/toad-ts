import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";

export interface NormalizedRequestBodyParseError {
  readonly message: string;
  readonly error: string;
}

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

export const classifyRequestParsingError = (error: unknown): string | null => {
  if (isRequestBodyTooLargeError(error)) {
    return SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE;
  }
  if (isInvalidRequestError(error)) {
    return SERVER_RESPONSE_MESSAGE.INVALID_REQUEST;
  }
  return null;
};
