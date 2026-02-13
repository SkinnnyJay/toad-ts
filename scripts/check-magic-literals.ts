#!/usr/bin/env tsx
/**
 * Magic Literals Detection Script
 *
 * Scans TypeScript/TSX files for potential magic literals:
 * - String literals in switch/case statements
 * - Magic numbers (non-trivial numeric literals)
 * - Repeated string literals
 *
 * Usage:
 *   tsx scripts/check-magic-literals.ts [--strict]
 *
 * Exit codes:
 *   0 - No issues found (or non-strict mode with warnings)
 *   1 - Critical issues found (strict mode only)
 */

import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const STRICT_MODE = process.argv.includes("--strict");
const IGNORE_PATTERNS = [
  /node_modules/,
  /dist/,
  /\.next/,
  /scratchpad/,
  /__tests__/,
  /\.test\.ts$/,
  /\.test\.tsx$/,
  /\.config\.ts$/,
  /\.config\.js$/,
];

type Severity = "critical" | "high" | "medium" | "low";

interface Issue {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: Severity;
  category: "STATUS_STRING" | "TYPE_LITERAL" | "MAGIC_NUMBER" | "CONTROL_FLOW";
}

const issues: Issue[] = [];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

// Known external library types that are acceptable as literals
const EXTERNAL_TYPES = [
  "text",
  "resource_link",
  "resource",
  "image",
  "audio",
  "in_progress",
  "completed",
  "failed",
  "escape",
  "strong",
  "em",
  "codespan",
  "link",
  "del",
  "html",
  "br",
  "space",
  "heading",
  "paragraph",
  "list",
  "blockquote",
  "code",
  "table",
  "hr",
  "left",
  "right",
  "center",
];

// Status strings that should use constants
const STATUS_STRINGS = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "completed",
  "error",
  "loading",
  "connecting",
  "ready",
];

interface QuoteStripState {
  inSingleQuote: boolean;
  inDoubleQuote: boolean;
  inTemplateQuote: boolean;
  isEscaped: boolean;
}

const INITIAL_QUOTE_STRIP_STATE: QuoteStripState = {
  inSingleQuote: false,
  inDoubleQuote: false,
  inTemplateQuote: false,
  isEscaped: false,
};

