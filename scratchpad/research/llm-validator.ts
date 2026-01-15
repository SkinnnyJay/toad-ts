// src/testing/validators/llm-validator.ts
// Production-ready LLM-based validation for AI-generated code
// EXPERIMENTAL: Requires an ACP agent (for example, Claude CLI) and network access.

import { ACPConnection } from "@/core/acp-connection";
import { z } from "zod";

// ============================================
// Validation Result Schemas
// ============================================

const ValidationCriterionResultSchema = z.object({
  criterion: z.string(),
  passed: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
});

const ValidationResultSchema = z.object({
  score: z.number().min(0).max(1),
  passed: z.array(ValidationCriterionResultSchema),
  failed: z.array(ValidationCriterionResultSchema),
  summary: z.string(),
  suggestions: z.array(z.string()),
});

export type ValidationCriterionResult = z.infer<typeof ValidationCriterionResultSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ============================================
// Request Types
// ============================================

export interface CodeValidationRequest {
  /** The original prompt/instructions given to generate this code */
  originalPrompt: string;

  /** The generated code/content to validate */
  generatedOutput: string;

  /** Language of the code (for syntax-specific checks) */
  language?: string;

  /** Specific criteria to evaluate against */
  criteria: string[];

  /** Additional context about the project/requirements */
  context?: string;

  /** Expected outputs or behaviors */
  expectedBehavior?: string;
}

export interface MultiFileValidationRequest {
  /** The original prompt/instructions */
  originalPrompt: string;

  /** Files generated */
  files: Array<{
    path: string;
    content: string;
    language?: string;
  }>;

  /** Criteria to evaluate */
  criteria: string[];

  /** Project structure expectations */
  expectedStructure?: string[];
}

export interface BehaviorValidationRequest {
  /** Description of what the code should do */
  expectedBehavior: string;

  /** Actual output/behavior observed */
  actualBehavior: string;

  /** The code that produced the behavior */
  code?: string;

  /** Tolerance for deviations */
  strictness?: "strict" | "moderate" | "lenient";
}

// ============================================
// LLM Validator Class
// ============================================

export class LLMValidator {
  private connection: ACPConnection;
  private model: string;

  constructor(options?: { model?: string }) {
    this.connection = new ACPConnection({ command: "claude --experimental-acp" });
    this.model = options?.model ?? "claude-sonnet-4-20250514";
  }

  // ------------------------------------------
  // Primary Validation Methods
  // ------------------------------------------

  /**
   * Validate generated code against criteria
   */
  async validateCode(request: CodeValidationRequest): Promise<ValidationResult> {
    const systemPrompt = this.buildCodeValidationSystemPrompt();
    const userPrompt = this.buildCodeValidationUserPrompt(request);

    return this.executeValidation(systemPrompt, userPrompt);
  }

  /**
   * Validate a multi-file project
   */
  async validateProject(request: MultiFileValidationRequest): Promise<
    ValidationResult & {
      fileAnalysis: Record<string, { quality: number; issues: string[] }>;
    }
  > {
    const systemPrompt = this.buildProjectValidationSystemPrompt();
    const userPrompt = this.buildProjectValidationUserPrompt(request);

    const baseResult = await this.executeValidation(systemPrompt, userPrompt);

    // Analyze each file individually
    const fileAnalysis: Record<string, { quality: number; issues: string[] }> = {};

    for (const file of request.files) {
      const fileResult = await this.validateCode({
        originalPrompt: `File: ${file.path}`,
        generatedOutput: file.content,
        language: file.language,
        criteria: ["Code is syntactically correct", "No obvious bugs", "Follows conventions"],
      });

      fileAnalysis[file.path] = {
        quality: fileResult.score,
        issues: fileResult.failed.map((f) => f.criterion),
      };
    }

    return { ...baseResult, fileAnalysis };
  }

