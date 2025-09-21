import React, { Fragment } from 'react';
import type { CanonicalAction, CanonicalComponent, CanonicalDataSource, PropValue } from './generated/canonical';
import type { ResolvedMetadata } from './resolver';
import { FeatureGrid, type FeatureGridProps } from '@/components/dynamic/FeatureGrid';
import { FeatureSection, type FeatureSectionProps } from '@/components/dynamic/FeatureSection';
import { HeroSection, type HeroSectionProps } from '@/components/dynamic/HeroSection';
import { HeaderSection, type HeaderSectionProps } from '@/components/dynamic/HeaderSection';
import { CTASection, type CTASectionProps } from '@/components/dynamic/CTASection';
import { BentoGrid, type BentoGridProps } from '@/components/dynamic/BentoGrid';
import { PricingSection, type PricingSectionProps } from '@/components/dynamic/PricingSection';

type ComponentRenderer<Props extends Record<string, unknown>> = (
  props: Props,
  children: React.ReactNode
) => React.ReactElement | null;

const componentRegistry: Record<string, ComponentRenderer<Record<string, unknown>>> = {
  HeroSection: (props, children) => <HeroSection {...(props as HeroSectionProps)}>{children}</HeroSection>,
  HeaderSection: (props, children) => (
    <HeaderSection {...(props as HeaderSectionProps)}>{children}</HeaderSection>
  ),
  CTASection: (props, children) => <CTASection {...(props as CTASectionProps)}>{children}</CTASection>,
  FeatureGrid: (props, children) => <FeatureGrid {...(props as FeatureGridProps)}>{children}</FeatureGrid>,
  FeatureSection: (props, children) => <FeatureSection {...(props as FeatureSectionProps)}>{children}</FeatureSection>,
  BentoGrid: (props, children) => <BentoGrid {...(props as BentoGridProps)}>{children}</BentoGrid>,
  PricingSection: (props, children) => <PricingSection {...(props as PricingSectionProps)}>{children}</PricingSection>,
};

export interface InterpreterContext {
  role?: string | null;
  tenant?: string | null;
  locale?: string | null;
  featureFlags?: Record<string, boolean>;
  searchParams?: Record<string, string | string[] | undefined>;
}

interface DataScope {
  [key: string]: unknown;
}

interface ActionScope {
  [key: string]: CanonicalAction & { config: Record<string, unknown> };
}

interface ExpressionScope {
  data: DataScope;
  flags: Record<string, boolean>;
  params: Record<string, string | string[] | undefined>;
  role: string;
}

type ExpressionEvaluator = (scope: ExpressionScope) => unknown;

const expressionCache = new Map<string, ExpressionEvaluator>();

export async function renderResolvedPage(
  resolved: ResolvedMetadata,
  context: InterpreterContext
): Promise<React.ReactNode> {
  const role = context.role ?? 'guest';
  const dataScope = await evaluateDataSources(resolved.definition.page.dataSources ?? [], role);
  const actions = evaluateActions(resolved.definition.page.actions ?? [], role);
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
  context: InterpreterContext
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
  context: InterpreterContext
): React.ReactNode {
  if (!isPermitted(component.rbac, context.role ?? 'guest')) {
    return null;
  }
  const renderer = component.type ? componentRegistry[component.type] : undefined;
  if (!renderer) {
    return null;
  }
  const evaluatedProps = evaluateProps(component.props ?? {}, dataScope, actions, context);
  const childNodes = component.children
    ? renderComponents(component.children, dataScope, actions, context)
    : null;
  return renderer(evaluatedProps, childNodes ?? null);
}

async function evaluateDataSources(
  sources: CanonicalDataSource[],
  role: string
): Promise<DataScope> {
  const results: DataScope = {};
  for (const source of sources) {
    if (!isPermitted(source.rbac, role)) {
      continue;
    }
    if (source.kind === 'static') {
      results[source.id] = source.config?.value ?? null;
      continue;
    }
    if (source.kind === 'http') {
      const url = String(source.config?.url ?? '');
      if (!url) {
        continue;
      }
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (response.ok) {
          results[source.id] = await response.json();
        }
      } catch (error) {
        console.error(`Failed to fetch HTTP data source ${source.id}`, toError(error));
      }
      continue;
    }
    if (source.kind === 'supabase') {
      console.warn(`Supabase data source ${source.id} not evaluated in this environment.`);
      continue;
    }
  }
  return results;
}

