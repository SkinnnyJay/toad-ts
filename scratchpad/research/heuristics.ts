// @ts-nocheck
// src/testing/validators/heuristics.ts
// Fast, deterministic validators for common code patterns
// EXPERIMENTAL: Research-only; not wired to production or CI. No network, but outputs are heuristic and untyped in places.

import * as ts from "typescript";

// ============================================
// HTML Validation
// ============================================

export interface HTMLValidationResult {
  valid: boolean;
  hasDoctype: boolean;
  hasHtml: boolean;
  hasHead: boolean;
  hasBody: boolean;
  hasTitle: boolean;
  hasViewport: boolean;
  errors: string[];
  warnings: string[];
  elementCounts: Record<string, number>;
}

export function validateHTMLStructure(html: string): HTMLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const elementCounts: Record<string, number> = {};

  // Check DOCTYPE
  const hasDoctype = /<!DOCTYPE\s+html>/i.test(html);
  if (!hasDoctype) {
    warnings.push("Missing <!DOCTYPE html> declaration");
  }

  // Simple tag matching (not a full parser, but catches obvious issues)
  const tagRegex = /<(\/?)([\w-]+)([^>]*)>/gi;
  const openTags: string[] = [];

  while (true) {
    const match = tagRegex.exec(html);
    if (!match) {
      break;
    }
    const isClosing = match[1] === "/";
    const tagName = match[2].toLowerCase();

    // Count elements
    if (!isClosing) {
      elementCounts[tagName] = (elementCounts[tagName] || 0) + 1;
    }

    // Skip self-closing/void elements
    const voidElements = [
      "img",
      "br",
      "hr",
      "input",
      "meta",
      "link",
      "area",
      "base",
      "col",
      "embed",
      "param",
      "source",
      "track",
      "wbr",
    ];
    if (voidElements.includes(tagName)) continue;

    if (isClosing) {
      const lastOpen = openTags.pop();
      if (lastOpen !== tagName) {
        errors.push(`Mismatched tag: expected </${lastOpen}>, found </${tagName}>`);
        // Try to recover
        if (openTags.includes(tagName)) {
          while (openTags.length && openTags[openTags.length - 1] !== tagName) {
            openTags.pop();
          }
          openTags.pop();
        }
      }
    } else {
      openTags.push(tagName);
    }
  }

  if (openTags.length > 0) {
    errors.push(`Unclosed tags: ${openTags.join(", ")}`);
  }

  // Check for essential elements
  const hasHtml = (elementCounts.html || 0) > 0;
  const hasHead = (elementCounts.head || 0) > 0;
  const hasBody = (elementCounts.body || 0) > 0;
  const hasTitle = (elementCounts.title || 0) > 0;

  if (!hasHtml) errors.push("Missing <html> element");
  if (!hasHead) errors.push("Missing <head> element");
  if (!hasBody) errors.push("Missing <body> element");
  if (!hasTitle) warnings.push("Missing <title> element");

  // Check for viewport meta
  const hasViewport = /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html);
  if (!hasViewport) {
    warnings.push("Missing viewport meta tag for responsive design");
  }

  return {
    valid: errors.length === 0,
    hasDoctype,
    hasHtml,
    hasHead,
    hasBody,
    hasTitle,
    hasViewport,
    errors,
    warnings,
    elementCounts,
  };
}

// ============================================
// TypeScript Validation
// ============================================

export interface TypeScriptValidationResult {
  valid: boolean;
  errors: ts.Diagnostic[];
  errorMessages: string[];
  syntaxValid: boolean;
  hasTypes: boolean;
}

