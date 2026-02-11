import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { UI } from "@/config/ui";
import { type ReactNode, memo, useEffect, useState } from "react";

const ART_FILES = {
  ASCII: "toadstool-ascii.txt",
  TEXT: "toadstool-text.txt",
} as const;

type ArtFileName = (typeof ART_FILES)[keyof typeof ART_FILES];

const getCandidateAssetPaths = (fileName: ArtFileName): string[] => {
  // `toadstool` is commonly run from arbitrary project directories, so `process.cwd()`
  // is not a reliable way to locate packaged assets.
  //
  // We try:
  // - relative to the current module (works for built `dist/cli.js` -> `../public/...`)
  // - relative to source layout (works in dev from `src/ui/components/...` -> `../../../public/...`)
  // - relative to CWD as a final fallback (useful during local dev / unusual setups)
  const moduleDir = fileURLToPath(new URL(".", import.meta.url));

  return [
    join(moduleDir, "..", "public", fileName),
    join(moduleDir, "..", "..", "..", "public", fileName),
    join(process.cwd(), "public", fileName),
  ];
};

const readFirstExistingTextFile = async (fileName: ArtFileName): Promise<string> => {
  const candidates = getCandidateAssetPaths(fileName);
  for (const path of candidates) {
    try {
      await access(path);
      return await readFile(path, "utf8");
    } catch {
      // Try next candidate.
    }
  }
  throw new Error(`Asset not found: ${fileName}`);
};

const renderProgressBar = (progress: number): string => {
  const filled = Math.floor((progress / UI.PROGRESS.COMPLETE) * UI.PROGRESS_BAR_WIDTH);
  const empty = UI.PROGRESS_BAR_WIDTH - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${progress}%`;
};

/**
 * Downsample ASCII art by scale (e.g. 0.75 = 25% smaller).
 * Keeps every Nth line and every Nth character so the art file stays full-size.
 */
function scaleAsciiArt(art: string, scale: number): string {
  if (scale >= 1 || scale <= 0) return art;
  const lines = art.split("\n");
  if (lines.length === 0) return art;
  const step = 1 / scale;
  const outLines: string[] = [];
  for (let i = 0; i < lines.length; i += step) {
    const line = lines[Math.floor(i)] ?? "";
    let scaled = "";
    for (let j = 0; j < line.length; j += step) {
      scaled += line[Math.floor(j)] ?? "";
    }
    outLines.push(scaled);
  }
  return outLines.join("\n");
}

// Separate component for static content - memoized to prevent re-renders
const StaticArt = memo(
  ({ logoArt, textArt }: { logoArt: string; textArt: string }): ReactNode => {
    if (!logoArt && !textArt) return null;

    return (
      <>
        {logoArt && (
          <box flexDirection="column" alignItems="center" marginBottom={1}>
            <text>{logoArt}</text>
          </box>
        )}
        {textArt && (
          <box flexDirection="column" alignItems="center" marginBottom={2}>
            <text>{textArt}</text>
          </box>
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if logoArt or textArt actually changed
    return prevProps.logoArt === nextProps.logoArt && prevProps.textArt === nextProps.textArt;
  }
);

StaticArt.displayName = "StaticArt";

export interface LoadingScreenProps {
  progress: number;
  status?: string;
}

export function LoadingScreen({ progress, status }: LoadingScreenProps): ReactNode {
  const [logoArt, setLogoArt] = useState<string>("");
  const [textArt, setTextArt] = useState<string>("");

  // Load files in parallel
  useEffect(() => {
    void (async () => {
      try {
        const [logoContent, textContent] = await Promise.all([
          readFirstExistingTextFile(ART_FILES.ASCII),
          readFirstExistingTextFile(ART_FILES.TEXT),
        ]);

        const normalizedLogo = logoContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const trimmedLogo = normalizedLogo.replace(/\n+$/, "");
        const scaledLogo = scaleAsciiArt(trimmedLogo, UI.LOGO_DISPLAY_SCALE);
        setLogoArt(scaledLogo);

        const normalizedText = textContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const trimmedText = normalizedText.replace(/\n+$/, "");
        setTextArt(trimmedText);
      } catch {
        // Graceful degradation - show empty state if files fail to load
        setLogoArt("");
        setTextArt("");
      }
    })();
  }, []);

  const clampedProgress = Number.isFinite(progress)
    ? Math.min(UI.PROGRESS.COMPLETE, Math.max(0, Math.round(progress)))
    : 0;

  return (
    <box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      width="100%"
      paddingTop={1}
    >
      <StaticArt logoArt={logoArt} textArt={textArt} />
      <box flexDirection="column" alignItems="center">
        {status ? <text>{status}</text> : null}
        <text>{renderProgressBar(clampedProgress)}</text>
      </box>
    </box>
  );
}
