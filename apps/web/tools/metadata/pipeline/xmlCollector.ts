import { promises as fs } from 'fs';
import path from 'path';

export class XmlAuthoringLoader {
  constructor(private readonly authoringDir: string) {}

  async collect(): Promise<string[]> {
    return this.collectRecursive(this.authoringDir);
  }

  private async collectRecursive(dir: string): Promise<string[]> {
    const result: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await this.collectRecursive(fullPath);
        result.push(...nested);
      } else if (entry.isFile() && fullPath.endsWith('.xml')) {
        result.push(fullPath);
      }
    }
    return result.sort();
  }
}
