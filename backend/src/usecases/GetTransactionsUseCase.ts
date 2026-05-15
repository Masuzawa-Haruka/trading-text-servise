/**
 * GetTransactionsUseCase（取引一覧取得ユースケース）
 *
 * 認証ユーザーが関わる取引一覧（売り手・買い手どちらも）を返す。
 * マイページの「取引履歴」画面で使用する。
 */
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { TransactionEntity } from '../domain/transaction';

export class GetTransactionsUseCase {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  /**
   * 指定したユーザーが売り手または買い手として関わる取引一覧を返す。
   * @param userId - 認証ユーザーのID
   */
  async execute(userId: string): Promise<TransactionEntity[]> {
    return await this.transactionRepository.findByUserId(userId);
  }
}
