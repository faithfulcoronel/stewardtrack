import { Category } from '../models/category.model';

export class CategoryValidator {
  static validate(data: Partial<Category>): void {
    if (data.code !== undefined && !data.code.trim()) {
      throw new Error('Category code is required');
    }

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Category name is required');
    }
  }
}
