import { Request, Response } from 'express';
import { GetUsersUseCase } from '../../usecases/GetUsersUseCase';

export class UserController {
  constructor(private readonly getUsersUseCase: GetUsersUseCase) {}

  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.getUsersUseCase.execute();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
