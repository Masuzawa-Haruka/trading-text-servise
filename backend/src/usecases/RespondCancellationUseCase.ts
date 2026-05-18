import { ICancellationRepository } from '../domain/repositories/ICancellationRepository';
import { CancellationRequestEntity, RespondCancellationInput } from '../domain/cancellation';
import { NotFoundError, ValidationError } from '../domain/errors';

export class RespondCancellationUseCase {
  constructor(private readonly cancellationRepository: ICancellationRepository) {}

  async execute(input: RespondCancellationInput, responderId: string): Promise<CancellationRequestEntity> {
    const { cancellation_id } = input;
    void responderId;

    const request = await this.cancellationRepository.findById(cancellation_id);
    if (!request) {
      throw new NotFoundError('キャンセル申請が見つかりません');
    }

    throw new ValidationError('キャンセル実行は送信時に即時中止されるため、承認または拒否はできません');
  }
}
