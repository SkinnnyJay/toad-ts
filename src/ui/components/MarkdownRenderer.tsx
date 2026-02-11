import { FULL_WIDTH_STYLE } from "@/config/ui";
import { SyntaxStyle } from "@opentui/core";
import { type ReactNode, memo, useMemo } from "react";

interface MarkdownRendererProps {
  markdown: string;
  streaming?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  markdown,
  streaming = false,
}: MarkdownRendererProps): ReactNode {
  const syntaxStyle = useMemo(() => SyntaxStyle.create(), []);

  return (
    <markdown
      content={markdown}
      streaming={streaming}
      syntaxStyle={syntaxStyle}
      conceal={true}
      style={FULL_WIDTH_STYLE}
    />
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
