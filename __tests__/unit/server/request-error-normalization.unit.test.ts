import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import {
  classifyRequestParsingError,
  normalizeRequestBodyParseError,
  normalizeRequestBodyParseErrorDetails,
} from "@/server/request-error-normalization";
import { describe, expect, it } from "vitest";

const UNKNOWN_ERROR_MESSAGE = "unexpected failure";

describe("request-error-normalization", () => {
  it("classifies request body too large errors", () => {
    const error = new Error(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE);

    expect(classifyRequestParsingError(error)).toBe(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE);
  });

  it("classifies syntax errors as invalid requests", () => {
    const error = new SyntaxError("Unexpected token");

    expect(classifyRequestParsingError(error)).toBe(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("classifies canonical invalid-request errors", () => {
    const error = new Error(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);

    expect(classifyRequestParsingError(error)).toBe(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("returns null for unrecognized errors", () => {
    const error = new Error(UNKNOWN_ERROR_MESSAGE);

    expect(classifyRequestParsingError(error)).toBeNull();
  });

  it("normalizes unknown parse errors to invalid request", () => {
    const error = new Error(UNKNOWN_ERROR_MESSAGE);

    expect(normalizeRequestBodyParseError(error)).toBe(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("returns normalized parse error details", () => {
    const error = new Error(UNKNOWN_ERROR_MESSAGE);

    expect(normalizeRequestBodyParseErrorDetails(error)).toEqual({
      message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });
});
