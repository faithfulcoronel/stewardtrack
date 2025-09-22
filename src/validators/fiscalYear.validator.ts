import { FiscalYear } from '../models/fiscalYear.model';

export class FiscalYearValidator {
  static validate(data: Partial<FiscalYear>): void {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Name is required');
    }
    if (data.start_date && data.end_date && data.start_date > data.end_date) {
      throw new Error('Start date must be before end date');
    }
  }
}
