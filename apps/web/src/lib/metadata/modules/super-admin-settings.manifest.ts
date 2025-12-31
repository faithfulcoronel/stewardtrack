import { superAdminSettingsHandlers } from "../services/super-admin-settings";
import type { MetadataModuleManifest } from "./registry";

export const superAdminSettingsManifest: MetadataModuleManifest = {
  id: "super-admin-settings",
  services: superAdminSettingsHandlers,
};
