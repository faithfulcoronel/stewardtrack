import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

import { XmlAuthoringLoader } from '../xmlCollector';
import { XmlSchemaValidator } from '../schemaValidator';
import { CanonicalTransformer } from '../transformer';
import { RegistryPublisher } from '../publisher';
import { validateCanonicalDefinition } from '../validators';
import type { CanonicalDefinition, ManifestEntry, ManifestFile, PropValue } from '../types';

const tmpPrefix = path.join(os.tmpdir(), 'metadata-pipeline-tests-');

async function createTempDir(): Promise<string> {
  return await fs.mkdtemp(tmpPrefix);
}

async function cleanupTempDir(dir: string | null): Promise<void> {
  if (dir) {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('XmlAuthoringLoader', () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    tempDir = null;
  });

  it('collects xml files recursively and sorts them', async () => {
    const dir = await createTempDir();
    tempDir = dir;
    const nestedDir = path.join(dir, 'nested');
    await fs.mkdir(nestedDir, { recursive: true });
    const files = [
      path.join(dir, 'a.xml'),
      path.join(nestedDir, 'b.xml'),
      path.join(nestedDir, 'c.txt'),
      path.join(dir, 'd.XML'),
    ];
    await fs.writeFile(files[0], '<a />');
    await fs.writeFile(files[1], '<b />');
    await fs.writeFile(files[2], 'ignore');
    await fs.writeFile(files[3], '<d />');

    const loader = new XmlAuthoringLoader(tempDir);
    const collected = await loader.collect();

    assert.deepEqual(collected, [files[0], files[1]]);
  });
});

describe('XmlSchemaValidator', () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    tempDir = null;
  });

  it('loads schema once and validates xml content', async () => {
    const dir = await createTempDir();
    tempDir = dir;
    const xsdPath = path.join(dir, 'schema.xsd');
    await fs.writeFile(
      xsdPath,
      `<?xml version="1.0"?>
      <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
        <xs:element name="root">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="child" type="xs:string" />
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:schema>`,
    );

    const originalReadFile = fs.readFile;
    const readFileMock = mock.method(fs, 'readFile', async (...args: Parameters<typeof originalReadFile>) => {
      return await originalReadFile(...args);
    });

    try {
      const validator = new XmlSchemaValidator(xsdPath);
      const xml = `<root><child>Hello</child></root>`;
      const filePath = path.join(dir, 'file.xml');
      await validator.validate(xml, filePath);
      await validator.validate(xml, filePath);

      assert.equal(readFileMock.mock.callCount(), 1);
    } finally {
      readFileMock.mock.restore();
    }
  });

  it('throws with aggregated messages when validation fails', async () => {
    const dir = await createTempDir();
    tempDir = dir;
    const xsdPath = path.join(dir, 'schema.xsd');
    await fs.writeFile(
      xsdPath,
      `<?xml version="1.0"?>
      <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
        <xs:element name="root">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="child" type="xs:string" />
              <xs:element name="other" type="xs:string" />
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:schema>`,
    );

    const validator = new XmlSchemaValidator(xsdPath);
    await assert.rejects(
      () => validator.validate('<root><child>Hello</child></root>', path.join(dir, 'file.xml')),
      /XSD validation failed[\s\S]*other/,
    );
  });
});

describe('CanonicalTransformer', () => {
  it('creates canonical definitions from blueprint xml', () => {
    const rootDir = '/repo';
    const transformer = new CanonicalTransformer(rootDir);
    const xml = `<?xml version="1.0"?>
      <PageDefinition schemaVersion="1.0.0" contentVersion="1.0.0" kind="blueprint" module="core" route="home">
        <Page id="home">
          <Title>Home</Title>
          <Regions>
            <Region id="main">
              <Component id="hero" type="hero" />
            </Region>
          </Regions>
          <DataSources>
            <DataSource id="users" kind="static" />
          </DataSources>
          <Actions>
            <Action id="save" kind="mutation" />
          </Actions>
        </Page>
      </PageDefinition>`;

    const definition = transformer.fromXml(xml, path.join(rootDir, 'authoring/page.xml'));

    assert.equal(definition.kind, 'blueprint');
    assert.equal(definition.layer.module, 'core');
    assert.equal(definition.layer.route, 'home');
    assert.equal(definition.page.id, 'home');
    assert.equal(definition.page.regions?.[0]?.components?.[0]?.id, 'hero');
    assert.equal(definition.page.dataSources?.[0]?.id, 'users');
    assert.equal(definition.page.actions?.[0]?.id, 'save');
    assert.equal(definition.sourcePath, path.join('authoring', 'page.xml'));
  });

  it('throws when XML root is missing', () => {
    const transformer = new CanonicalTransformer('/repo');
    assert.throws(() => transformer.transform('invalid' as unknown, '/repo/file.xml'), /Unexpected XML structure/);
    assert.throws(
      () => transformer.transform({ PageDefinition: null }, '/repo/file.xml'),
      /Missing PageDefinition/,
    );
  });
});

