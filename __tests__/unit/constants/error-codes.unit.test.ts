import {
  AUTH_REQUIRED,
  EACCES,
  ENOENT,
  ERROR_CODE,
  RPC_METHOD_NOT_FOUND,
} from "@/constants/error-codes";
import { describe, expect, it } from "vitest";

describe("error-codes constants", () => {
  it("exposes canonical errno-style codes", () => {
    expect(ERROR_CODE.ENOENT).toBe("ENOENT");
    expect(ERROR_CODE.EACCES).toBe("EACCES");
    expect(ENOENT).toBe(ERROR_CODE.ENOENT);
    expect(EACCES).toBe(ERROR_CODE.EACCES);
  });

  it("exposes rpc/auth numeric codes", () => {
    expect(ERROR_CODE.AUTH_REQUIRED).toBe(-32000);
    expect(ERROR_CODE.RPC_METHOD_NOT_FOUND).toBe(-32601);
    expect(AUTH_REQUIRED).toBe(ERROR_CODE.AUTH_REQUIRED);
    expect(RPC_METHOD_NOT_FOUND).toBe(ERROR_CODE.RPC_METHOD_NOT_FOUND);
  });
});
