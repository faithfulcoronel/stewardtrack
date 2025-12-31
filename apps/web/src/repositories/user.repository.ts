import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { User } from '@/models/user.model';
import type { IAuthUserAdapter } from '@/adapters/authUser.adapter';
import { UserValidator } from '@/validators/user.validator';
import { TYPES } from '@/lib/types';

export type IUserRepository = BaseRepository<User>;

@injectable()
export class UserRepository
  extends BaseRepository<User>
  implements IUserRepository {
  constructor(@inject(TYPES.IAuthUserAdapter) adapter: IAuthUserAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<User>): Promise<Partial<User>> {
    UserValidator.validate(data);
    return this.formatUserData(data);
  }

  protected override async beforeUpdate(id: string, data: Partial<User>): Promise<Partial<User>> {
    UserValidator.validate(data);
    return this.formatUserData(data);
  }

  private formatUserData(data: Partial<User>): Partial<User> {
    return {
      ...data,
      email: data.email?.trim().toLowerCase(),
    };
  }
}