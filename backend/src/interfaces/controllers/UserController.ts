import { Request, Response } from 'express';
import { NotFoundError, ValidationError } from '../../domain/errors';
import { AuthRequest } from '../../middleware/auth';
import { GetMyProfileUseCase } from '../../usecases/GetMyProfileUseCase';
import { GetUsersUseCase } from '../../usecases/GetUsersUseCase';
import { UpdateMyProfileUseCase } from '../../usecases/UpdateMyProfileUseCase';

export class UserController {
  constructor(
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly getMyProfileUseCase: GetMyProfileUseCase,
    private readonly updateMyProfileUseCase: UpdateMyProfileUseCase,
  ) {}

  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.getUsersUseCase.execute();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const user = await this.getMyProfileUseCase.execute(req.user.id);
      res.status(200).json(user);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        res.status(400).json({ error: 'リクエストボディはオブジェクトで指定してください' });
        return;
      }

      const { nickname, profile_image_url } = req.body;
      const input: { nickname?: string; profile_image_url?: string | null } = {};

      if (nickname !== undefined) {
        if (typeof nickname !== 'string') {
          res.status(400).json({ error: 'nickname は文字列で指定してください' });
          return;
        }

        const normalizedNickname = nickname.trim();
        if (normalizedNickname.length === 0 || normalizedNickname.length > 50) {
          res.status(400).json({ error: 'nickname は1文字以上50文字以内で指定してください' });
          return;
        }
        input.nickname = normalizedNickname;
      }

      if (profile_image_url !== undefined) {
        if (profile_image_url === null || profile_image_url === '') {
          input.profile_image_url = null;
        } else if (typeof profile_image_url === 'string' && isValidHttpUrl(profile_image_url)) {
          input.profile_image_url = profile_image_url;
        } else {
          res.status(400).json({ error: 'profile_image_url はHTTP(S)のURLで指定してください' });
          return;
        }
      }

      const user = await this.updateMyProfileUseCase.execute(req.user.id, input);
      res.status(200).json(user);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  private handleError(res: Response, error: unknown): void {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
