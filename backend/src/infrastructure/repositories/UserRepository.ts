import { PrismaClient } from '@prisma/client';
import { UserEntity } from '../../domain/user';

const prisma = new PrismaClient();

export class UserRepository {
  async findAll(): Promise<UserEntity[]> {
    const users = await prisma.user.findMany();
    return users.map(user => ({
      ...user,
      status: user.status.toString(),
    }));
  }
}
