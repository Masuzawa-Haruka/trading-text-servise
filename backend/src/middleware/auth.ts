import { Request, Response, NextFunction } from 'express';
import { createPublicKey } from 'crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const ALLOWED_EMAIL_DOMAIN = '@ecs.osaka-u.ac.jp';
const MOCK_ACCESS_TOKEN = 'mock-access-token';
const MOCK_USER_ID = '11111111-1111-4111-8111-111111111111';
const MOCK_USER_EMAIL = 'mock-user@ecs.osaka-u.ac.jp';
const SUPPORTED_ASYMMETRIC_ALGORITHMS = new Set(['ES256', 'RS256']);
type SupabaseJwk = Record<string, unknown> & { kid?: string };
let cachedJwks: { expiresAt: number; keys: SupabaseJwk[] } | null = null;

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
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
    handleVerifiedClaims(req, res, next, decoded);
  } catch (legacyError) {
    try {
      const decoded = await verifyAsymmetricSupabaseToken(token);
      handleVerifiedClaims(req, res, next, decoded);
    } catch (asymmetricError) {
      console.error(
        'Failed to verify Supabase JWT',
        asymmetricError instanceof Error ? asymmetricError.message : asymmetricError,
      );
      res.status(403).json({ error: '無効なトークンです' });
    }
  }
};

function handleVerifiedClaims(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  decoded: JwtPayload,
): void {
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
}

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

async function verifyAsymmetricSupabaseToken(token: string): Promise<JwtPayload> {
  const decodedHeader = jwt.decode(token, { complete: true });
  const alg = decodedHeader && typeof decodedHeader === 'object'
    ? decodedHeader.header.alg
    : undefined;

  if (alg && SUPPORTED_ASYMMETRIC_ALGORITHMS.has(alg)) {
    const kid = decodedHeader && typeof decodedHeader === 'object'
      ? decodedHeader.header.kid
      : undefined;
    if (!kid) {
      throw new Error('JWT header kid is missing');
    }

    const jwk = await findJwkByKid(kid);
    const publicKey = createPublicKey({ key: jwk as any, format: 'jwk' });
    return jwt.verify(token, publicKey, { algorithms: [alg as jwt.Algorithm] }) as JwtPayload;
  }

  throw new Error(`Unsupported JWT alg: ${alg ?? 'unknown'}`);
}

async function findJwkByKid(kid: string): Promise<SupabaseJwk> {
  const keys = await getSupabaseJwks();
  const key = keys.find((candidate) => candidate.kid === kid);
  if (!key) {
    throw new Error(`JWKS key not found for kid: ${kid}`);
  }
  return key;
}

async function getSupabaseJwks(): Promise<SupabaseJwk[]> {
  const now = Date.now();
  if (cachedJwks && cachedJwks.expiresAt > now) {
    return cachedJwks.keys;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required for asymmetric JWT verification');
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Supabase JWKS: ${response.status}`);
  }

  const body = await response.json();
  if (!body || typeof body !== 'object' || !Array.isArray((body as { keys?: unknown }).keys)) {
    throw new Error('Invalid Supabase JWKS response');
  }

  cachedJwks = {
    expiresAt: now + 10 * 60 * 1000,
    keys: (body as { keys: SupabaseJwk[] }).keys,
  };
  return cachedJwks.keys;
}
