-- 発行用 QR（payment_card_claim 表）をやめたので、表を消す。
-- 発行は静的サイト sysken-pay-qr に移した（docs/phone-payment.md の「発行方式の変更」）。
--
-- 実行する前に、必ず make backup を取る（DROP は元に戻せない）。
-- 新しいバックエンドを起動する前に実行すること（古い表が残っていると、ユーザーの削除・学籍番号の変更が外部キーで失敗することがある）。
-- 実行方法は sysken-pay-backend/README.md の「DB の変更（マイグレーション）」を参照
USE sysken_pay;

DROP TABLE IF EXISTS payment_card_claim;
