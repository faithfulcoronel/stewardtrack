import path from 'path';
import { promises as fs } from 'fs';
import { validateXML } from 'xmllint-wasm';

export class XmlSchemaValidator {
  private schema: string | null = null;

  constructor(private readonly xsdPath: string) {}

  async ensureLoaded(): Promise<void> {
    if (!this.schema) {
      this.schema = await fs.readFile(this.xsdPath, 'utf-8');
    }
  }

  async validate(xmlContent: string, filePath: string): Promise<void> {
    await this.ensureLoaded();
    const result = await validateXML({
      xml: [{ fileName: path.basename(filePath), contents: xmlContent }],
      schema: [this.schema ?? ''],
    });
    if (!result.valid) {
      const errors = (result.errors ?? [])
        .map((err) => err.rawMessage ?? err.message ?? String(err))
        .join('\n');
      const message = errors || 'Unknown validation error.';
      throw new Error(`XSD validation failed for ${filePath}:\n${message}`);
    }
  }
}
