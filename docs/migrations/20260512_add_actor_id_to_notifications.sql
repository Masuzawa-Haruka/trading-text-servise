-- Migration: notifications テーブルに actor_id カラムを追加
-- 実行日: 2026-05-12
-- 対応PR: #6

ALTER TABLE notifications
ADD COLUMN actor_id UUID REFERENCES users(id) ON DELETE SET NULL;
