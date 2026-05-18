import { CancellationRequestEntity, RespondCancellationInput } from '../domain/cancellation';
import { ValidationError } from '../domain/errors';

export class RespondCancellationUseCase {
  async execute(input: RespondCancellationInput, responderId: string): Promise<CancellationRequestEntity> {
    void input;
    void responderId;

    throw new ValidationError('キャンセル実行は送信時に即時中止されるため、承認または拒否はできません');
  }
}
