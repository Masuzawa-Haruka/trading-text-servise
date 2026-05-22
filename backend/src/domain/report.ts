export type ReportEntity = {
  id: string;
  transaction_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  detail: string;
  evidence_image_urls: string[];
  created_at: Date;
  updated_at: Date;
};

export type CreateReportInput = {
  transaction_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  detail: string;
  evidence_image_urls: string[];
};
