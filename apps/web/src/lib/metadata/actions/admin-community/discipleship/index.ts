/**
 * ================================================================================
 * DISCIPLESHIP ACTION HANDLERS
 * ================================================================================
 *
 * IMPORTANT: Action handlers vs Service handlers
 *
 * The metadata system has TWO separate handler registries:
 *
 * 1. ACTION HANDLERS (this file) - src/lib/metadata/actions/...
 *    - Used for form submissions, save operations, user-triggered actions
 *    - Registered in module manifests under `actions` key
 *    - Resolved via `resolveMetadataActionHandler()`
 *    - Called by `executeMetadataAction()` in execute.ts
 *
 * 2. SERVICE HANDLERS - src/lib/metadata/services/...
 *    - Used for data source resolution (loading form data, tables, etc.)
 *    - Registered in module manifests under `services` key
 *    - Resolved via `resolveServiceDataSourceHandler()`
 *    - Called by the metadata interpreter for DataSource elements
 *
 * When adding a new page with a save/submit action:
 *   1. Create the SERVICE handler for data loading (in services/admin-community-*.ts)
 *   2. Create the ACTION handler for save operations (in this directory)
 *   3. The ACTION handler should wrap the SERVICE handler (see savePlan.ts)
 *
 * The XML <Action kind="service"> looks up ACTION handlers, not SERVICE handlers!
 *
 * ================================================================================
 */

import type { MetadataActionHandler } from "../../types";
import { handleDiscipleshipPathwayQuickCreate } from "./pathwayCreate";
import { handleSaveDiscipleshipPlan } from "./savePlan";

export const discipleshipActionHandlers: Record<string, MetadataActionHandler> = {
  // Pathway quick-create for lookup dropdown
  "admin-community.discipleship.pathway.create": handleDiscipleshipPathwayQuickCreate,

  // Discipleship plan CRUD action handlers
  "admin-community.discipleship.manage.save": handleSaveDiscipleshipPlan,
};
