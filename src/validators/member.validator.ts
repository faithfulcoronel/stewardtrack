import { Member } from '@/models/member.model';
import { FieldValidationError } from '@/utils/errorHandler';

export class MemberValidator {
  static validate(data: Partial<Member>): void {
    const toNullableString = (value: unknown): string | null => {
      if (value === undefined || value === null) {
        return null;
      }

      const trimmed = `${value}`.trim();
      return trimmed.length ? trimmed : null;
    };

    if (data.first_name !== undefined) {
      const firstName = toNullableString(data.first_name);
      if (!firstName) {
        throw new FieldValidationError('firstName', 'First name is required');
      }
      data.first_name = firstName;
    }

    if (data.last_name !== undefined) {
      const lastName = toNullableString(data.last_name);
      if (!lastName) {
        throw new FieldValidationError('lastName', 'Last name is required');
      }
      data.last_name = lastName;
    }

    if (data.gender !== undefined) {
      const gender = toNullableString(data.gender);
      if (!gender) {
        throw new FieldValidationError('gender', 'Gender is required');
      }
      data.gender = gender as Member['gender'];
    }

    if (data.marital_status !== undefined) {
      const maritalStatus = toNullableString(data.marital_status);
      if (!maritalStatus) {
        throw new FieldValidationError('maritalStatus', 'Marital status is required');
      }
      data.marital_status = maritalStatus as Member['marital_status'];
    }

    if (data.contact_number !== undefined) {
      const contactNumber = toNullableString(data.contact_number);
      if (!contactNumber) {
        throw new FieldValidationError('phone', 'Contact number is required');
      }
      data.contact_number = contactNumber;
    }

    if (data.email !== undefined) {
      const email = toNullableString(data.email);
      if (!email) {
        data.email = null;
      } else {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new FieldValidationError('email', 'Invalid email format');
        }
        data.email = email;
      }
    }
  }
}
