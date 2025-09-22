import { User } from '../models/user.model';

export class UserValidator {
  static validate(data: Partial<User>): void {
    if (!data.email?.trim()) {
      throw new Error('Email is required');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.password && data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
  }
}
