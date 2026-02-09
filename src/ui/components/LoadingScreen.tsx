import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { UI } from "@/config/ui";
import { type ReactNode, memo, useEffect, useState } from "react";

const getAsciiArtPath = (): string => {
  return join(process.cwd(), "public", "toadstool-ascii.txt");
};

const getTextArtPath = (): string => {
  return join(process.cwd(), "public", "toadstool-text.txt");
};

const renderProgressBar = (progress: number): string => {
  const filled = Math.floor((progress / UI.PROGRESS.COMPLETE) * UI.PROGRESS_BAR_WIDTH);
  const empty = UI.PROGRESS_BAR_WIDTH - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${progress}%`;
};

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
    ? Math.min(UI.PROGRESS.COMPLETE, Math.max(0, Math.round(progress)))
    : 0;

  return (
    <box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      width="100%"
    >
      <StaticArt logoArt={logoArt} textArt={textArt} />
      <box flexDirection="column" alignItems="center">
        {status ? <text>{status}</text> : null}
        <text>{renderProgressBar(clampedProgress)}</text>
      </box>
    </box>
  );
}
