import { NotFoundError } from '../domain/errors';
import { IEvaluationRepository } from '../domain/repositories/IEvaluationRepository';
import { IUserRepository } from '../domain/repositories/IUserRepository';
import { PublicUserProfileEntity } from '../domain/user';

export class GetPublicUserProfileUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly evaluationRepository: IEvaluationRepository,
  ) {}

  async execute(userId: string): Promise<PublicUserProfileEntity> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    const evaluationCount = await this.evaluationRepository.countVisibleReceivedByUserId(userId);

    return {
      id: user.id,
      nickname: user.nickname,
      profile_image_url: user.profile_image_url,
      credit_score: user.credit_score,
      status: user.status,
      evaluation_count: evaluationCount,
    };
  }
}
