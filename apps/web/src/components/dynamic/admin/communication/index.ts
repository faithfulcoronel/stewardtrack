/**
 * Communication Module Components
 *
 * This module exports all communication-related components for the
 * metadata-driven admin UI.
 */

export { MessageComposer, type MessageComposerProps } from './MessageComposer';
export {
  RecipientSelector,
  type RecipientSelectorProps,
  type Recipient,
  type RecipientGroup,
  type RecipientSource,
} from './RecipientSelector';
export {
  TemplateSelector,
  type TemplateSelectorProps,
  type MessageTemplate,
  type TemplateCategory,
} from './TemplateSelector';
export { CampaignComposer, type CampaignComposerProps } from './CampaignComposer';
export { VariableInserter, type VariableInserterProps, type VariableDefinition } from './VariableInserter';
export { AIAssistantPanel, type AIAssistantPanelProps } from './AIAssistantPanel';
export { DeliveryStats, type DeliveryStatsProps, type DeliveryStatsData } from './DeliveryStats';
export {
  TemplateEditor,
  type TemplateEditorProps,
  type TemplateData,
  type TemplateCategory as TemplateEditorCategory,
  type TemplateChannel,
  type TemplateVariable,
} from './TemplateEditor';
