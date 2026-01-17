import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { COLOR } from "@/constants/colors";
import ignore from "ignore";
import { Box, Text, useInput, useStdout } from "ink";
import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "./ScrollArea";

interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileTreeNode[];
}

interface FileTreeProps {
  rootPath?: string;
  isFocused?: boolean;
  height?: number;
  textSize?: "small" | "normal" | number;
}

const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
  return [...nodes].sort((a, b) => {
    if (a.isDir !== b.isDir) {
      return a.isDir ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
};

const toPosix = (value: string): string => value.split(path.sep).join("/");

// Helper function to truncate filename with ellipsis
// Ensures the result never exceeds maxLength
const truncateFileName = (name: string, maxLength: number): string => {
  if (maxLength <= 0) return "…";
  if (name.length <= maxLength) return name;
  // Ensure we leave room for ellipsis (1 char)
  const truncateAt = Math.max(1, maxLength - 1);
  return `${name.slice(0, truncateAt)}…`;
};

const createIgnoreFilter = async (rootPath: string): Promise<(relativePath: string) => boolean> => {
  const ig = ignore();
  ig.add([".git", "node_modules"]);

  try {
    const gitignoreContents = await readFile(path.join(rootPath, ".gitignore"), "utf8");
    ig.add(gitignoreContents);
  } catch (_error) {
    // Ignore missing or unreadable .gitignore
  }

  return (relativePath: string): boolean => {
    if (!relativePath) return false;
    return ig.ignores(toPosix(relativePath)) || ig.ignores(`${toPosix(relativePath)}/`);
  };
};

const buildTree = async (
  rootPath: string,
  shouldIgnore: (relativePath: string) => boolean
): Promise<FileTreeNode[]> => {
  const walk = async (dir: string): Promise<FileTreeNode[]> => {
    const dirents = await readdir(dir, { withFileTypes: true });
    const children: FileTreeNode[] = [];

    for (const dirent of dirents) {
      const fullPath = path.join(dir, dirent.name);
      const relativePath = path.relative(rootPath, fullPath) || dirent.name;
      if (shouldIgnore(relativePath)) {
        continue;
      }

      if (dirent.isDirectory()) {
        const nested = await walk(fullPath);
        children.push({ name: dirent.name, path: fullPath, isDir: true, children: nested });
      } else {
        children.push({ name: dirent.name, path: fullPath, isDir: false });
      }
    }

    return sortNodes(children);
  };

  return walk(rootPath);
};

export function FileTree({
  rootPath = process.cwd(),
  isFocused = true,
  height,
  textSize = "normal",
}: FileTreeProps): JSX.Element {
  const { stdout } = useStdout();
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const shouldIgnore = await createIgnoreFilter(rootPath);
        const loaded = await buildTree(rootPath, shouldIgnore);
        if (!active) return;
        setNodes(loaded);
        setExpanded(new Set([rootPath]));
        setSelectedIndex(0);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [rootPath]);

  const rootNode: FileTreeNode = useMemo(
    () => ({
      name: path.basename(rootPath) || rootPath,
      path: rootPath,
      isDir: true,
      children: nodes,
    }),
    [nodes, rootPath]
  );

  const visible = useMemo(() => {
    const result: Array<{ node: FileTreeNode; depth: number }> = [];
    const walkVisible = (node: FileTreeNode, depth: number): void => {
      result.push({ node, depth });
      if (node.isDir && expanded.has(node.path)) {
        node.children?.forEach((child) => walkVisible(child, depth + 1));
      }
    };
    walkVisible(rootNode, 0);
    return result;
  }, [expanded, rootNode]);

  // FileTree is now inside a Tab within Sidebar
  // The height prop is the available height from the tab content area
  // Use the full height provided by the parent
  const scrollAreaHeight = height ? Math.max(1, height) : undefined;
  const visibleItems = scrollAreaHeight ? Math.max(1, scrollAreaHeight) : 1;
  const maxScrollOffset = Math.max(0, visible.length - visibleItems);

  // Adjust selectedIndex if it's out of bounds
  useEffect(() => {
    if (selectedIndex >= visible.length) {
      setSelectedIndex(Math.max(0, visible.length - 1));
    }
  }, [selectedIndex, visible.length]);

  // Selection-driven scrolling: keep selected item visible
  useEffect(() => {
    if (visible.length === 0) {
      setScrollOffset(0);
      return;
    }

    setScrollOffset((currentScrollOffset) => {
      // If selected item is above visible viewport, scroll up
      if (selectedIndex < currentScrollOffset) {
        return selectedIndex;
      }
      // If selected item is below visible viewport, scroll down
      if (selectedIndex >= currentScrollOffset + visibleItems) {
        // Keep selected item in middle of viewport when possible
        const idealOffset = selectedIndex - Math.floor(visibleItems / 2);
        return Math.max(0, Math.min(idealOffset, maxScrollOffset));
      }
      // Selected item is already visible, no change needed
      return currentScrollOffset;
    });
  }, [selectedIndex, visible.length, visibleItems, maxScrollOffset]);

  // Determine if text should be dimmed based on textSize prop
  const isSmallText = textSize === "small" || (typeof textSize === "number" && textSize < 1);

  // Calculate available width for filenames
  // Sidebar is 15% of terminal width by default, with paddingX={1} (2 chars)
  // FileTree is inside a Box with padding={1} (2 more chars on each side = 4 total)
  // So we need: sidebar width - sidebar padding - filetree container padding
  const terminalWidth = stdout?.columns ?? 80;
  const sidebarWidthPercent = 0.15; // 15% default
  const sidebarWidth = Math.floor(terminalWidth * sidebarWidthPercent);
  const sidebarPadding = 2; // paddingX={1} on both sides
  const fileTreeContainerPadding = 2; // padding={1} on left side only (right is handled by scrollbar)
  const scrollbarWidth = 1; // Reserve space for scrollbar
  const availableWidth = Math.max(
    10,
    sidebarWidth - sidebarPadding - fileTreeContainerPadding - scrollbarWidth
  );

  // Render visible items (wrapped in ScrollArea) - memoize to prevent recreation
  // Must be called before early returns to follow Rules of Hooks
  const fileTreeItems = useMemo(
    () =>
      visible.map(({ node, depth }, idx) => {
        const isSelected = idx === selectedIndex;
        const isExpanded = node.isDir && expanded.has(node.path);
        const icon = node.isDir ? (isExpanded ? "▼" : "▶") : "·";
        const pointer = isSelected ? "› " : "  ";

        // Build tree structure with box-drawing characters
        let treePrefix = "";
        if (depth > 0) {
          // Find all siblings at the same depth with the same parent
          const parentPath = path.dirname(node.path);
          const siblings = visible.filter(
            (v) => v.depth === depth && path.dirname(v.node.path) === parentPath
          );
          const siblingIndex = siblings.findIndex((s) => s.node.path === node.path);
          const isLastSibling = siblingIndex === siblings.length - 1;

          // Build vertical lines for each ancestor level
          for (let i = 1; i < depth; i++) {
            // Get the ancestor path at depth i
            const pathParts = node.path.split(path.sep);
            const ancestorPath = pathParts.slice(0, pathParts.length - depth + i).join(path.sep);
            const ancestorParentPath = path.dirname(ancestorPath);

            // Find siblings of this ancestor
            const ancestorSiblings = visible.filter(
              (v) => v.depth === i && path.dirname(v.node.path) === ancestorParentPath
            );
            const ancestorIndex = ancestorSiblings.findIndex((s) => s.node.path === ancestorPath);
            const hasMoreAfter = ancestorIndex >= 0 && ancestorIndex < ancestorSiblings.length - 1;

            treePrefix += hasMoreAfter ? "│ " : "  ";
          }

          // Add connector for this item
          treePrefix += isLastSibling ? "└─" : "├─";
        }

        // Calculate the length of the prefix (pointer + treePrefix + icon + space)
        const prefixLength = pointer.length + treePrefix.length + icon.length + 1; // +1 for space after icon
        // Use a conservative calculation: subtract prefix length and add safety margin
        const safetyMargin = 3; // Extra margin to prevent any wrapping
        const maxFileNameLength = Math.max(1, availableWidth - prefixLength - safetyMargin);
        const truncatedName = truncateFileName(node.name, maxFileNameLength);

        return (
          <Box key={node.path} width="100%" overflow="hidden" minWidth={0}>
            <Text color={isSelected ? COLOR.CYAN : undefined} dimColor={isSmallText && !isSelected}>
              {pointer}
              {treePrefix}
              {icon} {truncatedName}
            </Text>
          </Box>
        );
      }),
    [visible, selectedIndex, expanded, isSmallText, availableWidth]
  );

  useInput((_input, key) => {
    if (!isFocused || isLoading || error) return;
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(visible.length - 1, prev + 1));
    }
    if (key.return || _input === " ") {
      const entry = visible[selectedIndex];
      if (entry?.node.isDir) {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(entry.node.path)) {
            next.delete(entry.node.path);
          } else {
            next.add(entry.node.path);
          }
          return next;
        });
      }
    }
  });

  if (isLoading) {
    return (
      <Box flexDirection="column" paddingY={1} gap={0} width="100%" overflow="hidden" minWidth={0}>
        <Text dimColor={isSmallText} wrap="wrap">
          Loading files…
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1} gap={0} width="100%" overflow="hidden" minWidth={0}>
        <Text color={COLOR.RED} dimColor={isSmallText} wrap="wrap">
          Failed to load files
        </Text>
        <Text dimColor wrap="wrap">
          {error}
        </Text>
      </Box>
    );
  }

  return (
    <Box
      width="100%"
      overflow="hidden"
      paddingX={0}
      paddingTop={0}
      paddingBottom={0}
      flexDirection="column"
      flexShrink={1}
      flexGrow={1}
      minWidth={0}
      minHeight={0}
    >
      <ScrollArea
        height={scrollAreaHeight}
        showScrollbar={true}
        isFocused={isFocused}
        scrollOffset={scrollOffset}
        onScrollChange={setScrollOffset}
        estimatedLinesPerItem={1}
        showScrollHints={false}
      >
        {fileTreeItems}
      </ScrollArea>
    </Box>
  );
}
