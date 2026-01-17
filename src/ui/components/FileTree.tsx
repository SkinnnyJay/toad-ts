import { readdir } from "node:fs/promises";
import path from "node:path";
import { COLOR } from "@/constants/colors";
import { Box, Text, useInput } from "ink";
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
}

const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
  return [...nodes].sort((a, b) => {
    if (a.isDir !== b.isDir) {
      return a.isDir ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
};

const shouldSkip = (rootPath: string, fullPath: string): boolean => {
  const rel = path.relative(rootPath, fullPath);
  return rel.startsWith(".git") || rel.includes(`${path.sep}node_modules`);
};

const buildTree = async (rootPath: string): Promise<FileTreeNode[]> => {
  const walk = async (dir: string): Promise<FileTreeNode[]> => {
    const dirents = await readdir(dir, { withFileTypes: true });
    const children: FileTreeNode[] = [];

    for (const dirent of dirents) {
      const fullPath = path.join(dir, dirent.name);
      if (shouldSkip(rootPath, fullPath)) {
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
}: FileTreeProps): JSX.Element {
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
        const loaded = await buildTree(rootPath);
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

  // Render visible items (wrapped in ScrollArea) - memoize to prevent recreation
  // Must be called before early returns to follow Rules of Hooks
  const fileTreeItems = useMemo(
    () =>
      visible.map(({ node, depth }, idx) => {
        const isSelected = idx === selectedIndex;
        const indent = "  ".repeat(depth);
        const icon = node.isDir ? (expanded.has(node.path) ? "📂" : "📁") : "📄";
        const pointer = isSelected ? "› " : "  ";

        return (
          <Box key={node.path} width="100%" overflow="hidden" minWidth={0}>
            <Text color={isSelected ? COLOR.CYAN : undefined} wrap="wrap">
              {pointer}
              {indent}
              {icon} {node.name}
            </Text>
          </Box>
        );
      }),
    [visible, selectedIndex, expanded]
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
        <Text dimColor wrap="wrap">
          Loading files…
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1} gap={0} width="100%" overflow="hidden" minWidth={0}>
        <Text color={COLOR.RED} wrap="wrap">
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
