import path from 'path';
import { MetadataCompiler } from './pipeline/compiler';
import type { CompileTimeContext } from './pipeline/types';

async function main() {
  const rootDir = path.resolve(__dirname, '..', '..');
  const context: CompileTimeContext = {
    paths: {
      rootDir,
      authoringDir: path.join(rootDir, 'metadata', 'authoring'),
      xsdPath: path.join(rootDir, 'metadata', 'xsd', 'page-definition.xsd'),
      compiledDir: path.join(rootDir, 'metadata', 'compiled'),
      latestDir: path.join(rootDir, 'metadata', 'registry', 'latest'),
      manifestPath: path.join(rootDir, 'metadata', 'registry', 'manifest.json'),
    },
    diagnostics: {
      info(message) {
        console.log(message);
      },
      warn(message) {
        console.warn(message);
      },
    },
  };

  const compiler = new MetadataCompiler({ context });
  await compiler.run();
  console.log('Compilation complete.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
