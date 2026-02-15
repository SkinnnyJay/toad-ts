import { buildWindowsCmdExecArgs, quoteWindowsCommandValue } from "@/utils/windows-command.utils";
import { describe, expect, it } from "vitest";

describe("windows command utility", () => {
  it("quotes values for cmd.exe execution", () => {
    const quoted = quoteWindowsCommandValue('C:\\Users\\Name\\A&B^ Folder\\say "hi".txt');

    expect(quoted).toBe('"C:\\Users\\Name\\A&B^ Folder\\say ""hi"".txt"');
  });

  it("builds cmd.exe /S /C arguments with quoted command payload", () => {
    const args = buildWindowsCmdExecArgs('type "C:\\A&B^\\ユニコード file.txt"');

    expect(args).toEqual(["/D", "/Q", "/S", "/C", '"type ""C:\\A&B^\\ユニコード file.txt"""']);
  });
});
