import type { AgentInfo } from "@/agents/agent-manager";
import { CHAT_MESSAGE } from "@/constants/chat-messages";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SESSION_MODE } from "@/constants/session-modes";
import { AgentIdSchema } from "@/types/domain";
import {
  handleCloudDispatchInput,
  isCloudDispatchInput,
  resolveCloudDispatchErrorMessage,
  toCloudDispatchPrompt,
} from "@/ui/components/chat/MessageSender";
import { describe, expect, it, vi } from "vitest";

const createCursorAgent = (): AgentInfo => ({
  id: AgentIdSchema.parse("cursor-cli"),
  harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
  name: "Cursor CLI",
  model: "auto",
});

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("message sender cloud dispatch helpers", () => {
  it("detects cloud dispatch input and extracts prompt", () => {
    expect(isCloudDispatchInput("& run tests")).toBe(true);
    expect(isCloudDispatchInput("run tests")).toBe(false);
    expect(toCloudDispatchPrompt("& run tests")).toBe("run tests");
  });

  it("returns unsupported for non-cursor agents", () => {
    const systemMessages: string[] = [];
    const result = handleCloudDispatchInput({
      input: "&run tests",
      sessionMode: SESSION_MODE.AUTO,
      currentAgent: {
        id: AgentIdSchema.parse("claude-cli"),
        harnessId: "claude-cli",
        name: "Claude",
      },
      onResetInput: () => {},
      appendSystemMessage: (text) => systemMessages.push(text),
      setModeWarning: () => {},
    });

    expect(result).toBe(true);
    expect(systemMessages).toContain(CHAT_MESSAGE.CLOUD_DISPATCH_UNSUPPORTED);
  });

  it("dispatches to cloud client when cursor agent is active", async () => {
    const systemMessages: string[] = [];
    const launchAgent = vi.fn(async () => ({ id: "cloud-1", status: "running" }));

    const result = handleCloudDispatchInput({
      input: "&investigate flaky tests",
      sessionMode: SESSION_MODE.AUTO,
      currentAgent: createCursorAgent(),
      onResetInput: () => {},
      appendSystemMessage: (text) => systemMessages.push(text),
      setModeWarning: () => {},
      createCloudClient: () => ({ launchAgent }),
    });

    expect(result).toBe(true);
    expect(systemMessages[0]).toBe(CHAT_MESSAGE.CLOUD_DISPATCH_STARTING);

    await flushMicrotasks();

    expect(launchAgent).toHaveBeenCalledWith({
      prompt: "investigate flaky tests",
      model: "auto",
    });
    expect(systemMessages.at(-1)).toContain(CHAT_MESSAGE.CLOUD_DISPATCH_STARTED);
    expect(systemMessages.at(-1)).toContain("cloud-1");
  });

  it("forwards repository and branch context to cloud dispatch launch", async () => {
    const launchAgent = vi.fn(async () => ({ id: "cloud-2", status: "queued" }));
    const systemMessages: string[] = [];

    const handled = handleCloudDispatchInput({
      input: "&open a fix PR",
      sessionMode: SESSION_MODE.AUTO,
      currentAgent: createCursorAgent(),
      onResetInput: () => {},
      appendSystemMessage: (text) => systemMessages.push(text),
      setModeWarning: () => {},
      cloudDispatchContext: {
        repository: "owner/repo",
        branch: "feature/cloud-dispatch",
      },
      createCloudClient: () => ({ launchAgent }),
    });

    expect(handled).toBe(true);
    await flushMicrotasks();
    expect(launchAgent).toHaveBeenCalledWith({
      prompt: "open a fix PR",
      model: "auto",
      repository: "owner/repo",
      branch: "feature/cloud-dispatch",
    });
    expect(systemMessages.at(-1)).toContain("owner/repo @ feature/cloud-dispatch");
  });

  it("maps missing API key errors to friendly message", async () => {
    const systemMessages: string[] = [];
    const result = handleCloudDispatchInput({
      input: "&analyze repo",
      sessionMode: SESSION_MODE.AUTO,
      currentAgent: createCursorAgent(),
      onResetInput: () => {},
      appendSystemMessage: (text) => systemMessages.push(text),
      setModeWarning: () => {},
      createCloudClient: () => {
        throw new Error("Cursor cloud API requires CURSOR_API_KEY.");
      },
    });

    expect(result).toBe(true);
    await flushMicrotasks();
    expect(systemMessages.at(-1)).toBe(CHAT_MESSAGE.CLOUD_DISPATCH_MISSING_API_KEY);
    expect(
      resolveCloudDispatchErrorMessage(new Error("Cursor cloud API requires CURSOR_API_KEY."))
    ).toBe(CHAT_MESSAGE.CLOUD_DISPATCH_MISSING_API_KEY);
  });
});
