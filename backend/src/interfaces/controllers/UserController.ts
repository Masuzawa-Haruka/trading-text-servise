import { Request, Response } from 'express';
import { GetUsersUseCase } from '../../usecases/GetUsersUseCase';
import { UserRepository } from '../infrastructure/repositories/UserRepository'; // Note: Dependency injection would be better

export class UserController {
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const userRepository = new UserRepository();
      const getUsersUseCase = new GetUsersUseCase(userRepository);
      
      const users = await getUsersUseCase.execute();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
