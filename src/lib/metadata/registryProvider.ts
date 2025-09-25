import type { MetadataRegistry, FileSystemMetadataRegistryOptions } from './registry';
import { createMetadataRegistry } from './registry';

let registryFactory: () => MetadataRegistry = () => createMetadataRegistry();
let cachedRegistry: MetadataRegistry | null = null;

export function configureMetadataRegistry(factory: () => MetadataRegistry): void {
  registryFactory = factory;
  cachedRegistry = null;
}

export function getMetadataRegistry(): MetadataRegistry {
  if (!cachedRegistry) {
    cachedRegistry = registryFactory();
  }
  return cachedRegistry;
}

export function createDefaultMetadataRegistry(
  options?: FileSystemMetadataRegistryOptions,
): MetadataRegistry {
  return createMetadataRegistry(options);
}
