import { NotFoundError } from '../domain/errors';
import { IUserRepository } from '../domain/repositories/IUserRepository';
import { UserEntity } from '../domain/user';

export class GetMyProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('ユーザーが見つかりません');
    }
    return user;
  }
}
