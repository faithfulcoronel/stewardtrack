/**
 * Goals & Objectives Dynamic Components
 *
 * Mobile-first, theme-aware components for the Goals & Objectives feature.
 * These components follow the metadata-driven architecture pattern.
 *
 * Components:
 * - GoalProgressRing: Circular progress indicator with status colors
 * - GoalCard: Goal card with status, progress, and quick actions
 * - KeyResultProgressCard: Key result with progress bar and update functionality
 * - OKRTreeView: Hierarchical goal/objective/key-result visualization
 * - GoalStatusTimeline: Visual timeline of goal activity
 */

export { GoalProgressRing, type GoalProgressRingProps, type ProgressRingStatus } from "./GoalProgressRing";
export { GoalCard, type GoalCardProps, type GoalCardData, type GoalStatus } from "./GoalCard";
export {
  KeyResultProgressCard,
  type KeyResultProgressCardProps,
  type KeyResultData,
  type KeyResultStatus,
  type MetricType,
  type UpdateFrequency,
} from "./KeyResultProgressCard";
export {
  OKRTreeView,
  type OKRTreeViewProps,
  type GoalNode,
  type ObjectiveNode,
  type KeyResultNode,
  type OKRStatus,
  type ObjectivePriority,
} from "./OKRTreeView";
export {
  GoalStatusTimeline,
  type GoalStatusTimelineProps,
  type TimelineEvent,
  type TimelineEventType,
} from "./GoalStatusTimeline";
