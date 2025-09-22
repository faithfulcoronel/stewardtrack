import { Member } from '../models/member.model';

export class MemberValidator {
  static validate(data: Partial<Member>): void {
    if (data.first_name !== undefined && !data.first_name.trim()) {
      throw new Error('First name is required');
    }
    if (data.last_name !== undefined && !data.last_name.trim()) {
      throw new Error('Last name is required');
    }
    if (data.gender !== undefined && !data.gender) {
      throw new Error('Gender is required');
    }
    if (data.marital_status !== undefined && !data.marital_status) {
      throw new Error('Marital status is required');
    }
    if (data.contact_number !== undefined && !data.contact_number.trim()) {
      throw new Error('Contact number is required');
    }
    if (data.address !== undefined && !data.address.trim()) {
      throw new Error('Address is required');
    }
    if (data.email !== undefined && data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Invalid email format');
    }
  }
}
