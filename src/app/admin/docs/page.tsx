import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

import type { Metadata } from "next";

import { DocsManager } from "@/components/docs/docs-manager";

export const metadata: Metadata = {
  title: "Documentation | StewardTrack",
};

type DocsTreeNode = {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: DocsTreeNode[];
};

type DocsData = {
  tree: DocsTreeNode[];
  files: Record<string, string>;
  initialPath: string | null;
};

const DOCS_ROOT = path.join(process.cwd(), "docs");

export default async function DocumentationPage() {
  const data = await readDocsDirectory();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Documentation hub</h1>
        <p className="text-sm text-muted-foreground">
          Access StewardTrack’s internal documentation directly from the admin console.
        </p>
      </div>
      <DocsManager tree={data.tree} files={data.files} initialPath={data.initialPath} />
    </div>
  );
}

async function readDocsDirectory(): Promise<DocsData> {
  const files: Record<string, string> = {};
  const tree = await readDirectoryRecursive(DOCS_ROOT, "", files);
  const initialPath = findFirstFile(tree);

  return { tree, files, initialPath };
}

async function readDirectoryRecursive(
  current: string,
  relative: string,
  files: Record<string, string>
): Promise<DocsTreeNode[]> {
  let entries: Dirent[] = [];

  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch (error) {
    console.error(`Failed to read documentation directory: ${current}`, error);
    return [];
  }

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) {
      return -1;
    }

    if (!a.isDirectory() && b.isDirectory()) {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });

  const nodes: DocsTreeNode[] = [];

  for (const entry of entries) {
    const entryPath = path.join(current, entry.name);
    const relativePath = path.posix.join(relative, entry.name);

    if (entry.isDirectory()) {
      const children = await readDirectoryRecursive(entryPath, relativePath, files);

      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: "directory",
          children,
        });
      }
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      const content = await fs.readFile(entryPath, "utf8");
      files[relativePath] = content;
      nodes.push({ name: entry.name, path: relativePath, type: "file" });
    }
  }

  return nodes;
}

function findFirstFile(nodes: DocsTreeNode[]): string | null {
  for (const node of nodes) {
    if (node.type === "file") {
      return node.path;
    }

    if (node.children && node.children.length > 0) {
      const childPath = findFirstFile(node.children);
      if (childPath) {
        return childPath;
      }
    }
  }

  return null;
}
