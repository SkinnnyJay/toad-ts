import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENV_KEY } from "@/constants/env-keys";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { UI_SYMBOLS } from "@/constants/ui-symbols";
import { useAppStore } from "@/store/app-store";
import type {
  ContentBlock as ChatContentBlock,
  Message as ChatMessage,
  ToolCallId,
} from "@/types/domain";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "@/ui/components/TruncationProvider";
import { formatDurationMs } from "@/ui/components/tool-calls/formatToolCallDuration";
import type { ToolCall } from "@/ui/components/tool-calls/toolCall.types";
import { roleColor } from "@/ui/theme";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import stripAnsi from "strip-ansi";
import { ContentBlockRenderer } from "./ContentBlockRenderer";

interface MessageItemProps {
  message: ChatMessage;
  toolCallsById: Map<ToolCallId, ToolCall>;
}

const env = new Env(EnvManager.getInstance());
const EXPAND_ALL = env.getBoolean(ENV_KEY.TOADSTOOL_EXPAND_ALL, false);

const countLines = (text: string): number => stripAnsi(text ?? "").split(/\r?\n/).length;

/** Estimates visual line count when text wraps at wrapWidth (e.g. terminal width). */
const estimateWrappedLines = (text: string, wrapWidth: number): number => {
  const plain = stripAnsi(text ?? "");
  if (plain.length === 0) return 0;
  const lines = plain.split(/\r?\n/);
  let total = 0;
  for (const line of lines) {
    total += Math.max(1, Math.ceil(line.length / wrapWidth));
  }
  return total;
};

type TextLikeBlock = Extract<
  ChatContentBlock,
  { type: typeof CONTENT_BLOCK_TYPE.TEXT | typeof CONTENT_BLOCK_TYPE.THINKING }
>;

const isTextLikeBlock = (block: ChatContentBlock): block is TextLikeBlock =>
  block.type === CONTENT_BLOCK_TYPE.TEXT || block.type === CONTENT_BLOCK_TYPE.THINKING;

const mergeTextBlocks = (blocks: ChatContentBlock[]): ChatContentBlock[] => {
  const merged: ChatContentBlock[] = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    if (isTextLikeBlock(block) && last && isTextLikeBlock(last) && last.type === block.type) {
      const combinedText = `${last.text}${block.text}`;
      merged[merged.length - 1] = { ...last, text: combinedText };
    } else {
      merged.push(block);
    }
  }
  return merged;
};

const countBlockLines = (block: ChatContentBlock): number => {
  if (block.type === CONTENT_BLOCK_TYPE.TEXT || block.type === CONTENT_BLOCK_TYPE.THINKING) {
    return countLines(block.text ?? "");
  }
  if (block.type === CONTENT_BLOCK_TYPE.CODE) {
    return countLines(block.text);
  }
  return 1;
};

