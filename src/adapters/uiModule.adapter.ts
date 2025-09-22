import "reflect-metadata";
import { injectable, inject } from "inversify";
import { SupabaseClient } from "@supabase/supabase-js";
import type { ModuleMetadata } from "../modules/types/module";
import { TYPES } from "../lib/types";

export interface IUiModuleAdapter {
  getModuleMetadata(params: {
    moduleGroupId: string;
    moduleId: string;
  }): Promise<ModuleMetadata>;
}

@injectable()
export class UiModuleAdapter implements IUiModuleAdapter {
  @inject(TYPES.SupabaseClient)
  private supabase!: SupabaseClient;
  async getModuleMetadata({
    moduleGroupId,
    moduleId,
  }: {
    moduleGroupId: string;
    moduleId: string;
  }): Promise<ModuleMetadata> {
    const { data, error } = await this.supabase
      .from("ui_modules")
      .select("metadata")
      .eq("group_id", moduleGroupId)
      .eq("module_id", moduleId)
      .single();
    if (error) throw error;
    if (!data)
      throw new Error(`Module metadata not found for ${moduleGroupId}/${moduleId}`);
    return data.metadata as ModuleMetadata;
  }
}

