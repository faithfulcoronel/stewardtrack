import { adminSettingsActionHandlers } from "../actions/admin-settings";
import { adminSettingsHandlers } from "../services/admin-settings";
import type { MetadataModuleManifest } from "./registry";

export const adminSettingsManifest: MetadataModuleManifest = {
  id: "admin-settings",
  actions: adminSettingsActionHandlers,
  services: adminSettingsHandlers,
};
