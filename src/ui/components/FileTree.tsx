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
  maxEntries?: number;
  height?: number;
}

interface BuildResult {
  nodes: FileTreeNode[];
  truncated: boolean;
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

const buildTree = async (rootPath: string, maxEntries: number): Promise<BuildResult> => {
  let count = 0;
  let truncated = false;

  const walk = async (dir: string): Promise<FileTreeNode[]> => {
    if (count >= maxEntries) {
      truncated = true;
      return [];
    }

    const dirents = await readdir(dir, { withFileTypes: true });
    const children: FileTreeNode[] = [];

    for (const dirent of dirents) {
      const fullPath = path.join(dir, dirent.name);
      if (shouldSkip(rootPath, fullPath)) {
        continue;
      }

      if (count >= maxEntries) {
        truncated = true;
        break;
      }

      count += 1;

      if (dirent.isDirectory()) {
        const nested = await walk(fullPath);
        children.push({ name: dirent.name, path: fullPath, isDir: true, children: nested });
      } else {
        children.push({ name: dirent.name, path: fullPath, isDir: false });
      }
    }

    return sortNodes(children);
  };

  const nodes = await walk(rootPath);
  return { nodes, truncated };
};

export function FileTree({
  rootPath = process.cwd(),
  isFocused = true,
  maxEntries = 800,
  height,
}: FileTreeProps): JSX.Element {
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { nodes: loaded, truncated } = await buildTree(rootPath, maxEntries);
        if (!active) return;
        setNodes(loaded);
        setExpanded(new Set([rootPath]));
        setSelectedIndex(0);
        setIsTruncated(truncated);
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
  }, [maxEntries, rootPath]);

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

  // FileTree is inside AccordionSection within Sidebar
  // The height prop is the available height from AccordionSection content area
  // Account for FileTree padding (paddingBottom={1} = 1 line)
  // If no height is provided, use a small default but allow flex to work
  const scrollAreaHeight = height ? Math.max(1, height - 1) : undefined;
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

  // Render visible items (wrapped in ScrollArea)
  const fileTreeItems = visible.map(({ node, depth }, idx) => {
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
  });

  // Add truncated message if needed
  const allItems = isTruncated
    ? [
        ...fileTreeItems,
        <Box key="truncated" width="100%" overflow="hidden" minWidth={0}>
          <Text dimColor wrap="wrap">
            … truncated view (limit {maxEntries} entries)
          </Text>
        </Box>,
      ]
    : fileTreeItems;

  return (
    <Box
      width="100%"
      overflow="hidden"
      paddingX={1}
      paddingTop={0}
      paddingBottom={1}
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
        {allItems}
      </ScrollArea>
    </Box>
  );
}
