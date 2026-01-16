import { readdir } from "node:fs/promises";
import path from "node:path";
import { COLOR } from "@/constants/colors";
import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useState } from "react";

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
}: FileTreeProps): JSX.Element {
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  useEffect(() => {
    if (selectedIndex >= visible.length) {
      setSelectedIndex(Math.max(0, visible.length - 1));
    }
  }, [selectedIndex, visible.length]);

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
      <Box flexDirection="column" paddingY={1} gap={0}>
        <Text dimColor>Loading files…</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1} gap={0}>
        <Text color={COLOR.RED}>Failed to load files</Text>
        <Text dimColor>{error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={0}>
      {visible.map(({ node, depth }, idx) => {
        const isSelected = idx === selectedIndex;
        const indent = "  ".repeat(depth);
        const icon = node.isDir ? (expanded.has(node.path) ? "📂" : "📁") : "📄";
        const pointer = isSelected ? "› " : "  ";

        return (
          <Text key={node.path} color={isSelected ? COLOR.CYAN : undefined}>
            {pointer}
            {indent}
            {icon} {node.name}
          </Text>
        );
      })}
      {isTruncated ? <Text dimColor>… truncated view (limit {maxEntries} entries)</Text> : null}
    </Box>
  );
}
