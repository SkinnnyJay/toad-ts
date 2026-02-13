import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { ENCODING } from "@/constants/encodings";
import { IGNORE_PATTERN } from "@/constants/ignore-patterns";
import { KEY_NAME } from "@/constants/key-names";
import { useTerminalDimensions } from "@/ui/hooks/useTerminalDimensions";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import ignore from "ignore";
import { type ReactNode, useEffect, useMemo, useState } from "react";
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
  /** When a file (not directory) is selected via Enter or click. */
  onSelectFile?: (path: string, name: string) => void;
  /** Called when user interacts with the tree (e.g. click) so the parent can set focus to Files. */
  onRequestFocus?: () => void;
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
  ig.add(IGNORE_PATTERN.FILE_TREE);

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
    try {
      const dirents = await readdir(dir, { withFileTypes: true, encoding: ENCODING.UTF8 });
      const children: FileTreeNode[] = [];

      for (const dirent of dirents) {
        const fullPath = path.join(dir, dirent.name);
        const relativePath = path.relative(rootPath, fullPath) || dirent.name;
        if (shouldIgnore(relativePath)) {
          continue;
        }

        if (dirent.isDirectory()) {
          let nested: FileTreeNode[] = [];
          try {
            nested = await walk(fullPath);
          } catch (_error) {
            nested = [];
          }
          children.push({ name: dirent.name, path: fullPath, isDir: true, children: nested });
        } else {
          children.push({ name: dirent.name, path: fullPath, isDir: false });
        }
      }

      return sortNodes(children);
    } catch (_error) {
      return [];
    }
  };

  return walk(rootPath);
};

export function FileTree({
  rootPath = process.cwd(),
  isFocused = true,
  height,
  textSize = "normal",
  onSelectFile,
  onRequestFocus,
}: FileTreeProps): ReactNode {
  const terminal = useTerminalDimensions();
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
  // Use the height provided by the parent, but subtract a small margin for safety
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
        const idealOffset =
          selectedIndex - Math.floor(visibleItems / LIMIT.FILE_TREE_SCROLL_CENTER_DIVISOR);
        return Math.max(0, Math.min(idealOffset, maxScrollOffset));
      }
      // Selected item is already visible, no change needed
      return currentScrollOffset;
    });
  }, [selectedIndex, visible.length, visibleItems, maxScrollOffset]);

  // Determine if text should be dimmed based on textSize prop
  const isSmallText = textSize === "small" || (typeof textSize === "number" && textSize < 1);

  // Calculate available width for filenames (sidebar minus padding and scrollbar)
  const terminalWidth = terminal.columns ?? UI.TERMINAL_DEFAULT_COLUMNS;
  const sidebarWidthPercent = UI.SIDEBAR_WIDTH_RATIO;
  const sidebarWidth = Math.floor(terminalWidth * sidebarWidthPercent);
  const sidebarPadding = UI.SIDEBAR_PADDING;
  const scrollbarWidth = UI.SCROLLBAR_WIDTH;
  const availableWidth = Math.max(
    LIMIT.FILE_TREE_PADDING,
    sidebarWidth - (sidebarPadding + sidebarPadding) - scrollbarWidth
  );

  // Render visible items (wrapped in ScrollArea) - memoize to prevent recreation
  // Must be called before early returns to follow Rules of Hooks
  const fileTreeItems = useMemo(() => {
    const start = Math.max(0, Math.min(scrollOffset, visible.length));
    const end = Math.min(visible.length, start + visibleItems);
    const slice = visible.slice(start, end);
    return slice.map(({ node, depth }, idx) => {
      const actualIndex = start + idx;
      const isSelected = actualIndex === selectedIndex;
      const isExpanded = node.isDir && expanded.has(node.path);
      const icon = node.isDir ? (isExpanded ? "▼" : "▶") : "•";
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
      const safetyMargin = LIMIT.FILE_TREE_SAFETY_MARGIN;
      const maxFileNameLength = Math.max(1, availableWidth - prefixLength - safetyMargin);
      const truncatedName = truncateFileName(node.name, maxFileNameLength);

      return (
        <box
          key={node.path}
          width="100%"
          overflow="hidden"
          minWidth={0}
          onMouseDown={() => {
            onRequestFocus?.();
            setSelectedIndex(actualIndex);
            if (node.isDir) {
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(node.path)) {
                  next.delete(node.path);
                } else {
                  next.add(node.path);
                }
                return next;
              });
            } else if (onSelectFile) {
              onSelectFile(node.path, node.name);
            }
          }}
        >
          <text
            fg={isSelected ? COLOR.CYAN : undefined}
            attributes={isSmallText && !isSelected ? TextAttributes.DIM : 0}
          >
            {pointer}
            {treePrefix}
            {icon} {truncatedName}
          </text>
        </box>
      );
    });
  }, [
    availableWidth,
    expanded,
    isSmallText,
    onRequestFocus,
    onSelectFile,
    scrollOffset,
    selectedIndex,
    visible,
    visibleItems,
  ]);

  useKeyboard((key) => {
    if (!isFocused || isLoading || error) return;
    if (key.name === KEY_NAME.UP) {
      key.preventDefault();
      key.stopPropagation();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.name === KEY_NAME.DOWN) {
      key.preventDefault();
      key.stopPropagation();
      setSelectedIndex((prev) => Math.min(visible.length - 1, prev + 1));
    }
    if (
      key.name === KEY_NAME.RETURN ||
      key.name === KEY_NAME.LINEFEED ||
      key.name === KEY_NAME.SPACE
    ) {
      key.preventDefault();
      key.stopPropagation();
      const entry = visible[selectedIndex];
      if (!entry) return;
      if (entry.node.isDir) {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(entry.node.path)) {
            next.delete(entry.node.path);
          } else {
            next.add(entry.node.path);
          }
          return next;
        });
      } else if (onSelectFile) {
        onSelectFile(entry.node.path, entry.node.name);
      }
    }
  });

  if (isLoading) {
    return (
      <box
        flexDirection="column"
        paddingTop={1}
        paddingBottom={1}
        gap={0}
        width="100%"
        overflow="hidden"
        minWidth={0}
      >
        <text attributes={isSmallText ? TextAttributes.DIM : 0} wrapMode="word">
          Loading files…
        </text>
      </box>
    );
  }

  if (error) {
    return (
      <box
        flexDirection="column"
        paddingTop={1}
        paddingBottom={1}
        gap={0}
        width="100%"
        overflow="hidden"
        minWidth={0}
      >
        <text fg={COLOR.RED} attributes={isSmallText ? TextAttributes.DIM : 0} wrapMode="word">
          Failed to load files
        </text>
        <text attributes={TextAttributes.DIM} wrapMode="word">
          {error}
        </text>
      </box>
    );
  }

  return (
    <box
      width="100%"
      overflow="hidden"
      paddingLeft={0}
      paddingRight={0}
      paddingTop={0}
      paddingBottom={0}
      flexDirection="column"
      flexShrink={1}
      flexGrow={0}
      minWidth={0}
      minHeight={0}
      height={height}
      maxHeight={height}
    >
      <ScrollArea height={scrollAreaHeight} viewportCulling={true} focused={isFocused}>
        {fileTreeItems}
      </ScrollArea>
    </box>
  );
}
