import {
  type CleanOptions,
  type CleanerTransformResult,
  cleanOptionsSchema,
} from "./tokenOptimizer.types";

export interface CleanResult {
  output: string;
  appliedTransforms: CleanerTransformResult[];
}

export interface CleanInput {
  text: string;
  options?: Partial<CleanOptions>;
}

type CleanerTransform = (text: string) => {
  output: string;
  applied: boolean;
};

const trimTransform: CleanerTransform = (text) => {
  const trimmed = text.trim();
  return {
    output: trimmed,
    applied: trimmed !== text,
  };
};

const collapseWhitespaceTransform: CleanerTransform = (text) => {
  const collapsed = text.replace(/[\t\f\v ]{2,}/g, " ");
  return {
    output: collapsed,
    applied: collapsed !== text,
  };
};

const normalizeNewlinesTransform: CleanerTransform = (text) => {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return {
    output: normalized,
    applied: normalized !== text,
  };
};

const jsonFlattenTransform: CleanerTransform = (text) => {
  try {
    const parsed = JSON.parse(text);
    const flattened = JSON.stringify(parsed);
    return {
      output: flattened,
      applied: flattened !== text,
    };
  } catch (_error) {
    return {
      output: text,
      applied: false,
    };
  }
};

const transformMap: Record<
  keyof CleanOptions,
  {
    transform: CleanerTransform;
  }
> = {
  trim: {
    transform: trimTransform,
  },
  collapseWhitespace: {
    transform: collapseWhitespaceTransform,
  },
  normalizeNewlines: {
    transform: normalizeNewlinesTransform,
  },
  jsonFlatten: {
    transform: jsonFlattenTransform,
  },
};

export const cleanPrompt = ({ text, options }: CleanInput): CleanResult => {
  const resolvedOptions = cleanOptionsSchema.parse(options ?? {});

  let current = text;
  const appliedTransforms: CleanerTransformResult[] = [];

  (Object.keys(transformMap) as Array<keyof CleanOptions>).forEach((key) => {
    const enabled = resolvedOptions[key];
    if (!enabled) {
      appliedTransforms.push({
        name: key,
        applied: false,
      });
      return;
    }

    const { transform } = transformMap[key];
    const result = transform(current);
    current = result.output;
    appliedTransforms.push({
      name: key,
      applied: result.applied,
    });
  });

  return {
    output: current,
    appliedTransforms,
  };
};
