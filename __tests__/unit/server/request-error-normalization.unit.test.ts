import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import {
  REQUEST_PARSING_SOURCE,
  classifyRequestParsingError,
  logRequestParsingFailure,
  logRequestValidationFailure,
  normalizeRequestBodyParseError,
  normalizeRequestBodyParseErrorDetails,
} from "@/server/request-error-normalization";
import { describe, expect, it, vi } from "vitest";

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

  it("logs normalized parsing metadata with standardized keys", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        method: " post ",
        pathname: " /api/tui/append-prompt ",
        handler: "append_prompt",
      },
      {
        message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request parsing failed", {
      source: REQUEST_PARSING_SOURCE.API_ROUTES,
      method: "POST",
      pathname: "/api/tui/append-prompt",
      handler: "append_prompt",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("logs normalized validation metadata with standardized keys", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestValidationFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.HOOK_IPC,
        method: " post ",
        pathname: " / ",
      },
      {
        mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.HOOK_IPC,
      method: "POST",
      pathname: "/",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });
});
