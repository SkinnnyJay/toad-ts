import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { PLAN_STATUS } from "@/constants/plan-status";
import {
  SESSION_EXPORT_JSON_EXTENSION,
  SESSION_EXPORT_MARKDOWN_EXTENSION,
  SESSION_EXPORT_ZIP_EXTENSION,
} from "@/constants/session-export";
import { SESSION_MODE } from "@/constants/session-modes";
import { TASK_STATUS } from "@/constants/task-status";
import {
  MessageIdSchema,
  MessageSchema,
  PlanIdSchema,
  PlanSchema,
  SessionIdSchema,
  SessionSchema,
} from "@/types/domain";
import { exportSessionToFile, importSessionFromFile } from "@/utils/session-export";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "toad-export-"));

describe("session export", () => {
  const createFixture = () => {
    const session = SessionSchema.parse({
      id: SessionIdSchema.parse("sess-1"),
      title: "Session",
      agentId: "mock",
      messageIds: [],
      createdAt: 1,
      updatedAt: 1,
      metadata: { mcpServers: [] },
      mode: SESSION_MODE.AUTO,
    });
    const message = MessageSchema.parse({
      id: MessageIdSchema.parse("msg-1"),
      sessionId: session.id,
      role: MESSAGE_ROLE.USER,
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" }],
      createdAt: 1,
      isStreaming: false,
    });
    const plan = PlanSchema.parse({
      id: PlanIdSchema.parse("plan-1"),
      sessionId: session.id,
      originalPrompt: "test",
      status: PLAN_STATUS.PLANNING,
      tasks: [
        {
          id: "task-1",
          planId: "plan-1",
          title: "Do thing",
          description: "desc",
          status: TASK_STATUS.PENDING,
          dependencies: [],
          createdAt: 1,
        },
      ],
      createdAt: 1,
      updatedAt: 1,
    });
    return { session, message, plan };
  };

  it("exports and imports JSON payloads", async () => {
    const dir = await createTempDir();
    const { session, message, plan } = createFixture();

    const filePath = join(dir, `session${SESSION_EXPORT_JSON_EXTENSION}`);
    await exportSessionToFile({
      session,
      messages: [message],
      plan,
      contextAttachments: ["README.md"],
      filePath,
    });

    const raw = await readFile(filePath, "utf8");
    expect(raw).toContain('"session"');

    const imported = await importSessionFromFile(filePath);
    expect(imported.session.id).toBe(session.id);
    expect(imported.messages).toHaveLength(1);
    expect(imported.plan?.id).toBe(plan.id);
    expect(imported.contextAttachments).toEqual(["README.md"]);
  });

  it("streams markdown exports to disk", async () => {
    const dir = await createTempDir();
    const { session, message } = createFixture();
    const filePath = join(dir, `session${SESSION_EXPORT_MARKDOWN_EXTENSION}`);

    await exportSessionToFile({
      session,
      messages: [message],
      filePath,
    });

    const raw = await readFile(filePath, "utf8");
    expect(raw).toContain("# Session");
    expect(raw).toContain("## User");
    expect(raw).toContain("hello");
  });

  it("exports and imports ZIP payloads", async () => {
    const dir = await createTempDir();
    const { session, message, plan } = createFixture();
    const filePath = join(dir, `session${SESSION_EXPORT_ZIP_EXTENSION}`);

    await exportSessionToFile({
      session,
      messages: [message],
      plan,
      contextAttachments: ["README.md"],
      filePath,
    });

    const imported = await importSessionFromFile(filePath);
    expect(imported.session.id).toBe(session.id);
    expect(imported.messages).toHaveLength(1);
    expect(imported.plan?.id).toBe(plan.id);
    expect(imported.contextAttachments).toEqual(["README.md"]);
  });
});
