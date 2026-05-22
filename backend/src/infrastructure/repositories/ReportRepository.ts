import { prisma } from '../../lib/prisma';
import { CreateReportInput, ReportEntity } from '../../domain/report';
import { IReportRepository } from '../../domain/repositories/IReportRepository';

export class ReportRepository implements IReportRepository {
  async create(input: CreateReportInput): Promise<ReportEntity> {
    return prisma.report.create({
      data: {
        transaction_id: input.transaction_id,
        reporter_id: input.reporter_id,
        reported_user_id: input.reported_user_id,
        reason: input.reason,
        detail: input.detail,
      },
    });
  }
}
