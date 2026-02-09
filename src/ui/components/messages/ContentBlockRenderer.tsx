import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENV_KEY } from "@/constants/env-keys";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { ContentBlock as ChatContentBlock } from "@/types/domain";
import { MarkdownRenderer } from "@/ui/components/MarkdownRenderer";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "@/ui/components/TruncationProvider";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { SyntaxStyle, TextAttributes } from "@opentui/core";
import { type ReactNode, memo, useMemo } from "react";
import { ThinkingBlock } from "./ThinkingBlock";

const env = new Env(EnvManager.getInstance());
const EXPAND_ALL = env.getBoolean(ENV_KEY.TOADSTOOL_EXPAND_ALL, false);

type CodeContentBlock = Extract<ChatContentBlock, { type: typeof CONTENT_BLOCK_TYPE.CODE }>;

function CodeBlock({
  block,
  messageId,
  index,
}: {
  block: CodeContentBlock;
  messageId: string;
  index: number;
}): ReactNode {
  const lang = block.language ?? "";
  const lines = block.text.split(/\r?\n/);
  const truncated = Math.max(0, lines.length - LIMIT.MAX_BLOCK_LINES);
  const { expanded, isActive } = useTruncationToggle({
    id: `${messageId}-code-${index}`,
    label: lang ? `${lang} code` : "Code block",
    isTruncated: truncated > 0,
    defaultExpanded: EXPAND_ALL,
  });

  const visibleContent =
    expanded || truncated === 0 ? block.text : lines.slice(0, LIMIT.MAX_BLOCK_LINES).join("\n");
  const syntaxStyle = useMemo(() => SyntaxStyle.create(), []);

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="rounded"
      borderColor={COLOR.BORDER}
      padding={1}
      gap={0}
    >
      {lang ? (
        <text fg={COLOR.DIM} attributes={TextAttributes.DIM}>
          {lang}
        </text>
      ) : null}
      <code
        content={visibleContent}
        filetype={lang || undefined}
        syntaxStyle={syntaxStyle}
        wrapMode="none"
        conceal={true}
        style={{ width: "100%" }}
      />
      {truncated > 0 ? (
        <text fg={COLOR.DIM} attributes={TextAttributes.DIM}>
          {`${isActive ? "▶" : "•"} … ${truncated} more lines ${
            expanded ? "(expanded)" : "(collapsed)"
          } · ${TRUNCATION_SHORTCUT_HINT}`}
        </text>
      ) : null}
    </box>
  );
}

export const ContentBlockRenderer = memo(function ContentBlockRenderer({
  block,
  messageId,
  index,
  isStreaming,
}: {
  block: ChatContentBlock;
  messageId: string;
  index: number;
  isStreaming: boolean;
}): ReactNode {
  switch (block.type) {
    case CONTENT_BLOCK_TYPE.TEXT:
      return <MarkdownRenderer markdown={block.text ?? ""} streaming={isStreaming} />;
    case CONTENT_BLOCK_TYPE.THINKING:
      return <ThinkingBlock text={block.text ?? ""} />;
    case CONTENT_BLOCK_TYPE.CODE:
      return <CodeBlock block={block} messageId={messageId} index={index} />;

    case CONTENT_BLOCK_TYPE.TOOL_CALL: {
      const label = block.name ?? "tool";
      const statusColor =
        block.status === TOOL_CALL_STATUS.SUCCEEDED
          ? COLOR.GREEN
          : block.status === TOOL_CALL_STATUS.RUNNING
            ? COLOR.CYAN
            : block.status === TOOL_CALL_STATUS.FAILED
              ? COLOR.RED
              : COLOR.YELLOW;

      const statusText =
        block.status === TOOL_CALL_STATUS.SUCCEEDED
          ? "complete"
          : block.status === TOOL_CALL_STATUS.RUNNING
            ? "in-progress"
            : block.status === TOOL_CALL_STATUS.FAILED
              ? "failed"
              : "pending";

      return (
        <box flexDirection="column" gap={0}>
          <box gap={1}>
            <text fg={statusColor}>[tool-call: {label}]</text>
            <text fg={statusColor} attributes={TextAttributes.DIM}>
              {statusText}
            </text>
          </box>
          {block.arguments && Object.keys(block.arguments).length > 0 && (
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
              - {JSON.stringify(block.arguments).substring(0, LIMIT.TOOL_NAME_TRUNCATE)}…
            </text>
          )}
        </box>
      );
    }
    case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
      return <text>{`${block.name} (${block.uri})`}</text>;
    case CONTENT_BLOCK_TYPE.RESOURCE: {
      const resource = block.resource;
      if ("text" in resource) {
        return <text>{`Resource ${resource.uri}: ${resource.text}`}</text>;
      }
      return <text>{`Resource ${resource.uri}: [binary ${resource.mimeType ?? "data"}]`}</text>;
    }
    default:
      return <text />;
  }
});

ContentBlockRenderer.displayName = "ContentBlockRenderer";
