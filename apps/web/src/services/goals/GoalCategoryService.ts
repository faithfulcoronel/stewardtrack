import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IGoalCategoryRepository } from '@/repositories/goals';
import type {
  GoalCategory,
  GoalCategoryCreateInput,
  GoalCategoryUpdateInput,
} from '@/models/goals';
import { handleError } from '@/utils/errorHandler';

// ============================================================================
// Service Interface
// ============================================================================

export interface IGoalCategoryService {
  getAll(): Promise<GoalCategory[]>;
  getById(id: string): Promise<GoalCategory | null>;
  getByCode(code: string): Promise<GoalCategory | null>;
  create(data: GoalCategoryCreateInput): Promise<GoalCategory>;
  update(id: string, data: GoalCategoryUpdateInput): Promise<GoalCategory>;
  delete(id: string): Promise<void>;
  isInUse(id: string): Promise<boolean>;
  seedDefaults(): Promise<void>;
}

// ============================================================================
// Service Implementation
// ============================================================================

@injectable()
export class GoalCategoryService implements IGoalCategoryService {
  constructor(
    @inject(TYPES.IGoalCategoryRepository)
    private repo: IGoalCategoryRepository
  ) {}

  /**
   * Get all goal categories for the current tenant
   */
  async getAll(): Promise<GoalCategory[]> {
    try {
      return await this.repo.getAll();
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryService.getAll',
      });
    }
  }

  /**
   * Get a goal category by ID
   */
  async getById(id: string): Promise<GoalCategory | null> {
    try {
      return await this.repo.getById(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryService.getById',
        id,
      });
    }
  }

  /**
   * Get a goal category by code
   */
  async getByCode(code: string): Promise<GoalCategory | null> {
    try {
      return await this.repo.getByCode(code);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryService.getByCode',
        code,
      });
    }
  }

  /**
   * Create a new goal category
   */
  async create(data: GoalCategoryCreateInput): Promise<GoalCategory> {
    try {
      // Validate code uniqueness
      if (data.code) {
        const existing = await this.repo.getByCode(data.code);
        if (existing) {
          throw new Error(`A category with code "${data.code}" already exists`);
        }
      }

      return await this.repo.create(data);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryService.create',
        data,
      });
    }
  }

  /**
   * Update a goal category
   */
  async update(id: string, data: GoalCategoryUpdateInput): Promise<GoalCategory> {
    try {
      // Validate category exists
      const existing = await this.repo.getById(id);
      if (!existing) {
        throw new Error('Category not found');
      }

      // Check if system category - cannot change code
      if (existing.is_system && data.code && data.code !== existing.code) {
        throw new Error('Cannot change code of system category');
      }

      // Validate code uniqueness if changing
      if (data.code && data.code !== existing.code) {
        const duplicate = await this.repo.getByCode(data.code);
        if (duplicate) {
          throw new Error(`A category with code "${data.code}" already exists`);
        }
      }

      return await this.repo.update(id, data);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryService.update',
        id,
        data,
      });
    }
  }

  /**
   * Delete a goal category
   */
  async delete(id: string): Promise<void> {
    try {
      // Validate category exists
      const existing = await this.repo.getById(id);
      if (!existing) {
        throw new Error('Category not found');
      }

      // Check if system category
      if (existing.is_system) {
        throw new Error('Cannot delete system category');
      }

      // Check if category is in use
      const inUse = await this.repo.isInUse(id);
      if (inUse) {
        throw new Error('Cannot delete category that is in use by goals');
      }

      await this.repo.delete(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryService.delete',
        id,
      });
    }
  }

  /**
   * Check if a category is in use
   */
  async isInUse(id: string): Promise<boolean> {
    try {
      return await this.repo.isInUse(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryService.isInUse',
        id,
      });
    }
  }

  /**
   * Seed default categories for a new tenant
   */
  async seedDefaults(): Promise<void> {
    try {
      await this.repo.seedDefaults();
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryService.seedDefaults',
      });
    }
  }
}