function evaluateActions(actions: CanonicalAction[], role: string): ActionScope {
  return actions.reduce<ActionScope>((acc, action) => {
    if (!isPermitted(action.rbac, role)) {
      return acc;
    }
    const config = normalizeRecord(action.config ?? {});
    acc[action.id] = { ...action, config };
    return acc;
  }, {});
}

function evaluateProps(
  props: Record<string, PropValue>,
  dataScope: DataScope,
  actions: ActionScope,
  context: InterpreterContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = evaluateProp(value, dataScope, actions, context);
  }
  return result;
}

function evaluateProp(
  prop: PropValue,
  dataScope: DataScope,
  actions: ActionScope,
  context: InterpreterContext
): unknown {
  switch (prop.kind) {
    case 'static':
      return prop.value;
    case 'binding': {
      const source = dataScope[prop.source];
      const resolved = resolvePath(source, prop.path);
      return resolved ?? prop.fallback ?? null;
    }
    case 'expression': {
      const scope: ExpressionScope = {
        data: dataScope,
        flags: context.featureFlags ?? {},
        params: context.searchParams ?? {},
        role: context.role ?? 'guest'
      };
      try {
        return evaluateExpression(prop.expression, scope);
      } catch (error) {
        console.error(`Failed to evaluate expression ${prop.expression}`, toError(error));
        return prop.fallback ?? null;
      }
    }
    case 'action':
      return actions[prop.actionId] ?? null;
    default:
      return null;
  }
}

function evaluateExpression(expression: string, scope: ExpressionScope): unknown {
  const evaluator = getExpressionEvaluator(expression);
  return evaluator(scope);
}

function getExpressionEvaluator(expression: string): ExpressionEvaluator {
  let evaluator = expressionCache.get(expression);
  if (!evaluator) {
    evaluator = compileExpression(expression);
    expressionCache.set(expression, evaluator);
  }
  return evaluator;
}

function compileExpression(expression: string): ExpressionEvaluator {
  try {
    const compiled = new Function(
      'data',
      'flags',
      'params',
      'role',
      `"use strict"; return (${expression});`
    ) as (
      data: DataScope,
      flags: Record<string, boolean>,
      params: Record<string, string | string[] | undefined>,
      role: string
    ) => unknown;

    return (scope) => compiled(scope.data, scope.flags, scope.params, scope.role);
  } catch (error) {
    const err = toError(error);
    console.error(`Failed to compile expression ${expression}`, err);
    return () => {
      throw err;
    };
  }
}

function resolvePath(source: unknown, pathExpression?: string | null): unknown {
  if (!pathExpression || pathExpression === '$') {
    return source;
  }
  const cleaned = pathExpression.replace(/^\$\.?/, '');
  if (!cleaned) {
    return source;
  }
  const segments = cleaned.split('.');
  let current: unknown = source;
  for (const segment of segments) {
    if (!isObjectRecord(current)) {
      return null;
    }
    current = current[segment];
  }
  return current;
}

function normalizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(record).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const normalizedKey = camelCase(key);
    acc[normalizedKey] = value;
    return acc;
  }, {});
}

function camelCase(value: string): string {
  return value
    .replace(/[-_\s]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(/^(.)/, (match) => match.toLowerCase());
}

function isPermitted(
  rbac:
    | CanonicalAction['rbac']
    | CanonicalComponent['rbac']
    | CanonicalDataSource['rbac'],
  role: string
): boolean {
  if (!rbac) {
    return true;
  }
  if (rbac.deny?.includes(role)) {
    return false;
  }
  if (rbac.allow && !rbac.allow.includes(role)) {
    return false;
  }
  return true;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}