import { NotFoundError, ValidationError } from '../domain/errors';
import { IUserRepository } from '../domain/repositories/IUserRepository';
import { UserEntity } from '../domain/user';

export type UpdateMyProfileInput = {
  nickname?: string;
  profile_image_url?: string | null;
};

export class UpdateMyProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string, input: UpdateMyProfileInput): Promise<UserEntity> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    if (input.nickname === undefined && input.profile_image_url === undefined) {
      throw new ValidationError('nickname または profile_image_url を指定してください');
    }

    return this.userRepository.updateProfile(userId, input);
  }
}
