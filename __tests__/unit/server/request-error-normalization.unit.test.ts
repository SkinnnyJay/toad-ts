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
const TOO_LARGE_MESSAGE = SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE;
const INVALID_MESSAGE = SERVER_RESPONSE_MESSAGE.INVALID_REQUEST;
const PADDED_TOO_LARGE_MESSAGE = ` ${TOO_LARGE_MESSAGE} `;
const PADDED_INVALID_MESSAGE = ` ${INVALID_MESSAGE} `;

describe("request-error-normalization", () => {
  it("classifies request body too large errors", () => {
    const error = new Error(TOO_LARGE_MESSAGE);

    expect(classifyRequestParsingError(error)).toBe(TOO_LARGE_MESSAGE);
  });

  it("classifies request body too large message strings", () => {
    expect(classifyRequestParsingError(TOO_LARGE_MESSAGE)).toBe(TOO_LARGE_MESSAGE);
  });

  it("classifies request body too large message strings with padding", () => {
    expect(classifyRequestParsingError(PADDED_TOO_LARGE_MESSAGE)).toBe(TOO_LARGE_MESSAGE);
  });

  it("classifies syntax errors as invalid requests", () => {
    const error = new SyntaxError("Unexpected token");

    expect(classifyRequestParsingError(error)).toBe(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("classifies canonical invalid-request errors", () => {
    const error = new Error(INVALID_MESSAGE);

    expect(classifyRequestParsingError(error)).toBe(INVALID_MESSAGE);
  });

  it("classifies canonical invalid-request message objects", () => {
    const error = {
      message: INVALID_MESSAGE,
    };

    expect(classifyRequestParsingError(error)).toBe(INVALID_MESSAGE);
  });

  it("classifies padded invalid-request message objects", () => {
    const error = {
      message: PADDED_INVALID_MESSAGE,
    };

    expect(classifyRequestParsingError(error)).toBe(INVALID_MESSAGE);
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

  it("returns normalized parse error details for message-only objects", () => {
    const error = {
      message: UNKNOWN_ERROR_MESSAGE,
    };

    expect(normalizeRequestBodyParseErrorDetails(error)).toEqual({
      message: INVALID_MESSAGE,
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
