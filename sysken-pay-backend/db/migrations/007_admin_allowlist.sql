-- 既存の DB に admin_allowlist テーブル（管理サイトに Entra ID でログインしてよい人）を追加する
-- 実行方法は sysken-pay-backend/README.md の「DB の変更（マイグレーション）」を参照
-- 流す前に make backup で退避する。何度流しても壊れない（すでにあれば何もしない）
USE sysken_pay;

-- ---------------------------------
-- 9. admin_allowlist テーブル (管理者の許可リスト)
-- ---------------------------------
-- 管理サイトに Microsoft アカウント（UPN）でログインできる人。管理サイトの「管理者の許可」画面で編集する。
-- 最初の 1 人は、予備の管理者パスワードで管理サイトに入って足す。
-- upn は小文字で入れる。student_id は学籍番号（sysken@aitech.ac.jp のようなシステムアカウントは NULL）。
-- added_by は足した人の UPN（予備のパスワードで足したときは 'password'）。
CREATE TABLE IF NOT EXISTS admin_allowlist (
    upn VARCHAR(255) NOT NULL,
    student_id VARCHAR(20) NULL DEFAULT NULL,
    added_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (upn)
);
