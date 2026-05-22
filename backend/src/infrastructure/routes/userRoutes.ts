import { Router, Request, Response, NextFunction } from 'express';
import { UserController } from '../../interfaces/controllers/UserController';
import { UserRepository } from '../repositories/UserRepository';
import { authenticateToken } from '../../middleware/auth';
import { GetMyProfileUseCase } from '../../usecases/GetMyProfileUseCase';
import { GetUsersUseCase } from '../../usecases/GetUsersUseCase';
import { UpdateMyProfileUseCase } from '../../usecases/UpdateMyProfileUseCase';

const router = Router();

// 依存関係の注入 (Dependency Injection)
const userRepository = new UserRepository();
const getUsersUseCase = new GetUsersUseCase(userRepository);
const getMyProfileUseCase = new GetMyProfileUseCase(userRepository);
const updateMyProfileUseCase = new UpdateMyProfileUseCase(userRepository);
const userController = new UserController(
  getUsersUseCase,
  getMyProfileUseCase,
  updateMyProfileUseCase,
);

router.get('/me', authenticateToken, userController.getMe);
router.patch('/me', authenticateToken, userController.updateMe);

// 開発環境以外ではユーザー一覧へのアクセスを制限する（データ保護）
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }
  return userController.getUsers(req, res);
});

export default router;
