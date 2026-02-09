import { SyntaxStyle } from "@opentui/core";
import { memo, useMemo } from "react";

interface MarkdownRendererProps {
  markdown: string;
  streaming?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  markdown,
  streaming = false,
}: MarkdownRendererProps): JSX.Element {
  const syntaxStyle = useMemo(() => SyntaxStyle.create(), []);

  return (
    <markdown
      content={markdown}
      streaming={streaming}
      syntaxStyle={syntaxStyle}
      conceal={true}
      style={{ width: "100%" }}
    />
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
