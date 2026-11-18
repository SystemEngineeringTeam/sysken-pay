-- 既存の DB の user テーブルに hidden_at（一覧から非表示にした日時）を足す
-- 実行方法は sysken-pay-backend/README.md の「DB の変更（マイグレーション）」を参照
-- 流す前に make backup で退避する。何度流しても壊れない（すでに列があれば何もしない）
USE sysken_pay;

SET @add_hidden_at = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE `user` ADD COLUMN hidden_at TIMESTAMP NULL DEFAULT NULL AFTER deleted_at',
        'SELECT 1'
    )
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'hidden_at'
);
PREPARE add_hidden_at FROM @add_hidden_at;
EXECUTE add_hidden_at;
DEALLOCATE PREPARE add_hidden_at;
