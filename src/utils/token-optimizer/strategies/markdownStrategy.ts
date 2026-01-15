import { type Token, type Tokens, marked, walkTokens } from "marked";

marked.setOptions({
  gfm: true,
});

import type { OptimizationRequest } from "../tokenOptimizer.types";
import {
  type MarkdownOptimizationPayload,
  markdownOptimizationPayloadSchema,
} from "../tokenOptimizer.types";
import { CompressionTypeEnum } from "../types";
import type { CompressionOutcome, CompressionStrategy } from "./base";

const INDENTATION = "  ";

const renderInlineTokens = (tokens: Token[] = []): string => {
  const combined = tokens
    .map((token) => {
      switch (token.type) {
        case "text":
        case "escape":
          return token.text;
        case "strong":
          return `**${renderInlineTokens(token.tokens)}**`;
        case "em":
          return `*${renderInlineTokens(token.tokens)}*`;
        case "codespan":
          return `\`${token.text}\``;
        case "link":
          return `[${renderInlineTokens(token.tokens)}](${token.href})`;
        case "image":
          return `![${token.text}](${token.href})`;
        case "del":
          return `~~${renderInlineTokens(token.tokens)}~~`;
        case "html":
          return token.text.trim();
        case "br":
          return "  \n";
        default:
          return token.raw.trim();
      }
    })
    .join("");

  return combined.replace(/[ \t]{2,}(?!\n)/g, " ").trim();
};

const indentLines = (content: string, indent: string): string => {
  const lines = content.split("\n");
  return lines.map((line, index) => (index === 0 ? line : `${indent}${line}`)).join("\n");
};

const renderBlockTokens = (tokens: Token[]): string =>
  tokens
    .map((token) => renderBlockToken(token))
    .filter((segment) => segment.length > 0)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const renderList = (token: Tokens.List): string => {
  const lines: string[] = [];
  const start = typeof token.start === "number" ? token.start : 1;

  token.items.forEach((item: Tokens.ListItem, index: number) => {
    const marker = token.ordered
      ? `${start + index}.`
      : item.task
        ? `- [${item.checked ? "x" : " "}]`
        : "-";

    const content = renderBlockTokens(item.tokens ?? []);
    const indentedContent = indentLines(content, `${INDENTATION}${token.ordered ? " " : ""}`);
    lines.push(`${marker} ${indentedContent}`.trimEnd());
  });

  return lines.join("\n");
};

const renderBlockquote = (token: Tokens.Blockquote): string => {
  const content = renderBlockTokens(token.tokens ?? []);
  return content
    .split("\n")
    .map((line) => (line.length > 0 ? `> ${line}` : ">"))
    .join("\n");
};

const renderTable = (token: Tokens.Table): string => {
  const header = token.header.map((cell: Tokens.TableCell) => renderInlineTokens(cell.tokens));
  const alignment = token.align.map((align: "left" | "right" | "center" | null) => {
    switch (align) {
      case "left":
        return ":---";
      case "right":
        return "---:";
      case "center":
        return ":---:";
      default:
        return "---";
    }
  });

  const rows = token.rows.map((row: readonly Tokens.TableCell[]) =>
    row.map((cell: Tokens.TableCell) => renderInlineTokens(cell.tokens))
  );

  const headerLine = `| ${header.join(" | ")} |`;
  const separatorLine = `| ${alignment.join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.join(" | ")} |`);

  return [headerLine, separatorLine, ...rowLines].join("\n");
};

const renderBlockToken = (token: Token): string => {
  switch (token.type) {
    case "space":
      return "";
    case "heading": {
      const heading = token as Tokens.Heading;
      return `${"#".repeat(heading.depth)} ${renderInlineTokens(heading.tokens)}`.trim();
    }
    case "paragraph": {
      const paragraph = token as Tokens.Paragraph;
      return renderInlineTokens(paragraph.tokens).trim();
    }
    case "list":
      return renderList(token as Tokens.List);
    case "blockquote":
      return renderBlockquote(token as Tokens.Blockquote);
    case "code": {
      const codeToken = token as Tokens.Code;
      const language = codeToken.lang ? codeToken.lang : "";
      const codeContent = codeToken.text.replace(/\s+$/g, "");
      const fence = `\`\`\`${language ? language : ""}`;
      return [fence, codeContent, "```"].join("\n");
    }
    case "table":
      return renderTable(token as Tokens.Table);
    case "hr":
      return "---";
    case "html":
      return (token as Tokens.HTML).text.trim();
    case "text":
      return (token as Tokens.Text).text.trim();
    default:
      return token.raw.trim();
  }
};

const collectMarkdownStats = (tokens: Token[]): MarkdownOptimizationPayload => {
  const stats = {
    headingCount: 0,
    listCount: 0,
    tableCount: 0,
    codeBlockCount: 0,
  };

  walkTokens(tokens, (token: Token) => {
    switch (token.type) {
      case "heading":
        stats.headingCount += 1;
        break;
      case "list":
        stats.listCount += (token as Tokens.List).items.length;
        break;
      case "table":
        stats.tableCount += 1;
        break;
      case "code":
        stats.codeBlockCount += 1;
        break;
      default:
        break;
    }
  });

  return markdownOptimizationPayloadSchema.parse(stats);
};

export class MarkdownCompressionStrategy implements CompressionStrategy {
  public readonly type = CompressionTypeEnum.MARKDOWN;

  public format(cleanedInput: string, _request: OptimizationRequest): CompressionOutcome {
    const tokens = marked.lexer(cleanedInput);
    const normalized = renderBlockTokens(tokens);
    const payload = collectMarkdownStats(tokens);

    return {
      optimizedText: normalized,
      optimizedPayload: payload,
    };
  }
}
