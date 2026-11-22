-- 管理者の許可リストに、システムアカウント（sysken@aitech.ac.jp）を最初から入れる（外せない。アプリ側でも拒否する）
-- 実行方法は sysken-pay-backend/README.md の「DB の変更（マイグレーション）」を参照
-- 流す前に make backup で退避する。何度流しても壊れない（すでにあれば何もしない）
USE sysken_pay;

-- システムアカウント（sysken@aitech.ac.jp）は最初から許可リストに入れ、外せない（アプリ側でも拒否する）。
-- 値は app/domain/object/aitid の SystemAccountUPN と同じ。学籍番号は持たないので NULL。
INSERT IGNORE INTO admin_allowlist (upn, student_id, added_by) VALUES ('sysken@aitech.ac.jp', NULL, 'system');
