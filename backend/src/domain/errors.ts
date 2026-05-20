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

/** リクエストの内容が不正な場合（HTTP 400 に対応） */
export class ValidationError extends Error {
  constructor(message = '不正なリクエストです') {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 現在のリソース状態と操作が競合する場合（HTTP 409 に対応）
 * 入力値自体は正しいが、対象リソースの状態遷移上実行できない操作に使う。
 * 例: すでにキャンセル済みの取引に再度キャンセル実行、scheduled でない取引への操作。
 */
export class ConflictError extends Error {
  constructor(message = 'リソースの状態と操作が競合しています') {
    super(message);
    this.name = 'ConflictError';
  }
}
