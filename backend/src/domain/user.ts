export interface UserEntity {
  id: string;
  email: string;
  nickname: string;
  profile_image_url: string | null;
  credit_score: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUserProfileEntity {
  id: string;
  nickname: string;
  profile_image_url: string | null;
  credit_score: number;
  status: string;
  evaluation_count: number;
}