  /**
   * Validate actual vs expected behavior
   */
  async validateBehavior(request: BehaviorValidationRequest): Promise<{
    matches: boolean;
    similarity: number;
    differences: string[];
    reasoning: string;
  }> {
    const userPrompt = `
Compare the expected behavior to the actual behavior and determine if they match.

## Expected Behavior
${request.expectedBehavior}

## Actual Behavior
${request.actualBehavior}

${request.code ? `## Code\n\`\`\`\n${request.code}\n\`\`\`` : ""}

Strictness level: ${request.strictness ?? "moderate"}

Respond with JSON only:
{
  "matches": boolean,
  "similarity": number (0-1),
  "differences": string[],
  "reasoning": string
}
        `.trim();

    const text = await this.requestText(
      "You are a behavior validation expert. Compare expected and actual behaviors objectively.",
      userPrompt
    );

    return this.parseJsonResponse(text);
  }

  /**
   * Quick validation for simple criteria
   */
  async quickCheck(
    content: string,
    criteria: string[]
  ): Promise<{ passed: boolean; results: Array<{ criterion: string; passed: boolean }> }> {
    const results: Array<{ criterion: string; passed: boolean }> = [];

    const userPrompt = `
Check if this content meets each criterion. Answer with JSON array of {criterion, passed} objects.

Content:
\`\`\`
${content.slice(0, 10000)}
\`\`\`

Criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Respond with JSON only: [{"criterion": string, "passed": boolean}, ...]
        `.trim();

    const text = await this.requestText(
      "You are a strict validator. Respond ONLY with valid JSON matching the schema.",
      userPrompt
    );

    const parsed = this.parseJsonResponse<Array<{ criterion: string; passed: boolean }>>(text);
    return {
      passed: parsed.every((r) => r.passed),
      results: parsed,
    };
  }

  // ------------------------------------------
  // Specialized Validators
  // ------------------------------------------

  /**
   * Validate HTML structure and content
   */
  async validateHTML(request: {
    html: string;
    requirements: string[];
    checkAccessibility?: boolean;
  }): Promise<ValidationResult & { accessibility?: { score: number; issues: string[] } }> {
    const criteria = [
      ...request.requirements,
      "Valid HTML5 structure",
      "Proper use of semantic elements",
      "No broken or malformed tags",
    ];

    if (request.checkAccessibility) {
      criteria.push(
        "Has proper heading hierarchy",
        "Images have alt text where appropriate",
        "Form inputs have labels",
        "Color contrast appears adequate"
      );
    }

    const result = await this.validateCode({
      originalPrompt: "HTML document validation",
      generatedOutput: request.html,
      language: "html",
      criteria,
    });

    if (request.checkAccessibility) {
      const a11yResult = await this.quickCheck(request.html, [
        "Has proper heading hierarchy (h1 before h2, etc.)",
        "Images have meaningful alt attributes",
        "Form inputs are associated with labels",
        "Interactive elements are keyboard accessible",
      ]);

      return {
        ...result,
        accessibility: {
          score: a11yResult.results.filter((r) => r.passed).length / a11yResult.results.length,
          issues: a11yResult.results.filter((r) => !r.passed).map((r) => r.criterion),
        },
      };
    }

    return result;
  }

  /**
   * Validate React/TypeScript component
   */
  async validateReactComponent(request: {
    code: string;
    componentName: string;
    expectedProps?: string[];
    expectedBehaviors?: string[];
  }): Promise<ValidationResult> {
    const criteria = [
      "Valid React functional component syntax",
      "Proper TypeScript types are defined",
      "Component is properly exported",
      `Component name matches: ${request.componentName}`,
    ];

    if (request.expectedProps) {
      criteria.push(...request.expectedProps.map((p) => `Has prop: ${p}`));
    }

    if (request.expectedBehaviors) {
      criteria.push(...request.expectedBehaviors);
    }

    return this.validateCode({
      originalPrompt: `React component: ${request.componentName}`,
      generatedOutput: request.code,
      language: "typescript",
      criteria,
    });
  }

