import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const ALLOWED_EMAIL_DOMAIN = '@osaka-u.ac.jp';
const MOCK_ACCESS_TOKEN = 'mock-access-token';
const MOCK_USER_ID = '11111111-1111-4111-8111-111111111111';
const MOCK_USER_EMAIL = 'mock-user@osaka-u.ac.jp';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: '認証トークンが必要です' });
    return;
  }

  if (isLocalMockAuthToken(token)) {
    try {
      await ensureMockUser();
      req.user = {
        id: MOCK_USER_ID,
        email: MOCK_USER_EMAIL,
        role: 'authenticated',
      };
      next();
      return;
    } catch (error) {
      console.error('Failed to prepare mock user', error);
      res.status(500).json({ error: 'Mockユーザーの準備に失敗しました' });
      return;
    }
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error('SUPABASE_JWT_SECRET is not defined');
    res.status(500).json({ error: 'サーバー設定エラー' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as any;
    const email = typeof decoded.email === 'string' ? decoded.email : undefined;
    const userId = typeof decoded.sub === 'string' ? decoded.sub : undefined;
    const role = typeof decoded.role === 'string' ? decoded.role : undefined;

    if (!userId || role !== 'authenticated') {
      res.status(403).json({ error: '無効なトークンです' });
      return;
    }

    if (!isAllowedUniversityEmail(email)) {
      res.status(403).json({ error: '大阪大学のメールアドレスで認証してください' });
      return;
    }

    req.user = {
      id: userId,
      email,
      role,
    };
    next();
  } catch (error) {
    res.status(403).json({ error: '無効なトークンです' });
  }
};

function isLocalMockAuthToken(token: string): boolean {
  return (
    token === MOCK_ACCESS_TOKEN &&
    process.env.ENABLE_MOCK_AUTH === 'true' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.VERCEL_ENV === undefined
  );
}

async function ensureMockUser(): Promise<void> {
  await prisma.user.upsert({
    where: { id: MOCK_USER_ID },
    create: {
      id: MOCK_USER_ID,
      email: MOCK_USER_EMAIL,
      nickname: '大阪 太郎',
      credit_score: 100,
      status: 'active',
    },
    update: {
      email: MOCK_USER_EMAIL,
      nickname: '大阪 太郎',
      status: 'active',
    },
  });
}

export function isAllowedUniversityEmail(email: string | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN));
}

export function extractBearerToken(authHeader: string | string[] | undefined): string | undefined {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (typeof header !== 'string') {
    return undefined;
  }

  const [scheme, token, ...extra] = header.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || extra.length > 0) {
    return undefined;
  }

  return token;
}
