import Papa from "papaparse";

import type { OptimizationRequest } from "../tokenOptimizer.types";
import { type CsvOptimizationPayload, csvOptimizationPayloadSchema } from "../tokenOptimizer.types";
import { CompressionTypeEnum } from "../types";
import type { CompressionOutcome, CompressionStrategy } from "./base";

type CsvRow = readonly unknown[];

const sanitizeCell = (cell: unknown): string => {
  if (cell === null || cell === undefined) {
    return "";
  }

  return String(cell).trim();
};

const normalizeRows = (rows: CsvRow[]): string[][] =>
  rows.filter((row) => Array.isArray(row)).map((row) => (row as unknown[]).map(sanitizeCell));

const collectCsvStats = (rows: string[][], delimiter: string): CsvOptimizationPayload => {
  const rowCount = rows.length;
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  let emptyCellCount = 0;

  rows.forEach((row) => {
    row.forEach((cell) => {
      if (cell === "") {
        emptyCellCount += 1;
      }
    });
  });

  return csvOptimizationPayloadSchema.parse({
    rowCount,
    columnCount,
    emptyCellCount,
    delimiter,
  });
};

export class CsvCompressionStrategy implements CompressionStrategy {
  public readonly type = CompressionTypeEnum.CSV;

  public format(cleanedInput: string, _request: OptimizationRequest): CompressionOutcome {
    const parseResult = Papa.parse(cleanedInput, {
      skipEmptyLines: "greedy",
      delimiter: ",",
      dynamicTyping: false,
    });

    if (parseResult.errors.length > 0) {
      throw new Error("Invalid CSV input provided to CsvCompressionStrategy.");
    }

    const rows = normalizeRows(parseResult.data as CsvRow[]);
    const delimiter = parseResult.meta.delimiter || ",";
    const normalized = Papa.unparse(rows, {
      delimiter,
      newline: "\n",
      quotes: false,
      skipEmptyLines: true,
    });

    const trimmed = normalized.trim();
    const payload = collectCsvStats(rows, delimiter);

    return {
      optimizedText: trimmed,
      optimizedPayload: payload,
    };
  }
}