  // ------------------------------------------
  // Private Helpers
  // ------------------------------------------

  private buildCodeValidationSystemPrompt(): string {
    return `
You are an expert code validator. Your task is to evaluate generated code against specific criteria.

For each criterion:
1. Determine if it's met (passed: true/false)
2. Assign a confidence level (0-1)
3. Provide brief evidence for your assessment

Be strict but fair:
- Score 0.9-1.0: Excellent, meets all requirements professionally
- Score 0.7-0.89: Good, minor issues but functional
- Score 0.5-0.69: Acceptable, has notable issues
- Score 0.3-0.49: Poor, significant problems
- Score 0-0.29: Failing, does not meet requirements

Always respond with valid JSON matching this schema:
{
  "score": number,
  "passed": [{ "criterion": string, "passed": true, "confidence": number, "evidence": string }],
  "failed": [{ "criterion": string, "passed": false, "confidence": number, "evidence": string }],
  "summary": string,
  "suggestions": string[]
}
    `.trim();
  }

  private buildCodeValidationUserPrompt(request: CodeValidationRequest): string {
    return `
## Original Instructions
${request.originalPrompt}

## Generated Code
\`\`\`${request.language ?? ""}
${request.generatedOutput}
\`\`\`

${request.context ? `## Additional Context\n${request.context}` : ""}

${request.expectedBehavior ? `## Expected Behavior\n${request.expectedBehavior}` : ""}

## Criteria to Evaluate
${request.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Evaluate the generated code against all criteria. Respond with JSON only.
    `.trim();
  }

  private buildProjectValidationSystemPrompt(): string {
    return `
You are an expert software project validator. Evaluate multi-file projects for:
- Overall structure and organization
- Code quality and consistency
- Completeness relative to requirements
- Best practices adherence

Respond with JSON matching the validation result schema.
    `.trim();
  }

  private buildProjectValidationUserPrompt(request: MultiFileValidationRequest): string {
    const filesContent = request.files
      .map((f) => `### ${f.path}\n\`\`\`${f.language ?? ""}\n${f.content}\n\`\`\``)
      .join("\n\n");

    return `
## Original Instructions
${request.originalPrompt}

## Generated Files
${filesContent}

${request.expectedStructure ? `## Expected Structure\n${request.expectedStructure.join("\n")}` : ""}

## Criteria to Evaluate
${request.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Evaluate the project against all criteria. Respond with JSON only.
    `.trim();
  }

  private async executeValidation(
    systemPrompt: string,
    userPrompt: string
  ): Promise<ValidationResult> {
    const text = await this.requestText(systemPrompt, userPrompt);

    return this.parseJsonResponse(text, ValidationResultSchema);
  }

  private async requestText(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.connection.sendPrompt({
      system: systemPrompt,
      content: [{ type: "text", text: userPrompt }],
      model: this.model,
    });

    return response.text ?? "";
  }

  private parseJsonResponse<T>(text: string, schema?: z.ZodSchema<T>): T {

    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) ??
      text.match(/```\s*([\s\S]*?)\s*```/) ??
      text.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new Error(`Failed to extract JSON from response: ${text.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[1]);

    if (schema) {
      return schema.parse(parsed);
    }

    return parsed;
  }
}

// ============================================
// Convenience Functions
// ============================================

let defaultValidator: LLMValidator | null = null;

export function getValidator(): LLMValidator {
  if (!defaultValidator) {
    defaultValidator = new LLMValidator();
  }
  return defaultValidator;
}

export async function validateCode(
  code: string,
  criteria: string[],
  options?: { prompt?: string; language?: string }
): Promise<ValidationResult> {
  return getValidator().validateCode({
    originalPrompt: options?.prompt ?? "Code validation",
    generatedOutput: code,
    language: options?.language,
    criteria,
  });
}

export async function quickValidate(content: string, criteria: string[]): Promise<boolean> {
  const result = await getValidator().quickCheck(content, criteria);
  return result.passed;
}
