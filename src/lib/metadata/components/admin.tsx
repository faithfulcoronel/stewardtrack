import React from 'react';
import type { ComponentDefinition } from '../component-registry';
import { AdminMetricCards, type AdminMetricCardsProps } from '@/components/dynamic/admin/AdminMetricCards';
import { AdminQuickLinks, type AdminQuickLinksProps } from '@/components/dynamic/admin/AdminQuickLinks';
import {
  AdminActivityTimeline,
  type AdminActivityTimelineProps,
} from '@/components/dynamic/admin/AdminActivityTimeline';
import {
  AdminDataGridSection,
  type AdminDataGridSectionProps,
} from '@/components/dynamic/admin/AdminDataGridSection';
import { AdminDetailPanels, type AdminDetailPanelsProps } from '@/components/dynamic/admin/AdminDetailPanels';
import { AdminFormSection, type AdminFormSectionProps } from '@/components/dynamic/admin/AdminFormSection';
import { AdminGivingChart, type AdminGivingChartProps } from '@/components/dynamic/admin/AdminGivingChart';
import {
  AdminLookupQuickCreate,
  type AdminLookupQuickCreateProps,
} from '@/components/dynamic/admin/AdminLookupQuickCreate';
import {
  AdminMemberWorkspace,
  type AdminMemberWorkspaceProps,
} from '@/components/dynamic/admin/AdminMemberWorkspace';
import {
  AdminCarePlansCard,
  type AdminCarePlansCardProps,
} from '@/components/dynamic/admin/AdminCarePlansCard';
import {
  AdminDiscipleshipPlansCard,
  type AdminDiscipleshipPlansCardProps,
} from '@/components/dynamic/admin/AdminDiscipleshipPlansCard';

function withoutChildren<Props>(Component: React.ComponentType<Props>, displayName: string) {
  const Renderer = (props: Record<string, unknown>) => <Component {...(props as Props)} />;
  Renderer.displayName = displayName;
  return Renderer;
}

export const adminComponentDefinitions: ComponentDefinition[] = [
  {
    type: 'AdminMetricCards',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminMetricCardsProps>(AdminMetricCards, 'AdminMetricCardsRenderer'),
  },
  {
    type: 'AdminQuickLinks',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminQuickLinksProps>(AdminQuickLinks, 'AdminQuickLinksRenderer'),
  },
  {
    type: 'AdminActivityTimeline',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminActivityTimelineProps>(AdminActivityTimeline, 'AdminActivityTimelineRenderer'),
  },
  {
    type: 'AdminDataGridSection',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminDataGridSectionProps>(AdminDataGridSection, 'AdminDataGridSectionRenderer'),
  },
  {
    type: 'AdminDetailPanels',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminDetailPanelsProps>(AdminDetailPanels, 'AdminDetailPanelsRenderer'),
  },
  {
    type: 'AdminFormSection',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminFormSectionProps>(AdminFormSection, 'AdminFormSectionRenderer'),
  },
  {
    type: 'AdminGivingChart',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminGivingChartProps>(AdminGivingChart, 'AdminGivingChartRenderer'),
  },
  {
    type: 'AdminLookupQuickCreate',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminLookupQuickCreateProps>(AdminLookupQuickCreate, 'AdminLookupQuickCreateRenderer'),
  },
  {
    type: 'AdminMemberWorkspace',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminMemberWorkspaceProps>(AdminMemberWorkspace, 'AdminMemberWorkspaceRenderer'),
  },
  {
    type: 'AdminCarePlansCard',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminCarePlansCardProps>(AdminCarePlansCard, 'AdminCarePlansCardRenderer'),
  },
  {
    type: 'AdminDiscipleshipPlansCard',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminDiscipleshipPlansCardProps>(AdminDiscipleshipPlansCard, 'AdminDiscipleshipPlansCardRenderer'),
  },
];
