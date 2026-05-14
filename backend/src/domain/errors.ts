/**
 * アプリケーション共通のカスタムエラー型
 *
 * UseCase 層が throw するエラーを型として定義する。
 * Controller 層では error.message の文字列比較ではなく instanceof で分岐するため、
 * メッセージ文言の変更によるバグを防ぎ、保守性を高める。
 */

/** 対象のリソースが存在しない場合（HTTP 404 に対応） */
export class NotFoundError extends Error {
  constructor(message = 'リソースが見つかりません') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** 操作に必要な権限がない場合（HTTP 403 に対応） */
export class ForbiddenError extends Error {
  constructor(message = '操作する権限がありません') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
