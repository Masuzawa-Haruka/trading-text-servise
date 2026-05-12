import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { prisma } from '../../lib/prisma';
import { UserEntity } from '../../domain/user';

export class UserRepository implements IUserRepository {
  async findAll(): Promise<UserEntity[]> {
    const users = await prisma.user.findMany();
    return users.map(user => ({
      ...user,
      status: user.status.toString(),
    }));
  }
}
