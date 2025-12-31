import React from 'react';
import type { ComponentDefinition } from '../component-registry';
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

function withChildren<Props>(Component: React.ComponentType<Props>, displayName: string) {
  const Renderer = (props: Record<string, unknown>, children: React.ReactNode) => (
    <Component {...(props as Props)}>{children}</Component>
  );
  Renderer.displayName = displayName;
  return Renderer;
}

export const marketingComponentDefinitions: ComponentDefinition[] = [
  {
    type: 'HeroSection',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<HeroSectionProps>(HeroSection, 'HeroSectionRenderer'),
  },
  {
    type: 'HeaderSection',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<HeaderSectionProps>(HeaderSection, 'HeaderSectionRenderer'),
  },
  {
    type: 'CTASection',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<CTASectionProps>(CTASection, 'CTASectionRenderer'),
  },
  {
    type: 'FeatureGrid',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<FeatureGridProps>(FeatureGrid, 'FeatureGridRenderer'),
  },
  {
    type: 'FeatureSection',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<FeatureSectionProps>(FeatureSection, 'FeatureSectionRenderer'),
  },
  {
    type: 'BentoGrid',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<BentoGridProps>(BentoGrid, 'BentoGridRenderer'),
  },
  {
    type: 'PricingSection',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<PricingSectionProps>(PricingSection, 'PricingSectionRenderer'),
  },
  {
    type: 'NewsletterSection',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<NewsletterSectionProps>(NewsletterSection, 'NewsletterSectionRenderer'),
  },
  {
    type: 'StatsSection',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<StatsSectionProps>(StatsSection, 'StatsSectionRenderer'),
  },
  {
    type: 'TestimonialsSection',
    namespace: 'marketing',
    version: '1.0.0',
    renderer: withChildren<TestimonialsSectionProps>(TestimonialsSection, 'TestimonialsSectionRenderer'),
  },
];
