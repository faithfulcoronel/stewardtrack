import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { ModuleMetadata } from '../modules/types/module';
import type { IUiModuleRepository } from '../repositories/uiModule.repository';

@injectable()
export class UiModuleService {
  constructor(
    @inject(TYPES.IUiModuleRepository) private repo: IUiModuleRepository,
  ) {}

  getModuleMetadata(params: {
    moduleGroupId: string;
    moduleId: string;
  }): Promise<ModuleMetadata> {
    return this.repo.getModuleMetadata(params);
  }
}

