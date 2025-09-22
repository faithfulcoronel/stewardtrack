import { injectable, inject } from "inversify";
import type { ModuleMetadata } from "../modules/types/module";
import type { IUiModuleAdapter } from "../adapters/uiModule.adapter";

export interface IUiModuleRepository {
  getModuleMetadata(params: {
    moduleGroupId: string;
    moduleId: string;
  }): Promise<ModuleMetadata>;
}

@injectable()
export class UiModuleRepository implements IUiModuleRepository {
  constructor(@inject("IUiModuleAdapter") private adapter: IUiModuleAdapter) {}

  getModuleMetadata(params: {
    moduleGroupId: string;
    moduleId: string;
  }): Promise<ModuleMetadata> {
    return this.adapter.getModuleMetadata(params);
  }
}

