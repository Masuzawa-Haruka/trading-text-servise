import { IUserRepository } from '../domain/repositories/IUserRepository';
import { UserEntity } from '../domain/user';

export class GetUsersUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<UserEntity[]> {
    return await this.userRepository.findAll();
  }
}
