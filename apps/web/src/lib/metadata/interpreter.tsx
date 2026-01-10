import React, { Fragment } from 'react';
import type { CanonicalComponent } from './generated/canonical';
import type { ResolvedMetadata } from './resolver';
import {
  evaluateMetadataActions,
  evaluateMetadataDataSources,
  evaluateMetadataProps,
  type ActionScope,
  type DataScope,
  isPermitted,
} from './evaluation';
import { getComponentRegistry } from './component-registry';
import { initializeMetadataModules } from './modules';

initializeMetadataModules();

export interface InterpreterContext {
  role?: string | null;
  tenant?: string | null;
  locale?: string | null;
  featureFlags?: Record<string, boolean>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export async function renderResolvedPage(
  resolved: ResolvedMetadata,
  context: InterpreterContext,
): Promise<React.ReactNode> {
  const role = context.role ?? 'guest';
  const dataScope = await evaluateMetadataDataSources(
    resolved.definition.page.dataSources ?? [],
    context,
  );
  const actions = evaluateMetadataActions(
    resolved.definition.page.actions ?? [],
    role,
    undefined,
    undefined,
    context.searchParams,
    dataScope,
  );
  const regions = resolved.definition.page.regions ?? [];

  const renderedRegions = regions.map((region) => {
    const components = region.components ?? [];
    return (
      <Fragment key={region.id}>
        {renderComponents(components, dataScope, actions, context)}
      </Fragment>
    );
  });

  return <>{renderedRegions}</>;
}

function renderComponents(
  components: CanonicalComponent[],
  dataScope: DataScope,
  actions: ActionScope,
  context: InterpreterContext,
): React.ReactNode {
  return components
    .map((component) => {
      const rendered = renderComponent(component, dataScope, actions, context);
      if (!rendered) {
        return null;
      }
      return <Fragment key={component.id}>{rendered}</Fragment>;
    })
    .filter(Boolean);
}

function renderComponent(
  component: CanonicalComponent,
  dataScope: DataScope,
  actions: ActionScope,
  context: InterpreterContext,
): React.ReactNode {
  if (!isPermitted(component.rbac, context.role ?? 'guest')) {
    return null;
  }
  const registry = getComponentRegistry();
  const renderer = component.type
    ? registry.resolve(component.type, component.namespace ?? undefined, component.version ?? undefined)
    : undefined;
  if (!renderer) {
    return null;
  }
  const evaluatedProps = evaluateMetadataProps(component.props ?? {}, dataScope, actions, context);
  const childNodes = component.children
    ? renderComponents(component.children, dataScope, actions, context)
    : null;
  return renderer(evaluatedProps, childNodes ?? null);
}
