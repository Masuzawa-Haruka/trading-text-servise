import { UserEntity } from '../user';

export interface IUserRepository {
  findAll(): Promise<UserEntity[]>;
  findById(id: string): Promise<UserEntity | null>;
  updateProfile(
    id: string,
    input: {
      nickname?: string;
      profile_image_url?: string | null;
    },
  ): Promise<UserEntity>;
}
