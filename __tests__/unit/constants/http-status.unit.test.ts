import {
  BAD_REQUEST,
  HTTP_STATUS,
  INTERNAL_SERVER_ERROR,
  METHOD_NOT_ALLOWED,
  NOT_FOUND,
  NOT_MODIFIED,
  OK,
  UNAUTHORIZED,
} from "@/constants/http-status";
import { describe, expect, it } from "vitest";

describe("http-status constants", () => {
  it("exports canonical HTTP status codes", () => {
    expect(HTTP_STATUS).toEqual({
      OK: 200,
      NOT_MODIFIED: 304,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      METHOD_NOT_ALLOWED: 405,
      NOT_FOUND: 404,
      INTERNAL_SERVER_ERROR: 500,
    });
  });

  it("re-exports convenience aliases", () => {
    expect(OK).toBe(200);
    expect(NOT_MODIFIED).toBe(304);
    expect(BAD_REQUEST).toBe(400);
    expect(UNAUTHORIZED).toBe(401);
    expect(METHOD_NOT_ALLOWED).toBe(405);
    expect(NOT_FOUND).toBe(404);
    expect(INTERNAL_SERVER_ERROR).toBe(500);
  });
});
