/**
 * バリデーション共通ユーティリティ
 *
 * コントローラー層で繰り返し使うフォーマット検証関数をまとめる。
 * 正規表現ベースの検証で、JavaScript の Date.parse より厳密に形式を確認する。
 */

/** UUID v4 の正規表現パターン */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 文字列が UUID v4 形式かどうかを検証する。
 * Prisma が UUID 型のフィールドに不正な値を渡した場合の DB エラーを事前に防ぐ。
 */
export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * ISO8601 形式（例: 2026-05-14T10:00:00Z, 2026-05-14T19:00:00+09:00）を検証する正規表現。
 * Date.parse は "May 14, 2026" など非標準形式も受け付けるため、正規表現で厳密に検証する。
 */
const ISO8601_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * 文字列が ISO8601 形式かつ実在する日時かどうかを検証する。
 * 3段階で検証する：
 * 1. 正規表現で ISO8601 フォーマットか確認する
 * 2. Date.parse で構文的に有効か確認する
 * 3. パース結果を ISO 文字列に戻し、年月日が入力と一致するか確認する
 *    （2026-02-31 など存在しない日付を Date.parse が正規化して受け入れるのを防ぐ）
 */
export function isValidIso8601(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!ISO8601_REGEX.test(value)) return false;

  const timestamp = Date.parse(value);
  if (isNaN(timestamp)) return false;

  // 入力から年月日を取り出し、パース結果と一致するか確認する
  // 例: "2026-02-31T10:00:00Z" → Date は 2026-03-03 に正規化するため不一致になる
  const inputDate = value.substring(0, 10); // "YYYY-MM-DD" 部分
  const parsed = new Date(timestamp);
  const parsedYear = parsed.getUTCFullYear();
  const parsedMonth = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const parsedDay = String(parsed.getUTCDate()).padStart(2, '0');
  const parsedDate = `${parsedYear}-${parsedMonth}-${parsedDay}`;

  return inputDate === parsedDate;
}

/** Prisma の Int 型（32bit 符号付き整数）の最大値 */
export const INT32_MAX = 2_147_483_647;