export const MessageItem = memo(({ message, toolCallsById }: MessageItemProps): ReactNode => {
  const showToolDetails = useAppStore((state) => state.uiState.showToolDetails);
  const showThinking = useAppStore((state) => state.uiState.showThinking);
  const visibleBlocks = useMemo(
    () =>
      message.content.filter((block) => {
        if (!showToolDetails && block.type === CONTENT_BLOCK_TYPE.TOOL_CALL) {
          return false;
        }
        if (!showThinking && block.type === CONTENT_BLOCK_TYPE.THINKING) {
          return false;
        }
        return true;
      }),
    [message.content, showThinking, showToolDetails]
  );

  const mergedBlocks = useMemo(() => mergeTextBlocks(visibleBlocks), [visibleBlocks]);

  const toolCallBlocks = useMemo(
    () => mergedBlocks.filter((block) => block.type === CONTENT_BLOCK_TYPE.TOOL_CALL),
    [mergedBlocks]
  );
  const responseBlocks = useMemo(
    () => mergedBlocks.filter((block) => block.type !== CONTENT_BLOCK_TYPE.TOOL_CALL),
    [mergedBlocks]
  );

  const totalResponseLines = useMemo(
    () => responseBlocks.reduce((total, block) => total + countBlockLines(block), 0),
    [responseBlocks]
  );

  const isLongOutput = useMemo(
    () =>
      totalResponseLines > LIMIT.LONG_OUTPUT_LINE_THRESHOLD ||
      responseBlocks.length > LIMIT.LONG_OUTPUT_PREVIEW_BLOCKS * 2,
    [responseBlocks.length, totalResponseLines]
  );

  const roleLabel = message.role === MESSAGE_ROLE.ASSISTANT ? "AGENT" : message.role.toUpperCase();
  const roleBar = roleColor(message.role);

  const { expanded: messageExpanded } = useTruncationToggle({
    id: `msg-${message.id}`,
    label: roleLabel,
    isTruncated: true,
    defaultExpanded: true,
  });

  const { expanded: longOutputExpanded } = useTruncationToggle({
    id: `${message.id}-long-output`,
    label: "Long output",
    isTruncated: isLongOutput,
    defaultExpanded: EXPAND_ALL,
  });

  const toolCallsExpandedState = useTruncationToggle({
    id: `${message.id}-tool-calls`,
    label: "Tool calls",
    isTruncated: toolCallBlocks.length > 0,
    defaultExpanded: false,
  });

  const toolCallSummary = useMemo(() => {
    if (toolCallBlocks.length === 0) {
      return {
        count: 0,
        durationText: null as string | null,
        isRunning: false,
      };
    }

    const toolCalls: ToolCall[] = [];
    for (const block of toolCallBlocks) {
      if (block.type !== CONTENT_BLOCK_TYPE.TOOL_CALL) continue;
      const toolCall = toolCallsById.get(block.toolCallId);
      if (toolCall) toolCalls.push(toolCall);
    }

    let minStartMs: number | null = null;
    let maxEndMs: number | null = null;
    let isRunning = false;

    for (const t of toolCalls) {
      if (t.startedAt) {
        const startMs = t.startedAt.getTime();
        if (minStartMs === null || startMs < minStartMs) minStartMs = startMs;
      }
      if (t.completedAt) {
        const endMs = t.completedAt.getTime();
        if (maxEndMs === null || endMs > maxEndMs) maxEndMs = endMs;
      } else if (t.startedAt) {
        isRunning = true;
      }
    }

    if (minStartMs === null) {
      return { count: toolCallBlocks.length, durationText: null, isRunning: false };
    }

    const effectiveEndMs = maxEndMs ?? Date.now();
    const durationMs = Math.max(0, effectiveEndMs - minStartMs);
    const durationText = formatDurationMs(durationMs);
    return { count: toolCallBlocks.length, durationText, isRunning };
  }, [toolCallBlocks, toolCallsById]);

  const [toolCallPulseOn, setToolCallPulseOn] = useState(false);
  useEffect(() => {
    if (!toolCallSummary.isRunning) {
      setToolCallPulseOn(false);
      return;
    }

    const intervalId = setInterval(() => {
      setToolCallPulseOn((prev) => !prev);
    }, TIMEOUT.TOOL_CALL_SUMMARY_PULSE_MS);

    return () => clearInterval(intervalId);
  }, [toolCallSummary.isRunning]);

  const {
    previewBlocks: displayedResponseBlocks,
    hiddenLineCount,
    hiddenBlockCount,
  } = useMemo(() => {
    if (!isLongOutput) {
      return { previewBlocks: responseBlocks, hiddenLineCount: 0, hiddenBlockCount: 0 };
    }

    if (longOutputExpanded) {
      return {
        previewBlocks: responseBlocks,
        hiddenLineCount: 0,
        hiddenBlockCount: 0,
      };
    }

    const headCount = Math.min(LIMIT.LONG_OUTPUT_PREVIEW_BLOCKS, responseBlocks.length);
    const tailCount = responseBlocks.length > headCount ? 1 : 0;
    const headBlocks = responseBlocks.slice(0, headCount);
    const tailBlocks = tailCount > 0 ? responseBlocks.slice(-tailCount) : [];
    const previewBlocks = [...headBlocks, ...tailBlocks];

    const previewLineCount = previewBlocks.reduce(
      (total, block) => total + countBlockLines(block),
      0
    );
    return {
      previewBlocks,
      hiddenLineCount: Math.max(0, totalResponseLines - previewLineCount),
      hiddenBlockCount: Math.max(0, responseBlocks.length - previewBlocks.length),
    };
  }, [isLongOutput, longOutputExpanded, responseBlocks, totalResponseLines]);

  const hasIncompleteMarkdown = useMemo(
    () =>
      message.isStreaming &&
      responseBlocks.some((block) => {
        if (block.type === CONTENT_BLOCK_TYPE.TEXT) {
          const text = block.text || "";
          const codeBlockCount = (text.match(/```/g) || []).length;
          return codeBlockCount % 2 !== 0;
        }
        return false;
      }),
    [message.isStreaming, responseBlocks]
  );

  const estimateBlockLines = useCallback((block: ChatContentBlock): number => {
    const wrapWidth = LIMIT.MESSAGE_BAR_WRAP_WIDTH;
    switch (block.type) {
      case CONTENT_BLOCK_TYPE.TEXT:
      case CONTENT_BLOCK_TYPE.THINKING:
        return estimateWrappedLines(block.text ?? "", wrapWidth);
      case CONTENT_BLOCK_TYPE.CODE:
        return (
          Math.min(estimateWrappedLines(block.text ?? "", wrapWidth), LIMIT.MAX_BLOCK_LINES) + 1
        );
      case CONTENT_BLOCK_TYPE.TOOL_CALL:
        return 2;
      case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
      case CONTENT_BLOCK_TYPE.RESOURCE:
        return 1;
      default:
        return 1;
    }
  }, []);

  const contentLineCount = useMemo(() => {
    const headerLines = 1;
    if (!messageExpanded) {
      return headerLines + 1;
    }
    const toolLines =
      toolCallBlocks.length === 0
        ? 0
        : toolCallsExpandedState.expanded
          ? toolCallBlocks.reduce((sum, block) => sum + estimateBlockLines(block), 0)
          : 1;
    const toolSpacerLines = toolCallBlocks.length === 0 ? 0 : 1;
    const responseLines = displayedResponseBlocks.reduce(
      (sum, block) => sum + estimateBlockLines(block),
      0
    );
    const extras = (isLongOutput ? 1 : 0) + (hasIncompleteMarkdown ? 1 : 0);
    const bufferLines = 2;
    const streamingBuffer = message.isStreaming ? LIMIT.STREAMING_BAR_BUFFER_LINES : 0;
    return (
      headerLines +
      toolLines +
      toolSpacerLines +
      responseLines +
      extras +
      bufferLines +
      streamingBuffer
    );
  }, [
    displayedResponseBlocks,
    estimateBlockLines,
    hasIncompleteMarkdown,
    isLongOutput,
    message.isStreaming,
    messageExpanded,
    toolCallBlocks,
    toolCallsExpandedState.expanded,
  ]);

  const bar = useMemo(
    () => Array.from({ length: Math.max(1, contentLineCount) }, () => "│").join("\n"),
    [contentLineCount]
  );

  const collapseIcon = messageExpanded ? UI_SYMBOLS.MESSAGE_EXPANDED : UI_SYMBOLS.MESSAGE_COLLAPSED;
  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <box flexDirection="row" width="100%" gap={1} marginTop={0} marginBottom={2}>
      <box flexShrink={0}>
        <text fg={roleBar}>{bar}</text>
      </box>
      <box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} gap={0}>
        <box flexDirection="row" gap={1} marginBottom={0} flexGrow={1} flexShrink={1} minWidth={0}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <text fg={roleBar} attributes={TextAttributes.BOLD}>
              {collapseIcon}
            </text>
            <text fg={roleBar} attributes={TextAttributes.BOLD}>
              [{roleLabel}]
            </text>
            {message.isStreaming && (
              <text fg={COLOR.CYAN} attributes={TextAttributes.DIM}>
                ● streaming…
              </text>
            )}
          </box>
          <box flexGrow={1} minWidth={1} />
          <box flexShrink={0}>
            <text fg={COLOR.DIM} attributes={TextAttributes.DIM}>
              {timeStr}
            </text>
          </box>
        </box>

        {!messageExpanded ? (
          <box marginTop={0}>
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
              Message collapsed · {TRUNCATION_SHORTCUT_HINT}
            </text>
          </box>
        ) : (
          <>
            {toolCallBlocks.length > 0 && (
              <box flexDirection="column" marginBottom={0} gap={0}>
                <box paddingLeft={1}>
                  <text>
                    <span fg={COLOR.CYAN} attributes={TextAttributes.DIM}>
                      {toolCallSummary.isRunning
                        ? UI_SYMBOLS.SPINNER
                        : toolCallsExpandedState.isActive
                          ? UI_SYMBOLS.MESSAGE_COLLAPSED
                          : UI_SYMBOLS.BULLET}{" "}
                    </span>
                    <span
                      fg={COLOR.CYAN}
                      attributes={
                        toolCallSummary.isRunning
                          ? toolCallPulseOn
                            ? TextAttributes.BOLD
                            : TextAttributes.DIM
                          : TextAttributes.DIM
                      }
                    >
                      {toolCallSummary.count} tool calls
                    </span>
                    {toolCallSummary.durationText ? (
                      <span fg={COLOR.CYAN} attributes={TextAttributes.DIM}>
                        {" "}
                        in {toolCallSummary.durationText}
                      </span>
                    ) : null}
                    {toolCallSummary.isRunning ? (
                      <span fg={COLOR.CYAN} attributes={TextAttributes.DIM}>
                        {" "}
                        (running…)
                      </span>
                    ) : null}
                  </text>
                </box>
                {toolCallsExpandedState.expanded ? (
                  <box flexDirection="column" gap={0}>
                    {toolCallBlocks.map((block, idx) => (
                      <box key={`${message.id}-tool-${idx}`} paddingLeft={1}>
                        <ContentBlockRenderer
                          block={block}
                          messageId={message.id}
                          index={idx}
                          isStreaming={Boolean(message.isStreaming)}
                        />
                      </box>
                    ))}
                  </box>
                ) : null}
              </box>
            )}

            {toolCallBlocks.length > 0 ? <text> </text> : null}

            {displayedResponseBlocks.map((block, idx) => (
              <box
                key={`${message.id}-${block.type}-${idx}`}
                flexGrow={1}
                flexShrink={1}
                minWidth={0}
              >
                <ContentBlockRenderer
                  block={block}
                  messageId={message.id}
                  index={idx}
                  isStreaming={Boolean(message.isStreaming)}
                />
              </box>
            ))}

            {isLongOutput ? (
              <box marginTop={0}>
                <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
                  {`${longOutputExpanded ? UI_SYMBOLS.MESSAGE_COLLAPSED : UI_SYMBOLS.BULLET} long output ${
                    longOutputExpanded ? "(expanded)" : "(collapsed)"
                  }${
                    hiddenLineCount > 0 || hiddenBlockCount > 0
                      ? ` · ${hiddenLineCount} hidden lines, ${hiddenBlockCount} hidden blocks`
                      : ""
                  } · ${TRUNCATION_SHORTCUT_HINT}`}
                </text>
                {!longOutputExpanded && hiddenBlockCount > 0 ? (
                  <text
                    fg={COLOR.GRAY}
                    attributes={TextAttributes.DIM}
                  >{`Previewing head/tail (${displayedResponseBlocks.length}/${responseBlocks.length} blocks)`}</text>
                ) : null}
              </box>
            ) : null}

            {hasIncompleteMarkdown && (
              <box
                marginTop={1}
                border={true}
                borderStyle="rounded"
                borderColor={COLOR.YELLOW}
                padding={1}
              >
                <text fg={COLOR.YELLOW}>
                  ⚠ Incomplete markdown detected - waiting for complete response…
                </text>
              </box>
            )}
          </>
        )}
      </box>
    </box>
  );
});

MessageItem.displayName = "MessageItem";
