import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Box, Text } from "ink";
import { memo, useEffect, useState } from "react";

const PROGRESS_BAR_WIDTH = 40;

const getAsciiArtPath = (): string => {
  return join(process.cwd(), "public", "toadstool-ascii.txt");
};

const getTextArtPath = (): string => {
  return join(process.cwd(), "public", "toadstool-text.txt");
};

const renderProgressBar = (progress: number): string => {
  const filled = Math.floor((progress / 100) * PROGRESS_BAR_WIDTH);
  const empty = PROGRESS_BAR_WIDTH - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${progress}%`;
};

// Separate component for static content - memoized to prevent re-renders
const StaticArt = memo(
  ({ logoArt, textArt }: { logoArt: string; textArt: string }): JSX.Element | null => {
    if (!logoArt && !textArt) return null;

    return (
      <>
        {logoArt && (
          <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Text>{logoArt}</Text>
          </Box>
        )}
        {textArt && (
          <Box flexDirection="column" alignItems="center" marginBottom={2}>
            <Text>{textArt}</Text>
          </Box>
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

export function LoadingScreen({ progress, status }: LoadingScreenProps): JSX.Element {
  const [logoArt, setLogoArt] = useState<string>("");
  const [textArt, setTextArt] = useState<string>("");

  // Load files in parallel
  useEffect(() => {
    void (async () => {
      try {
        const [logoContent, textContent] = await Promise.all([
          readFile(getAsciiArtPath(), "utf8"),
          readFile(getTextArtPath(), "utf8"),
        ]);

        const normalizedLogo = logoContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const trimmedLogo = normalizedLogo.replace(/\n+$/, "");
        setLogoArt(trimmedLogo);

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
    ? Math.min(100, Math.max(0, Math.round(progress)))
    : 0;

  return (
    <Box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      width="100%"
    >
      <StaticArt logoArt={logoArt} textArt={textArt} />
      <Box flexDirection="column" alignItems="center">
        {status ? <Text>{status}</Text> : null}
        <Text>{renderProgressBar(clampedProgress)}</Text>
      </Box>
    </Box>
  );
}
