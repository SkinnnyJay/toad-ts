import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { ENV_KEY } from "@/constants/env-keys";
import { INDENT_SPACES } from "@/constants/json-format";
import { DiffRenderer } from "@/ui/components/DiffRenderer";
import { MarkdownRenderer } from "@/ui/components/MarkdownRenderer";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "@/ui/components/TruncationProvider";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo, useMemo } from "react";
import type { ToolCall } from "./toolCall.types";

interface FileEditInfo {
  oldContent: string;
  newContent: string;
  filename: string;
}

const env = new Env(EnvManager.getInstance());
const EXPAND_ALL = env.getBoolean(ENV_KEY.TOADSTOOL_EXPAND_ALL, false);

const formatResultLines = (result: unknown): string[] => {
  if (result === undefined || result === null) return ["null"];

  if (typeof result === "string") return result.split(/\r?\n/);

  try {
    return JSON.stringify(result, null, INDENT_SPACES).split(/\r?\n/);
  } catch {
    return [String(result)];
  }
};

const isShellLikeResult = (
  value: unknown
): value is { stdout?: string; stderr?: string; exitCode?: number | string } =>
  typeof value === "object" && value !== null && ("stdout" in value || "stderr" in value);

const FILE_EDIT_TOOL_PATTERNS = ["strreplace", "str_replace", "edit", "write", "patch", "modify"];

const isFileEditTool = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  return FILE_EDIT_TOOL_PATTERNS.some((pattern) => lowerName.includes(pattern));
};

const extractFileEditInfo = (
  toolName: string,
  args: Record<string, unknown>
): FileEditInfo | null => {
  if (!isFileEditTool(toolName)) return null;

  const extractString = (value: unknown): string | undefined =>
    typeof value === "string" ? value : undefined;

  const filename =
    extractString(args.path) ??
    extractString(args.file) ??
    extractString(args.filename) ??
    extractString(args.file_path) ??
    "unknown";

  if ("old_string" in args && "new_string" in args) {
    return {
      oldContent: String(args.old_string ?? ""),
      newContent: String(args.new_string ?? ""),
      filename,
    };
  }

  if ("content" in args || "contents" in args) {
    const content = String(args.content ?? args.contents ?? "");
    return {
      oldContent: "",
      newContent: content,
      filename,
    };
  }

  if ("patch" in args || "diff" in args) {
    return null;
  }

  return null;
};

const LogBlock = memo(function LogBlock({
  label,
  content,
  color,
  truncateId,
}: {
  label: string;
  content: string | undefined;
  color: string;
  truncateId: string;
}): ReactNode {
  if (!content || content.length === 0) return null;
  const lines = content.split(/\r?\n/);
  const isLong = lines.length > LIMIT.LONG_OUTPUT_LINE_THRESHOLD;
  const { expanded, isActive } = useTruncationToggle({
    id: truncateId,
    label,
    isTruncated: isLong,
    defaultExpanded: EXPAND_ALL,
  });
  const visibleLines =
    expanded || !isLong ? lines : lines.slice(0, LIMIT.LONG_OUTPUT_LINE_THRESHOLD);

  return (
    <box flexDirection="column" gap={0} paddingLeft={2}>
      <text fg={color} attributes={TextAttributes.BOLD}>
        {label}
      </text>
      {visibleLines.map((line) => (
        <text key={`${truncateId}-${line.slice(0, LIMIT.LINE_KEY_SLICE)}`}>{line || " "}</text>
      ))}

      {isLong ? (
        <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
          {`${isActive ? "▶" : "•"} showing ${visibleLines.length}/${lines.length} lines (${expanded ? "expanded" : "collapsed"}) · ${TRUNCATION_SHORTCUT_HINT}`}
        </text>
      ) : null}
    </box>
  );
});

LogBlock.displayName = "LogBlock";

const FileEditDiffOutput = memo(function FileEditDiffOutput({
  editInfo,
}: {
  editInfo: FileEditInfo;
}): ReactNode {
  return (
    <DiffRenderer
      oldContent={editInfo.oldContent}
      newContent={editInfo.newContent}
      filename={editInfo.filename}
    />
  );
});

FileEditDiffOutput.displayName = "FileEditDiffOutput";

export const ToolCallResult = memo(function ToolCallResult({
  tool,
}: {
  tool: ToolCall;
}): ReactNode {
  const { result, id: toolId, name: toolName, arguments: toolArgs } = tool;
  if (result === undefined || result === null) {
    return null;
  }

  const fileEditInfo = useMemo(() => extractFileEditInfo(toolName, toolArgs), [toolName, toolArgs]);

  if (fileEditInfo) {
    return (
      <box flexDirection="column" gap={0}>
        <FileEditDiffOutput editInfo={fileEditInfo} />
        {typeof result === "string" && result.trim().length > 0 && (
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            {result}
          </text>
        )}
      </box>
    );
  }

  if (isShellLikeResult(result)) {
    const { stdout, stderr, exitCode } = result;
    return (
      <box flexDirection="column" gap={0}>
        <LogBlock
          label="STDOUT"
          content={stdout}
          color={COLOR.WHITE}
          truncateId={`${toolId}-stdout`}
        />
        <LogBlock
          label="STDERR"
          content={stderr}
          color={COLOR.RED}
          truncateId={`${toolId}-stderr`}
        />
        {exitCode !== undefined ? (
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>{`Exit: ${exitCode}`}</text>
        ) : null}
      </box>
    );
  }

  if (typeof result === "string" && result.trim().length > 0) {
    return (
      <box flexDirection="column" gap={0}>
        <MarkdownRenderer markdown={result} />
      </box>
    );
  }

  const lines = useMemo(() => formatResultLines(result), [result]);
  const truncatedHead = Math.max(0, lines.length - UI.VISIBLE_RESULT_LINES);
  const { expanded, isActive } = useTruncationToggle({
    id: `${toolId}-result`,
    label: "Tool result",
    isTruncated: truncatedHead > 0,
    defaultExpanded: EXPAND_ALL,
  });
  const visibleLines =
    expanded || truncatedHead === 0 ? lines : lines.slice(-UI.VISIBLE_RESULT_LINES);

  return (
    <box flexDirection="column" gap={0}>
      {visibleLines.map((line) => (
        <text key={`${toolId}-line-${line.slice(0, LIMIT.LINE_KEY_SLICE)}`}>{line || " "}</text>
      ))}
      {truncatedHead > 0 ? (
        <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
          {`${isActive ? "▶" : "•"} showing ${visibleLines.length}/${lines.length} lines (${expanded ? "expanded" : "collapsed"}) · ${TRUNCATION_SHORTCUT_HINT}`}
        </text>
      ) : null}
    </box>
  );
});

ToolCallResult.displayName = "ToolCallResult";
