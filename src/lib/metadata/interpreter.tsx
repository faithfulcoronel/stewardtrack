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
import { FeatureGrid, type FeatureGridProps } from '@/components/dynamic/FeatureGrid';
import { FeatureSection, type FeatureSectionProps } from '@/components/dynamic/FeatureSection';
import { HeroSection, type HeroSectionProps } from '@/components/dynamic/HeroSection';
import { HeaderSection, type HeaderSectionProps } from '@/components/dynamic/HeaderSection';
import { CTASection, type CTASectionProps } from '@/components/dynamic/CTASection';
import { BentoGrid, type BentoGridProps } from '@/components/dynamic/BentoGrid';
import { PricingSection, type PricingSectionProps } from '@/components/dynamic/PricingSection';
import { NewsletterSection, type NewsletterSectionProps } from '@/components/dynamic/NewsletterSection';
import { StatsSection, type StatsSectionProps } from '@/components/dynamic/StatsSection';
import {
  TestimonialsSection,
  type TestimonialsSectionProps,
} from '@/components/dynamic/TestimonialsSection';
import {
  AdminMetricCards,
  type AdminMetricCardsProps,
} from '@/components/dynamic/admin/AdminMetricCards';
import {
  AdminQuickLinks,
  type AdminQuickLinksProps,
} from '@/components/dynamic/admin/AdminQuickLinks';
import {
  AdminActivityTimeline,
  type AdminActivityTimelineProps,
} from '@/components/dynamic/admin/AdminActivityTimeline';
import {
  AdminDataGridSection,
  type AdminDataGridSectionProps,
} from '@/components/dynamic/admin/AdminDataGridSection';
import {
  AdminDetailPanels,
  type AdminDetailPanelsProps,
} from '@/components/dynamic/admin/AdminDetailPanels';
import {
  AdminFormSection,
  type AdminFormSectionProps,
} from '@/components/dynamic/admin/AdminFormSection';
import {
  AdminGivingChart,
  type AdminGivingChartProps,
} from '@/components/dynamic/admin/AdminGivingChart';
import {
  AdminLookupQuickCreate,
  type AdminLookupQuickCreateProps,
} from '@/components/dynamic/admin/AdminLookupQuickCreate';
import {
  AdminMemberWorkspace,
  type AdminMemberWorkspaceProps,
} from '@/components/dynamic/admin/AdminMemberWorkspace';

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
  NewsletterSection: (props, children) => (
    <NewsletterSection {...(props as NewsletterSectionProps)}>{children}</NewsletterSection>
  ),
  StatsSection: (props, children) => <StatsSection {...(props as StatsSectionProps)}>{children}</StatsSection>,
  TestimonialsSection: (props, children) => (
    <TestimonialsSection {...(props as TestimonialsSectionProps)}>{children}</TestimonialsSection>
  ),
  AdminMetricCards: (props) => <AdminMetricCards {...(props as AdminMetricCardsProps)} />, 
  AdminQuickLinks: (props) => <AdminQuickLinks {...(props as AdminQuickLinksProps)} />, 
  AdminActivityTimeline: (props) => <AdminActivityTimeline {...(props as AdminActivityTimelineProps)} />, 
  AdminDataGridSection: (props) => <AdminDataGridSection {...(props as AdminDataGridSectionProps)} />, 
  AdminDetailPanels: (props) => <AdminDetailPanels {...(props as AdminDetailPanelsProps)} />,
  AdminFormSection: (props) => <AdminFormSection {...(props as AdminFormSectionProps)} />,
  AdminGivingChart: (props) => <AdminGivingChart {...(props as AdminGivingChartProps)} />,
  AdminLookupQuickCreate: (props) => <AdminLookupQuickCreate {...(props as AdminLookupQuickCreateProps)} />,
  AdminMemberWorkspace: (props) => <AdminMemberWorkspace {...(props as AdminMemberWorkspaceProps)} />,
};

export interface InterpreterContext {
  role?: string | null;
  tenant?: string | null;
  locale?: string | null;
  featureFlags?: Record<string, boolean>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export async function renderResolvedPage(
  resolved: ResolvedMetadata,
  context: InterpreterContext
): Promise<React.ReactNode> {
  const role = context.role ?? 'guest';
  const dataScope = await evaluateMetadataDataSources(
    resolved.definition.page.dataSources ?? [],
    context
  );
  const actions = evaluateMetadataActions(resolved.definition.page.actions ?? [], role);
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
  const evaluatedProps = evaluateMetadataProps(component.props ?? {}, dataScope, actions, context);
  const childNodes = component.children
    ? renderComponents(component.children, dataScope, actions, context)
    : null;
  return renderer(evaluatedProps, childNodes ?? null);
}