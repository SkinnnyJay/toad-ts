import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";

// Resolve path relative to project root (where CLI is executed from)
const getAsciiArtPath = (): string => {
  return join(process.cwd(), "public", "toadstool-ascii.txt");
};

const getTextArtPath = (): string => {
  return join(process.cwd(), "public", "toadstool-text.txt");
};

let cachedArt: string | null = null;
let cachedText: string | null = null;

// Reduce ASCII art to 25% size (reduce by 75%) using hybrid 2x4 block-based sampling
// Uses 2 lines x 4 characters to better preserve vertical detail (like eyes)
// Preserves leading whitespace to maintain alignment
const reduceAsciiArt = (art: string): string => {
  // Split lines but preserve all lines (including empty ones) and leading whitespace
  const lines = art.split("\n");
  const reducedLines: string[] = [];

  // Process in 2x4 blocks (take every 2nd line, every 4th character)
  // This gives 50% height x 25% width = 12.5% area, but preserves vertical features better
  // Actually, let's use 2x2 for better detail: 50% height x 50% width = 25% area
  for (let i = 0; i < lines.length; i += 2) {
    const line1 = lines[i];
    const line2 = lines[i + 1];

    if (line1 === undefined) {
      // Handle remaining lines
      if (i < lines.length) {
        const lastLine = lines[lines.length - 1];
        if (lastLine !== undefined) {
          let reducedLine = "";
          for (let j = 0; j < lastLine.length; j += 2) {
            reducedLine += lastLine[j] ?? " ";
          }
          reducedLines.push(reducedLine);
        }
      }
      break;
    }

    // Preserve ALL characters including leading whitespace - process every 2nd character
    let reducedLine = "";
    const maxWidth = Math.max(line1.length, line2?.length ?? 0);

    // Process characters in 2x2 blocks - preserves vertical detail better
    for (let j = 0; j < maxWidth; j += 2) {
      const char1 = line1[j];
      const char2 = line1[j + 1];
      const char3 = line2?.[j];
      const char4 = line2?.[j + 1];

      // Collect all characters from the 2x2 block
      const chars = [char1, char2, char3, char4].filter((c) => c !== undefined);
      if (chars.length === 0) {
        reducedLine += " ";
        continue;
      }

      // Check if all are spaces - preserve space for alignment
      const allSpaces = chars.every((c) => c === " " || c === undefined);
      if (allSpaces) {
        reducedLine += " ";
        continue;
      }

      // Select the most prominent character from the 2x2 block
      // Strongly prioritize dark characters (▓) to preserve eyes and details
      let selected = chars[0] ?? " ";
      let hasDark = false;
      for (const char of chars) {
        if (!char || char === " ") continue;
        if (char === "▓") {
          selected = char;
          hasDark = true;
          break; // Immediately use dark character if found
        }
      }

      // If no dark character found, select the most prominent
      if (!hasDark) {
        for (const char of chars) {
          if (!char || char === " ") continue;
          if (char === "▒" && selected !== "▓") {
            selected = char;
          } else if (char === "░" && selected === " ") {
            selected = char;
          }
        }
      }

      reducedLine += selected;
    }

    reducedLines.push(reducedLine);
  }

  return reducedLines.join("\n");
};

export function AsciiBanner(): JSX.Element {
  const [_mushroomArt, setMushroomArt] = useState<string>("");
  const [textArt, setTextArt] = useState<string>("");

  useEffect(() => {
    void (async () => {
      // Load mushroom art (hidden for now, but keeping code for future use)
      if (!cachedArt) {
        try {
          const content = await readFile(getAsciiArtPath(), "utf8");
          // Preserve original structure - only trim trailing newlines, not leading whitespace
          const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          const trimmed = normalized.replace(/\n+$/, "");
          // Reduce to 25% size (2x2 blocks) while preserving detail and alignment, prioritizing dark features
          const reduced = reduceAsciiArt(trimmed);
          cachedArt = reduced;
          setMushroomArt(reduced);
        } catch {
          setMushroomArt("");
        }
      } else {
        setMushroomArt(cachedArt);
      }

      // Load text art
      if (!cachedText) {
        try {
          const textContent = await readFile(getTextArtPath(), "utf8");
          const normalized = textContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          const trimmed = normalized.replace(/\n+$/, "");
          cachedText = trimmed;
          setTextArt(trimmed);
        } catch {
          setTextArt("");
        }
      } else {
        setTextArt(cachedText);
      }
    })();
  }, []);

  if (!textArt) return <></>;

  return (
    <Box flexDirection="column" paddingY={1}>
      {textArt && (
        <Box>
          <Text>{textArt}</Text>
        </Box>
      )}
    </Box>
  );
}