describe('RegistryPublisher', () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    tempDir = null;
  });

  it('publishes compiled artifacts and latest pointer', async () => {
    const dir = await createTempDir();
    tempDir = dir;
    const context = {
      paths: {
        rootDir: dir,
        authoringDir: path.join(dir, 'authoring'),
        xsdPath: path.join(dir, 'schema.xsd'),
        compiledDir: path.join(dir, 'compiled'),
        latestDir: path.join(dir, 'latest'),
        manifestPath: path.join(dir, 'manifest.json'),
      },
    };

    const publisher = new RegistryPublisher(context);
    const manifest: ManifestFile = { generatedAt: new Date().toISOString(), entries: {} };
    const definition: CanonicalDefinition = {
      schemaVersion: '1.0.0',
      contentVersion: '1.0.1',
      checksum: 'abc123',
      kind: 'overlay',
      layer: {
        module: 'core',
        route: 'home',
        tenant: 'tenant-a',
        role: null,
        variant: null,
        locale: null,
      },
      page: {},
      sourcePath: 'authoring/home.xml',
    };

    await publisher.publish(definition, manifest);

    const compiledPath = path.join(context.paths.compiledDir, 'tenant-a', 'core', 'home@1.0.1.json');
    const pointerPath = path.join(context.paths.latestDir, 'tenant-a', 'core', 'home.json');
    const manifestKey = 'tenant-a::core::home::-::-::-';

    const compiled = JSON.parse(await fs.readFile(compiledPath, 'utf-8'));
    const pointer = JSON.parse(await fs.readFile(pointerPath, 'utf-8'));
    const keys = Object.keys(manifest.entries);
    assert.deepEqual(keys, [manifestKey]);
    const entry = manifest.entries[manifestKey] as { dependsOn?: string[] } | undefined;

    assert.equal(compiled.contentVersion, '1.0.1');
    assert.equal(pointer.contentVersion, '1.0.1');
    assert.equal(pointer.compiledPath, path.relative(context.paths.rootDir, compiledPath));
    assert.ok(entry, 'manifest entry should be registered');
    assert.deepEqual(entry?.dependsOn, ['global::core::home::-::-::-']);
  });

  it('does not downgrade latest pointer when older versions publish', async () => {
    const dir = await createTempDir();
    tempDir = dir;
    const context = {
      paths: {
        rootDir: dir,
        authoringDir: path.join(dir, 'authoring'),
        xsdPath: path.join(dir, 'schema.xsd'),
        compiledDir: path.join(dir, 'compiled'),
        latestDir: path.join(dir, 'latest'),
        manifestPath: path.join(dir, 'manifest.json'),
      },
    };

    const publisher = new RegistryPublisher(context);
    const pointerPath = path.join(context.paths.latestDir, 'global', 'core', 'home.json');
    await fs.mkdir(path.dirname(pointerPath), { recursive: true });
    const existingPointer = {
      key: 'global::core::home::-::-',
      kind: 'blueprint' as const,
      schemaVersion: '1.0.0',
      contentVersion: '2.0.0',
      checksum: 'zzz',
      layer: {
        module: 'core',
        route: 'home',
        tenant: 'global',
        role: null,
        variant: null,
        locale: null,
      },
      sourcePath: 'authoring/home.xml',
      compiledPath: 'compiled/global/core/home@2.0.0.json',
    };
    await fs.writeFile(pointerPath, JSON.stringify(existingPointer, null, 2));

    const manifest: ManifestFile = { generatedAt: new Date().toISOString(), entries: {} };
    const olderDefinition: CanonicalDefinition = {
      schemaVersion: '1.0.0',
      contentVersion: '1.5.0',
      checksum: 'abc123',
      kind: 'blueprint',
      layer: {
        module: 'core',
        route: 'home',
        tenant: 'global',
        role: null,
        variant: null,
        locale: null,
      },
      page: {},
      sourcePath: 'authoring/home.xml',
    };

    await publisher.publish(olderDefinition, manifest);

    const pointer = JSON.parse(await fs.readFile(pointerPath, 'utf-8'));
    assert.equal(pointer.contentVersion, '2.0.0');
  });

  it('loads default manifest when file is missing and persists sorted entries', async () => {
    const dir = await createTempDir();
    tempDir = dir;
    const context = {
      paths: {
        rootDir: dir,
        authoringDir: path.join(dir, 'authoring'),
        xsdPath: path.join(dir, 'schema.xsd'),
        compiledDir: path.join(dir, 'compiled'),
        latestDir: path.join(dir, 'latest'),
        manifestPath: path.join(dir, 'manifest.json'),
      },
    };

    const publisher = new RegistryPublisher(context);
    const manifest = await publisher.loadManifest();
    assert.deepEqual(manifest.entries, {});

    const payload: ManifestFile = {
      generatedAt: new Date().toISOString(),
      entries: {
        b: {
          key: 'b',
          kind: 'blueprint',
          schemaVersion: '1.0.0',
          contentVersion: '1.0.0',
          checksum: '1',
          layer: {
            module: 'm',
            route: 'r',
            tenant: 'global',
            role: null,
            variant: null,
            locale: null,
          },
          sourcePath: 's',
          compiledPath: 'c',
        } satisfies ManifestEntry,
        a: {
          key: 'a',
          kind: 'overlay',
          schemaVersion: '1.0.0',
          contentVersion: '1.0.0',
          checksum: '1',
          layer: {
            module: 'm',
            route: 'r',
            tenant: 'global',
            role: null,
            variant: null,
            locale: null,
          },
          sourcePath: 's',
          compiledPath: 'c',
          dependsOn: ['root'],
        } satisfies ManifestEntry,
      },
    };

    await publisher.persistManifest(payload);
    const written = await fs.readFile(context.paths.manifestPath, 'utf-8');
    const firstIndex = written.indexOf('\"a\"');
    const secondIndex = written.indexOf('\"b\"');
    assert.ok(firstIndex < secondIndex, 'entries should be sorted alphabetically');
  });
});

