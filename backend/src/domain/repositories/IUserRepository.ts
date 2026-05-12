import { UserEntity } from '../user';

export interface IUserRepository {
  findAll(): Promise<UserEntity[]>;
}
