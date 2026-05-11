import { UserRepository } from '../infrastructure/repositories/UserRepository';
import { UserEntity } from '../domain/user';

export class GetUsersUseCase {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async execute(): Promise<UserEntity[]> {
    return await this.userRepository.findAll();
  }
}
