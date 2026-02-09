/* eslint-disable no-control-regex */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI stripping is intentional
const ANSI_REGEX = /\u001B\[[0-9;]*m/g;
const removeAnsi = (text: string): string => text.replace(ANSI_REGEX, "");

export interface LLMValidationContext {
  output: string;
  expected?: string;
  facts?: string[];
  allowlist?: string[];
  blocklist?: string[];
}

export interface LLMValidationCriterion {
  id: string;
  description: string;
  weight?: number;
  evaluator: (context: LLMValidationContext) => number;
}

export interface LLMValidationScore {
  id: string;
  description: string;
  weight: number;
  score: number;
}

export interface LLMValidationConfig {
  threshold: number;
}

export interface LLMValidationResult {
  passed: boolean;
  score: number;
  scores: LLMValidationScore[];
}

const clampScore = (value: number): number => {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
};

const normalize = (text: string): string => {
  const withoutAnsi = removeAnsi(text);
  return withoutAnsi.trim().replace(/\s+/g, " ").toLowerCase();
};

export const evaluateCriteria = (
  criteria: LLMValidationCriterion[],
  context: LLMValidationContext
): LLMValidationScore[] => {
  return criteria.map((criterion) => {
    const weight = criterion.weight ?? 1;
    const rawScore = criterion.evaluator(context);
    return {
      id: criterion.id,
      description: criterion.description,
      weight,
      score: clampScore(rawScore),
    } satisfies LLMValidationScore;
  });
};

export const aggregateScores = (scores: LLMValidationScore[]): number => {
  const totals = scores.reduce(
    (acc, current) => {
      acc.weight += current.weight;
      acc.weightedScore += current.weight * current.score;
      return acc;
    },
    { weight: 0, weightedScore: 0 }
  );

  if (totals.weight === 0) {
    return 1;
  }

  return totals.weightedScore / totals.weight;
};

export const validateLLMOutput = (
  criteria: LLMValidationCriterion[],
  context: LLMValidationContext,
  config: LLMValidationConfig
): LLMValidationResult => {
  const scores = evaluateCriteria(criteria, context);
  const score = aggregateScores(scores);
  return {
    passed: score >= config.threshold,
    score,
    scores,
  };
};

export class LLMValidationError extends Error {
  constructor(public readonly result: LLMValidationResult) {
    super("LLM validation failed");
    this.name = "LLMValidationError";
  }
}

export const assertLLMOutput = (
  criteria: LLMValidationCriterion[],
  context: LLMValidationContext,
  config: LLMValidationConfig
): LLMValidationResult => {
  const result = validateLLMOutput(criteria, context, config);
  if (!result.passed) {
    throw new LLMValidationError(result);
  }
  return result;
};

export const exactMatchCriterion = (
  description = "Expected text matches",
  weight = 1
): LLMValidationCriterion => ({
  id: "exact-match",
  description,
  weight,
  evaluator: (context) => {
    if (!context.expected) return 0;
    return normalize(context.output) === normalize(context.expected) ? 1 : 0;
  },
});

export const blocklistCriterion = (
  blocklist: string[],
  description = "Blocklisted phrases are absent",
  weight = 1
): LLMValidationCriterion => ({
  id: "blocklist",
  description,
  weight,
  evaluator: (context) => {
    const loweredOutput = normalize(context.output);
    const hasBlocked = blocklist.some((entry) => loweredOutput.includes(entry.toLowerCase()));
    return hasBlocked ? 0 : 1;
  },
});

export const containsFactsCriterion = (
  facts: string[],
  description = "Output references required facts",
  weight = 1
): LLMValidationCriterion => ({
  id: "facts",
  description,
  weight,
  evaluator: (context) => {
    if (facts.length === 0) return 1;
    const loweredOutput = normalize(context.output);
    const covered = facts.filter((fact) => loweredOutput.includes(fact.toLowerCase())).length;
    return covered / facts.length;
  },
});
