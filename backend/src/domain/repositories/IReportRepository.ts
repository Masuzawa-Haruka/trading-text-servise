import { CreateReportInput, ReportEntity } from '../report';

export interface IReportRepository {
  create(input: CreateReportInput): Promise<ReportEntity>;
}