describe('validateCanonicalDefinition', () => {
  const baseDefinition = {
    schemaVersion: '1.0.0',
    contentVersion: '1.0.0',
    checksum: 'hash',
    kind: 'blueprint',
    layer: {
      module: 'core',
      route: 'home',
      tenant: 'global',
      role: null,
      variant: null,
      locale: null,
    },
    page: {
      id: 'home',
      regions: [
        {
          id: 'main',
          components: [
            {
              id: 'hero',
              type: 'hero',
            },
          ],
        },
      ],
      dataSources: [
        {
          id: 'users',
          kind: 'static',
        },
      ],
      actions: [
        {
          id: 'save',
          kind: 'mutation',
        },
      ],
    },
    sourcePath: 'authoring/home.xml',
  } satisfies CanonicalDefinition;

  it('rejects invalid semantic versions and missing metadata', () => {
    const invalid = {
      ...baseDefinition,
      schemaVersion: 'invalid',
    };
    assert.throws(() => validateCanonicalDefinition(invalid, 'file.xml'), /Invalid schemaVersion/);

    const missingMetadata = {
      ...baseDefinition,
      layer: {
        ...baseDefinition.layer,
        module: '',
      },
    };
    assert.throws(() => validateCanonicalDefinition(missingMetadata, 'file.xml'), /Missing module/);
  });

  it('detects duplicate ids and unresolved bindings', () => {
    const duplicate = {
      ...baseDefinition,
      page: {
        ...baseDefinition.page,
        regions: [
          {
            id: 'main',
            components: [
              { id: 'hero', type: 'hero' },
              { id: 'hero', type: 'hero' },
            ],
          },
        ],
      },
    };
    assert.throws(() => validateCanonicalDefinition(duplicate, 'file.xml'), /Duplicate component id/);

    const unresolved = {
      ...baseDefinition,
      page: {
        ...baseDefinition.page,
        regions: [
          {
            id: 'main',
            components: [
              {
                id: 'hero',
                type: 'hero',
                props: {
                  title: {
                    kind: 'binding',
                    source: 'missing',
                  } satisfies PropValue,
                },
              },
            ],
          },
        ],
        dataSources: baseDefinition.page.dataSources?.slice(0, 0),
      },
    };
    assert.throws(() => validateCanonicalDefinition(unresolved, 'file.xml'), /Binding to unknown data source/);
  });
});
