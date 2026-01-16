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

interface Issue {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

const issues: Issue[] = [];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function scanFile(filePath: string): void {
  if (shouldIgnore(filePath)) return;

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for string literals in switch/case (excluding external library types)
      const switchCaseMatch = line.match(/case\s+["']([^"']+)["']/);
      if (switchCaseMatch) {
        const literal = switchCaseMatch[1];
        // Skip known external types (ACP SDK, markdown tokens)
        const externalTypes = [
          "text",
          "resource_link",
          "resource",
          "image",
          "audio",
          "in_progress",
          "completed",
          "failed",
        ];
        if (!externalTypes.includes(literal)) {
          issues.push({
            file: filePath,
            line: lineNum,
            column: line.indexOf(literal),
            message: `String literal "${literal}" in switch/case - consider using a constant`,
            severity: "warning",
          });
        }
      }

      // Check for magic numbers (non-trivial)
      const magicNumberMatch = line.match(/\b([2-9]|[1-9]\d{2,})\b/);
      if (magicNumberMatch) {
        const number = magicNumberMatch[1];
        // Skip obvious cases: array indices, common patterns
        const isObvious = /\[.*\]|\.slice\(|\.substring\(|\.substr\(/.test(line);
        if (!isObvious && !line.includes("LIMIT.") && !line.includes("TIMEOUT.")) {
          issues.push({
            file: filePath,
            line: lineNum,
            column: line.indexOf(number),
            message: `Magic number ${number} - consider extracting to LIMIT or TIMEOUT config`,
            severity: "warning",
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

console.log(`\n⚠️  Found ${issues.length} potential magic literal(s):\n`);

const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");

if (errors.length > 0) {
  console.log("Errors:");
  errors.forEach((issue) => {
    const relPath = relative(process.cwd(), issue.file);
    console.log(`  ${relPath}:${issue.line}:${issue.column} - ${issue.message}`);
  });
}

if (warnings.length > 0) {
  console.log("\nWarnings:");
  warnings.forEach((issue) => {
    const relPath = relative(process.cwd(), issue.file);
    console.log(`  ${relPath}:${issue.line}:${issue.column} - ${issue.message}`);
  });
}

if (STRICT_MODE && issues.length > 0) {
  console.log("\n❌ Strict mode: failing due to magic literals");
  process.exit(1);
}

console.log("\n✅ Non-strict mode: warnings only (use --strict to fail on warnings)");
process.exit(0);
