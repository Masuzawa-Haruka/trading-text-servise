export type NotificationType = 'action_required' | 'info';

export interface NotificationEntity {
  id: string;
  user_id: string;
  actor_id: string | null;
  title: string;
  type: NotificationType;
  transaction_id: string | null;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;
}