export function validateTypeScript(
  code: string,
  filename = "check.ts"
): TypeScriptValidationResult {
  // Check if code has TypeScript features
  const hasTypes =
    /:\s*(string|number|boolean|any|void|object|\{|Array|Promise|\[)/i.test(code) ||
    /interface\s+\w+/.test(code) ||
    /type\s+\w+\s*=/.test(code) ||
    /<\w+>/.test(code); // Generics

  // Parse the source file
  const sourceFile = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  // Check for syntax errors (parseDiagnostics)
  // biome-ignore lint/suspicious/noExplicitAny: research helper tolerates loose parsing
  const syntaxErrors = (sourceFile as any).parseDiagnostics || [];
  const syntaxValid = syntaxErrors.length === 0;

  // For full type checking, we'd need a proper compiler host
  // This is a simplified version that catches obvious issues
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    // Don't require react types for basic validation
    types: [],
  };

  // Create minimal compiler host
  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile;

  host.getSourceFile = (name, languageVersion) => {
    if (name === filename) return sourceFile;
    // Return empty file for missing modules to avoid errors
    if (name.includes("node_modules")) {
      return ts.createSourceFile(name, "", languageVersion);
    }
    return originalGetSourceFile(name, languageVersion);
  };

  host.fileExists = (name) => name === filename;
  host.readFile = (name) => (name === filename ? code : undefined);

  const program = ts.createProgram([filename], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  // Filter out "cannot find module" errors since we're not in a real project
  const relevantDiagnostics = diagnostics.filter((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
    return (
      !msg.includes("Cannot find module") &&
      !msg.includes("Could not find a declaration file") &&
      !msg.includes("Cannot find name 'React'")
    );
  });

  return {
    valid: relevantDiagnostics.length === 0 && syntaxValid,
    errors: [...relevantDiagnostics],
    errorMessages: relevantDiagnostics.map((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, "\n")
    ),
    syntaxValid,
    hasTypes,
  };
}

// ============================================
// JavaScript Validation
// ============================================

export interface JavaScriptValidationResult {
  valid: boolean;
  syntaxValid: boolean;
  errors: string[];
}

export function validateJavaScript(code: string): JavaScriptValidationResult {
  const errors: string[] = [];

  try {
    // Use TypeScript parser in JS mode for better error messages
    const sourceFile = ts.createSourceFile(
      "check.js",
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS
    );

    // biome-ignore lint/suspicious/noExplicitAny: research helper tolerates loose parsing
    const syntaxErrors = (sourceFile as any).parseDiagnostics || [];

    for (const error of syntaxErrors) {
      errors.push(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
    }

    return {
      valid: errors.length === 0,
      syntaxValid: errors.length === 0,
      errors,
    };
  } catch (e) {
    return {
      valid: false,
      syntaxValid: false,
      errors: [String(e)],
    };
  }
}

// ============================================
// JSON Validation
// ============================================

export interface JSONValidationResult {
  valid: boolean;
  error?: string;
  parsed?: unknown;
}

export function validateJSON(str: string): JSONValidationResult {
  try {
    const parsed = JSON.parse(str);
    return { valid: true, parsed };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof SyntaxError ? e.message : String(e),
    };
  }
}

// ============================================
// CSS Validation (Basic)
// ============================================

export interface CSSValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  ruleCount: number;
  selectorCount: number;
}

export function validateCSS(css: string): CSSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Remove comments
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

  // Count braces
  const openBraces = (cssNoComments.match(/\{/g) || []).length;
  const closeBraces = (cssNoComments.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} '{' vs ${closeBraces} '}'`);
  }

  // Count rules (rough approximation)
  const ruleMatches = cssNoComments.match(/[^{}]+\{[^{}]*\}/g) || [];
  const ruleCount = ruleMatches.length;

  // Count selectors
  const selectorMatches = cssNoComments.match(/[^{},]+(?=\s*[{,])/g) || [];
  const selectorCount = selectorMatches.length;

  // Check for common issues
  if (cssNoComments.includes("!importantimportant")) {
    warnings.push("Double !important detected");
  }

  // Check for unclosed strings
  const stringMatches = cssNoComments.match(/["'][^"']*$/);
  if (stringMatches) {
    errors.push("Unclosed string detected");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    ruleCount,
    selectorCount,
  };
}

// ============================================
// Code Pattern Detection
// ============================================

export interface PatternCheckResult {
  found: boolean;
  matches: string[];
  count: number;
}

export function checkPattern(code: string, pattern: RegExp): PatternCheckResult {
  const matches = code.match(pattern) || [];
  return {
    found: matches.length > 0,
    matches,
    count: matches.length,
  };
}

export const patterns = {
  // JavaScript/TypeScript patterns
  asyncFunction: /async\s+function|\basync\s*\(/g,
  arrowFunction: /=>\s*[{(]/g,
  classDefinition: /class\s+\w+/g,
  exportStatement: /export\s+(default\s+)?/g,
  importStatement: /import\s+.+\s+from/g,

  // React patterns
  useStateHook: /useState\s*[<(]/g,
  useEffectHook: /useEffect\s*\(/g,
  componentDefinition: /(?:function|const)\s+\w+\s*[=:]\s*(?:\([^)]*\)|React\.FC)/g,
  jsxElement: /<[A-Z]\w*[^>]*>/g,

  // Error handling patterns
  tryCatch: /try\s*\{[\s\S]*?\}\s*catch/g,
  throwStatement: /throw\s+/g,

  // TypeScript patterns
  interfaceDefinition: /interface\s+\w+/g,
  typeDefinition: /type\s+\w+\s*=/g,
  genericType: /<\w+(?:\s*,\s*\w+)*>/g,
};

// ============================================
// Complexity Metrics
// ============================================

export interface ComplexityMetrics {
  lines: number;
  nonEmptyLines: number;
  functions: number;
  classes: number;
  imports: number;
  exports: number;
  cyclomaticComplexity: number;
}

export function measureComplexity(code: string): ComplexityMetrics {
  const lines = code.split("\n");
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);

  // Count structures
  const functions = (code.match(/function\s+\w+|=>\s*[{(]|async\s+function/g) || []).length;
  const classes = (code.match(/class\s+\w+/g) || []).length;
  const imports = (code.match(/import\s+/g) || []).length;
  const exports = (code.match(/export\s+/g) || []).length;

  // Simplified cyclomatic complexity
  // Count decision points: if, else, for, while, case, catch, &&, ||, ?:
  const decisionPoints = (
    code.match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bcase\b|\bcatch\b|&&|\|\||\?[^:?]/g) || []
  ).length;

  return {
    lines: lines.length,
    nonEmptyLines: nonEmptyLines.length,
    functions,
    classes,
    imports,
    exports,
    cyclomaticComplexity: decisionPoints + 1,
  };
}

// ============================================
// Convenience Validators
// ============================================

export function isValidCode(code: string, language: string): boolean {
  switch (language.toLowerCase()) {
    case "typescript":
    case "ts":
    case "tsx":
      return validateTypeScript(code).syntaxValid;
    case "javascript":
    case "js":
    case "jsx":
      return validateJavaScript(code).syntaxValid;
    case "json":
      return validateJSON(code).valid;
    case "css":
      return validateCSS(code).valid;
    case "html":
      return validateHTMLStructure(code).valid;
    default:
      return true; // Unknown languages pass by default
  }
}

export function hasRequiredElements(
  code: string,
  required: string[]
): { allPresent: boolean; missing: string[]; found: string[] } {
  const found: string[] = [];
  const missing: string[] = [];

  for (const req of required) {
    if (code.toLowerCase().includes(req.toLowerCase())) {
      found.push(req);
    } else {
      missing.push(req);
    }
  }

  return {
    allPresent: missing.length === 0,
    missing,
    found,
  };
}
