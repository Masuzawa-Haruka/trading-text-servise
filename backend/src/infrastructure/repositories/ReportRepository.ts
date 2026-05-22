import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CreateReportInput, ReportEntity } from '../../domain/report';
import { IReportRepository } from '../../domain/repositories/IReportRepository';
import { ConflictError } from '../../domain/errors';

export class ReportRepository implements IReportRepository {
  async create(input: CreateReportInput): Promise<ReportEntity> {
    try {
      return await prisma.report.create({
        data: {
          transaction_id: input.transaction_id,
          reporter_id: input.reporter_id,
          reported_user_id: input.reported_user_id,
          reason: input.reason,
          detail: input.detail,
          evidence_image_urls: input.evidence_image_urls,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('この取引はすでに通報済みです');
      }
      throw error;
    }
  }
}
