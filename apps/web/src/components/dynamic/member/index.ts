/**
 * Member Profile Components
 *
 * Mobile-first, card-based components for displaying and editing member profiles.
 * Supports permission-based field visibility using userPermissions prop.
 */

export { MemberProfileCard } from "./MemberProfileCard";
export type {
  MemberProfileCardProps,
  MemberProfileCardVariant,
  CardDetailItem,
} from "./MemberProfileCard";

export { MemberProfileHeader } from "./MemberProfileHeader";
export type {
  MemberProfileHeaderProps,
  MetricItem,
  ActionItem,
} from "./MemberProfileHeader";

export { MemberProfileLayout } from "./MemberProfileLayout";
export type { MemberProfileLayoutProps } from "./MemberProfileLayout";

export { MemberCareSummaryCard } from "./MemberCareSummaryCard";
export type {
  MemberCareSummaryCardProps,
  CarePlanSummary,
  DiscipleshipPlanSummary,
} from "./MemberCareSummaryCard";