const stripQuotedContentAndLineComment = (
  line: string,
  previousState: QuoteStripState
): { strippedLine: string; nextState: QuoteStripState } => {
  let result = "";
  let inSingleQuote = previousState.inSingleQuote;
  let inDoubleQuote = previousState.inDoubleQuote;
  let inTemplateQuote = previousState.inTemplateQuote;
  let isEscaped = previousState.isEscaped;

  for (let i = 0; i < line.length; i += 1) {
    const current = line[i];
    const next = line[i + 1];

    if (current === undefined) {
      continue;
    }

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (current === "\\") {
      isEscaped = true;
      if (!inSingleQuote && !inDoubleQuote && !inTemplateQuote) {
        result += current;
      }
      continue;
    }

    if (inSingleQuote) {
      if (current === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (current === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (inTemplateQuote) {
      if (current === "`") {
        inTemplateQuote = false;
      }
      continue;
    }

    if (current === "/" && next === "/") {
      break;
    }

    if (current === "'") {
      inSingleQuote = true;
      continue;
    }

    if (current === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (current === "`") {
      inTemplateQuote = true;
      continue;
    }

    result += current;
  }

  return {
    strippedLine: result,
    nextState: {
      inSingleQuote,
      inDoubleQuote,
      inTemplateQuote,
      isEscaped,
    },
  };
};

function scanFile(filePath: string): void {
  if (shouldIgnore(filePath)) return;

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    let quoteStripState: QuoteStripState = INITIAL_QUOTE_STRIP_STATE;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      const strippedLineResult = stripQuotedContentAndLineComment(line, quoteStripState);
      const lineWithoutQuotedContent = strippedLineResult.strippedLine;
      quoteStripState = strippedLineResult.nextState;

      // Check for type literals: type X = "a" | "b" | "c"
      const typeLiteralMatch = trimmedLine.match(
        /^type\s+\w+\s*=\s*["']([^"']+)["'](\s*\|\s*["'][^"']+["'])+/
      );
      if (typeLiteralMatch) {
        issues.push({
          file: filePath,
          line: lineNum,
          column: line.indexOf("="),
          message: "Type literal detected - consider using a constant and deriving the type",
          severity: "high",
          category: "TYPE_LITERAL",
        });
      }

      // Check for string literals in switch/case (excluding external library types)
      const switchCaseMatch = line.match(/case\s+["']([^"']+)["']/);
      if (switchCaseMatch) {
        const literal = switchCaseMatch[1];
        if (!EXTERNAL_TYPES.includes(literal)) {
          issues.push({
            file: filePath,
            line: lineNum,
            column: line.indexOf(literal),
            message: `String literal "${literal}" in switch/case - consider using a constant`,
            severity: "high",
            category: "CONTROL_FLOW",
          });
        }
      }

      // Check for status strings in if/else chains
      for (const status of STATUS_STRINGS) {
        const statusPattern = new RegExp(
          `(===|!==|==|!=)\\s*["']${status}["']|["']${status}["']\\s*(===|!==|==|!=)`
        );
        if (statusPattern.test(line) && !line.includes("_STATUS.") && !line.includes("_STAGE.")) {
          // Skip if it's in a comment or string
          if (!line.includes("//") && !line.match(/["'].*${status}.*["']/)) {
            issues.push({
              file: filePath,
              line: lineNum,
              column: line.indexOf(status),
              message: `Status string "${status}" in control flow - use constant from constants/`,
              severity: "critical",
              category: "STATUS_STRING",
            });
          }
        }
      }

      // Check for magic numbers (non-trivial)
      const magicNumberMatch = lineWithoutQuotedContent.match(/\b([2-9]|[1-9]\d{2,})\b/);
      if (magicNumberMatch) {
        const number = magicNumberMatch[1];
        // Skip obvious cases: array indices, common patterns, config files, percentages in CSS
        const isObvious =
          /\[.*\]|\.slice\(|\.substring\(|\.substr\(|LIMIT\.|TIMEOUT\.|UI\.|PROGRESS\.|100%|width.*%|height.*%/.test(
            line
          );
        // Skip if it's in a config file (limits.ts, timeouts.ts, ui.ts)
        const isConfigFile = /(limits|timeouts|ui)\.ts$/.test(filePath);
        if (!isObvious && !isConfigFile) {
          issues.push({
            file: filePath,
            line: lineNum,
            column: line.indexOf(number),
            message: `Magic number ${number} - consider extracting to LIMIT, TIMEOUT, or UI config`,
            severity: "medium",
            category: "MAGIC_NUMBER",
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error);
  }
}

function scanDirectory(dir: string): void {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      scanFile(fullPath);
    }
  }
}

// Main execution
const srcDir = join(process.cwd(), "src");
if (statSync(srcDir).isDirectory()) {
  scanDirectory(srcDir);
}

// Report issues
if (issues.length === 0) {
  console.log("✅ No magic literals detected!");
  process.exit(0);
}

// Group by severity
const critical = issues.filter((i) => i.severity === "critical");
const high = issues.filter((i) => i.severity === "high");
const medium = issues.filter((i) => i.severity === "medium");
const low = issues.filter((i) => i.severity === "low");

console.log(`\n⚠️  Found ${issues.length} potential magic literal(s):\n`);

if (critical.length > 0) {
  console.log("🔴 Critical:");
  critical.forEach((issue) => {
    const relPath = relative(process.cwd(), issue.file);
    console.log(`  ${relPath}:${issue.line}:${issue.column} - ${issue.message}`);
  });
}

if (high.length > 0) {
  console.log("\n🟠 High:");
  high.forEach((issue) => {
    const relPath = relative(process.cwd(), issue.file);
    console.log(`  ${relPath}:${issue.line}:${issue.column} - ${issue.message}`);
  });
}

if (medium.length > 0) {
  console.log("\n🟡 Medium:");
  medium.forEach((issue) => {
    const relPath = relative(process.cwd(), issue.file);
    console.log(`  ${relPath}:${issue.line}:${issue.column} - ${issue.message}`);
  });
}

if (low.length > 0) {
  console.log("\n🟢 Low:");
  low.forEach((issue) => {
    const relPath = relative(process.cwd(), issue.file);
    console.log(`  ${relPath}:${issue.line}:${issue.column} - ${issue.message}`);
  });
}

// JSON output option
if (process.argv.includes("--json")) {
  console.log(`\n${JSON.stringify(issues, null, 2)}`);
}

// Exit codes
if (STRICT_MODE && issues.length > 0) {
  console.log("\n❌ Strict mode: failing because issues were detected");
  process.exit(1);
}

console.log("\n✅ Non-strict mode: warnings only (use --strict to fail on Critical/High)");
process.exit(0);
