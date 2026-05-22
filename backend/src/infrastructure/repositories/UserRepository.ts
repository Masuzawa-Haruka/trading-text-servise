import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { prisma } from '../../lib/prisma';
import { UserEntity } from '../../domain/user';

export class UserRepository implements IUserRepository {
  async findAll(): Promise<UserEntity[]> {
    const users = await prisma.user.findMany();
    return users.map((user) => this.toEntity(user));
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.toEntity(user) : null;
  }

  async updateProfile(
    id: string,
    input: {
      nickname?: string;
      profile_image_url?: string | null;
    },
  ): Promise<UserEntity> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
        ...(input.profile_image_url !== undefined
          ? { profile_image_url: input.profile_image_url }
          : {}),
      },
    });

    return this.toEntity(user);
  }

  private toEntity(user: {
    id: string;
    email: string;
    nickname: string;
    profile_image_url: string | null;
    credit_score: number;
    status: { toString(): string };
    created_at: Date;
    updated_at: Date;
  }): UserEntity {
    return {
      ...user,
      status: user.status.toString(),
    };
  }
}
