import { promises as fs } from 'fs';
import type { CanonicalDefinition, CompileTimeContext } from './types';
import { XmlAuthoringLoader } from './xmlCollector';
import { XmlSchemaValidator } from './schemaValidator';
import { CanonicalTransformer } from './transformer';
import { validateCanonicalDefinition } from './validators';
import { applyChecksum } from './checksum';
import { RegistryPublisher } from './publisher';

export interface MetadataCompilerOptions {
  context: CompileTimeContext;
}

export class MetadataCompiler {
  private readonly loader: XmlAuthoringLoader;
  private readonly validator: XmlSchemaValidator;
  private readonly transformer: CanonicalTransformer;
  private readonly publisher: RegistryPublisher;

  constructor(options: MetadataCompilerOptions) {
    this.loader = new XmlAuthoringLoader(options.context.paths.authoringDir);
    this.validator = new XmlSchemaValidator(options.context.paths.xsdPath);
    this.transformer = new CanonicalTransformer(options.context.paths.rootDir);
    this.publisher = new RegistryPublisher(options.context);
    this.context = options.context;
  }

  private readonly context: CompileTimeContext;

  async run(): Promise<void> {
    const files = await this.collectAuthoringFiles();
    if (files.length === 0) {
      this.context.diagnostics?.info?.('No XML authoring files found.');
      return;
    }

    const manifest = await this.publisher.loadManifest();

    for (const file of files) {
      const definition = await this.compileFile(file);
      await this.publisher.publish(definition, manifest);
    }

    manifest.generatedAt = new Date().toISOString();
    await this.publisher.persistManifest(manifest);
  }

  private async collectAuthoringFiles(): Promise<string[]> {
    try {
      return await this.loader.collect();
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        this.context.diagnostics?.warn?.(`Authoring directory not found at ${this.context.paths.authoringDir}`);
        return [];
      }
      throw error;
    }
  }

  private async compileFile(filePath: string): Promise<CanonicalDefinition> {
    const xmlContent = await fs.readFile(filePath, 'utf-8');
    await this.validator.validate(xmlContent, filePath);
    const parsed = this.transformer.parse(xmlContent);
    const canonical = this.transformer.transform(parsed, filePath);
    validateCanonicalDefinition(canonical, filePath);
    const withChecksum = applyChecksum(canonical);
    return withChecksum;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
