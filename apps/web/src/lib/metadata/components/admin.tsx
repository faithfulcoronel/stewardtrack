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
import {
  AdminNotificationPreferences,
  type AdminNotificationPreferencesProps,
} from '@/components/dynamic/admin/AdminNotificationPreferences';
import {
  AdminSettingsTabs,
  type AdminSettingsTabsProps,
} from '@/components/dynamic/admin/AdminSettingsTabs';
import {
  AdminIntegrationSettings,
  type AdminIntegrationSettingsProps,
} from '@/components/dynamic/admin/AdminIntegrationSettings';
import {
  AdminScheduledNotifications,
  type AdminScheduledNotificationsProps,
} from '@/components/dynamic/admin/AdminScheduledNotifications';
import {
  AdminNotificationAnalytics,
  type AdminNotificationAnalyticsProps,
} from '@/components/dynamic/admin/AdminNotificationAnalytics';
import {
  AdminNotificationTemplates,
  type AdminNotificationTemplatesProps,
} from '@/components/dynamic/admin/AdminNotificationTemplates';
import {
  SuperAdminIntegrationSettings,
  type SuperAdminIntegrationSettingsProps,
} from '@/components/dynamic/admin/SuperAdminIntegrationSettings';
import {
  SuperAdminSystemTemplates,
  type SuperAdminSystemTemplatesProps,
} from '@/components/dynamic/admin/SuperAdminSystemTemplates';
import {
  FamilyMembershipManager,
  type FamilyMembershipManagerProps,
} from '@/components/dynamic/admin/FamilyMembershipManager';
import {
  MemberQRCode,
  type MemberQRCodeProps,
} from '@/components/dynamic/admin/MemberQRCode';
import {
  GoalProgressRing,
  type GoalProgressRingProps,
} from '@/components/dynamic/admin/goals/GoalProgressRing';
import {
  GoalCard,
  type GoalCardProps,
} from '@/components/dynamic/admin/goals/GoalCard';
import {
  KeyResultProgressCard,
  type KeyResultProgressCardProps,
} from '@/components/dynamic/admin/goals/KeyResultProgressCard';
import {
  OKRTreeView,
  type OKRTreeViewProps,
} from '@/components/dynamic/admin/goals/OKRTreeView';
import {
  GoalStatusTimeline,
  type GoalStatusTimelineProps,
} from '@/components/dynamic/admin/goals/GoalStatusTimeline';
import {
  PlanningCalendar,
  type PlanningCalendarProps,
} from '@/components/dynamic/admin/PlanningCalendar';
import {
  PlanningDashboard,
  type PlanningDashboardProps,
} from '@/components/dynamic/admin/PlanningDashboard';

function withoutChildren<Props>(Component: React.ComponentType<Props>, displayName: string) {
  const Renderer = (props: Record<string, unknown>) => <Component {...(props as Props)} />;
  Renderer.displayName = displayName;
  return Renderer;
}

function withChildren<Props>(Component: React.ComponentType<Props>, displayName: string) {
  const Renderer = (props: Record<string, unknown>, children: React.ReactNode) => (
    <Component {...(props as Props)}>{children}</Component>
  );
  Renderer.displayName = displayName;
  return Renderer;
}

// Fragment renderer - wraps children with spacing (used for grouping in XML)
function FragmentRenderer(_props: Record<string, unknown>, children: React.ReactNode) {
  return <div className="space-y-8">{children}</div>;
}
FragmentRenderer.displayName = 'FragmentRenderer';

export const adminComponentDefinitions: ComponentDefinition[] = [
  {
    type: 'Fragment',
    namespace: 'core',
    version: '1.0.0',
    renderer: FragmentRenderer,
  },
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
  {
    type: 'AdminNotificationPreferences',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminNotificationPreferencesProps>(AdminNotificationPreferences, 'AdminNotificationPreferencesRenderer'),
  },
  {
    type: 'AdminSettingsTabs',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withChildren<AdminSettingsTabsProps>(AdminSettingsTabs, 'AdminSettingsTabsRenderer'),
  },
  {
    type: 'AdminIntegrationSettings',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminIntegrationSettingsProps>(AdminIntegrationSettings, 'AdminIntegrationSettingsRenderer'),
  },
  {
    type: 'AdminScheduledNotifications',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminScheduledNotificationsProps>(AdminScheduledNotifications, 'AdminScheduledNotificationsRenderer'),
  },
  {
    type: 'AdminNotificationAnalytics',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminNotificationAnalyticsProps>(AdminNotificationAnalytics, 'AdminNotificationAnalyticsRenderer'),
  },
  {
    type: 'AdminNotificationTemplates',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<AdminNotificationTemplatesProps>(AdminNotificationTemplates, 'AdminNotificationTemplatesRenderer'),
  },
  {
    type: 'SuperAdminIntegrationSettings',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<SuperAdminIntegrationSettingsProps>(SuperAdminIntegrationSettings, 'SuperAdminIntegrationSettingsRenderer'),
  },
  {
    type: 'SuperAdminSystemTemplates',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<SuperAdminSystemTemplatesProps>(SuperAdminSystemTemplates, 'SuperAdminSystemTemplatesRenderer'),
  },
  {
    type: 'FamilyMembershipManager',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<FamilyMembershipManagerProps>(FamilyMembershipManager, 'FamilyMembershipManagerRenderer'),
  },
  {
    type: 'MemberQRCode',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<MemberQRCodeProps>(MemberQRCode, 'MemberQRCodeRenderer'),
  },
  // Goals & Objectives Components
  {
    type: 'GoalProgressRing',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<GoalProgressRingProps>(GoalProgressRing, 'GoalProgressRingRenderer'),
  },
  {
    type: 'GoalCard',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<GoalCardProps>(GoalCard, 'GoalCardRenderer'),
  },
  {
    type: 'KeyResultProgressCard',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<KeyResultProgressCardProps>(KeyResultProgressCard, 'KeyResultProgressCardRenderer'),
  },
  {
    type: 'OKRTreeView',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<OKRTreeViewProps>(OKRTreeView, 'OKRTreeViewRenderer'),
  },
  {
    type: 'GoalStatusTimeline',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<GoalStatusTimelineProps>(GoalStatusTimeline, 'GoalStatusTimelineRenderer'),
  },
  // Planning Components
  {
    type: 'PlanningCalendar',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<PlanningCalendarProps>(PlanningCalendar, 'PlanningCalendarRenderer'),
  },
  {
    type: 'PlanningDashboard',
    namespace: 'admin',
    version: '1.0.0',
    renderer: withoutChildren<PlanningDashboardProps>(PlanningDashboard, 'PlanningDashboardRenderer'),
  },
];
