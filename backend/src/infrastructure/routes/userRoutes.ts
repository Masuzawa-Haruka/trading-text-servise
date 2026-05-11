import { Router } from 'express';
import { UserController } from '../../interfaces/controllers/UserController';

const router = Router();
const userController = new UserController();

router.get('/', userController.getUsers);

export default router;
