import 'server-only';
import "reflect-metadata";
import { injectable } from "inversify";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModuleMetadata } from "@/modules/types/module";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface IUiModuleAdapter {
  getModuleMetadata(params: {
    moduleGroupId: string;
    moduleId: string;
  }): Promise<ModuleMetadata>;
}

@injectable()
export class UiModuleAdapter implements IUiModuleAdapter {
  private supabase: SupabaseClient | null = null;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }
  async getModuleMetadata({
    moduleGroupId,
    moduleId,
  }: {
    moduleGroupId: string;
    moduleId: string;
  }): Promise<ModuleMetadata> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
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

